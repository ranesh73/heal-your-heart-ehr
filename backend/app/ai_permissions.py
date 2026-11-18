"""
AI Permissions and Governance Module for Heal Your Heart EHR.

Enforces Role-Based Access Control (RBAC), facility isolation, and clinical safety
guardrails for the AI Workforce Agent.
"""
import re
from typing import Set, Dict, Any, Optional, Tuple, List
from fastapi import HTTPException


# All valid staff roles in Heal Your Heart EHR
STAFF_ROLES: Set[str] = {
    'admin',
    'doctor',
    'assistant',
    'therapist',
    'reception',
    'billing'
}

# Roles permitted to create administrative tasks and notifications
ADMINISTRATIVE_WRITE_ROLES: Set[str] = {
    'admin',
    'assistant',
    'reception',
    'doctor'
}

# Actions strictly prohibited for AI agents (must be performed directly by a licensed clinician)
RESTRICTED_CLINICAL_ACTIONS: Set[str] = {
    'sign_encounter',
    'prescribe_medication',
    'finalize_clinical_order',
    'modify_signed_encounter',
    'approve_lab_result',
    'change_treatment_plan'
}

# Robust regex patterns for detecting restricted clinical intents in natural language
# Handles intervening words, punctuation, apostrophes, and casing variations
RESTRICTED_INTENT_PATTERNS: List[Tuple[str, re.Pattern]] = [
    # 1. Encounter Signing, Sealing, Finalizing, Closing
    (
        'sign_or_seal_encounter',
        re.compile(r'\b(sign|seal|finalize|approve|lock|close)\b(?:\s+[\w\'-]+){0,5}\s+\b(encounter|chart|note|record|visit|soap|consult|consultation|documentation)\b', re.IGNORECASE)
    ),
    (
        'approve_and_sign',
        re.compile(r'\bapprove\s+and\s+sign\b', re.IGNORECASE)
    ),
    (
        'seal_the_record',
        re.compile(r'\bseal\b(?:\s+[\w\'-]+){0,4}\s+\b(record|encounter|chart|note)\b', re.IGNORECASE)
    ),
    # 2. Prescribing, Writing Orders for Medications / Drugs
    (
        'prescribe_medication',
        re.compile(r'\b(prescribe|prescription|rx)\b', re.IGNORECASE)
    ),
    (
        'write_order_for_drug',
        re.compile(r'\b(write|place|issue|submit|create)\b(?:\s+[\w\'-]+){0,4}\s+\b(order|prescription|rx)\b(?:\s+[\w\'-]+){0,4}\s+\b(drug|medication|medicine|substance)\b', re.IGNORECASE)
    ),
    (
        'order_medication',
        re.compile(r'\b(order|dispense)\b(?:\s+[\w\'-]+){0,4}\s+\b(medication|drug|medicine|tablets?|capsules?|dose)\b', re.IGNORECASE)
    ),
    # 3. Clinical Orders Finalizing / Lab Results Approval
    (
        'finalize_clinical_order',
        re.compile(r'\b(finalize|approve|authorize|verify)\b(?:\s+[\w\'-]+){0,5}\s+\b(clinical\s+order|lab\s+order|imaging\s+order|lab\s+result|test\s+result|order)\b', re.IGNORECASE)
    ),
    # 4. Modifying Signed Records / Treatment Plan Alterations
    (
        'modify_signed_record',
        re.compile(r'\b(modify|change|alter|edit|amend)\b(?:\s+[\w\'-]+){0,4}\s+\b(signed|sealed)\b', re.IGNORECASE)
    ),
    (
        'alter_treatment_plan',
        re.compile(r'\b(change|alter|modify|cancel)\b(?:\s+[\w\'-]+){0,4}\s+\b(treatment\s+plan|eecp\s+plan|therapy\s+plan)\b', re.IGNORECASE)
    ),
]

# Mapping of tools to the minimum roles authorized to use them
TOOL_PERMISSIONS: Dict[str, Set[str]] = {
    'read_patient_summary': STAFF_ROLES,
    'get_appointment_details': STAFF_ROLES,
    'list_tasks': STAFF_ROLES,
    'create_administrative_task': ADMINISTRATIVE_WRITE_ROLES,
    'send_staff_notification': ADMINISTRATIVE_WRITE_ROLES,
    'trigger_patient_arrival_workflow': ADMINISTRATIVE_WRITE_ROLES,
}


def get_restricted_clinical_intent(action_name: str) -> Optional[str]:
    """
    Detects if a natural-language query or action identifier matches any prohibited
    clinical action intent. Returns the intent category name or None.
    """
    cleaned = action_name.strip()
    # Check regex patterns
    for intent_name, pattern in RESTRICTED_INTENT_PATTERNS:
        if pattern.search(cleaned):
            return intent_name

    # Check normalized technical identifiers (e.g. 'sign_encounter')
    normalized = cleaned.lower().replace(' ', '_').replace('-', '_')
    for restricted in RESTRICTED_CLINICAL_ACTIONS:
        if restricted in normalized:
            return restricted

    return None


def is_restricted_clinical_action(action_name: str) -> bool:
    """Returns True if the action is a restricted clinical action requiring direct human clinician authority."""
    return get_restricted_clinical_intent(action_name) is not None


def check_ai_access(user_role: str, active: bool = True) -> None:
    """
    Validates that the requesting user is active and has an authorized staff role.
    Raises HTTPException 401/403 on violation.
    """
    if not active:
        raise HTTPException(status_code=401, detail="User account is inactive")
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Role not authorized to access AI capabilities")


def check_tool_permission(tool_name: str, user_role: str) -> bool:
    """
    Checks if a staff member with user_role is permitted to invoke the specified tool.
    Never allows invocation of restricted clinical actions.
    """
    if is_restricted_clinical_action(tool_name):
        return False
    allowed_roles = TOOL_PERMISSIONS.get(tool_name)
    if allowed_roles is None:
        return False
    return user_role in allowed_roles


def validate_facility_scope(context_facility_id: str, target_facility_id: str) -> None:
    """
    Enforces that AI operations cannot cross facility boundaries.
    """
    if not context_facility_id or not target_facility_id:
        raise HTTPException(status_code=403, detail="Facility context is required")
    if context_facility_id != target_facility_id:
        raise HTTPException(status_code=403, detail="Cross-facility AI operation is prohibited")
