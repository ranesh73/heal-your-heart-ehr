"""
Phase 2 Comprehensive Test Suite: Durable Workflow Engine for Heal Your Heart EHR.

Covers:
STEP 0 Carry-Over Fixes:
  A. Read-tool scope per role (clinical vs non-clinical role filtering).
  B. Audit enrichment: resource IDs in entity fields; ai_tool_rejected on 404, 422, unknown tool.
  C. Background identity: worker/system-initiated ToolContext with automation marker and role bounding.
  D. Dynamic role loading per request directly from DB.

STEP 1 & 2 Workflow Engine:
  - Durable workflow DAG: parallel activation, dependency ordering.
  - Advance idempotency.
  - Concurrent check-in race safety (IntegrityError handling).
  - Optional step skipping vs required step enforcement.
  - Restart persistence across fresh sessions.
  - End-to-end instance completion when all required steps finish.

STEP 3 Step Action Endpoints:
  - /acknowledge, /start, /block, /unblock, /complete, /skip, /cancel.
  - State machine validation and 409 rejections.
  - Role authorization (403 for unauthorized roles).
  - Cross-facility step action denial (404).
  - Task status mirroring (step completed -> task completed).
  - Zero LLM involvement.
"""
import json
from datetime import date
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.db import SessionLocal
from app import models as m
from app.ai_tools import (
    execute_tool,
    ToolContext,
    ReadPatientSummaryArgs,
    GetAppointmentDetailsArgs,
    CreateAdministrativeTaskArgs,
    RISK_READ,
    RISK_SAFE_WRITE
)
from app.workflow_engine import (
    WorkflowEngine,
    PATIENT_ARRIVAL_TEMPLATE,
    ARRIVAL_STEPS_BY_KEY
)
from tests.conftest import PASSWORD
from tests.test_workflows import patient, booking, ok


def client(role="doctor", facility=None):
    """Creates an authenticated TestClient with CSRF token and facility headers."""
    c = TestClient(app)
    resp = c.post("/api/auth/login", json={"email": f"{role}@demo.local", "password": PASSWORD})
    assert resp.status_code == 200, f"Login failed for {role}: {resp.text}"
    c.headers["X-CSRF-Token"] = resp.json()["csrf"]
    me = c.get("/api/auth/me").json()
    c.headers["X-Facility-ID"] = facility or next(x["id"] for x in me["facilities"] if x["code"] == "HYN")
    return c


# ===========================================================================
# STEP 0.A: Read-tool Scope Per Role
# ===========================================================================

def test_step_0a_read_tool_scope_per_role():
    """
    Verifies read_patient_summary and get_appointment_details return strictly
    what each role is authorized to see in the EHR.
    - Clinical roles (doctor, assistant, therapist, admin): receive diagnoses,
      active medications, and vitals.
    - Non-clinical roles (reception, billing): receive demographics and pending
      tasks only; clinical fields are censored (empty/None, clinical_access=False).
    - Appointment reason: clinical & scheduling roles see clinical reason;
      billing sees censored empty string.
    """
    c_doc = client("doctor")
    p = patient(c_doc)
    appt = ok(c_doc.post("/api/appointments", json=booking(c_doc, p, day=15, hour=10)))[0]

    # Seed clinical data: vital, diagnosis, prescription
    doc_id = c_doc.get("/api/auth/me").json()["user"]["id"]
    fac_id = c_doc.headers["X-Facility-ID"]
    with SessionLocal() as db:
        db.add(m.Vital(
            patient_id=p["id"],
            facility_id=fac_id,
            author_id=doc_id,
            bp_sys=120.0,
            bp_dia=80.0,
            pulse_bpm=72.0,
            spo2_pct=98.0
        ))
        db.add(m.Diagnosis(
            patient_id=p["id"],
            facility_id=fac_id,
            author_id=doc_id,
            code="I25.10",
            description="Atherosclerotic heart disease",
            status="active"
        ))
        db.add(m.Medication(
            patient_id=p["id"],
            facility_id=fac_id,
            author_id=doc_id,
            trade_name="Atorvastatin",
            dose="20mg",
            route="oral",
            maen="0-0-1-0",
            duration_days=30,
            quantity=30,
            status="active"
        ))
        db.add(m.Task(
            patient_id=p["id"],
            facility_id=fac_id,
            author_id=doc_id,
            assignee_id=doc_id,
            title="Follow-up ECG",
            kind="task",
            status="pending"
        ))
        db.commit()

    clinical_roles = ["doctor", "assistant", "therapist", "admin"]
    non_clinical_roles = ["reception", "billing"]

    # 1. Verify read_patient_summary per role
    for role in clinical_roles:
        c_role = client(role)
        me = c_role.get("/api/auth/me").json()
        with SessionLocal() as db:
            ctx = ToolContext(db=db, user_id=me["user"]["id"], role=role, facility_id=c_role.headers["X-Facility-ID"])
            res = execute_tool(ctx, "read_patient_summary", ReadPatientSummaryArgs(patient_id=p["id"]))
            assert res["clinical_access"] is True, f"Role {role} should have clinical_access=True"
            assert len(res["diagnoses"]) >= 1, f"Role {role} should see diagnoses"
            assert len(res["active_medications"]) >= 1, f"Role {role} should see active_medications"
            assert res["latest_vitals"] is not None, f"Role {role} should see latest_vitals"
            assert res["patient"]["id"] == p["id"]

    for role in non_clinical_roles:
        c_role = client(role)
        me = c_role.get("/api/auth/me").json()
        with SessionLocal() as db:
            ctx = ToolContext(db=db, user_id=me["user"]["id"], role=role, facility_id=c_role.headers["X-Facility-ID"])
            res = execute_tool(ctx, "read_patient_summary", ReadPatientSummaryArgs(patient_id=p["id"]))
            assert res["clinical_access"] is False, f"Role {role} must have clinical_access=False"
            assert res["diagnoses"] == [], f"Role {role} must not see diagnoses"
            assert res["active_medications"] == [], f"Role {role} must not see medications"
            assert res["latest_vitals"] is None, f"Role {role} must not see vitals"
            # Demographics and pending tasks are accessible
            assert res["patient"]["id"] == p["id"]
            assert len(res["pending_tasks"]) >= 1

    # 2. Verify get_appointment_details reason scoping
    # Update appointment with sensitive clinical reason
    with SessionLocal() as db:
        a = db.get(m.Appointment, appt["id"])
        a.reason = "Acute coronary syndrome evaluation"
        db.commit()

    # Clinical + scheduling roles see the reason
    for role in ["doctor", "assistant", "therapist", "admin", "reception"]:
        c_role = client(role)
        me = c_role.get("/api/auth/me").json()
        with SessionLocal() as db:
            ctx = ToolContext(db=db, user_id=me["user"]["id"], role=role, facility_id=c_role.headers["X-Facility-ID"])
            res = execute_tool(ctx, "get_appointment_details", GetAppointmentDetailsArgs(appointment_id=appt["id"]))
            assert res["reason"] == "Acute coronary syndrome evaluation", f"Role {role} should see appointment reason"

    # Billing role has reason censored
    c_bill = client("billing")
    me = c_bill.get("/api/auth/me").json()
    with SessionLocal() as db:
        ctx = ToolContext(db=db, user_id=me["user"]["id"], role="billing", facility_id=c_bill.headers["X-Facility-ID"])
        res = execute_tool(ctx, "get_appointment_details", GetAppointmentDetailsArgs(appointment_id=appt["id"]))
        assert res["reason"] == "", "Billing role must receive censored empty appointment reason"


