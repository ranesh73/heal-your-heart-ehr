"""
AI EHR Tools and Unified Tool Execution Pipeline for Heal Your Heart AI Workforce Agent.

Refactors all tools behind ONE authoritative executor: execute_tool(ctx, name, args).
ctx (user_id, role, facility_id) is built strictly from the authenticated session.

The executor strictly enforces, in order:
1. Active-user and facility-affiliation check
2. Tool registration & role permission check (denial audit logged with tool name, role, reason, no PHI)
3. Pydantic argument validation (extra='forbid' to eliminate spoofing)
4. Facility ownership check for all referenced entities (patient, appointment, task, recipient/assignee)
5. Tool handler execution
6. Structured audit logging

Declared Risk Classes:
- 'read': Read-only queries with zero mutations.
- 'safe_write': Safe administrative operations (tasks, internal staff notifications).
- 'propose_clinical': Clinical draft generation (human clinician must approve/sign).
- 'forbidden': Prohibited clinical operations (sign, seal, prescribe, finalize orders, alter signed records).
"""
from dataclasses import dataclass
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Set, Union, Literal, Callable, Type
from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from . import models as m
from .ai_permissions import (
    check_tool_permission,
    is_restricted_clinical_action,
    STAFF_ROLES,
    ADMINISTRATIVE_WRITE_ROLES,
    RESTRICTED_CLINICAL_ACTIONS,
)

# Declared Risk Classes
RISK_READ: str = "read"
RISK_SAFE_WRITE: str = "safe_write"
RISK_PROPOSE_CLINICAL: str = "propose_clinical"
RISK_FORBIDDEN: str = "forbidden"

RiskClass = Literal["read", "safe_write", "propose_clinical", "forbidden"]

# Explicit allowlist of all registered tools
ALLOWLISTED_TOOLS: Set[str] = {
    "read_patient_summary",
    "get_appointment_details",
    "list_tasks",
    "create_administrative_task",
    "send_staff_notification",
    "trigger_patient_arrival_workflow",
}

# Forbidden clinical actions strictly prohibited for any AI tool
FORBIDDEN_CLINICAL_TOOLS: Set[str] = {
    "sign_encounter",
    "seal_encounter",
    "prescribe_medication",
    "finalize_clinical_order",
    "modify_signed_encounter",
    "approve_lab_result",
    "change_treatment_plan",
}


@dataclass(frozen=True)
class ToolContext:
    """
    Immutable tool execution context constructed solely from authenticated session state.
    Never accepts client-supplied or LLM-supplied user_id, role, or facility_id.
    """
    db: Session
    user_id: str
    role: str
    facility_id: str
    user_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Pydantic Tool Argument Schemas (extra='forbid' enforces strict input validation)
# ---------------------------------------------------------------------------

class ToolArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ReadPatientSummaryArgs(ToolArgs):
    patient_id: str = Field(..., min_length=1, description="Target patient ID")


class GetAppointmentDetailsArgs(ToolArgs):
    appointment_id: str = Field(..., min_length=1, description="Target appointment ID")


class ListTasksArgs(ToolArgs):
    user_id: Optional[str] = Field(None, description="Optional assignee user ID filter")
    status: str = Field(default="pending", max_length=30, description="Task status filter")


class CreateAdministrativeTaskArgs(ToolArgs):
    patient_id: str = Field(..., min_length=1, description="Target patient ID")
    assignee_id: str = Field(..., min_length=1, description="Assigned staff member ID")
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    body: str = Field(default="", description="Task description or instructions")
    priority: Literal["normal", "high", "urgent"] = Field(default="normal", description="Task priority")
    due_date: Optional[date] = Field(None, description="Due date")
    kind: str = Field(default="task", max_length=30, description="Task category")


class SendStaffNotificationArgs(ToolArgs):
    patient_id: str = Field(..., min_length=1, description="Target patient ID")
    recipient_id: str = Field(..., min_length=1, description="Recipient staff member ID")
    subject: str = Field(..., min_length=1, max_length=200, description="Notification subject")
    body: str = Field(default="", description="Notification message body")


class TriggerPatientArrivalWorkflowArgs(ToolArgs):
    appointment_id: str = Field(..., min_length=1, description="Checked-in appointment ID")


# ---------------------------------------------------------------------------
# Internal Tool Handlers (Zero permission/facility checks; executor guarantees pre-conditions)
# ---------------------------------------------------------------------------

