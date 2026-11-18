"""Clinical Tasks, Patient Workflow Templates, Two-Person Edit Lock, Auto-Handoff & Real-Time Notifications."""
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from . import models as m
from .security import context, password_hash


router = APIRouter(prefix='/api')
ALL_STAFF = {'admin', 'doctor', 'assistant', 'therapist', 'reception', 'billing'}
IST = timezone(timedelta(hours=5, minutes=30))

CLINIC_WORKFLOW_STAFF = [
    ('Nathiya', 'nathiya@healyourheart.local', 'billing'),
    ('Issac G', 'issac.g@healyourheart.local', 'reception'),
    ('Ranjitha P', 'ranjitha.p@healyourheart.local', 'billing'),
    ('Sarala D', 'sarala.d@healyourheart.local', 'assistant'),
    ('Jamuna', 'jamuna@healyourheart.local', 'assistant'),
    ('Serina', 'serina@healyourheart.local', 'therapist'),
    ('Mahalakshmi S', 'mahalakshmi.s@healyourheart.local', 'therapist'),
    ('Dr. Elakkiya M', 'dr.elakkiya@healyourheart.local', 'doctor'),
    ('Lisiya Rex', 'lisiya.rex@healyourheart.local', 'assistant'),
    ('Susan Sekar', 'susan.sekar@healyourheart.local', 'reception'),
]

OPTIONAL_LAB_FLOW_STEPS = [
    {
        'step_order': 2,
        'title': 'Complete the Laboratory Testing',
        'short_label': 'Lab Test',
        'default_priority': 'Medium',
        'allowed_assignees': ['Sarala D', 'Jamuna', 'Serina', 'Mahalakshmi S'],
        'sub_types': {
            'Lab Test': ['Sarala D', 'Jamuna'],
            'ECG or Echo Test': ['Serina', 'Mahalakshmi S'],
        },
    },
    {
        'step_order': 3,
        'title': 'Verify Laboratory Report',
        'short_label': 'Verify Lab',
        'default_priority': 'Medium',
        'allowed_assignees': ['Dr. Elakkiya M', 'Lisiya Rex'],
        'sub_types': None,
    },
]

DEFAULT_WORKFLOW_TEMPLATES = [
    {
        'name': 'EECP Lab + Demo',
        'description': 'Full EECP onboarding flow: Billing, Lab/ECG Testing, Report Verification, Demo & Counselling.',
        'has_optional_lab_flow': False,
        'steps': [
            {
                'step_order': 1,
                'title': 'Check the billing and payment done',
                'short_label': 'Billing',
                'default_priority': 'High',
                'allowed_assignees': ['Nathiya', 'Issac G', 'Ranjitha P'],
                'sub_types': None,
            },
            {
                'step_order': 2,
                'title': 'Complete the Laboratory Testing',
                'short_label': 'Lab Test',
                'default_priority': 'Medium',
                'allowed_assignees': ['Sarala D', 'Jamuna', 'Serina', 'Mahalakshmi S'],
                'sub_types': {
                    'Lab Test': ['Sarala D', 'Jamuna'],
                    'ECG or Echo Test': ['Serina', 'Mahalakshmi S'],
                },
            },
            {
                'step_order': 3,
                'title': 'Verify Laboratory Report',
                'short_label': 'Verify Lab',
                'default_priority': 'Medium',
                'allowed_assignees': ['Dr. Elakkiya M', 'Lisiya Rex'],
                'sub_types': None,
            },
            {
                'step_order': 4,
                'title': 'Arrange demo and treatment',
                'short_label': 'Demo',
                'default_priority': 'Medium',
                'allowed_assignees': ['Susan Sekar', 'Issac G'],
                'sub_types': None,
            },
            {
                'step_order': 5,
                'title': 'Complete patient counselling and treatment decision',
                'short_label': 'Counselling',
                'default_priority': 'Medium',
                'allowed_assignees': ['Susan Sekar', 'Issac G'],
                'sub_types': None,
            },
        ],
    },
    {
        'name': 'Lab Alone',
        'description': 'Diagnostic lab/ECG testing and physician verification workflow.',
        'has_optional_lab_flow': False,
        'steps': [
            {
                'step_order': 1,
                'title': 'Complete the Laboratory Testing',
                'short_label': 'Lab Test',
                'default_priority': 'Medium',
                'allowed_assignees': ['Sarala D', 'Jamuna', 'Serina', 'Mahalakshmi S'],
                'sub_types': {
                    'Lab Test': ['Sarala D', 'Jamuna'],
                    'ECG or Echo Test': ['Serina', 'Mahalakshmi S'],
                },
            },
            {
                'step_order': 2,
                'title': 'Verify Laboratory Report',
                'short_label': 'Verify Lab',
                'default_priority': 'Medium',
                'allowed_assignees': ['Dr. Elakkiya M', 'Lisiya Rex'],
                'sub_types': None,
            },
        ],
    },
    {
        'name': 'Lab + Treatment Started',
        'description': 'Lab testing, verification, and EECP treatment slot scheduling & payment.',
        'has_optional_lab_flow': False,
        'steps': [
            {
                'step_order': 1,
                'title': 'Complete the Laboratory Testing',
                'short_label': 'Lab Test',
                'default_priority': 'Medium',
                'allowed_assignees': ['Sarala D', 'Jamuna', 'Serina', 'Mahalakshmi S'],
                'sub_types': {
                    'Lab Test': ['Sarala D', 'Jamuna'],
                    'ECG or Echo Test': ['Serina', 'Mahalakshmi S'],
                },
            },
            {
                'step_order': 2,
                'title': 'Verify Laboratory Report',
                'short_label': 'Verify Lab',
                'default_priority': 'Medium',
                'allowed_assignees': ['Dr. Elakkiya M', 'Lisiya Rex'],
                'sub_types': None,
            },
            {
                'step_order': 3,
                'title': 'Treatment Slots Discussion and payment',
                'short_label': 'Slots & Payment',
                'default_priority': 'High',
                'allowed_assignees': ['Issac G', 'Nathiya', 'Ranjitha P', 'Susan Sekar'],
                'sub_types': None,
            },
        ],
    },
    {
        'name': 'Admission',
        'description': 'Admission room allocation and billing, with optional Laboratory Testing & Verification flow.',
        'has_optional_lab_flow': True,
        'steps': [
            {
                'step_order': 1,
                'title': 'Admission Room allocation and Billing',
                'short_label': 'Admission & Billing',
                'default_priority': 'High',
                'allowed_assignees': ['Susan Sekar', 'Issac G'],
                'sub_types': None,
            },
        ],
    },
]


