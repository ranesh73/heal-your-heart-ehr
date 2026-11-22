"""
FastAPI Router for AI Workforce Agent in Heal Your Heart EHR.

Exposes authenticated, facility-isolated, RBAC-guarded endpoints for AI assistance,
Ollama status monitoring, tool discovery, and workflow orchestration.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from . import models as m
from .security import context, Context
from .ai_permissions import check_ai_access, check_tool_permission
from .ai_service import check_ollama_status, check_ai_status, check_groq_status, execute_agent_query
from .ai_tools import get_available_tools_for_role, ToolContext, execute_tool
from .workflow_engine import WorkflowEngine


router = APIRouter(prefix="/api/ai", tags=["ai"])


class AiChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    message: str = Field(..., min_length=1, max_length=1000, description="User prompt or query")
    patient_id: Optional[str] = Field(None, description="Optional patient ID to scope context")
    appointment_id: Optional[str] = Field(None, description="Optional appointment ID to scope context")


class AiChatResponse(BaseModel):
    response: str
    model: str
    service_available: bool
    mode: str
    context_loaded: bool
    type: Optional[str] = None
    action_id: Optional[str] = None
    tool: Optional[str] = None
    args: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None


@router.get("/status")
def ai_status(c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Returns AI service health, configured model, and current user permission context.
    Requires authenticated staff session.
    """
    check_ai_access(c.user.role, c.user.active)
    status_info = check_ai_status()
    return {
        "status": "ok",
        "service_available": status_info["available"],
        "provider": status_info["provider"],
        "model": status_info["model"],
        "version": status_info["version"],
        "error": status_info["error"],
        "user": {
            "id": c.user.id,
            "name": c.user.name,
            "role": c.user.role,
            "facility_id": c.facility_id
        }
    }