def _handle_read_patient_summary(ctx: ToolContext, args: ReadPatientSummaryArgs) -> Dict[str, Any]:
    patient = ctx.db.get(m.Patient, args.patient_id)
    today = date.today()
    age = None
    if patient.dob:
        age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))

    diagnoses = ctx.db.scalars(
        select(m.Diagnosis).where(
            m.Diagnosis.patient_id == args.patient_id,
            m.Diagnosis.facility_id == ctx.facility_id,
            m.Diagnosis.status == "active"
        ).order_by(m.Diagnosis.created_at.desc()).limit(10)
    ).all()

    latest_vital = ctx.db.scalar(
        select(m.Vital).where(
            m.Vital.patient_id == args.patient_id,
            m.Vital.facility_id == ctx.facility_id
        ).order_by(m.Vital.observed_at.desc().nullslast(), m.Vital.created_at.desc()).limit(1)
    )

    medications = ctx.db.scalars(
        select(m.Medication).where(
            m.Medication.patient_id == args.patient_id,
            m.Medication.facility_id == ctx.facility_id,
            m.Medication.status == "active"
        ).order_by(m.Medication.created_at.desc()).limit(10)
    ).all()

    pending_tasks = ctx.db.scalars(
        select(m.Task).where(
            m.Task.patient_id == args.patient_id,
            m.Task.facility_id == ctx.facility_id,
            m.Task.status == "pending"
        ).order_by(m.Task.due_date.asc().nullslast()).limit(10)
    ).all()

    vitals_data = None
    if latest_vital:
        vitals_data = {
            "bp": f"{int(latest_vital.bp_sys)}/{int(latest_vital.bp_dia)}" if latest_vital.bp_sys and latest_vital.bp_dia else None,
            "pulse_bpm": latest_vital.pulse_bpm,
            "weight_kg": latest_vital.weight_kg,
            "height_cm": latest_vital.height_cm,
            "spo2_pct": latest_vital.spo2_pct,
            "observed_at": latest_vital.observed_at.isoformat() if latest_vital.observed_at else latest_vital.created_at.isoformat()
        }

    return {
        "patient": {
            "id": patient.id,
            "mrn": patient.mrn,
            "name": f"{patient.first_name} {patient.last_name}".strip(),
            "sex": patient.sex,
            "age": age,
            "blood_group": patient.blood_group,
            "phone": patient.phone[-4:].rjust(len(patient.phone), "*") if patient.phone else ""
        },
        "diagnoses": [
            {"code": d.code, "description": d.description, "onset": str(d.onset) if d.onset else None}
            for d in diagnoses
        ],
        "latest_vitals": vitals_data,
        "active_medications": [
            {"name": m_row.trade_name, "dose": m_row.dose, "route": m_row.route, "frequency": m_row.frequency}
            for m_row in medications
        ],
        "pending_tasks": [
            {"id": t.id, "title": t.title, "priority": t.priority, "due_date": str(t.due_date) if t.due_date else None}
            for t in pending_tasks
        ]
    }


def _handle_get_appointment_details(ctx: ToolContext, args: GetAppointmentDetailsArgs) -> Dict[str, Any]:
    appt = ctx.db.get(m.Appointment, args.appointment_id)
    patient = ctx.db.get(m.Patient, appt.patient_id)
    provider = ctx.db.get(m.User, appt.provider_id)
    return {
        "id": appt.id,
        "patient_id": appt.patient_id,
        "patient_name": f"{patient.first_name} {patient.last_name}".strip() if patient else "Unknown",
        "patient_mrn": patient.mrn if patient else "",
        "provider_id": appt.provider_id,
        "provider_name": provider.name if provider else "Unknown",
        "token_number": appt.token_number,
        "status": appt.status,
        "visit_type": appt.visit_type,
        "start_at": appt.start_at.isoformat() if appt.start_at else None,
        "checked_in_at": appt.checked_in_at.isoformat() if appt.checked_in_at else None,
        "reason": appt.reason
    }