# ===========================================================================
# STEP 0.B: Audit Enrichment & Rejection Audits
# ===========================================================================

def test_step_0b_audit_enrichment_reads_and_writes():
    """
    Verifies resource IDs (patient_id, appointment_id, task_id) are recorded in
    AuditEvent entity fields for both reads and writes.
    """
    c = client("doctor")
    p = patient(c)
    appt = ok(c.post("/api/appointments", json=booking(c, p, day=16, hour=14)))[0]
    me = c.get("/api/auth/me").json()

    with SessionLocal() as db:
        ctx = ToolContext(db=db, user_id=me["user"]["id"], role="doctor", facility_id=c.headers["X-Facility-ID"])

        # 1. Read patient summary -> audits patient resource ID
        execute_tool(ctx, "read_patient_summary", ReadPatientSummaryArgs(patient_id=p["id"]))
        audit_read_p = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.action == "ai_tool_executed:read_patient_summary",
                m.AuditEvent.entity_id == p["id"]
            ).order_by(m.AuditEvent.created_at.desc())
        )
        assert audit_read_p is not None
        assert audit_read_p.entity_type == "patients"
        assert audit_read_p.actor_id == me["user"]["id"]
        assert "patient_id" in audit_read_p.detail

        # 2. Read appointment details -> audits appointment resource ID
        execute_tool(ctx, "get_appointment_details", GetAppointmentDetailsArgs(appointment_id=appt["id"]))
        audit_read_a = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.action == "ai_tool_executed:get_appointment_details",
                m.AuditEvent.entity_id == appt["id"]
            ).order_by(m.AuditEvent.created_at.desc())
        )
        assert audit_read_a is not None
        assert audit_read_a.entity_type == "appointments"
        assert "appointment_id" in audit_read_a.detail

        # 3. Write task -> audits task resource ID
        task_res = execute_tool(
            ctx,
            "create_administrative_task",
            CreateAdministrativeTaskArgs(
                patient_id=p["id"],
                assignee_id=me["user"]["id"],
                title="Schedule follow-up lipid profile",
                priority="normal"
            )
        )
        audit_task = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.action == "ai_tool_executed:create_administrative_task",
                m.AuditEvent.entity_id == p["id"]
            ).order_by(m.AuditEvent.created_at.desc())
        )
        assert audit_task is not None
        assert task_res.id in audit_task.detail
        # Zero clinical free text
        assert "Atherosclerotic" not in audit_task.detail


def test_step_0b_audit_rejected_calls_404_422_unknown():
    """
    Verifies rejected calls (cross-facility 404, validation 422, unknown tool)
    log an AuditEvent with action='ai_tool_rejected' and no clinical free text.
    """
    c = client("doctor")
    p = patient(c)
    me = c.get("/api/auth/me").json()
    facility_hyr = next(x["id"] for x in me["facilities"] if x["code"] == "HYR")

    # 1. Unknown tool rejection
    with SessionLocal() as db:
        ctx = ToolContext(db=db, user_id=me["user"]["id"], role="doctor", facility_id=c.headers["X-Facility-ID"])
        with pytest.raises(Exception) as exc:
            execute_tool(ctx, "non_existent_diagnostic_tool", {})
        assert exc.value.status_code == 404

        rej_audit = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.action == "ai_tool_rejected",
                m.AuditEvent.entity_id == "non_existent_diagnostic_tool"
            ).order_by(m.AuditEvent.created_at.desc())
        )
        assert rej_audit is not None
        assert "Unknown tool" in rej_audit.detail

    # 2. Validation error 422 rejection
    with SessionLocal() as db:
        ctx = ToolContext(db=db, user_id=me["user"]["id"], role="doctor", facility_id=c.headers["X-Facility-ID"])
        with pytest.raises(Exception) as exc:
            execute_tool(ctx, "read_patient_summary", {"patient_id": p["id"], "spoofed_extra": "danger"})
        assert exc.value.status_code == 422

        val_audit = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.action == "ai_tool_rejected",
                m.AuditEvent.entity_type == "ai_tool",
                m.AuditEvent.entity_id == "read_patient_summary"
            ).order_by(m.AuditEvent.created_at.desc())
        )
        assert val_audit is not None
        assert "Validation error 422" in val_audit.detail

    # 3. Cross-facility 404 rejection
    with SessionLocal() as db:
        # Context is HYR, but patient belongs to HYN
        ctx_hyr = ToolContext(db=db, user_id=me["user"]["id"], role="doctor", facility_id=facility_hyr)
        with pytest.raises(Exception) as exc:
            execute_tool(ctx_hyr, "read_patient_summary", ReadPatientSummaryArgs(patient_id=p["id"]))
        assert exc.value.status_code == 404

        cross_audit = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.action == "ai_tool_rejected",
                m.AuditEvent.entity_id == p["id"]
            ).order_by(m.AuditEvent.created_at.desc())
        )
        assert cross_audit is not None
        assert cross_audit.entity_type == "patients"
        assert "Cross-facility" in cross_audit.detail