# --- Pydantic Schemas ---
class WorkflowStepSchema(BaseModel):
    step_order: int = Field(ge=1, le=50)
    title: str = Field(min_length=1, max_length=250)
    short_label: str = Field(default='', max_length=80)
    default_priority: Literal['High', 'Medium', 'Low'] = 'Medium'
    allowed_assignees: list[str] = Field(default_factory=list)
    sub_types: dict[str, list[str]] | None = None


class WorkflowTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str = Field(default='', max_length=1000)
    has_optional_lab_flow: bool = False
    steps: list[WorkflowStepSchema] = Field(min_length=1, max_length=30)


class TemplateStepTaskOverride(BaseModel):
    step_order: int = Field(ge=1, le=50)
    title: str = Field(min_length=1, max_length=250)
    short_label: str = Field(default='', max_length=80)
    sub_type: str = Field(default='', max_length=80)
    priority: Literal['High', 'Medium', 'Low'] = 'Medium'
    assigned_to_user_id: str
    due_date: date | None = None
    comments: str = Field(default='', max_length=4000)


class ClinicalTaskCreate(BaseModel):
    mode: Literal['single', 'template'] = 'single'
    # Single task fields
    category: str = Field(default='General', max_length=150)
    title: str = Field(default='', max_length=250)
    short_label: str = Field(default='', max_length=80)
    sub_type: str = Field(default='', max_length=80)
    priority: Literal['High', 'Medium', 'Low'] = 'Medium'
    assigned_to_user_id: str | None = None
    patient_id: str | None = None
    due_date: date | None = None
    comments: str = Field(default='', max_length=4000)
    # Template run fields
    template_id: str | None = None
    include_lab_flow: bool = False
    steps: list[TemplateStepTaskOverride] = Field(default_factory=list)


class ClinicalTaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=250)
    category: str | None = Field(default=None, max_length=150)
    sub_type: str | None = Field(default=None, max_length=80)
    priority: Literal['High', 'Medium', 'Low'] | None = None
    status: Literal['Pending', 'In-Progress', 'Completed'] | None = None
    assigned_to_user_id: str | None = None
    due_date: date | None = None
    clear_due_date: bool = False
    comments: str | None = Field(default=None, max_length=4000)


class ClinicalTaskBulkDelete(BaseModel):
    task_ids: list[str] = Field(min_length=1, max_length=200)


class ClinicalTaskCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