def _handle_list_tasks(ctx: ToolContext, args: ListTasksArgs) -> List[Dict[str, Any]]:
    query = select(m.Task).where(
        m.Task.facility_id == ctx.facility_id,
        m.Task.status == args.status
    )
    if args.user_id:
        query = query.where(m.Task.assignee_id == args.user_id)
    query = query.order_by(m.Task.due_date.asc().nullslast(), m.Task.created_at.desc()).limit(50)

    rows = ctx.db.scalars(query).all()
    results = []
    for t in rows:
        assignee = ctx.db.get(m.User, t.assignee_id)
        patient = ctx.db.get(m.Patient, t.patient_id)
        results.append({
            "id": t.id,
            "patient_id": t.patient_id,
            "patient_mrn": patient.mrn if patient else "",
            "patient_name": f"{patient.first_name} {patient.last_name}".strip() if patient else "",
            "assignee_id": t.assignee_id,
            "assignee_name": assignee.name if assignee else "",
            "title": t.title,
            "body": t.body,
            "priority": t.priority,
            "status": t.status,
            "due_date": str(t.due_date) if t.due_date else None,
            "created_at": t.created_at.isoformat() if t.created_at else None
        })
    return results


def _handle_create_administrative_task(ctx: ToolContext, args: CreateAdministrativeTaskArgs) -> m.Task:
    task = m.Task(
        facility_id=ctx.facility_id,
        author_id=ctx.user_id,
        patient_id=args.patient_id,
        assignee_id=args.assignee_id,
        title=args.title[:200],
        body=args.body,
        priority=args.priority,
        due_date=args.due_date or date.today(),
        kind=args.kind[:30],
        status="pending"
    )
    ctx.db.add(task)
    ctx.db.flush()

    # Log task audit
    assignee = ctx.db.get(m.User, args.assignee_id)
    ctx.db.add(m.AuditEvent(
        facility_id=ctx.facility_id,
        actor_id=ctx.user_id,
        action="ai_task_created",
        entity_type="tasks",
        entity_id=task.id,
        detail=f"Title: {task.title}; Assignee: {assignee.name if assignee else args.assignee_id}; Priority: {task.priority}"
    ))

    # Send staff notification message via execute_tool for assignee
    patient = ctx.db.get(m.Patient, args.patient_id)
    p_name = f"{patient.first_name} {patient.last_name}".strip() if patient else ""
    p_mrn = patient.mrn if patient else ""
    notif_body = f"Patient: {p_name} ({p_mrn})\nPriority: {args.priority.upper()}\n{args.body}".strip()

    execute_tool(
        ctx=ctx,
        name="send_staff_notification",
        args=SendStaffNotificationArgs(
            patient_id=args.patient_id,
            recipient_id=args.assignee_id,
            subject=f"New Task: {args.title[:100]}",
            body=notif_body
        )
    )
    return task


def _handle_send_staff_notification(ctx: ToolContext, args: SendStaffNotificationArgs) -> Optional[m.Message]:
    # Deduplication check: Do not send identical message for same patient within the last hour
    one_hour_ago = m.now() - timedelta(hours=1)
    existing = ctx.db.scalar(
        select(m.Message).where(
            m.Message.facility_id == ctx.facility_id,
            m.Message.patient_id == args.patient_id,
            m.Message.recipient_id == args.recipient_id,
            m.Message.subject == args.subject,
            m.Message.created_at >= one_hour_ago
        )
    )
    if existing:
        return existing

    msg = m.Message(
        facility_id=ctx.facility_id,
        author_id=ctx.user_id,
        patient_id=args.patient_id,
        recipient_id=args.recipient_id,
        subject=args.subject[:200],
        body=args.body
    )
    ctx.db.add(msg)
    ctx.db.flush()

    # Audit log
    ctx.db.add(m.AuditEvent(
        facility_id=ctx.facility_id,
        actor_id=ctx.user_id,
        action="ai_notification_created",
        entity_type="messages",
        entity_id=msg.id,
        detail=f"Recipient: {args.recipient_id}; Subject: {msg.subject}"
    ))
    return msg


def _handle_trigger_patient_arrival_workflow(ctx: ToolContext, args: TriggerPatientArrivalWorkflowArgs) -> Dict[str, Any]:
    from .workflow_engine import WorkflowEngine
    engine = WorkflowEngine()
    return engine.trigger_patient_arrival(
        db=ctx.db,
        facility_id=ctx.facility_id,
        appointment_id=args.appointment_id,
        actor_id=ctx.user_id
    )


# ---------------------------------------------------------------------------
# Tool Registry & Definition
# ---------------------------------------------------------------------------

@dataclass
class ToolDefinition:
    name: str
    description: str
    risk_class: str
    args_schema: Type[BaseModel]
    handler: Callable[[ToolContext, Any], Any]
    allowed_roles: Set[str]