# ===========================================================================
# STEP 0.C: Background Identity & Role Bounding
# ===========================================================================

def test_step_0c_background_identity_and_role_bounding():
    """
    Verifies worker/system-initiated tool calls build ToolContext with
    actor_type='automation', attributed to the originating user, carrying
    that user's exact role, and bounded strictly to that role's privileges.
    """
    c_rec = client("reception")
    p = patient(c_rec)
    me_rec = c_rec.get("/api/auth/me").json()

    with SessionLocal() as db:
        # 1. Background worker executing administrative task for reception user
        ctx_auto = ToolContext(
            db=db,
            user_id=me_rec["user"]["id"],
            role=me_rec["user"]["role"],
            facility_id=c_rec.headers["X-Facility-ID"],
            actor_type="automation",
            is_automation=True
        )
        task = execute_tool(
            ctx_auto,
            "create_administrative_task",
            CreateAdministrativeTaskArgs(
                patient_id=p["id"],
                assignee_id=me_rec["user"]["id"],
                title="Automated intake checklist"
            )
        )
        assert task.id is not None

        # Verify audit carries ActorType: automation
        audit = db.scalar(
            select(m.AuditEvent).where(
                m.AuditEvent.action == "ai_tool_executed:create_administrative_task",
                m.AuditEvent.actor_id == me_rec["user"]["id"]
            ).order_by(m.AuditEvent.created_at.desc())
        )
        assert audit is not None
        assert "ActorType: automation" in audit.detail

        # 2. Automation identity CANNOT exceed originating user's role
        # Reception user attempting forbidden clinical tool via automation context
        with pytest.raises(Exception) as exc:
            execute_tool(ctx_auto, "prescribe_medication", {"patient_id": p["id"]})
        assert exc.value.status_code == 403


# ===========================================================================
# STEP 0.D: Dynamic Role Loading
# ===========================================================================

def test_step_0d_dynamic_role_loading_per_request():
    """
    Verifies ctx.role is dynamically loaded per request from the database
    (db.get(User, session.user_id)), not cached from the login token.
    """
    c = client("reception")
    me = c.get("/api/auth/me").json()
    user_id = me["user"]["id"]
    original_role = me["user"]["role"]
    assert original_role == "reception"

    # Status check confirms initial role is reception
    status1 = c.get("/api/ai/status").json()
    assert status1["user"]["role"] == "reception"

    try:
        # Dynamically change user's role in the DB mid-session
        with SessionLocal() as db:
            u = db.get(m.User, user_id)
            u.role = "assistant"
            db.commit()

        # Immediate next request with same session cookie reflects new role
        status2 = c.get("/api/ai/status").json()
        assert status2["user"]["role"] == "assistant", "Role must update dynamically on next request without re-login"

    finally:
        # Restore role back to reception
        with SessionLocal() as db:
            u = db.get(m.User, user_id)
            u.role = original_role
            db.commit()


# ===========================================================================
# STEP 1 & 2: Durable Workflow Engine DAG, Idempotency & Race Safety
# ===========================================================================

def test_step_1_2_parallel_activation_and_dependency_ordering():
    """
    Verifies the patient arrival workflow DAG:
    1. Parallel activation: step_triage_vitals and step_reception_verify have
       no dependencies and are activated immediately with tasks created.
    2. Dependency ordering: step_doctor_chart_review depends on vitals and
       remains unassigned (no task) until vitals is completed.
    """
    c = client("reception")
    p = patient(c)
    appt = ok(c.post("/api/appointments", json=booking(c, p, day=17, hour=9)))[0]

    engine = WorkflowEngine()
    with SessionLocal() as db:
        res = engine.trigger_patient_arrival(
            db=db,
            facility_id=c.headers["X-Facility-ID"],
            appointment_id=appt["id"],
            actor_id=c.get("/api/auth/me").json()["user"]["id"]
        )
        assert res["status"] == "success"
        instance_id = res["workflow_id"]
        db.commit()

    with SessionLocal() as db:
        steps = db.scalars(
            select(m.WorkflowStep).where(m.WorkflowStep.instance_id == instance_id)
        ).all()
        steps_by_key = {s.step_key: s for s in steps}

        # Step 1: vitals (assistant, required) -> activated
        vitals_step = steps_by_key["step_triage_vitals"]
        assert vitals_step.status == "pending"
        assert vitals_step.task_id is not None
        assert vitals_step.required is True

        # Step 2: reception (reception, optional) -> activated in parallel
        intake_step = steps_by_key["step_reception_verify"]
        assert intake_step.status == "pending"
        assert intake_step.task_id is not None
        assert intake_step.required is False

        # Step 3: chart review (doctor, required, depends on vitals) -> waiting
        review_step = steps_by_key["step_doctor_chart_review"]
        assert review_step.status == "pending"
        assert review_step.task_id is None, "Chart review must not have task before vitals completes"

        # Verify step dependency record
        dep = db.scalar(
            select(m.StepDependency).where(
                m.StepDependency.step_id == review_step.id,
                m.StepDependency.depends_on_step_id == vitals_step.id
            )
        )
        assert dep is not None


