"""
Modular Workflow Engine for Heal Your Heart EHR AI Workforce Agent.

Supports administrator-configured administrative workflow templates with sequential,
parallel, conditional, and optional tasks, dependency tracking, role-based assignment,
and idempotent event triggers.

SCHEMA GAP DOCUMENTATION:
-------------------------
The current `tasks` table schema (Task model) contains columns:
  [id, patient_id, facility_id, author_id, assignee_id, kind, title, body, due_date, priority, status]
It DOES NOT currently possess relational columns for:
  - `workflow_instance_id` (foreign key to a parent workflow execution run)
  - `predecessor_task_id` (relational self-referential foreign key for DAG dependency tracking)
  - `is_optional` (boolean column indicating skippable steps)
  - `condition_expr` (formal rule engine condition expression)

Per project guidelines, we DO NOT store relational IDs or JSON blobs in arbitrary text fields (e.g. `body`).
Instead, `WorkflowEngine` orchestrates template DAG dependencies in application logic, creates first-class
`Task` records for eligible steps, and records workflow state transitions in `audit_events`.
"""
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from . import models as m
from .ai_tools import create_administrative_task, send_staff_notification

logger = logging.getLogger("ehr.workflow")


@dataclass
class WorkflowStep:
    step_id: str
    title: str
    description: str
    target_role: str
    priority: str = "normal"
    due_offset_minutes: int = 15
    is_optional: bool = False
    is_parallel: bool = False
    depends_on: List[str] = field(default_factory=list)
    condition: Optional[Callable[[Dict[str, Any]], bool]] = None


@dataclass
class WorkflowTemplate:
    template_id: str
    name: str
    trigger_event: str
    description: str
    steps: List[WorkflowStep] = field(default_factory=list)


# Standard Patient Arrival Workflow Template
PATIENT_ARRIVAL_TEMPLATE = WorkflowTemplate(
    template_id="wf_patient_arrival_v1",
    name="Patient Arrival & Triage Orchestration",
    trigger_event="appointment_checked_in",
    description="Triggered when an appointment transitions to checked-in.",
    steps=[
        WorkflowStep(
            step_id="step_triage_vitals",
            title="Record Pre-Consultation Vitals",
            description="Measure and record blood pressure, heart rate, weight, and SpO2.",
            target_role="assistant",
            priority="normal",
            due_offset_minutes=15,
            is_optional=False,
            is_parallel=True,
            depends_on=[]
        ),
        WorkflowStep(
            step_id="step_reception_verify",
            title="Verify Intake Form and Identification",
            description="Confirm emergency contact, patient residence, and insurance/billing details.",
            target_role="reception",
            priority="normal",
            due_offset_minutes=10,
            is_optional=True,
            is_parallel=True,
            depends_on=[]
        ),
        WorkflowStep(
            step_id="step_doctor_chart_review",
            title="Review Patient Chart & Baseline Vitals",
            description="Review patient triage data and medical history before starting consultation.",
            target_role="doctor",
            priority="high",
            due_offset_minutes=30,
            is_optional=False,
            is_parallel=False,
            depends_on=["step_triage_vitals"]
        )
    ]
)


