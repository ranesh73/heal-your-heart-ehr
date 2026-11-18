"""
Workflow Router for Heal Your Heart EHR.

Exposes authenticated, facility-isolated, RBAC-guarded endpoints for
workflow instance inspection, step state tracking, and deterministic
state machine transitions. Zero LLM involvement.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from . import models as m
from .security import context, Context
from .ai_permissions import check_ai_access
from .workflow_engine import WorkflowEngine


router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("/instances/{instance_id}")
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


@router.get("/steps/{step_id}")
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


@router.post("/steps/{step_id}/acknowledge")
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


@router.post("/steps/{step_id}/start")
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


@router.post("/steps/{step_id}/block")
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


@router.post("/steps/{step_id}/unblock")
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


@router.post("/steps/{step_id}/complete")
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


@router.post("/steps/{step_id}/skip")
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


@router.post("/steps/{step_id}/cancel")
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