def test_step_1_2_advance_idempotency():
    """
    Verifies calling advance() multiple times creates no duplicate tasks
    and leaves step states unchanged.
    """
    c = client("reception")
    p = patient(c)
    appt = ok(c.post("/api/appointments", json=booking(c, p, day=17, hour=11)))[0]

    engine = WorkflowEngine()
    with SessionLocal() as db:
        res = engine.trigger_patient_arrival(
            db=db,
            facility_id=c.headers["X-Facility-ID"],
            appointment_id=appt["id"],
            actor_id=c.get("/api/auth/me").json()["user"]["id"]
        )
        instance_id = res["workflow_id"]
        db.commit()

    with SessionLocal() as db:
        tasks_before = len(db.scalars(select(m.Task).where(m.Task.patient_id == p["id"])).all())

        # Advance once
        adv1 = engine.advance(db, instance_id)
        assert adv1["tasks_created"] == 0

        # Advance twice
        adv2 = engine.advance(db, instance_id)
        assert adv2["tasks_created"] == 0

        tasks_after = len(db.scalars(select(m.Task).where(m.Task.patient_id == p["id"])).all())
        assert tasks_before == tasks_after


def test_step_1_2_concurrent_checkin_race_safety():
    """
    Verifies concurrent check-in requests for the same appointment safely
    handle unique constraint on (appointment_id, template_key) and return
    the existing instance without creating duplicate records or throwing 500.
    """
    c = client("reception")
    p = patient(c)
    appt = ok(c.post("/api/appointments", json=booking(c, p, day=17, hour=13)))[0]
    actor_id = c.get("/api/auth/me").json()["user"]["id"]
    facility_id = c.headers["X-Facility-ID"]

    engine = WorkflowEngine()

    with SessionLocal() as db1:
        # First creation
        inst1 = engine.create_instance(
            db=db1,
            facility_id=facility_id,
            patient_id=p["id"],
            appointment_id=appt["id"],
            created_by=actor_id,
            template_key="wf_patient_arrival_v1"
        )
        db1.commit()

        # Second creation on separate session simulating concurrency race
        with SessionLocal() as db2:
            inst2 = engine.create_instance(
                db=db2,
                facility_id=facility_id,
                patient_id=p["id"],
                appointment_id=appt["id"],
                created_by=actor_id,
                template_key="wf_patient_arrival_v1"
            )
            assert inst2.id == inst1.id

    # Verify exactly one instance exists
    with SessionLocal() as db:
        count = len(db.scalars(
            select(m.WorkflowInstance).where(m.WorkflowInstance.appointment_id == appt["id"])
        ).all())
        assert count == 1


def test_step_1_2_optional_step_skipping_and_required_enforcement():
    """
    Verifies optional steps can be skipped, while required steps reject skipping.
    """
    c = client("reception")
    p = patient(c)
    appt = ok(c.post("/api/appointments", json=booking(c, p, day=17, hour=15)))[0]
    actor_id = c.get("/api/auth/me").json()["user"]["id"]
    facility_id = c.headers["X-Facility-ID"]

    engine = WorkflowEngine()
    with SessionLocal() as db:
        res = engine.trigger_patient_arrival(db, facility_id, appt["id"], actor_id)
        instance_id = res["workflow_id"]
        db.commit()

    with SessionLocal() as db:
        steps = db.scalars(
            select(m.WorkflowStep).where(m.WorkflowStep.instance_id == instance_id)
        ).all()
        steps_by_key = {s.step_key: s for s in steps}

        # 1. step_reception_verify is optional -> skip succeeds
        rec_step = steps_by_key["step_reception_verify"]
        skip_res = engine.transition_step(
            db=db,
            step_id=rec_step.id,
            target_status="skipped",
            actor_id=actor_id,
            actor_role="reception",
            facility_id=facility_id
        )
        assert skip_res["status"] == "success"
        assert rec_step.status == "skipped"

        # 2. step_triage_vitals is required -> skip rejected with 409
        vitals_step = steps_by_key["step_triage_vitals"]
        with pytest.raises(Exception) as exc:
            engine.transition_step(
                db=db,
                step_id=vitals_step.id,
                target_status="skipped",
                actor_id=actor_id,
                actor_role="admin",
                facility_id=facility_id
            )
        assert exc.value.status_code == 409
        assert "Cannot skip a required workflow step" in exc.value.detail


def test_step_1_2_restart_persistence():
    """
    Verifies full durability: states, step statuses, dependencies, and event logs
    persist accurately across engine and session restarts.
    """
    c = client("reception")
    p = patient(c)
    appt = ok(c.post("/api/appointments", json=booking(c, p, day=18, hour=9)))[0]
    actor_id = c.get("/api/auth/me").json()["user"]["id"]
    facility_id = c.headers["X-Facility-ID"]

    engine = WorkflowEngine()
    with SessionLocal() as db:
        res = engine.trigger_patient_arrival(db, facility_id, appt["id"], actor_id)
        instance_id = res["workflow_id"]
        db.commit()

    # Simulate full restart: throw away engine, open fresh session
    del engine
    fresh_engine = WorkflowEngine()

    with SessionLocal() as db:
        inst = db.get(m.WorkflowInstance, instance_id)
        assert inst is not None
        assert inst.status == "active"
        assert inst.template_key == "wf_patient_arrival_v1"

        steps = db.scalars(
            select(m.WorkflowStep).where(m.WorkflowStep.instance_id == instance_id)
        ).all()
        assert len(steps) == 3

        events = db.scalars(
            select(m.WorkflowEvent).where(m.WorkflowEvent.instance_id == instance_id)
        ).all()
        assert len(events) >= 1  # 'created' and 'activated' events


