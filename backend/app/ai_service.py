"""
AI Service and Ollama Orchestration Client for Heal Your Heart EHR.

Manages LLM communication with a locally hosted Ollama instance, enforces clinical safety
guardrails, context retrieval, audit logging, and deterministic fallback when offline.
"""
import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from . import models as m
from .ai_permissions import is_restricted_clinical_action, get_restricted_clinical_intent
from .ai_tools import ToolContext, execute_tool

logger = logging.getLogger("ehr.ai")

# Configuration from environment variables
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "10.0"))

SYSTEM_PROMPT = """You are the Heal Your Heart EHR AI Assistant.
You assist licensed physicians, clinical assistants, receptionists, and administrative staff.
STRICT HEALTHCARE SAFETY GUIDELINES:
1. You are an ASSISTANT, not a doctor. You must NEVER formulate definitive diagnostic assertions or prescribe medications.
2. You CANNOT sign encounters, approve orders, or change clinical records directly.
3. Keep summaries concise, clear, and relevant to the user's role.
4. If asked to perform a restricted action (e.g. sign a note, prescribe Schedule H drugs), politely explain that this action requires the direct clinical authority of a licensed doctor in the EHR.
"""


def check_ollama_status() -> Dict[str, Any]:
    """
    Checks whether the local Ollama instance is accessible.
    Never throws unhandled exceptions.
    """
    url = f"{OLLAMA_BASE_URL}/api/version"
    req = urllib.request.Request(url, headers={"User-Agent": "HealYourHeart-EHR/0.1.0"})
    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "available": True,
                    "provider": "ollama",
                    "model": OLLAMA_MODEL,
                    "version": data.get("version", "unknown"),
                    "base_url": OLLAMA_BASE_URL,
                    "error": None
                }
    except Exception as e:
        logger.info(f"Ollama health check: service unreachable at {OLLAMA_BASE_URL}: {e}")
        return {
            "available": False,
            "provider": "ollama",
            "model": OLLAMA_MODEL,
            "version": None,
            "base_url": OLLAMA_BASE_URL,
            "error": "Ollama service unavailable or offline"
        }
    return {
        "available": False,
        "provider": "ollama",
        "model": OLLAMA_MODEL,
        "version": None,
        "base_url": OLLAMA_BASE_URL,
        "error": "Non-200 status from Ollama"
    }


def call_ollama_generate(prompt: str, system: str = SYSTEM_PROMPT) -> Optional[str]:
    """
    Sends a generation request to the local Ollama instance.
    Returns generated text or None if Ollama is unreachable.
    """
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "HealYourHeart-EHR/0.1.0"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
            if resp.status == 200:
                result = json.loads(resp.read().decode("utf-8"))
                return result.get("response", "").strip()
    except Exception as e:
        logger.warning(f"Ollama call failed ({url}): {e}")
        return None


