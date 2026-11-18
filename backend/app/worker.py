"""
Durable local background worker for Heal Your Heart EHR.

Processes asynchronous jobs including:
1. Internal recall scans (recall, recall_scan)
2. Patient arrival workflow jobs (patient_arrival)

Enforces:
- Safe execution with error catching
- Idempotent workflow execution
- Failure logging (no infinite retry loops, transitions to 'failed' on unrecoverable error)
- Outbound delivery protection (internal worklist only)
"""
import json
import time
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select

from .db import SessionLocal, lock_writes
from .models import Job, Task, now

logger = logging.getLogger("ehr.worker")


def run_once() -> bool:
    """
    Executes a single pending background job idempotently.
    Returns True if a job was processed, False if queue was empty.
    """
    with SessionLocal() as db:
        lock_writes(db)
        job = db.scalar(
            select(Job).where(Job.status == 'pending').order_by(Job.created_at)
        )
        if not job:
            db.commit()
            return False

        try:
            if job.kind in ('recall', 'recall_scan'):
                today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
                rows = db.scalars(
                    select(Task).where(
                        Task.facility_id == job.facility_id,
                        Task.kind == 'recall',
                        Task.status == 'pending',
                        Task.due_date <= today
                    )
                ).all()
                job.result = json.dumps({
                    'due_recalls': len(rows),
                    'delivery': 'Internal worklist only; outbound messaging disabled'
                })
                job.status = 'completed'
                job.completed_at = now()

            elif job.kind == 'patient_arrival':
                from .workflow_engine import WorkflowEngine
                payload = {}
                if job.result:
                    try:
                        payload = json.loads(job.result)
                    except Exception:
                        pass
                appointment_id = payload.get('appointment_id')
                actor_id = payload.get('actor_id')

                if not appointment_id:
                    job.status = 'failed'
                    job.result = json.dumps({'error': 'Missing appointment_id in job payload'})
                    job.completed_at = now()
                else:
                    engine = WorkflowEngine()
                    wf_result = engine.trigger_patient_arrival(
                        db=db,
                        facility_id=job.facility_id,
                        appointment_id=appointment_id,
                        actor_id=actor_id or job.id
                    )
                    job.status = 'completed' if wf_result.get('status') in ('success', 'already_executed') else 'failed'
                    job.result = json.dumps(wf_result)
                    job.completed_at = now()

            elif job.kind == 'workflow_order_hook_retry':
                from .workflow_engine import WorkflowEngine
                from . import models as m
                payload = {}
                if job.result:
                    try:
                        payload = json.loads(job.result)
                    except Exception:
                        pass
                order_id = payload.get('order_id')
                actor_id = payload.get('actor_id', job.id)
                order = db.get(m.ClinicalOrder, order_id) if order_id else None
                if order:
                    engine = WorkflowEngine()
                    step = engine.handle_order_created(db, order, actor_id)
                    job.status = 'completed'
                    job.result = json.dumps({'status': 'success', 'step_id': step.id if step else None})
                    job.completed_at = now()
                else:
                    job.status = 'failed'
                    job.result = json.dumps({'error': 'Order not found for retry'})
                    job.completed_at = now()

            else:
                # Unknown job kind: mark failed safely to prevent infinite loops
                logger.warning(f"Unknown job kind: {job.kind} (id: {job.id})")
                job.status = 'failed'
                job.result = json.dumps({'error': f"Unsupported job kind: {job.kind}"})
                job.completed_at = now()

        except Exception as exc:
            logger.error(f"Worker job execution failed for {job.id} ({job.kind}): {exc}", exc_info=True)
            job.status = 'failed'
            job.result = json.dumps({'error': str(exc), 'failed_at': now().isoformat()})
            job.completed_at = now()

        db.commit()
        return True


if __name__ == '__main__':
    while True:
        try:
            run_once()
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
        time.sleep(5)