# --- Seeding ---
def ensure_clinical_tasks_seed_data(db):
    facilities = db.scalars(select(m.Facility).where(m.Facility.active == True)).all()
    if not facilities:
        return

    # 1. Seed the 10 named clinic staff members & link to all active facilities
    pw = password_hash('password123')
    staff_by_name = {}
    for full_name, email, role in CLINIC_WORKFLOW_STAFF:
        user = db.scalar(select(m.User).where(or_(m.User.email == email, m.User.name == full_name)))
        if not user:
            user = m.User(
                id=str(uuid4()),
                email=email,
                name=full_name,
                role=role,
                password_hash=pw,
                active=True,
            )
            db.add(user)
            db.flush()
        staff_by_name[full_name] = user
        for fac in facilities:
            if not db.get(m.UserFacility, (user.id, fac.id)):
                db.add(m.UserFacility(user_id=user.id, facility_id=fac.id))
    db.flush()

    # 2. Seed the 4 Pre-Built Workflow Templates
    for tmpl_def in DEFAULT_WORKFLOW_TEMPLATES:
        existing = db.scalar(
            select(m.WorkflowTemplate).where(
                m.WorkflowTemplate.name == tmpl_def['name'],
                m.WorkflowTemplate.is_system == True,
            )
        )
        if not existing:
            db.add(
                m.WorkflowTemplate(
                    id=str(uuid4()),
                    facility_id=None,
                    name=tmpl_def['name'],
                    description=tmpl_def['description'],
                    is_system=True,
                    has_optional_lab_flow=tmpl_def['has_optional_lab_flow'],
                    steps_json=tmpl_def['steps'],
                    created_at=m.now(),
                    updated_at=m.now(),
                )
            )
        else:
            existing.description = tmpl_def['description']
            existing.has_optional_lab_flow = tmpl_def['has_optional_lab_flow']
            existing.steps_json = tmpl_def['steps']
    db.flush()


# --- Helpers ---
def _today_ist() -> date:
    return datetime.now(IST).date()


def _iso(dt) -> str | None:
    if not dt:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt.isoformat() + 'Z'
    return dt.isoformat()


def _short_label(title: str, explicit: str = '') -> str:
    if explicit and explicit.strip():
        return explicit.strip()
    low = (title or '').lower()
    if 'billing' in low and 'admission' in low:
        return 'Admission & Billing'
    if 'billing' in low or 'payment' in low and 'slot' not in low:
        return 'Billing'
    if 'laboratory testing' in low or 'lab test' in low:
        return 'Lab Test'
    if 'verify' in low and 'lab' in low:
        return 'Verify Lab'
    if 'demo' in low:
        return 'Demo'
    if 'counselling' in low or 'counseling' in low:
        return 'Counselling'
    if 'slot' in low:
        return 'Slots & Payment'
    words = (title or '').strip().split()
    return ' '.join(words[:3]) if words else 'Task'


def _get_task(c, task_id: str) -> m.ClinicalTask:
    task = c.db.get(m.ClinicalTask, task_id)
    if not task or task.facility_id != c.facility_id:
        raise HTTPException(404, 'Task not found in this branch')
    return task


def _check_two_person_lock(c, task: m.ClinicalTask):
    if c.user.id not in (task.created_by_user_id, task.assigned_to_user_id):
        creator = c.db.get(m.User, task.created_by_user_id)
        assignee = c.db.get(m.User, task.assigned_to_user_id)
        creator_name = creator.name if creator else 'Creator'
        assignee_name = assignee.name if assignee else 'Assignee'
        raise HTTPException(
            403,
            f'Editable only by {creator_name} or {assignee_name}',
        )


def _serialize_template(tmpl: m.WorkflowTemplate) -> dict:
    return {
        'id': tmpl.id,
        'facility_id': tmpl.facility_id,
        'name': tmpl.name,
        'description': tmpl.description or '',
        'is_system': bool(tmpl.is_system),
        'has_optional_lab_flow': bool(tmpl.has_optional_lab_flow),
        'steps': tmpl.steps_json or [],
        'optional_lab_steps': OPTIONAL_LAB_FLOW_STEPS if tmpl.has_optional_lab_flow else [],
        'created_by': tmpl.created_by,
        'created_at': _iso(tmpl.created_at),
    }


