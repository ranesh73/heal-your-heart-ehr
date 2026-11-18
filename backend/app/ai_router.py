"""
FastAPI Router for AI Workforce Agent in Heal Your Heart EHR.

Exposes authenticated, facility-isolated, RBAC-guarded endpoints for AI assistance,
Ollama status monitoring, tool discovery, and workflow orchestration.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .security import context, Context
from .ai_permissions import check_ai_access, check_tool_permission
from .ai_service import check_ollama_status, execute_agent_query
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


@router.get("/status")
def ai_status(c: Context = Depends(context)) -> Dict[str, Any]:
    """
    Returns AI service health, configured model, and current user permission context.
    Requires authenticated staff session.
    """
    check_ai_access(c.user.role, c.user.active)
    ollama_info = check_ollama_status()
    return {
        "status": "ok",
        "service_available": ollama_info["available"],
        "provider": ollama_info["provider"],
        "model": ollama_info["model"],
        "version": ollama_info["version"],
        "error": ollama_info["error"],
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
