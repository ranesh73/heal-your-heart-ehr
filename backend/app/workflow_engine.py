"""
Durable Workflow Engine for Heal Your Heart EHR AI Workforce Agent.

Provides persistent, relational-database-backed workflow orchestration with:
1. Durable WorkflowInstance, WorkflowStep, StepDependency, and WorkflowEvent models.
2. Race-safe concurrent instance creation (UNIQUE constraint on appointment_id + template_key).
3. Idempotent advance(instance_id) dependency execution and task activation.
4. Strict state transition validation for workflow steps.
5. Task status mirroring (open/completed).
6. Port of patient arrival workflow: vitals (assistant), intake (reception, optional), chart review (doctor).
"""
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, field
from sqlalchemy import select, and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from . import models as m
from .ai_tools import create_administrative_task, send_staff_notification

logger = logging.getLogger("ehr.workflow")


# State machine valid transition matrix for workflow steps
VALID_STEP_TRANSITIONS: Dict[str, Set[str]] = {
    'pending': {'acknowledged', 'in_progress', 'blocked', 'cancelled', 'skipped'},
    'acknowledged': {'in_progress', 'completed', 'blocked', 'cancelled', 'skipped'},
    'in_progress': {'completed', 'blocked', 'cancelled', 'skipped'},
    'blocked': {'pending', 'acknowledged', 'in_progress', 'cancelled'},
    'completed': {'in_progress', 'pending'},
    'skipped': set(),
    'cancelled': set(),
}


@dataclass
class StepTemplate:
    step_key: str
    step_type: str
    title: str
    description: str
    assignee_role: str
    priority: str = "normal"
    required: bool = True
    due_offset_minutes: int = 15
    depends_on: List[str] = field(default_factory=list)


@dataclass
class WorkflowTemplateDef:
    template_key: str
    template_version: int
    name: str
    trigger_event: str
    description: str
    steps: List[StepTemplate]


# Versioned Patient Arrival Workflow Template
PATIENT_ARRIVAL_TEMPLATE = WorkflowTemplateDef(
    template_key="wf_patient_arrival_v1",
    template_version=1,
    name="Patient Arrival & Triage Orchestration",
    trigger_event="appointment_checked_in",
    description="Triggered when an appointment transitions to checked-in.",
    steps=[
        StepTemplate(
            step_key="step_triage_vitals",
            step_type="vitals",
            title="Record Pre-Consultation Vitals",
            description="Measure and record blood pressure, heart rate, weight, and SpO2.",
            assignee_role="assistant",
            priority="normal",
            required=True,
            due_offset_minutes=15,
            depends_on=[]
        ),
        StepTemplate(
            step_key="step_reception_verify",
            step_type="intake",
            title="Verify Intake Form and Identification",
            description="Confirm emergency contact, patient residence, and insurance/billing details.",
            assignee_role="reception",
            priority="normal",
            required=False,  # Optional step
            due_offset_minutes=10,
            depends_on=[]
        ),
        StepTemplate(
            step_key="step_doctor_chart_review",
            step_type="review",
            title="Review Patient Chart & Baseline Vitals",
            description="Review patient triage data and medical history before starting consultation.",
            assignee_role="doctor",
            priority="high",
            required=True,
            due_offset_minutes=30,
            depends_on=["step_triage_vitals"]
        )
    ]
)

ARRIVAL_STEPS_BY_KEY: Dict[str, StepTemplate] = {s.step_key: s for s in PATIENT_ARRIVAL_TEMPLATE.steps}