def _serialize_task(db, task: m.ClinicalTask, current_user_id: str, user_map: dict, patient_map: dict, comment_counts: dict) -> dict:
    creator = user_map.get(task.created_by_user_id)
    assignee = user_map.get(task.assigned_to_user_id)
    patient = patient_map.get(task.patient_id) if task.patient_id else None
    today = _today_ist()
    is_overdue = bool(task.due_date and task.status != 'Completed' and task.due_date < today)
    can_edit = current_user_id in (task.created_by_user_id, task.assigned_to_user_id)
    creator_name = creator.name if creator else 'Staff'
    assignee_name = assignee.name if assignee else 'Unassigned'
    return {
        'id': task.id,
        'facility_id': task.facility_id,
        'patient_id': task.patient_id,
        'patient_name': f'{patient.first_name} {patient.last_name}'.strip() if patient else '',
        'patient_mrn': patient.mrn if patient else '',
        'workflow_instance_id': task.workflow_instance_id,
        'template_id': task.template_id,
        'category': task.category,
        'step_order': task.step_order,
        'short_label': _short_label(task.title, task.short_label),
        'title': task.title,
        'sub_type': task.sub_type or '',
        'priority': task.priority,
        'status': task.status,
        'created_by_user_id': task.created_by_user_id,
        'created_by_name': creator_name,
        'assigned_to_user_id': task.assigned_to_user_id,
        'assigned_to_name': assignee_name,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'is_overdue': is_overdue,
        'comments': task.comments or '',
        'comment_count': int(comment_counts.get(task.id, 0)) + (1 if (task.comments or '').strip() else 0),
        'can_edit': can_edit,
        'lock_reason': '' if can_edit else f'Editable only by {creator_name} or {assignee_name}',
        'completed_at': _iso(task.completed_at),
        'created_at': _iso(task.created_at),
        'updated_at': _iso(task.updated_at),
        'version': task.version,
    }


def _create_notification(db, facility_id: str, user_id: str, task: m.ClinicalTask, kind: str, message: str):
    notif = m.TaskNotification(
        id=str(uuid4()),
        facility_id=facility_id,
        user_id=user_id,
        task_id=task.id,
        kind=kind,
        message=message,
        is_read=False,
        created_at=m.now(),
    )
    db.add(notif)
    return notif


def _load_maps(db, tasks: list[m.ClinicalTask]):
    user_ids = {t.created_by_user_id for t in tasks} | {t.assigned_to_user_id for t in tasks}
    patient_ids = {t.patient_id for t in tasks if t.patient_id}
    task_ids = [t.id for t in tasks]
    user_map = (
        {u.id: u for u in db.scalars(select(m.User).where(m.User.id.in_(user_ids))).all()}
        if user_ids else {}
    )
    patient_map = (
        {p.id: p for p in db.scalars(select(m.Patient).where(m.Patient.id.in_(patient_ids))).all()}
        if patient_ids else {}
    )
    comment_counts = {}
    if task_ids:
        rows = db.execute(
            select(m.ClinicalTaskComment.task_id, func.count(m.ClinicalTaskComment.id))
            .where(m.ClinicalTaskComment.task_id.in_(task_ids))
            .group_by(m.ClinicalTaskComment.task_id)
        ).all()
        comment_counts = {tid: cnt for tid, cnt in rows}
    return user_map, patient_map, comment_counts


def _build_patient_workflows(db, facility_id: str, patient_ids: list[str], current_user_id: str) -> dict[str, list[dict]]:
    if not patient_ids:
        return {}
    tasks = db.scalars(
        select(m.ClinicalTask)
        .where(
            m.ClinicalTask.facility_id == facility_id,
            m.ClinicalTask.patient_id.in_(patient_ids),
        )
        .order_by(m.ClinicalTask.created_at.desc(), m.ClinicalTask.step_order.asc())
    ).all()
    if not tasks:
        return {pid: [] for pid in patient_ids}

    user_map, patient_map, comment_counts = _load_maps(db, tasks)
    grouped: dict[tuple[str, str], list[dict]] = {}
    for task in tasks:
        ser = _serialize_task(db, task, current_user_id, user_map, patient_map, comment_counts)
        wf_key = task.workflow_instance_id or f'single-{task.id}'
        grouped.setdefault((task.patient_id, wf_key), []).append(ser)

    result: dict[str, list[dict]] = {pid: [] for pid in patient_ids}
    for (pid, wf_key), steps in grouped.items():
        steps_sorted = sorted(steps, key=lambda x: (x['step_order'], x['created_at'] or ''))
        completed_count = sum(1 for s in steps_sorted if s['status'] == 'Completed')
        total_count = len(steps_sorted)
        # First Pending step is the primary bottleneck; if none Pending, check In-Progress
        bottleneck = next((s for s in steps_sorted if s['status'] == 'Pending'), None)
        if not bottleneck:
            bottleneck = next((s for s in steps_sorted if s['status'] == 'In-Progress'), None)
        result.setdefault(pid, []).append({
            'workflow_instance_id': wf_key,
            'template_name': steps_sorted[0]['category'] or 'Task',
            'is_workflow': bool(steps_sorted[0]['workflow_instance_id']),
            'completed_count': completed_count,
            'total_count': total_count,
            'is_completed': completed_count == total_count,
            'has_overdue': any(s['is_overdue'] for s in steps_sorted),
            'created_at': steps_sorted[0]['created_at'],
            'bottleneck': {
                'task_id': bottleneck['id'],
                'title': bottleneck['title'],
                'short_label': bottleneck['short_label'],
                'status': bottleneck['status'],
                'assigned_to_name': bottleneck['assigned_to_name'],
                'due_date': bottleneck['due_date'],
                'is_overdue': bottleneck['is_overdue'],
            } if bottleneck else None,
            'steps': steps_sorted,
        })
    # Sort each patient's workflows: active (uncompleted) first, newest first
    for pid in result:
        result[pid].sort(key=lambda w: (w['is_completed'], -(datetime.fromisoformat(w['created_at'].replace('Z', '+00:00')).timestamp() if w['created_at'] else 0)))
    return result