@router.get("/tools")
def ai_tools(c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Lists all EHR tools accessible by the currently authenticated user's role.
    """
    check_ai_access(c.user.role, c.user.active)
    tools = get_available_tools_for_role(c.user.role)
    return {
        "user_role": c.user.role,
        "tools_count": len(tools),
        "tools": tools
    }


@router.post("/chat", response_model=AiChatResponse)
def ai_chat(payload: AiChatRequest, c: Context = Depends(context)) -> AiChatResponse:
    """
    Executes an authorized AI query with facility-scoped clinical/administrative context.
    Enforces healthcare safety guardrails and graceful offline fallback.
    """
    check_ai_access(c.user.role, c.user.active)
    result = execute_agent_query(
        db=c.db,
        facility_id=c.facility_id,
        actor_id=c.user.id,
        actor_role=c.user.role,
        message=payload.message,
        patient_id=payload.patient_id,
        appointment_id=payload.appointment_id
    )
    c.db.commit()
    return AiChatResponse(**result)


@router.post("/workflow/patient-arrival/{appointment_id}")
def trigger_arrival_workflow(appointment_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Explicitly triggers the patient arrival workflow for a checked-in appointment.
    Guarantees idempotency, role authorization, and facility scoping through execute_tool.
    """
    check_ai_access(c.user.role, c.user.active)
    ctx = ToolContext(
        db=c.db,
        user_id=c.user.id,
        role=c.user.role,
        facility_id=c.facility_id,
        user_name=c.user.name
    )
    result = execute_tool(
        ctx=ctx,
        name="trigger_patient_arrival_workflow",
        args={"appointment_id": appointment_id}
    )
    c.db.commit()
    return result


@router.get("/workflow/instances/{instance_id}")
def get_workflow_instance(instance_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Returns full workflow instance state, including all steps and dependency status.
    Facility isolated and authenticated.
    """
    check_ai_access(c.user.role, c.user.active)
    instance = c.db.get(m.WorkflowInstance, instance_id)
    if not instance or instance.facility_id != c.facility_id:
        raise HTTPException(status_code=404, detail="Workflow instance not found in this facility")

    steps = c.db.scalars(
        select(m.WorkflowStep).where(m.WorkflowStep.instance_id == instance_id)
    ).all()
    step_ids = [s.id for s in steps]
    deps = c.db.scalars(
        select(m.StepDependency).where(m.StepDependency.step_id.in_(step_ids))
    ).all() if step_ids else []
    dep_map: Dict[str, List[str]] = {}
    for d in deps:
        dep_map.setdefault(d.step_id, []).append(d.depends_on_step_id)

    return {
        "id": instance.id,
        "facility_id": instance.facility_id,
        "patient_id": instance.patient_id,
        "appointment_id": instance.appointment_id,
        "template_key": instance.template_key,
        "status": instance.status,
        "created_by": instance.created_by,
        "created_at": instance.created_at.isoformat() if instance.created_at else None,
        "steps": [
            {
                "id": s.id,
                "step_key": s.step_key,
                "step_type": s.step_type,
                "assignee_role": s.assignee_role,
                "assigned_user_id": s.assigned_user_id,
                "status": s.status,
                "required": s.required,
                "task_id": s.task_id,
                "due_at": s.due_at.isoformat() if s.due_at else None,
                "depends_on": dep_map.get(s.id, [])
            }
            for s in steps
        ]
    }


@router.get("/workflow/steps/{step_id}")
def get_workflow_step(step_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Returns step state and dependencies. Facility isolated and authenticated.
    """
    check_ai_access(c.user.role, c.user.active)
    step = c.db.get(m.WorkflowStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Workflow step not found")
    instance = c.db.get(m.WorkflowInstance, step.instance_id)
    if not instance or instance.facility_id != c.facility_id:
        raise HTTPException(status_code=404, detail="Workflow step not found in this facility")

    deps = c.db.scalars(
        select(m.StepDependency).where(m.StepDependency.step_id == step.id)
    ).all()

    return {
        "id": step.id,
        "instance_id": step.instance_id,
        "step_key": step.step_key,
        "step_type": step.step_type,
        "assignee_role": step.assignee_role,
        "assigned_user_id": step.assigned_user_id,
        "status": step.status,
        "required": step.required,
        "task_id": step.task_id,
        "due_at": step.due_at.isoformat() if step.due_at else None,
        "depends_on": [d.depends_on_step_id for d in deps]
    }


@router.post("/workflow/steps/{step_id}/acknowledge")
def step_acknowledge(step_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Acknowledges a pending workflow step.
    Enforces RBAC (step assignee role or admin), facility scoping, and state machine validation.
    """
    check_ai_access(c.user.role, c.user.active)
    engine = WorkflowEngine()
    result = engine.transition_step(
        db=c.db,
        step_id=step_id,
        target_status="acknowledged",
        actor_id=c.user.id,
        actor_role=c.user.role,
        facility_id=c.facility_id
    )
    c.db.commit()
    return result


@router.post("/workflow/steps/{step_id}/start")
def step_start(step_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Transitions a workflow step to in_progress.
    """
    check_ai_access(c.user.role, c.user.active)
    engine = WorkflowEngine()
    result = engine.transition_step(
        db=c.db,
        step_id=step_id,
        target_status="in_progress",
        actor_id=c.user.id,
        actor_role=c.user.role,
        facility_id=c.facility_id
    )
    c.db.commit()
    return result


@router.post("/workflow/steps/{step_id}/block")
def step_block(step_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Marks a workflow step as blocked.
    """
    check_ai_access(c.user.role, c.user.active)
    engine = WorkflowEngine()
    result = engine.transition_step(
        db=c.db,
        step_id=step_id,
        target_status="blocked",
        actor_id=c.user.id,
        actor_role=c.user.role,
        facility_id=c.facility_id
    )
    c.db.commit()
    return result


@router.post("/workflow/steps/{step_id}/unblock")
def step_unblock(
    step_id: str,
    target_status: Optional[str] = None,
    c: Context = Depends(context)
) -> Dict[str, Any]:
    """
    Unblocks a step back to in_progress (or requested target state).
    """
    check_ai_access(c.user.role, c.user.active)
    engine = WorkflowEngine()
    result = engine.transition_step(
        db=c.db,
        step_id=step_id,
        target_status=target_status or "in_progress",
        actor_id=c.user.id,
        actor_role=c.user.role,
        facility_id=c.facility_id
    )
    c.db.commit()
    return result


@router.post("/workflow/steps/{step_id}/complete")
def step_complete(step_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Completes a workflow step, mirrors completion to its Task row,
    and advances the workflow instance to activate downstream dependent steps.
    """
    check_ai_access(c.user.role, c.user.active)
    engine = WorkflowEngine()
    result = engine.transition_step(
        db=c.db,
        step_id=step_id,
        target_status="completed",
        actor_id=c.user.id,
        actor_role=c.user.role,
        facility_id=c.facility_id
    )
    c.db.commit()
    return result


@router.post("/workflow/steps/{step_id}/skip")
def step_skip(step_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Skips an optional workflow step. Rejects skipping if step is required.
    """
    check_ai_access(c.user.role, c.user.active)
    engine = WorkflowEngine()
    result = engine.transition_step(
        db=c.db,
        step_id=step_id,
        target_status="skipped",
        actor_id=c.user.id,
        actor_role=c.user.role,
        facility_id=c.facility_id
    )
    c.db.commit()
    return result


@router.post("/workflow/steps/{step_id}/cancel")
def step_cancel(step_id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Cancels a workflow step. Restricted to doctor or admin roles only.
    """
    check_ai_access(c.user.role, c.user.active)
    engine = WorkflowEngine()
    result = engine.transition_step(
        db=c.db,
        step_id=step_id,
        target_status="cancelled",
        actor_id=c.user.id,
        actor_role=c.user.role,
        facility_id=c.facility_id
    )
    c.db.commit()
    return result


@router.post("/actions/{id}/confirm")
def confirm_pending_action(id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Executes a pending safe_write action after explicit human confirmation.
    Enforces authentication, same user identity, facility scoping, not expired,
    and replay prevention (one-time confirmation).
    """
    import json
    check_ai_access(c.user.role, c.user.active)
    action = c.db.get(m.AIPendingAction, id)
    if not action or action.facility_id != c.facility_id:
        raise HTTPException(status_code=404, detail="Pending action not found")
    if action.user_id != c.user.id:
        raise HTTPException(status_code=403, detail="Only the initiating user may confirm this action")
    if action.status != "pending":
        raise HTTPException(status_code=409, detail=f"Action is no longer pending (current status: {action.status})")
    if action.expires_at <= m.now():
        action.status = "expired"
        action.resolved_at = m.now()
        c.db.commit()
        raise HTTPException(status_code=409, detail="Pending action has expired")

    parsed_args = json.loads(action.args_json)
    ctx = ToolContext(
        db=c.db,
        user_id=c.user.id,
        role=c.user.role,
        facility_id=c.facility_id,
        user_name=c.user.name
    )
    result = execute_tool(ctx, action.tool, parsed_args)

    action.status = "confirmed"
    action.resolved_at = m.now()

    c.db.add(m.AuditEvent(
        facility_id=c.facility_id,
        actor_id=c.user.id,
        action="ai_action_confirmed",
        entity_type="ai_pending_action",
        entity_id=action.id,
        detail=f"Tool: {action.tool}; Status: confirmed"
    ))
    c.db.commit()

    result_payload = result
    if hasattr(result, "id"):
        result_payload = {"id": result.id, "status": getattr(result, "status", "ok")}

    return {
        "status": "confirmed",
        "action_id": action.id,
        "tool": action.tool,
        "result": result_payload
    }


@router.post("/actions/{id}/reject")
def reject_pending_action(id: str, c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Rejects a pending safe_write action upon user cancellation.
    Enforces authentication, user identity, facility scoping, and audits rejection.
    """
    check_ai_access(c.user.role, c.user.active)
    action = c.db.get(m.AIPendingAction, id)
    if not action or action.facility_id != c.facility_id:
        raise HTTPException(status_code=404, detail="Pending action not found")
    if action.user_id != c.user.id:
        raise HTTPException(status_code=403, detail="Only the initiating user may reject this action")
    if action.status != "pending":
        raise HTTPException(status_code=409, detail=f"Action is not pending (status: {action.status})")

    action.status = "rejected"
    action.resolved_at = m.now()

    c.db.add(m.AuditEvent(
        facility_id=c.facility_id,
        actor_id=c.user.id,
        action="ai_action_rejected",
        entity_type="ai_pending_action",
        entity_id=action.id,
        detail=f"Tool: {action.tool}; Status: rejected"
    ))
    c.db.commit()

    return {
        "status": "rejected",
        "action_id": action.id
    }