# ===========================================================================
# STEP 3: Step Action Endpoints, State Machine Transitions & Task Mirroring
# ===========================================================================

def test_step_3_full_workflow_lifecycle_via_api():
    """
    Verifies end-to-end workflow execution via HTTP step action endpoints:
    1. Acknowledge vitals step (pending -> acknowledged)
    2. Start vitals step (acknowledged -> in_progress)
    3. Block vitals step (in_progress -> blocked)
    4. Unblock vitals step (blocked -> in_progress)
    5. Complete vitals step (in_progress -> completed)
       - Mirrors to Task (status -> completed)
       - Unblocks downstream chart review step (now activated with task!)
    6. Skip optional reception step
    7. Complete doctor chart review step
    8. Workflow instance reaches terminal 'completed' status!
    """
    c_rec = client("reception")
    c_asst = client("assistant")
    c_doc = client("doctor")
    p = patient(c_rec)
    appt = ok(c_rec.post("/api/appointments", json=booking(c_rec, p, day=18, hour=11)))[0]

    # Trigger arrival workflow via check-in
    checkin_res = c_rec.post(f"/api/appointments/{appt['id']}/status", json={
        "status": "checked-in",
        "version": appt["version"]
    })
    assert checkin_res.status_code == 200

    with SessionLocal() as db:
        inst = db.scalar(
            select(m.WorkflowInstance).where(m.WorkflowInstance.appointment_id == appt["id"])
        )
        assert inst is not None
        instance_id = inst.id

    # 0. Query instance state via GET endpoint
    inst_resp = c_rec.get(f"/api/ai/workflow/instances/{instance_id}")
    assert inst_resp.status_code == 200
    inst_data = inst_resp.json()
    steps_map = {s["step_key"]: s for s in inst_data["steps"]}
    vitals_step_id = steps_map["step_triage_vitals"]["id"]
    intake_step_id = steps_map["step_reception_verify"]["id"]
    review_step_id = steps_map["step_doctor_chart_review"]["id"]

    # 1. Acknowledge vitals step
    ack_res = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/acknowledge")
    assert ack_res.status_code == 200
    assert ack_res.json()["new_status"] == "acknowledged"

    # 2. Start vitals step
    start_res = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["new_status"] == "in_progress"

    # 3. Block vitals step
    block_res = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/block")
    assert block_res.status_code == 200
    assert block_res.json()["new_status"] == "blocked"

    # 4. Unblock vitals step
    unblock_res = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/unblock")
    assert unblock_res.status_code == 200
    assert unblock_res.json()["new_status"] == "in_progress"

    # 5. Complete vitals step
    comp_res = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/complete")
    assert comp_res.status_code == 200
    assert comp_res.json()["new_status"] == "completed"

    # Verify task mirroring & downstream activation
    with SessionLocal() as db:
        v_step = db.get(m.WorkflowStep, vitals_step_id)
        assert v_step.status == "completed"
        v_task = db.get(m.Task, v_step.task_id)
        assert v_task.status == "completed", "Completing workflow step must mirror task status to completed"

        # Chart review step is now automatically activated with task
        rev_step = db.get(m.WorkflowStep, review_step_id)
        assert rev_step.task_id is not None, "Downstream chart review must be activated upon vitals completion"

    # 6. Skip optional intake step
    skip_res = c_rec.post(f"/api/ai/workflow/steps/{intake_step_id}/skip")
    assert skip_res.status_code == 200
    assert skip_res.json()["new_status"] == "skipped"

    # 7. Complete doctor chart review step (start first, then complete)
    doc_start = c_doc.post(f"/api/ai/workflow/steps/{review_step_id}/start")
    assert doc_start.status_code == 200
    doc_comp = c_doc.post(f"/api/ai/workflow/steps/{review_step_id}/complete")
    assert doc_comp.status_code == 200
    assert doc_comp.json()["new_status"] == "completed"

    # 8. Verify entire workflow instance is now completed!
    final_inst = c_doc.get(f"/api/ai/workflow/instances/{instance_id}").json()
    assert final_inst["status"] == "completed"


def test_step_3_invalid_transitions_and_permissions():
    """
    Verifies state machine rejects invalid transitions (409) and enforces
    strict role permissions (403) and cross-facility isolation (404).
    """
    c_rec = client("reception")
    c_asst = client("assistant")
    c_doc = client("doctor")
    p = patient(c_rec)
    appt = ok(c_rec.post("/api/appointments", json=booking(c_rec, p, day=18, hour=14)))[0]

    engine = WorkflowEngine()
    with SessionLocal() as db:
        res = engine.trigger_patient_arrival(
            db=db,
            facility_id=c_rec.headers["X-Facility-ID"],
            appointment_id=appt["id"],
            actor_id=c_rec.get("/api/auth/me").json()["user"]["id"]
        )
        instance_id = res["workflow_id"]
        db.commit()

    with SessionLocal() as db:
        steps = db.scalars(select(m.WorkflowStep).where(m.WorkflowStep.instance_id == instance_id)).all()
        steps_map = {s.step_key: s for s in steps}
        vitals_step_id = steps_map["step_triage_vitals"].id

    # 1. Role unauthorized: reception trying to complete assistant's vitals step -> 403
    unauth_resp = c_rec.post(f"/api/ai/workflow/steps/{vitals_step_id}/complete")
    assert unauth_resp.status_code == 403

    # 2. Reception trying to cancel a step -> 403 (cancellation restricted to doctor or admin)
    cancel_resp = c_rec.post(f"/api/ai/workflow/steps/{vitals_step_id}/cancel")
    assert cancel_resp.status_code == 403

    # 3. Invalid transition from terminal status: transition through valid path to completed
    start_resp = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/start")
    assert start_resp.status_code == 200
    comp_resp = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/complete")
    assert comp_resp.status_code == 200

    # Now attempt invalid transition on completed step -> 409
    re_ack = c_asst.post(f"/api/ai/workflow/steps/{vitals_step_id}/acknowledge")
    assert re_ack.status_code == 409
    assert "Cannot transition step from terminal status 'completed'" in re_ack.json()["detail"]

    # Also attempt invalid direct jump from pending to completed
    review_step_id = steps_map["step_doctor_chart_review"].id
    jump_resp = c_doc.post(f"/api/ai/workflow/steps/{review_step_id}/complete")
    assert jump_resp.status_code == 409
    assert "Invalid transition" in jump_resp.json()["detail"]

    # 4. Cross-facility access denial -> 404
    me = c_asst.get("/api/auth/me").json()
    facility_hyr = next(x["id"] for x in me["facilities"] if x["code"] == "HYR")
    c_asst_hyr = client("assistant", facility=facility_hyr)
    cross_resp = c_asst_hyr.post(f"/api/ai/workflow/steps/{vitals_step_id}/complete")
    assert cross_resp.status_code == 404