# --- Workflow Template Endpoints ---
@router.get('/workflow-templates')
def list_workflow_templates(c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_clinical_tasks_seed_data(c.db)
    templates = c.db.scalars(
        select(m.WorkflowTemplate)
        .where(
            or_(
                m.WorkflowTemplate.facility_id == None,  # noqa: E711
                m.WorkflowTemplate.facility_id == c.facility_id,
            )
        )
        .order_by(m.WorkflowTemplate.is_system.desc(), m.WorkflowTemplate.created_at.asc())
    ).all()
    # Keep canonical order for the 4 system templates
    order_rank = {t['name']: idx for idx, t in enumerate(DEFAULT_WORKFLOW_TEMPLATES)}
    templates.sort(key=lambda t: (0 if t.is_system else 1, order_rank.get(t.name, 99), t.name.lower()))
    return [_serialize_template(t) for t in templates]


@router.post('/workflow-templates')
def create_workflow_template(data: WorkflowTemplateCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    name = data.name.strip()
    existing = c.db.scalar(
        select(m.WorkflowTemplate).where(
            func.lower(m.WorkflowTemplate.name) == name.lower(),
            or_(
                m.WorkflowTemplate.facility_id == None,  # noqa: E711
                m.WorkflowTemplate.facility_id == c.facility_id,
            ),
        )
    )
    if existing:
        raise HTTPException(409, f'A workflow template named "{name}" already exists.')
    steps_payload = []
    for idx, step in enumerate(sorted(data.steps, key=lambda x: x.step_order), start=1):
        steps_payload.append({
            'step_order': idx,
            'title': step.title.strip(),
            'short_label': _short_label(step.title, step.short_label),
            'default_priority': step.default_priority,
            'allowed_assignees': [a.strip() for a in step.allowed_assignees if a.strip()],
            'sub_types': step.sub_types,
        })
    row = m.WorkflowTemplate(
        id=str(uuid4()),
        facility_id=c.facility_id,
        name=name,
        description=data.description.strip(),
        is_system=False,
        has_optional_lab_flow=data.has_optional_lab_flow,
        steps_json=steps_payload,
        created_by=c.user.id,
        created_at=m.now(),
        updated_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_workflow_template', row, name)
    return _serialize_template(row)


@router.delete('/workflow-templates/{template_id}')
def delete_workflow_template(template_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.WorkflowTemplate, template_id)
    if not row or (row.facility_id is not None and row.facility_id != c.facility_id):
        raise HTTPException(404, 'Workflow template not found')
    if row.is_system:
        raise HTTPException(403, 'Built-in clinical workflow templates cannot be deleted.')
    c.db.delete(row)
    c.audit('delete_workflow_template', row, row.name)
    return {'deleted': True, 'id': template_id}


# --- Clinical Tasks CRUD & Workflow Endpoints ---
@router.get('/clinical-tasks')
def list_clinical_tasks(
    category: str = 'All',
    status: str = 'All',
    owner_id: str = 'All',
    priority: str = 'All',
    q: str = '',
    patient_id: str | None = None,
    c=Depends(context),
):
    c.allow(ALL_STAFF)
    query = select(m.ClinicalTask).where(m.ClinicalTask.facility_id == c.facility_id)
    if category and category != 'All':
        query = query.where(m.ClinicalTask.category == category)
    if status and status != 'All':
        query = query.where(m.ClinicalTask.status == status)
    if owner_id and owner_id != 'All':
        query = query.where(m.ClinicalTask.assigned_to_user_id == owner_id)
    if priority and priority != 'All':
        query = query.where(m.ClinicalTask.priority == priority)
    if patient_id:
        query = query.where(m.ClinicalTask.patient_id == patient_id)

    tasks = c.db.scalars(
        query.order_by(m.ClinicalTask.created_at.desc(), m.ClinicalTask.step_order.asc()).limit(500)
    ).all()
    user_map, patient_map, comment_counts = _load_maps(c.db, tasks)
    rows = [_serialize_task(c.db, t, c.user.id, user_map, patient_map, comment_counts) for t in tasks]

    if q and q.strip():
        needle = q.strip().lower()
        # Also search comment drawer bodies
        task_ids = [r['id'] for r in rows]
        comment_matched_ids = set()
        if task_ids:
            matched_comments = c.db.scalars(
                select(m.ClinicalTaskComment.task_id).where(
                    m.ClinicalTaskComment.task_id.in_(task_ids),
                    m.ClinicalTaskComment.body.ilike(f'%{needle}%'),
                )
            ).all()
            comment_matched_ids = set(matched_comments)
        rows = [
            r for r in rows
            if needle in r['title'].lower()
            or needle in r['comments'].lower()
            or needle in r['category'].lower()
            or needle in r['patient_name'].lower()
            or needle in r['patient_mrn'].lower()
            or needle in r['assigned_to_name'].lower()
            or r['id'] in comment_matched_ids
        ]
    return rows


@router.post('/clinical-tasks')
def create_clinical_tasks(data: ClinicalTaskCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    if data.patient_id:
        patient = c.patient(data.patient_id)
        patient_label = f'{patient.first_name} {patient.last_name}'.strip()
    else:
        patient = None
        patient_label = ''

    created_tasks: list[m.ClinicalTask] = []

    if data.mode == 'single':
        if not data.title.strip():
            raise HTTPException(422, 'Task title is required')
        assignee_id = data.assigned_to_user_id or c.user.id
        assignee = c.staff(assignee_id)
        task = m.ClinicalTask(
            id=str(uuid4()),
            facility_id=c.facility_id,
            patient_id=data.patient_id,
            workflow_instance_id=None,
            template_id=data.template_id,
            category=(data.category or 'General').strip(),
            step_order=1,
            short_label=_short_label(data.title, data.short_label),
            title=data.title.strip(),
            sub_type=(data.sub_type or '').strip(),
            priority=data.priority,
            status='Pending',
            created_by_user_id=c.user.id,
            assigned_to_user_id=assignee.id,
            due_date=data.due_date,
            comments=(data.comments or '').strip(),
            created_at=m.now(),
            updated_at=m.now(),
        )
        c.db.add(task)
        c.db.flush()
        msg = f'New task assigned by {c.user.name}: {task.title}'
        if patient_label:
            msg += f' ({patient_label})'
        _create_notification(c.db, c.facility_id, assignee.id, task, 'assigned', msg)
        c.audit('create_clinical_task', task, task.title)
        created_tasks.append(task)
    else:
        if not data.template_id:
            raise HTTPException(422, 'Please select a workflow template')
        tmpl = c.db.get(m.WorkflowTemplate, data.template_id)
        if not tmpl or (tmpl.facility_id is not None and tmpl.facility_id != c.facility_id):
            raise HTTPException(404, 'Workflow template not found')
        if not data.steps:
            raise HTTPException(422, 'Workflow template requires at least one step')

        wf_instance_id = str(uuid4())
        sorted_steps = sorted(data.steps, key=lambda s: s.step_order)
        for idx, step in enumerate(sorted_steps, start=1):
            assignee = c.staff(step.assigned_to_user_id)
            task = m.ClinicalTask(
                id=str(uuid4()),
                facility_id=c.facility_id,
                patient_id=data.patient_id,
                workflow_instance_id=wf_instance_id,
                template_id=tmpl.id,
                category=tmpl.name,
                step_order=idx,
                short_label=_short_label(step.title, step.short_label),
                title=step.title.strip(),
                sub_type=(step.sub_type or '').strip(),
                priority=step.priority,
                status='Pending',
                created_by_user_id=c.user.id,
                assigned_to_user_id=assignee.id,
                due_date=step.due_date,
                comments=(step.comments or '').strip(),
                created_at=m.now(),
                updated_at=m.now(),
            )
            c.db.add(task)
            c.db.flush()
            created_tasks.append(task)
            # Trigger immediate notification for Step 1 (next steps auto-handoff on completion!)
            if idx == 1:
                msg = f'Workflow "{tmpl.name}" Step 1 assigned by {c.user.name}: {task.title}'
                if patient_label:
                    msg += f' ({patient_label})'
                _create_notification(c.db, c.facility_id, assignee.id, task, 'assigned', msg)
            c.audit('create_clinical_task', task, f'{tmpl.name} step {idx}')

    user_map, patient_map, comment_counts = _load_maps(c.db, created_tasks)
    return [_serialize_task(c.db, t, c.user.id, user_map, patient_map, comment_counts) for t in created_tasks]


@router.put('/clinical-tasks/{task_id}')
@router.patch('/clinical-tasks/{task_id}')
def update_clinical_task(task_id: str, data: ClinicalTaskUpdate, c=Depends(context)):
    c.allow(ALL_STAFF)
    task = _get_task(c, task_id)
    # STRICT TWO-PERSON EDIT LOCK
    _check_two_person_lock(c, task)

    prev_status = task.status
    prev_assignee = task.assigned_to_user_id

    if data.title is not None:
        task.title = data.title.strip()
        task.short_label = _short_label(task.title)
    if data.category is not None:
        task.category = data.category.strip()
    if data.sub_type is not None:
        task.sub_type = data.sub_type.strip()
    if data.priority is not None:
        task.priority = data.priority
    if data.comments is not None:
        task.comments = data.comments.strip()
    if data.clear_due_date:
        task.due_date = None
    elif data.due_date is not None:
        task.due_date = data.due_date
    if data.assigned_to_user_id is not None and data.assigned_to_user_id != task.assigned_to_user_id:
        new_assignee = c.staff(data.assigned_to_user_id)
        task.assigned_to_user_id = new_assignee.id
        patient = c.db.get(m.Patient, task.patient_id) if task.patient_id else None
        p_label = f' ({patient.first_name} {patient.last_name})'.strip() if patient else ''
        _create_notification(
            c.db,
            c.facility_id,
            new_assignee.id,
            task,
            'assigned',
            f'Task reassigned to you by {c.user.name}: {task.title}{(" " + p_label) if p_label else ""}',
        )

    handoff_task = None
    if data.status is not None:
        task.status = data.status
        if data.status == 'Completed':
            task.completed_at = m.now()
            # Mark any unread notifications for this completed task as read for current user
            for n in c.db.scalars(
                select(m.TaskNotification).where(
                    m.TaskNotification.task_id == task.id,
                    m.TaskNotification.user_id == c.user.id,
                    m.TaskNotification.is_read == False,  # noqa: E712
                )
            ).all():
                n.is_read = True
            # AUTO-HANDOFF: Notify assignee of Step N+1 when Step N transitions to Completed!
            if prev_status != 'Completed' and task.workflow_instance_id:
                next_task = c.db.scalar(
                    select(m.ClinicalTask)
                    .where(
                        m.ClinicalTask.workflow_instance_id == task.workflow_instance_id,
                        m.ClinicalTask.step_order > task.step_order,
                        m.ClinicalTask.status != 'Completed',
                    )
                    .order_by(m.ClinicalTask.step_order.asc())
                    .limit(1)
                )
                if next_task:
                    handoff_task = next_task
                    patient = c.db.get(m.Patient, next_task.patient_id) if next_task.patient_id else None
                    p_label = f'{patient.first_name} {patient.last_name}'.strip() if patient else ''
                    handoff_msg = (
                        f'Handoff ready! "{task.title}" completed by {c.user.name}. '
                        f'Next step for you: {next_task.title}'
                        + (f' ({p_label})' if p_label else '')
                    )
                    _create_notification(c.db, c.facility_id, next_task.assigned_to_user_id, next_task, 'handoff', handoff_msg)
        else:
            task.completed_at = None

    task.version += 1
    task.updated_at = m.now()
    c.audit('update_clinical_task', task, f'{prev_status}->{task.status}')
    user_map, patient_map, comment_counts = _load_maps(c.db, [task] + ([handoff_task] if handoff_task else []))
    result = _serialize_task(c.db, task, c.user.id, user_map, patient_map, comment_counts)
    if handoff_task:
        assignee = user_map.get(handoff_task.assigned_to_user_id)
        result['handoff'] = {
            'next_task_id': handoff_task.id,
            'next_task_title': handoff_task.title,
            'next_assignee_name': assignee.name if assignee else '',
        }
    return result


@router.delete('/clinical-tasks/{task_id}')
def delete_clinical_task(task_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    task = _get_task(c, task_id)
    _check_two_person_lock(c, task)
    c.db.delete(task)
    c.audit('delete_clinical_task', task, task.title)
    return {'deleted': True, 'id': task_id}


@router.post('/clinical-tasks/bulk-delete')
def bulk_delete_clinical_tasks(data: ClinicalTaskBulkDelete, c=Depends(context)):
    c.allow(ALL_STAFF)
    deleted = 0
    for tid in data.task_ids:
        task = _get_task(c, tid)
        _check_two_person_lock(c, task)
        c.db.delete(task)
        c.audit('delete_clinical_task', task, task.title)
        deleted += 1
    return {'deleted': deleted}


# --- Comments Drawer Endpoints ---
@router.get('/clinical-tasks/{task_id}/comments')
def list_task_comments(task_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    task = _get_task(c, task_id)
    comments = c.db.scalars(
        select(m.ClinicalTaskComment)
        .where(m.ClinicalTaskComment.task_id == task.id)
        .order_by(m.ClinicalTaskComment.created_at.asc())
    ).all()
    author_ids = {cm.author_id for cm in comments} | {task.created_by_user_id}
    authors = {u.id: u.name for u in c.db.scalars(select(m.User).where(m.User.id.in_(author_ids))).all()}
    result = []
    if (task.comments or '').strip():
        result.append({
            'id': f'initial-{task.id}',
            'task_id': task.id,
            'author_id': task.created_by_user_id,
            'author_name': authors.get(task.created_by_user_id, 'Staff'),
            'body': task.comments.strip(),
            'created_at': _iso(task.created_at),
            'is_initial': True,
        })
    for cm in comments:
        result.append({
            'id': cm.id,
            'task_id': cm.task_id,
            'author_id': cm.author_id,
            'author_name': authors.get(cm.author_id, 'Staff'),
            'body': cm.body,
            'created_at': _iso(cm.created_at),
            'is_initial': False,
        })
    return result


@router.post('/clinical-tasks/{task_id}/comments')
def add_task_comment(task_id: str, data: ClinicalTaskCommentCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    task = _get_task(c, task_id)
    row = m.ClinicalTaskComment(
        id=str(uuid4()),
        task_id=task.id,
        author_id=c.user.id,
        body=data.body.strip(),
        created_at=m.now(),
    )
    c.db.add(row)
    c.audit('add_clinical_task_comment', row, task.title)
    return {
        'id': row.id,
        'task_id': row.task_id,
        'author_id': row.author_id,
        'author_name': c.user.name,
        'body': row.body,
        'created_at': _iso(row.created_at),
        'is_initial': False,
    }


# --- Workflow Progress Endpoints (Calendar Cards + Patient Messages / Overview) ---
@router.get('/patients/{patient_id}/workflow-progress')
def get_patient_workflow_progress(patient_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    c.patient(patient_id)
    data = _build_patient_workflows(c.db, c.facility_id, [patient_id], c.user.id)
    return data.get(patient_id, [])


@router.get('/clinical-tasks/workflow-progress-batch')
def get_batch_workflow_progress(patient_ids: str = Query(default=''), c=Depends(context)):
    c.allow(ALL_STAFF)
    ids = [pid.strip() for pid in patient_ids.split(',') if pid.strip()][:100]
    return _build_patient_workflows(c.db, c.facility_id, ids, c.user.id)


# --- Real-Time Assignment Popup Notifications ---
@router.get('/clinical-tasks/notifications')
def list_task_notifications(c=Depends(context)):
    c.allow(ALL_STAFF)
    notifs = c.db.scalars(
        select(m.TaskNotification)
        .where(
            m.TaskNotification.facility_id == c.facility_id,
            m.TaskNotification.user_id == c.user.id,
        )
        .order_by(m.TaskNotification.is_read.asc(), m.TaskNotification.created_at.desc())
        .limit(30)
    ).all()
    task_ids = [n.task_id for n in notifs]
    tasks = (
        {t.id: t for t in c.db.scalars(select(m.ClinicalTask).where(m.ClinicalTask.id.in_(task_ids))).all()}
        if task_ids else {}
    )
    user_map, patient_map, comment_counts = _load_maps(c.db, list(tasks.values()))
    items = []
    for n in notifs:
        task = tasks.get(n.task_id)
        if not task:
            continue
        ser = _serialize_task(c.db, task, c.user.id, user_map, patient_map, comment_counts)
        items.append({
            'id': n.id,
            'kind': n.kind,
            'message': n.message,
            'is_read': bool(n.is_read),
            'created_at': _iso(n.created_at),
            'task': ser,
        })

    today = _today_ist()
    overdue_count = c.db.scalar(
        select(func.count(m.ClinicalTask.id)).where(
            m.ClinicalTask.facility_id == c.facility_id,
            m.ClinicalTask.assigned_to_user_id == c.user.id,
            m.ClinicalTask.status != 'Completed',
            m.ClinicalTask.due_date != None,  # noqa: E711
            m.ClinicalTask.due_date < today,
        )
    ) or 0
    unread_count = sum(1 for item in items if not item['is_read'])
    return {
        'unread_count': unread_count,
        'overdue_count': int(overdue_count),
        'notifications': items,
    }


@router.post('/clinical-tasks/notifications/{notification_id}/read')
def mark_notification_read(notification_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.TaskNotification, notification_id)
    if not row or row.user_id != c.user.id or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Notification not found')
    row.is_read = True
    return {'ok': True, 'id': notification_id}


@router.post('/clinical-tasks/notifications/read-all')
def mark_all_notifications_read(c=Depends(context)):
    c.allow(ALL_STAFF)
    rows = c.db.scalars(
        select(m.TaskNotification).where(
            m.TaskNotification.facility_id == c.facility_id,
            m.TaskNotification.user_id == c.user.id,
            m.TaskNotification.is_read == False,  # noqa: E712
        )
    ).all()
    for row in rows:
        row.is_read = True
    return {'ok': True, 'marked': len(rows)}