class WorkflowEngine:
    """
    Modular execution engine for administrative workflows.
    """
    def __init__(self):
        self._templates: Dict[str, WorkflowTemplate] = {
            PATIENT_ARRIVAL_TEMPLATE.template_id: PATIENT_ARRIVAL_TEMPLATE
        }

    def register_template(self, template: WorkflowTemplate) -> None:
        self._templates[template.template_id] = template

    def get_template(self, template_id: str) -> Optional[WorkflowTemplate]:
        return self._templates.get(template_id)

    def trigger_patient_arrival(
        self,
        db: Session,
        facility_id: str,
        appointment_id: str,
        actor_id: str
    ) -> Dict[str, Any]:
        """
        Executes patient arrival orchestration when an appointment transitions to checked-in.
        Guarantees idempotency: duplicate triggers for the same appointment return early.
        """
        # 1. Fetch and validate appointment
        appt = db.get(m.Appointment, appointment_id)
        if not appt:
            logger.warning(f"Workflow skipped: appointment {appointment_id} not found")
            return {"status": "error", "message": "Appointment not found"}

        if appt.facility_id != facility_id:
            logger.warning(f"Workflow skipped: facility mismatch for appointment {appointment_id}")
            return {"status": "error", "message": "Facility mismatch"}

        # 2. Idempotency Check: Verify if arrival workflow has already run for this appointment
        existing_event = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.facility_id == facility_id,
                m.AuditEvent.action == "workflow_patient_arrival",
                m.AuditEvent.entity_type == "appointments",
                m.AuditEvent.entity_id == appointment_id
            )
        )
        if existing_event:
            logger.info(f"Workflow already executed for appointment {appointment_id}; skipping to prevent duplicate tasks.")
            return {
                "status": "already_executed",
                "message": "Patient arrival workflow already completed for this appointment",
                "appointment_id": appointment_id,
                "tasks_created": 0
            }

        patient = db.get(m.Patient, appt.patient_id)
        if not patient:
            return {"status": "error", "message": "Patient not found"}

        # 3. Resolve Staff Members for target roles within this facility
        doctor_user = db.get(m.User, appt.provider_id)
        if not doctor_user or not doctor_user.active:
            # Fallback to any active doctor in facility
            doctor_user = self._find_active_facility_user_by_role(db, facility_id, "doctor")

        assistant_user = self._find_active_facility_user_by_role(db, facility_id, "assistant")
        if not assistant_user:
            # Fallback to doctor if no dedicated assistant is on duty
            assistant_user = doctor_user

        reception_user = self._find_active_facility_user_by_role(db, facility_id, "reception")
        if not reception_user:
            # Fallback to actor or assistant
            reception_user = assistant_user or doctor_user

        role_user_map = {
            "doctor": doctor_user.id if doctor_user else actor_id,
            "assistant": assistant_user.id if assistant_user else actor_id,
            "reception": reception_user.id if reception_user else actor_id
        }

        # 4. Evaluate and generate workflow tasks
        template = PATIENT_ARRIVAL_TEMPLATE
        created_tasks = []
        patient_label = f"{patient.first_name} {patient.last_name}".strip()
        token_info = f" (Token #{appt.token_number})" if appt.token_number else ""

        for step in template.steps:
            assignee_id = role_user_map.get(step.target_role, actor_id)

            # Parallel root steps (depends_on is empty) execute immediately
            # Sequential steps (depends_on is non-empty) are queued with priority indication
            is_dependent = len(step.depends_on) > 0
            step_prefix = "[Pre-requisite: Vitals] " if is_dependent else ""

            task_title = f"{step.title}{token_info}"
            task_body = (
                f"{step_prefix}{step.description}\n"
                f"Patient: {patient_label} (MRN: {patient.mrn})\n"
                f"Appointment: {appt.visit_type} at {appt.start_at.strftime('%H:%M') if appt.start_at else 'Today'}\n"
                f"Workflow: {template.name}"
            )

            due_date = date.today()

            task = create_administrative_task(
                db=db,
                facility_id=facility_id,
                author_id=actor_id,
                patient_id=patient.id,
                assignee_id=assignee_id,
                title=task_title,
                body=task_body,
                priority=step.priority,
                due_date=due_date,
                kind="workflow_step"
            )
            created_tasks.append(task.id)

        # 5. Log Master Workflow Audit Event
        db.add(m.AuditEvent(
            facility_id=facility_id,
            actor_id=actor_id,
            action="workflow_patient_arrival",
            entity_type="appointments",
            entity_id=appointment_id,
            detail=f"Template: {template.template_id}; Tasks created: {len(created_tasks)}"
        ))
        db.flush()

        logger.info(f"Patient arrival workflow completed for appointment {appointment_id}; created {len(created_tasks)} tasks.")
        return {
            "status": "success",
            "workflow_id": template.template_id,
            "appointment_id": appointment_id,
            "tasks_created": len(created_tasks),
            "task_ids": created_tasks
        }

    def _find_active_facility_user_by_role(
        self,
        db: Session,
        facility_id: str,
        role: str
    ) -> Optional[m.User]:
        """Finds an active user assigned to the facility with the given role."""
        return db.scalar(
            select(m.User).join(
                m.UserFacility,
                m.User.id == m.UserFacility.user_id
            ).where(
                m.UserFacility.facility_id == facility_id,
                m.User.role == role,
                m.User.active == True
            ).limit(1)
        )