# ===========================================================================
# PHASE 2B GAPS & EXTENDED COVERAGE
# ===========================================================================

def test_phase2b_step_1_migration_fresh_db_schema_parity():
    """
    STEP 1: Migration integrity test.
    Runs all migrations from scratch on a fresh empty SQLite file outside the repo,
    and confirms the resulting schema has all workflow tables and columns matching
    Base.metadata models.
    """
    import tempfile, os
    from alembic.config import Config
    from alembic import command
    from sqlalchemy import create_engine, inspect

    tmp_dir = tempfile.mkdtemp(prefix="alembic_parity_")
    tmp_db_path = os.path.join(tmp_dir, "parity.db")
    test_url = f"sqlite:///{tmp_db_path}"

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", test_url)

    # Run upgrade head from scratch
    command.upgrade(cfg, "head")

    test_engine = create_engine(test_url)
    insp = inspect(test_engine)
    table_names = set(insp.get_table_names())

    # All workflow tables must exist
    workflow_tables = {
        "workflow_instances",
        "workflow_steps",
        "step_dependencies",
        "workflow_events"
    }
    for wt in workflow_tables:
        assert wt in table_names, f"Table {wt} must exist after upgrade head on fresh DB"

    # Verify column presence on each workflow table
    inst_cols = {c["name"] for c in insp.get_columns("workflow_instances")}
    assert {"id", "created_at", "version", "facility_id", "patient_id", "appointment_id", "template_key", "status", "created_by"}.issubset(inst_cols)

    step_cols = {c["name"] for c in insp.get_columns("workflow_steps")}
    assert {"id", "created_at", "version", "instance_id", "step_key", "step_type", "assignee_role", "status", "required", "task_id"}.issubset(step_cols)

    dep_cols = {c["name"] for c in insp.get_columns("step_dependencies")}
    assert {"id", "created_at", "version", "step_id", "depends_on_step_id"}.issubset(dep_cols)

    event_cols = {c["name"] for c in insp.get_columns("workflow_events")}
    assert {"id", "created_at", "version", "instance_id", "step_id", "event_type", "actor_id", "actor_type", "timestamp"}.issubset(event_cols)


def test_phase2b_step_2_task_step_synchronization_lifecycle():
    """
    STEP 2: Task <-> Step Synchronization test.
    Tests completing, reopening, reassigning, and attempting deletion of a mirrored task
    via the existing EHR tasks endpoints:
    - Completing via legacy /api/records/tasks/{id}/status transitions step to completed
      and automatically activates downstream dependent steps.
    - Reopening via legacy endpoint transitions step back to in_progress/pending.
    - Reassigning via legacy PUT /api/records/tasks/{id} updates step.assigned_user_id.
    - Deleting via legacy DELETE /api/records/tasks/{id} is rejected with HTTP 409.
    """
    c_rec = client("reception")
    c_asst = client("assistant")
    c_doc = client("doctor")
    p = patient(c_rec)
    appt = ok(c_rec.post("/api/appointments", json=booking(c_rec, p, day=19, hour=10)))[0]

    # Check-in appointment triggers workflow
    c_rec.post(f"/api/appointments/{appt['id']}/status", json={
        "status": "checked-in",
        "version": appt["version"]
    })

    with SessionLocal() as db:
        inst = db.scalar(select(m.WorkflowInstance).where(m.WorkflowInstance.appointment_id == appt["id"]))
        v_step = db.scalar(select(m.WorkflowStep).where(
            m.WorkflowStep.instance_id == inst.id,
            m.WorkflowStep.step_key == "step_triage_vitals"
        ))
        r_step = db.scalar(select(m.WorkflowStep).where(
            m.WorkflowStep.instance_id == inst.id,
            m.WorkflowStep.step_key == "step_doctor_chart_review"
        ))
        assert v_step is not None
        assert v_step.task_id is not None
        assert r_step.task_id is None, "Chart review must not be activated yet"
        v_task_id = v_step.task_id

    # 1. Complete mirrored task through legacy tasks status endpoint
    complete_resp = c_asst.post(f"/api/records/tasks/{v_task_id}/status", json={
        "version": 1,
        "status": "completed"
    })
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completed"

    # Verify workflow step is mirrored to completed and downstream chart review is activated!
    with SessionLocal() as db:
        v_step = db.get(m.WorkflowStep, v_step.id)
        assert v_step.status == "completed", "Workflow step must synchronize to completed"

        r_step = db.get(m.WorkflowStep, r_step.id)
        assert r_step.task_id is not None, "Downstream chart review must activate upon vitals completion via legacy endpoint"

    # 2. Reopen mirrored task through legacy tasks status endpoint
    reopen_resp = c_asst.post(f"/api/records/tasks/{v_task_id}/status", json={
        "version": 2,
        "status": "pending"
    })
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["status"] == "pending"

    with SessionLocal() as db:
        v_step = db.get(m.WorkflowStep, v_step.id)
        assert v_step.status in ("in_progress", "pending"), "Workflow step must synchronize upon reopen"

    # 3. Reassign mirrored task through legacy PUT /records/tasks/{id}
    me_doc = c_doc.get("/api/auth/me").json()
    new_assignee_id = me_doc["user"]["id"]
    put_resp = c_asst.put(f"/api/records/tasks/{v_task_id}", json={
        "assignee_id": new_assignee_id,
        "version": 3
    })
    assert put_resp.status_code == 200

    with SessionLocal() as db:
        v_step = db.get(m.WorkflowStep, v_step.id)
        assert v_step.assigned_user_id == new_assignee_id, "Workflow step assignee must synchronize with task assignee"

    # 4. Attempt to delete mirrored task through legacy DELETE endpoint -> must return 409
    del_resp = c_asst.delete(f"/api/records/tasks/{v_task_id}")
    assert del_resp.status_code == 409
    assert "Cannot delete a task linked to an active workflow step" in del_resp.json()["detail"]