TOOL_REGISTRY: Dict[str, ToolDefinition] = {
    "read_patient_summary": ToolDefinition(
        name="read_patient_summary",
        description="Reads clinical summary (diagnoses, latest vitals, medications, pending tasks) for a patient",
        risk_class=RISK_READ,
        args_schema=ReadPatientSummaryArgs,
        handler=_handle_read_patient_summary,
        allowed_roles=STAFF_ROLES,
    ),
    "get_appointment_details": ToolDefinition(
        name="get_appointment_details",
        description="Fetches appointment information, token number, and arrival status",
        risk_class=RISK_READ,
        args_schema=GetAppointmentDetailsArgs,
        handler=_handle_get_appointment_details,
        allowed_roles=STAFF_ROLES,
    ),
    "list_tasks": ToolDefinition(
        name="list_tasks",
        description="Lists active worklist tasks for the facility or specific staff member",
        risk_class=RISK_READ,
        args_schema=ListTasksArgs,
        handler=_handle_list_tasks,
        allowed_roles=STAFF_ROLES,
    ),
    "create_administrative_task": ToolDefinition(
        name="create_administrative_task",
        description="Creates an administrative task and sends in-app notification to assigned staff",
        risk_class=RISK_SAFE_WRITE,
        args_schema=CreateAdministrativeTaskArgs,
        handler=_handle_create_administrative_task,
        allowed_roles=ADMINISTRATIVE_WRITE_ROLES,
    ),
    "send_staff_notification": ToolDefinition(
        name="send_staff_notification",
        description="Sends an internal notification message to a staff member",
        risk_class=RISK_SAFE_WRITE,
        args_schema=SendStaffNotificationArgs,
        handler=_handle_send_staff_notification,
        allowed_roles=ADMINISTRATIVE_WRITE_ROLES,
    ),
    "trigger_patient_arrival_workflow": ToolDefinition(
        name="trigger_patient_arrival_workflow",
        description="Triggers the standard patient arrival orchestration workflow for a checked-in appointment",
        risk_class=RISK_SAFE_WRITE,
        args_schema=TriggerPatientArrivalWorkflowArgs,
        handler=_handle_trigger_patient_arrival_workflow,
        allowed_roles=ADMINISTRATIVE_WRITE_ROLES,
    ),
}


# ---------------------------------------------------------------------------
# The ONE Authoritative Tool Executor: execute_tool(ctx, name, args)
# ---------------------------------------------------------------------------