class WorkflowEngine:
    """
    Durable execution engine for clinical and administrative workflows.
    Backs all state and dependencies into relational database tables.
    """
    def __init__(self):
        self._templates: Dict[str, WorkflowTemplateDef] = {
            PATIENT_ARRIVAL_TEMPLATE.template_key: PATIENT_ARRIVAL_TEMPLATE
        }

    def get_template(self, template_key: str) -> Optional[WorkflowTemplateDef]:
        return self._templates.get(template_key)

    def create_instance(
        self,
        db: Session,
        facility_id: str,
        patient_id: str,
        appointment_id: str,
        created_by: str,
        template_key: str = "wf_patient_arrival_v1",
        actor_type: str = "user"
    ) -> m.WorkflowInstance:
        """
        Creates a durable WorkflowInstance with steps and dependencies.
        Race-safe: on unique constraint violation (appointment_id + template_key), returns existing.
        """
        template = self.get_template(template_key)
        if not template:
            raise ValueError(f"Unknown workflow template: {template_key}")

        # Check existing first
        existing = db.scalar(
            select(m.WorkflowInstance).where(
                m.WorkflowInstance.appointment_id == appointment_id,
                m.WorkflowInstance.template_key == template_key
            )
        )
        if existing:
            return existing

        instance = m.WorkflowInstance(
            facility_id=facility_id,
            patient_id=patient_id,
            appointment_id=appointment_id,
            template_key=template_key,
            template_version=template.template_version,
            status='active',
            created_by=created_by
        )
        try:
            with db.begin_nested():
                db.add(instance)
                db.flush()
        except IntegrityError:
            existing = db.scalar(
                select(m.WorkflowInstance).where(
                    m.WorkflowInstance.appointment_id == appointment_id,
                    m.WorkflowInstance.template_key == template_key
                )
            )
            if existing:
                return existing
            raise

        # Create steps
        step_map: Dict[str, m.WorkflowStep] = {}
        for st in template.steps:
            due_at = m.now() + timedelta(minutes=st.due_offset_minutes) if st.due_offset_minutes else None
            step_record = m.WorkflowStep(
                instance_id=instance.id,
                step_key=st.step_key,
                step_type=st.step_type,
                assignee_role=st.assignee_role,
                assigned_user_id=None,
                status='pending',
                required=st.required,
                due_at=due_at
            )
            db.add(step_record)
            step_map[st.step_key] = step_record

        db.flush()

        # Create step dependencies
        for st in template.steps:
            if st.depends_on:
                child_record = step_map[st.step_key]
                for parent_key in st.depends_on:
                    parent_record = step_map.get(parent_key)
                    if parent_record:
                        dep = m.StepDependency(
                            step_id=child_record.id,
                            depends_on_step_id=parent_record.id
                        )
                        db.add(dep)

        db.flush()

        # Log creation in workflow_events (append-only)
        db.add(m.WorkflowEvent(
            instance_id=instance.id,
            step_id=None,
            event_type="created",
            actor_id=created_by,
            actor_type=actor_type,
            timestamp=m.now()
        ))

        # Log creation in audit_events
        audit_action = "workflow_patient_arrival" if template_key == "wf_patient_arrival_v1" else "workflow_instance_created"
        db.add(m.AuditEvent(
            facility_id=facility_id,
            actor_id=created_by,
            action=audit_action,
            entity_type="appointments" if appointment_id else "workflow_instances",
            entity_id=appointment_id or instance.id,
            detail=f"Template: {template_key}; InstanceId: {instance.id}; ApptId: {appointment_id or ''}"
        ))
        db.flush()

        # Advance workflow to activate initial ready steps
        self.advance(db, instance.id, actor_id=created_by)
        return instance

    def advance(
        self,
        db: Session,
        instance_id: str,
        actor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Idempotently advances a workflow instance:
        1. Finds pending steps whose dependencies are all completed or skipped.
        2. Activates them: assigns staff member, creates durable Task row, sends notification.
        3. Closes instance when all required steps are completed or skipped.
        """
        instance = db.get(m.WorkflowInstance, instance_id)
        if not instance:
            return {"status": "error", "message": "Instance not found"}

        if instance.status != 'active':
            return {
                "status": instance.status,
                "instance_id": instance.id,
                "tasks_created": 0,
                "message": f"Instance is in {instance.status} status"
            }

        steps = db.scalars(
            select(m.WorkflowStep).where(m.WorkflowStep.instance_id == instance_id)
        ).all()
        step_by_id = {s.id: s for s in steps}

        # Query all dependencies for this instance
        step_ids = [s.id for s in steps]
        deps = db.scalars(
            select(m.StepDependency).where(m.StepDependency.step_id.in_(step_ids))
        ).all() if step_ids else []

        dep_map: Dict[str, List[str]] = {}
        for d in deps:
            dep_map.setdefault(d.step_id, []).append(d.depends_on_step_id)

        activated_steps = []
        patient = db.get(m.Patient, instance.patient_id)
        appt = db.get(m.Appointment, instance.appointment_id)
        patient_name = f"{patient.first_name} {patient.last_name}".strip() if patient else "Patient"
        token_info = f" (Token #{appt.token_number})" if appt and appt.token_number else ""

        for step in steps:
            # Skip steps that are already completed, skipped, or cancelled
            if step.status in ('completed', 'skipped', 'cancelled'):
                continue

            # Check if all parent dependencies are completed or skipped
            parent_ids = dep_map.get(step.id, [])
            deps_satisfied = True
            for pid in parent_ids:
                parent_step = step_by_id.get(pid)
                if not parent_step or parent_step.status not in ('completed', 'skipped'):
                    deps_satisfied = False
                    break

            # If dependencies are satisfied and step has not yet been activated (no task_id):
            if deps_satisfied and step.task_id is None:
                assignee = self._resolve_assignee(
                    db=db,
                    facility_id=instance.facility_id,
                    role=step.assignee_role,
                    appointment_id=instance.appointment_id,
                    actor_id=actor_id or instance.created_by
                )
                assignee_id = assignee.id if assignee else (actor_id or instance.created_by)
                step.assigned_user_id = assignee_id

                step_tmpl = ARRIVAL_STEPS_BY_KEY.get(step.step_key)
                title = f"{step_tmpl.title if step_tmpl else step.step_key}{token_info}"
                desc = step_tmpl.description if step_tmpl else ""
                body = (
                    f"{desc}\n"
                    f"Patient: {patient_name} (MRN: {patient.mrn if patient else ''})\n"
                    f"Appointment: {appt.visit_type if appt else 'Visit'}\n"
                    f"Workflow: {instance.template_key}"
                ).strip()
                priority = step_tmpl.priority if step_tmpl else "normal"

                # Create task via audited path
                task = create_administrative_task(
                    db=db,
                    facility_id=instance.facility_id,
                    author_id=actor_id or instance.created_by,
                    patient_id=instance.patient_id,
                    assignee_id=assignee_id,
                    title=title,
                    body=body,
                    priority=priority,
                    due_date=date.today(),
                    kind="workflow_step"
                )
                step.task_id = task.id
                activated_steps.append(step.id)

                # Record event in workflow_events
                db.add(m.WorkflowEvent(
                    instance_id=instance.id,
                    step_id=step.id,
                    event_type="activated",
                    actor_id=actor_id or instance.created_by,
                    actor_type="automation",
                    timestamp=m.now()
                ))

        # Check if all required steps are completed or skipped
        required_steps = [s for s in steps if s.required]
        all_required_done = all(s.status in ('completed', 'skipped') for s in required_steps) if required_steps else False

        if all_required_done:
            instance.status = "completed"
            db.add(m.WorkflowEvent(
                instance_id=instance.id,
                step_id=None,
                event_type="completed",
                actor_id=actor_id or instance.created_by,
                actor_type="automation",
                timestamp=m.now()
            ))
            db.add(m.AuditEvent(
                facility_id=instance.facility_id,
                actor_id=actor_id or instance.created_by,
                action="workflow_instance_completed",
                entity_type="workflow_instances",
                entity_id=instance.id,
                detail=f"Template: {instance.template_key}; ApptId: {instance.appointment_id}"
            ))

        db.flush()
        return {
            "status": "success",
            "instance_id": instance.id,
            "instance_status": instance.status,
            "activated_steps": activated_steps,
            "tasks_created": len(activated_steps)
        }

    def transition_step(
        self,
        db: Session,
        step_id: str,
        target_status: str,
        actor_id: str,
        actor_role: str,
        facility_id: str
    ) -> Dict[str, Any]:
        """
        Executes a step state transition according to the transition state machine.
        Validates active user, facility isolation, and role authorization.
        Mirrors status to the underlying task.
        Triggers advance() to unblock any downstream dependent steps.
        """
        step = db.get(m.WorkflowStep, step_id)
        if not step:
            raise HTTPException(status_code=404, detail="Workflow step not found")

        instance = db.get(m.WorkflowInstance, step.instance_id)
        if not instance or instance.facility_id != facility_id:
            raise HTTPException(status_code=404, detail="Step not available in this facility")

        # Role authorization check: actor must have step.assignee_role, be assigned, or be admin
        if actor_role != 'admin' and actor_role != step.assignee_role and step.assigned_user_id != actor_id:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{actor_role}' is not authorized to act on step requiring '{step.assignee_role}'"
            )

        current_status = step.status

        # 1. Terminal status check
        if current_status in ('skipped', 'cancelled'):
            raise HTTPException(
                status_code=409,
                detail=f"Cannot transition step from terminal status '{current_status}'"
            )

        # 2. State machine transition check
        valid_targets = VALID_STEP_TRANSITIONS.get(current_status, set())
        if target_status not in valid_targets:
            if current_status == 'completed':
                raise HTTPException(
                    status_code=409,
                    detail=f"Cannot transition step from terminal status '{current_status}'"
                )
            raise HTTPException(
                status_code=409,
                detail=f"Invalid transition from '{current_status}' to '{target_status}'"
            )

        # Reopen workflow instance if a completed step is reopened
        if current_status == 'completed' and target_status in ('in_progress', 'pending'):
            if instance.status == 'completed':
                instance.status = 'active'

        # 3. Role restrictions for cancellation
        if target_status == 'cancelled' and actor_role not in ('admin', 'doctor'):
            raise HTTPException(
                status_code=403,
                detail="Only doctors or administrators may cancel workflow steps"
            )

        # 4. Restriction for skipping: only optional steps can be skipped
        if target_status == 'skipped' and step.required:
            raise HTTPException(
                status_code=409,
                detail="Cannot skip a required workflow step"
            )

        # Update step status
        step.status = target_status

        # Mirror step status to underlying Task row
        if step.task_id:
            task = db.get(m.Task, step.task_id)
            if task:
                if target_status == 'completed':
                    task.status = 'completed'
                elif target_status in ('pending', 'acknowledged', 'in_progress', 'blocked'):
                    task.status = 'pending'

        # Record in workflow_events (append-only)
        db.add(m.WorkflowEvent(
            instance_id=instance.id,
            step_id=step.id,
            event_type=target_status,
            actor_id=actor_id,
            actor_type="user",
            timestamp=m.now()
        ))

        # Record in audit_events (NO clinical free text)
        db.add(m.AuditEvent(
            facility_id=facility_id,
            actor_id=actor_id,
            action=f"workflow_step_{target_status}",
            entity_type="workflow_steps",
            entity_id=step.id,
            detail=f"Step: {step.step_key}; Status: {step.status}; TaskId: {step.task_id or ''}"
        ))

        # Advance workflow instance to activate newly unblocked dependencies
        advance_result = self.advance(db, instance.id, actor_id=actor_id)

        db.flush()
        return {
            "status": "success",
            "step_id": step.id,
            "step_key": step.step_key,
            "previous_status": current_status,
            "new_status": step.status,
            "instance_id": instance.id,
            "instance_status": advance_result.get("instance_status", instance.status),
            "newly_activated_steps": advance_result.get("activated_steps", [])
        }

    def trigger_patient_arrival(
        self,
        db: Session,
        facility_id: str,
        appointment_id: str,
        actor_id: str
    ) -> Dict[str, Any]:
        """
        Backwards-compatible API for scheduling status transitions and worker jobs.
        Creates a durable WorkflowInstance (race-safe) and advances it.
        """
        appt = db.get(m.Appointment, appointment_id)
        if not appt:
            return {"status": "error", "message": "Appointment not found"}

        if appt.facility_id != facility_id:
            return {"status": "error", "message": "Facility mismatch"}

        # Check existing instance
        existing_instance = db.scalar(
            select(m.WorkflowInstance).where(
                m.WorkflowInstance.appointment_id == appointment_id,
                m.WorkflowInstance.template_key == "wf_patient_arrival_v1"
            )
        )
        if existing_instance:
            return {
                "status": "already_executed",
                "message": "Patient arrival workflow already completed or active for this appointment",
                "workflow_id": existing_instance.id,
                "appointment_id": appointment_id,
                "tasks_created": 0
            }

        instance = self.create_instance(
            db=db,
            facility_id=facility_id,
            patient_id=appt.patient_id,
            appointment_id=appt.id,
            created_by=actor_id,
            template_key="wf_patient_arrival_v1"
        )

        steps = db.scalars(
            select(m.WorkflowStep).where(m.WorkflowStep.instance_id == instance.id)
        ).all()
        created_tasks = [s.task_id for s in steps if s.task_id]

        return {
            "status": "success",
            "workflow_id": instance.id,
            "appointment_id": appointment_id,
            "tasks_created": len(created_tasks),
            "task_ids": created_tasks
        }

    def _resolve_assignee(
        self,
        db: Session,
        facility_id: str,
        role: str,
        appointment_id: str,
        actor_id: str
    ) -> Optional[m.User]:
        """Resolves target staff member for the given role in the facility."""
        if role == "doctor":
            appt = db.get(m.Appointment, appointment_id)
            if appt and appt.provider_id:
                provider = db.get(m.User, appt.provider_id)
                if provider and provider.active:
                    return provider
            return self._find_active_facility_user_by_role(db, facility_id, "doctor")

        if role == "assistant":
            asst = self._find_active_facility_user_by_role(db, facility_id, "assistant")
            return asst or self._find_active_facility_user_by_role(db, facility_id, "doctor")

        if role == "reception":
            rec = self._find_active_facility_user_by_role(db, facility_id, "reception")
            return rec or self._find_active_facility_user_by_role(db, facility_id, "assistant") or db.get(m.User, actor_id)

        user = self._find_active_facility_user_by_role(db, facility_id, role)
        return user or db.get(m.User, actor_id)

    def _find_active_facility_user_by_role(
        self,
        db: Session,
        facility_id: str,
        role: str
    ) -> Optional[m.User]:
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