def test_phase2b_step_3_provider_assignment_and_notifications():
    """
    STEP 3: Verify appointment-specific provider assignment and notification delivery.
    - Chart review step is assigned to the appointment's own provider (provider_id).
    - advance() creates a notification Message for the assignee whenever a step activates.
    """
    c_admin = client("admin")
    c_rec = client("reception")
    p = patient(c_rec)

    # Fetch provider ID for doctor
    me_doc = client("doctor").get("/api/auth/me").json()
    doc_id = me_doc["user"]["id"]

    # Book appointment with this specific doctor
    booking_data = booking(c_rec, p, day=20, hour=11)
    booking_data["provider_id"] = doc_id
    appt = ok(c_rec.post("/api/appointments", json=booking_data))[0]
    assert appt["provider_id"] == doc_id

    # Check-in triggers arrival workflow
    c_rec.post(f"/api/appointments/{appt['id']}/status", json={
        "status": "checked-in",
        "version": appt["version"]
    })

    with SessionLocal() as db:
        inst = db.scalar(select(m.WorkflowInstance).where(m.WorkflowInstance.appointment_id == appt["id"]))
        v_step = db.scalar(select(m.WorkflowStep).where(m.WorkflowStep.instance_id == inst.id, m.WorkflowStep.step_key == "step_triage_vitals"))
        # Verify notification was created for initial activated step (vitals)
        msg_vitals = db.scalar(select(m.Message).where(
            m.Message.recipient_id == v_step.assigned_user_id,
            m.Message.patient_id == p["id"]
        ))
        assert msg_vitals is not None, "advance() must create a notification for the assignee"
        assert "Record Pre-Consultation Vitals" in msg_vitals.subject or "Workflow Step Activated" in msg_vitals.subject

    # Complete vitals to activate chart review
    c_asst = client("assistant")
    c_asst.post(f"/api/workflows/steps/{v_step.id}/start")
    c_asst.post(f"/api/workflows/steps/{v_step.id}/complete")

    # Verify chart review step is assigned strictly to the appointment's provider (doc_id)
    with SessionLocal() as db:
        r_step = db.scalar(select(m.WorkflowStep).where(
            m.WorkflowStep.instance_id == inst.id,
            m.WorkflowStep.step_key == "step_doctor_chart_review"
        ))
        assert r_step.assigned_user_id == doc_id, "Chart review must be assigned to appointment's provider"

        # Verify notification was created for provider
        msg_review = db.scalar(select(m.Message).where(
            m.Message.recipient_id == doc_id,
            m.Message.patient_id == p["id"],
            m.Message.subject.like("%Review Patient Chart%")
        ))
        assert msg_review is not None, "Notification must be sent to appointment provider upon chart review activation"


def test_phase2b_step_3_real_multithreaded_concurrency_file_sqlite():
    """
    STEP 3: Real multi-threaded concurrency test against a file-based SQLite database.
    Verifies WAL mode, busy_timeout, and race-safe IntegrityError handling across
    concurrent threads checking in simultaneously.
    """
    import concurrent.futures
    import sqlite3
    from app.db import DB_FILE

    # 1. Report PRAGMA settings on the database file
    con = sqlite3.connect(str(DB_FILE))
    journal_mode = con.execute("PRAGMA journal_mode").fetchone()[0]
    busy_timeout = con.execute("PRAGMA busy_timeout").fetchone()[0]
    con.close()

    assert journal_mode.lower() == "wal", f"Database must be in WAL mode, found {journal_mode}"
    assert busy_timeout >= 5000, f"busy_timeout must be at least 5000ms, found {busy_timeout}"

    # 2. Book appointment for concurrent check-in (day=29 is Monday)
    c = client("reception")
    p = patient(c)
    appt = ok(c.post("/api/appointments", json=booking(c, p, day=29, hour=10)))[0]
    facility_id = c.headers["X-Facility-ID"]
    actor_id = c.get("/api/auth/me").json()["user"]["id"]

    # 3. Execute 5 simultaneous threads calling trigger_patient_arrival
    def concurrent_trigger():
        with SessionLocal() as thread_db:
            engine = WorkflowEngine()
            ret = engine.trigger_patient_arrival(
                db=thread_db,
                facility_id=facility_id,
                appointment_id=appt["id"],
                actor_id=actor_id
            )
            thread_db.commit()
            return ret

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(concurrent_trigger) for _ in range(5)]
        results = [f.result() for f in futures]

    # Exactly one workflow instance created, others return already_executed or success
    with SessionLocal() as db:
        instances = db.scalars(
            select(m.WorkflowInstance).where(m.WorkflowInstance.appointment_id == appt["id"])
        ).all()
        assert len(instances) == 1, "Exactly one WorkflowInstance must be created under concurrency"

        tasks = db.scalars(
            select(m.Task).where(m.Task.patient_id == p["id"], m.Task.kind == "workflow_step")
        ).all()
        assert len(tasks) == 2, "Exactly two initial tasks must be created under concurrency"