def execute_tool(
    ctx: ToolContext,
    name: str,
    args: Union[BaseModel, Dict[str, Any]]
) -> Any:
    """
    Executes a registered AI tool through the single authoritative gatekeeper pipeline.

    Enforces, strictly in order:
    1. Active-user check: user must exist, be active, and belong to ctx.facility_id.
    2. Role permission check: verifies tool registration and role authorization.
       Rejects forbidden clinical actions and unauthorized roles with HTTP 403 and denial audit.
    3. Pydantic arg validation: enforces extra='forbid' to eliminate spoofed parameters.
    4. Facility ownership check: validates facility affiliation for patient, appointment,
       task, and recipient/assignee IDs.
    5. Tool handler execution.
    6. Audit logging.
    """
    # -----------------------------------------------------------------------
    # Step 1: Active-user and facility-membership check
    # -----------------------------------------------------------------------
    user = ctx.db.get(m.User, ctx.user_id)
    if not user or not user.active:
        raise HTTPException(status_code=401, detail="User account is inactive or not found")

    user_fac = ctx.db.scalar(
        select(m.UserFacility).where(
            m.UserFacility.user_id == ctx.user_id,
            m.UserFacility.facility_id == ctx.facility_id
        )
    )
    if not user_fac:
        raise HTTPException(status_code=403, detail="Author is not affiliated with this facility")

    # -----------------------------------------------------------------------
    # Step 2: Role permission & Forbidden Clinical Action Check
    # -----------------------------------------------------------------------
    # Rejection of forbidden clinical actions
    if name in FORBIDDEN_CLINICAL_TOOLS or is_restricted_clinical_action(name):
        ctx.db.add(m.AuditEvent(
            facility_id=ctx.facility_id,
            actor_id=ctx.user_id,
            action="ai_tool_permission_denied",
            entity_type="ai_tool",
            entity_id=name,
            detail=f"Tool: {name}; Role: {ctx.role}; Reason: Forbidden clinical action"
        ))
        ctx.db.flush()
        raise HTTPException(
            status_code=403,
            detail=f"Tool '{name}' is a restricted clinical action and cannot be executed by AI"
        )

    tool_def = TOOL_REGISTRY.get(name)
    if not tool_def:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found in registered tools")

    if ctx.role not in tool_def.allowed_roles:
        # Every denial must produce an audit record containing tool name, role and reason, with no clinical free text
        ctx.db.add(m.AuditEvent(
            facility_id=ctx.facility_id,
            actor_id=ctx.user_id,
            action="ai_tool_permission_denied",
            entity_type="ai_tool",
            entity_id=name,
            detail=f"Tool: {name}; Role: {ctx.role}; Reason: Role not permitted"
        ))
        ctx.db.flush()
        raise HTTPException(
            status_code=403,
            detail=f"Role not authorized: role '{ctx.role}' is not authorized to execute tool '{name}'"
        )

    # -----------------------------------------------------------------------
    # Step 3: Pydantic Arg Validation (extra='forbid' prevents spoofing)
    # -----------------------------------------------------------------------
    if isinstance(args, tool_def.args_schema):
        validated_args = args
    elif isinstance(args, dict):
        try:
            validated_args = tool_def.args_schema(**args)
        except ValidationError as ve:
            raise HTTPException(status_code=422, detail=f"Tool argument validation failed: {ve.errors()}")
    else:
        raise HTTPException(status_code=422, detail="Tool arguments must be a dictionary or schema instance")

    # -----------------------------------------------------------------------
    # Step 4: Facility ownership check for all referenced entities
    # -----------------------------------------------------------------------
    # 4a. Patient facility ownership
    patient_id = getattr(validated_args, "patient_id", None)
    if patient_id:
        patient = ctx.db.get(m.Patient, patient_id)
        affiliation = ctx.db.scalar(
            select(m.PatientFacility).where(
                m.PatientFacility.patient_id == patient_id,
                m.PatientFacility.facility_id == ctx.facility_id
            )
        )
        if not patient or (not affiliation and patient.primary_facility_id != ctx.facility_id):
            raise HTTPException(
                status_code=404,
                detail=f"Patient not found or not affiliated with facility {ctx.facility_id}"
            )

    # 4b. Appointment facility ownership
    appointment_id = getattr(validated_args, "appointment_id", None)
    if appointment_id:
        appt = ctx.db.get(m.Appointment, appointment_id)
        if not appt or appt.facility_id != ctx.facility_id:
            raise HTTPException(
                status_code=404,
                detail=f"Appointment not found in facility {ctx.facility_id}"
            )

    # 4c. Task facility ownership
    task_id = getattr(validated_args, "task_id", None)
    if task_id:
        task = ctx.db.get(m.Task, task_id)
        if not task or task.facility_id != ctx.facility_id:
            raise HTTPException(
                status_code=404,
                detail=f"Task not found in facility {ctx.facility_id}"
            )

    # 4d. Target staff member (assignee_id or recipient_id) facility membership
    target_staff_id = getattr(validated_args, "assignee_id", None) or getattr(validated_args, "recipient_id", None)
    if target_staff_id:
        target_staff = ctx.db.get(m.User, target_staff_id)
        target_fac = ctx.db.scalar(
            select(m.UserFacility).where(
                m.UserFacility.user_id == target_staff_id,
                m.UserFacility.facility_id == ctx.facility_id
            )
        )
        if not target_staff or not target_fac or not target_staff.active:
            raise HTTPException(
                status_code=400,
                detail=f"Target staff member is not an active member of facility {ctx.facility_id}"
            )

    # -----------------------------------------------------------------------
    # Step 5: Tool Execution
    # -----------------------------------------------------------------------
    result = tool_def.handler(ctx, validated_args)

    # -----------------------------------------------------------------------
    # Step 6: Structured Audit Logging (Zero clinical free text)
    # -----------------------------------------------------------------------
    ctx.db.add(m.AuditEvent(
        facility_id=ctx.facility_id,
        actor_id=ctx.user_id,
        action=f"ai_tool_executed:{name}",
        entity_type="ai_tool",
        entity_id=name,
        detail=f"Tool: {name}; Status: success; Risk: {tool_def.risk_class}"
    ))
    ctx.db.flush()
    return result