def execute_agent_query(
    db: Session,
    facility_id: str,
    actor_id: str,
    actor_role: str,
    message: str,
    patient_id: Optional[str] = None,
    appointment_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core agent pipeline:
    1. Guardrail checks (refuses restricted clinical actions).
    2. Gathers facility-isolated EHR context (patient summary, appointment details, tasks).
    3. Attempts generation with Ollama or falls back deterministically.
    4. Logs audit event.
    """
    # 1. Guardrail Check: Restricted clinical action refusal
    matched_intent = get_restricted_clinical_intent(message)
    if matched_intent:
        refusal_text = (
            "Safety Guardrail: As an AI assistant, I cannot directly sign encounters, "
            "prescribe medications, or finalize clinical orders. These actions require "
            "the direct clinical authority and cryptographic signing of a licensed physician in the EHR."
        )
        db.add(m.AuditEvent(
            facility_id=facility_id,
            actor_id=actor_id,
            action="ai_query_guardrail_refusal",
            entity_type="ai_agent",
            entity_id="guardrail",
            detail=f"Refused restricted clinical intent: {matched_intent}"
        ))
        db.flush()
        return {
            "response": refusal_text,
            "model": OLLAMA_MODEL,
            "service_available": False,
            "mode": "guardrail_rejected",
            "context_loaded": False
        }

    # 2. Context Aggregation via Single Authoritative Tool Executor
    context_sections = []
    patient_summary = None
    ctx = ToolContext(db=db, user_id=actor_id, role=actor_role, facility_id=facility_id)

    if patient_id:
        try:
            patient_summary = execute_tool(ctx, "read_patient_summary", {"patient_id": patient_id})
            p = patient_summary["patient"]
            context_sections.append(
                f"PATIENT CONTEXT:\n"
                f"- Name: {p['name']}, Age: {p['age']}, Sex: {p['sex']}, MRN: {p['mrn']}\n"
                f"- Active Diagnoses: {', '.join(d['description'] for d in patient_summary['diagnoses']) or 'None'}\n"
                f"- Active Medications: {', '.join(med['name'] for med in patient_summary['active_medications']) or 'None'}\n"
                f"- Latest Vitals: {patient_summary['latest_vitals'] or 'No recent vitals documented'}\n"
                f"- Pending Tasks: {len(patient_summary['pending_tasks'])} open item(s)"
            )
        except Exception as e:
            logger.info(f"Context retrieval for patient {patient_id} failed or not authorized: {e}")

    if appointment_id:
        try:
            appt_summary = execute_tool(ctx, "get_appointment_details", {"appointment_id": appointment_id})
            context_sections.append(
                f"APPOINTMENT CONTEXT:\n"
                f"- Patient: {appt_summary['patient_name']} (MRN: {appt_summary['patient_mrn']})\n"
                f"- Token: #{appt_summary['token_number']}, Status: {appt_summary['status']}\n"
                f"- Provider: {appt_summary['provider_name']}, Visit: {appt_summary['visit_type']}"
            )
        except Exception as e:
            logger.info(f"Context retrieval for appointment {appointment_id} failed: {e}")

    # Build prompt
    context_block = "\n\n".join(context_sections) if context_sections else "No specific patient or appointment loaded."
    prompt = (
        f"USER ROLE: {actor_role.upper()}\n"
        f"FACILITY CONTEXT ID: {facility_id}\n\n"
        f"AVAILABLE EHR CONTEXT:\n{context_block}\n\n"
        f"STAFF QUERY: {message}\n\n"
        f"Please provide an accurate, helpful response based on the EHR context."
    )

    # 3. Attempt Ollama Generation
    llm_output = call_ollama_generate(prompt)

    if llm_output:
        response_text = llm_output
        mode = "ollama_live"
        service_available = True
    else:
        # Deterministic Fallback Mode when Ollama is offline
        service_available = False
        mode = "deterministic_fallback"
        if patient_summary:
            p = patient_summary["patient"]
            diagnoses_str = ", ".join(d["description"] for d in patient_summary["diagnoses"]) or "None documented"
            vitals_str = (
                f"BP: {patient_summary['latest_vitals']['bp']}, Pulse: {patient_summary['latest_vitals']['pulse_bpm']} bpm"
                if patient_summary.get("latest_vitals") and patient_summary["latest_vitals"].get("bp")
                else "No recent vitals"
            )
            response_text = (
                f"[Offline Assistant Mode] Ollama LLM is currently offline at {OLLAMA_BASE_URL}.\n\n"
                f"Patient Overview for {p['name']} ({p['mrn']}):\n"
                f"• Age/Gender: {p['age']} yrs / {p['sex']}\n"
                f"• Active Conditions: {diagnoses_str}\n"
                f"• Recent Vitals: {vitals_str}\n"
                f"• Open Tasks: {len(patient_summary['pending_tasks'])}\n\n"
                f"EHR data is up-to-date and accessible."
            )
        else:
            response_text = (
                f"[Offline Assistant Mode] Ollama LLM is currently offline at {OLLAMA_BASE_URL}.\n"
                f"Your query was received: '{message}'.\n"
                f"The EHR backend and workflow engine remain fully functional."
            )

    # 4. Audit Log
    db.add(m.AuditEvent(
        facility_id=facility_id,
        actor_id=actor_id,
        action="ai_agent_query",
        entity_type="ai_assistant",
        entity_id=patient_id or appointment_id or "general",
        detail=f"Role: {actor_role}; Mode: {mode}; Query: {message[:100]}"
    ))
    db.flush()

    return {
        "response": response_text,
        "model": OLLAMA_MODEL,
        "service_available": service_available,
        "mode": mode,
        "context_loaded": bool(context_sections)
    }