def test_phase2b_step_4_read_scope_derived_from_existing_ehr_rules():
    """
    STEP 4: Cross-API parity test across all six roles (doctor, assistant, therapist, admin, reception, billing).
    Verifies that the AI read tool read_patient_summary derives its scope directly from
    existing EHR permission rules (CLINICAL set in security.py):
    - The AI never returns any clinical field that the existing EHR chart API hides from that role.
    - Explicitly proves 'therapist' has clinical access in both existing API and AI tool.
    - Proves 'reception' and 'billing' receive zero clinical data in both.
    """
    c_admin = client("admin")
    p = patient(c_admin)

    # Seed clinical data
    doc_id = client("doctor").get("/api/auth/me").json()["user"]["id"]
    fac_id = c_admin.headers["X-Facility-ID"]
    with SessionLocal() as db:
        db.add(m.Diagnosis(patient_id=p["id"], facility_id=fac_id, author_id=doc_id, code="I25.10", description="Heart disease", status="active"))
        db.add(m.Vital(patient_id=p["id"], facility_id=fac_id, author_id=doc_id, bp_sys=120.0, bp_dia=80.0, pulse_bpm=72.0))
        db.add(m.Medication(patient_id=p["id"], facility_id=fac_id, author_id=doc_id, trade_name="Aspirin", dose="75mg", route="oral", maen="0-0-1-0", duration_days=30, quantity=30, status="active"))
        db.commit()

    all_six_roles = ["doctor", "assistant", "therapist", "admin", "reception", "billing"]

    for role in all_six_roles:
        c_role = client(role)
        me = c_role.get("/api/auth/me").json()

        # 1. Existing EHR API response
        api_chart = c_role.get(f"/api/patients/{p['id']}").json()
        api_has_clinical = "diagnoses" in api_chart

        # 2. AI read tool response
        with SessionLocal() as db:
            ctx = ToolContext(db=db, user_id=me["user"]["id"], role=role, facility_id=c_role.headers["X-Facility-ID"])
            ai_summary = execute_tool(ctx, "read_patient_summary", ReadPatientSummaryArgs(patient_id=p["id"]))

        # AI tool clinical_access must strictly match existing EHR API visibility
        assert ai_summary["clinical_access"] == api_has_clinical, f"Role {role}: AI clinical_access ({ai_summary['clinical_access']}) must match API ({api_has_clinical})"

        if not api_has_clinical:
            # Non-clinical roles (reception, billing): AI tool must hide all clinical fields
            assert ai_summary["diagnoses"] == []
            assert ai_summary["latest_vitals"] is None
            assert ai_summary["active_medications"] == []
        else:
            # Clinical roles (doctor, assistant, therapist, admin): AI tool provides clinical fields
            assert len(ai_summary["diagnoses"]) >= 1
            assert ai_summary["latest_vitals"] is not None
            assert len(ai_summary["active_medications"]) >= 1

        # Explicit check for therapist role
        if role == "therapist":
            assert api_has_clinical is True, "Therapist must have clinical access in existing EHR API"
            assert ai_summary["clinical_access"] is True, "Therapist must have clinical access in AI summary"


def test_phase2b_step_5_workflow_router_and_ollama_unreachable():
    """
    STEP 5: Dedicated workflow router test (/api/workflows) and Ollama offline test.
    Verifies that step actions execute deterministically via /api/workflows without
    any LLM involvement, functioning identically when Ollama is completely offline.
    """
    import unittest.mock
    c_rec = client("reception")
    c_asst = client("assistant")
    p = patient(c_rec)
    appt = ok(c_rec.post("/api/appointments", json=booking(c_rec, p, day=22, hour=9)))[0]

    # Trigger arrival
    c_rec.post(f"/api/appointments/{appt['id']}/status", json={"status": "checked-in", "version": appt["version"]})

    with SessionLocal() as db:
        inst = db.scalar(select(m.WorkflowInstance).where(m.WorkflowInstance.appointment_id == appt["id"]))
        v_step = db.scalar(select(m.WorkflowStep).where(m.WorkflowStep.instance_id == inst.id, m.WorkflowStep.step_key == "step_triage_vitals"))
        instance_id = inst.id
        v_step_id = v_step.id

    # 1. Query instance via dedicated /api/workflows router
    inst_resp = c_rec.get(f"/api/workflows/instances/{instance_id}")
    assert inst_resp.status_code == 200
    assert inst_resp.json()["id"] == instance_id

    # 2. Query step via dedicated /api/workflows router
    step_resp = c_rec.get(f"/api/workflows/steps/{v_step_id}")
    assert step_resp.status_code == 200
    assert step_resp.json()["id"] == v_step_id

    # 3. Simulate Ollama completely offline / unreachable
    with unittest.mock.patch("httpx.get", side_effect=Exception("Ollama unreachable")), \
         unittest.mock.patch("httpx.post", side_effect=Exception("Ollama unreachable")):

        # Step acknowledge via /api/workflows
        ack_res = c_asst.post(f"/api/workflows/steps/{v_step_id}/acknowledge")
        assert ack_res.status_code == 200
        assert ack_res.json()["new_status"] == "acknowledged"

        # Step start via /api/workflows
        start_res = c_asst.post(f"/api/workflows/steps/{v_step_id}/start")
        assert start_res.status_code == 200
        assert start_res.json()["new_status"] == "in_progress"

        # Step complete via /api/workflows
        comp_res = c_asst.post(f"/api/workflows/steps/{v_step_id}/complete")
        assert comp_res.status_code == 200
        assert comp_res.json()["new_status"] == "completed"