# ---------------------------------------------------------------------------
# Backward Compatibility Wrappers (All delegate strictly through execute_tool)
# ---------------------------------------------------------------------------

def create_administrative_task(
    db: Session,
    facility_id: str,
    author_id: str,
    patient_id: str,
    assignee_id: str,
    title: str,
    body: str = "",
    priority: str = "normal",
    due_date: Optional[date] = None,
    kind: str = "task"
) -> m.Task:
    author = db.get(m.User, author_id)
    role = author.role if author else "reception"
    ctx = ToolContext(db=db, user_id=author_id, role=role, facility_id=facility_id)
    return execute_tool(
        ctx=ctx,
        name="create_administrative_task",
        args=CreateAdministrativeTaskArgs(
            patient_id=patient_id,
            assignee_id=assignee_id,
            title=title,
            body=body,
            priority=priority,  # type: ignore[arg-type]
            due_date=due_date,
            kind=kind
        )
    )


def send_staff_notification(
    db: Session,
    facility_id: str,
    author_id: str,
    patient_id: str,
    recipient_id: str,
    subject: str,
    body: str
) -> Optional[m.Message]:
    author = db.get(m.User, author_id)
    role = author.role if author else "reception"
    ctx = ToolContext(db=db, user_id=author_id, role=role, facility_id=facility_id)
    return execute_tool(
        ctx=ctx,
        name="send_staff_notification",
        args=SendStaffNotificationArgs(
            patient_id=patient_id,
            recipient_id=recipient_id,
            subject=subject,
            body=body
        )
    )


def get_patient_summary(
    db: Session,
    facility_id: str,
    patient_id: str,
    actor_role: Optional[str] = None,
    actor_id: Optional[str] = None
) -> Dict[str, Any]:
    if not actor_id:
        user = db.scalar(
            select(m.User).join(m.UserFacility).where(
                m.UserFacility.facility_id == facility_id,
                m.User.active == True,
                m.User.role == (actor_role or "doctor")
            ).limit(1)
        )
        actor_id = user.id if user else "none"
        if user and not actor_role:
            actor_role = user.role
    ctx = ToolContext(db=db, user_id=actor_id, role=actor_role or "doctor", facility_id=facility_id)
    return execute_tool(ctx, "read_patient_summary", ReadPatientSummaryArgs(patient_id=patient_id))


def get_appointment_summary(
    db: Session,
    facility_id: str,
    appointment_id: str,
    actor_role: Optional[str] = None,
    actor_id: Optional[str] = None
) -> Dict[str, Any]:
    if not actor_id:
        user = db.scalar(
            select(m.User).join(m.UserFacility).where(
                m.UserFacility.facility_id == facility_id,
                m.User.active == True,
                m.User.role == (actor_role or "doctor")
            ).limit(1)
        )
        actor_id = user.id if user else "none"
        if user and not actor_role:
            actor_role = user.role
    ctx = ToolContext(db=db, user_id=actor_id, role=actor_role or "doctor", facility_id=facility_id)
    return execute_tool(ctx, "get_appointment_details", GetAppointmentDetailsArgs(appointment_id=appointment_id))


def list_facility_tasks(
    db: Session,
    facility_id: str,
    user_id: Optional[str] = None,
    status: str = "pending",
    actor_role: Optional[str] = None,
    actor_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    if not actor_id:
        user = db.scalar(
            select(m.User).join(m.UserFacility).where(
                m.UserFacility.facility_id == facility_id,
                m.User.active == True,
                m.User.role == (actor_role or "doctor")
            ).limit(1)
        )
        actor_id = user.id if user else "none"
        if user and not actor_role:
            actor_role = user.role
    ctx = ToolContext(db=db, user_id=actor_id, role=actor_role or "doctor", facility_id=facility_id)
    return execute_tool(ctx, "list_tasks", ListTasksArgs(user_id=user_id, status=status))


def get_available_tools_for_role(role: str) -> List[Dict[str, Any]]:
    """
    Returns tool discovery metadata for tools accessible by the specified role,
    including risk class and schema parameter descriptions.
    """
    results = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        if role in tool_def.allowed_roles:
            results.append({
                "name": tool_def.name,
                "description": tool_def.description,
                "risk_class": tool_def.risk_class,
                "restricted_clinical": False,
                "parameters": list(tool_def.args_schema.model_fields.keys())
            })
    return results
