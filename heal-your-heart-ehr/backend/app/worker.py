"""Durable local worker. Only internal recall scans; no external delivery adapters."""
import json
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select
from .db import SessionLocal, lock_writes
from .models import Job, Task, now


def run_once():
    with SessionLocal() as db:
        lock_writes(db)
        job=db.scalar(select(Job).where(Job.status=='pending').order_by(Job.created_at))
        if not job:
            db.commit(); return False
        today=datetime.now(ZoneInfo('Asia/Kolkata')).date()
        rows=db.scalars(select(Task).where(Task.facility_id==job.facility_id,Task.kind=='recall',Task.status=='pending',Task.due_date<=today)).all()
        job.result=json.dumps({'due_recalls':len(rows),'delivery':'Internal worklist only; outbound messaging disabled'})
        job.status='completed'; job.completed_at=now(); db.commit(); return True


if __name__=='__main__':
    while True:
        run_once()
        time.sleep(5)
