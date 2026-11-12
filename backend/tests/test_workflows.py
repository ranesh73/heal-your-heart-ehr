import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

# This suite is isolated from the local demonstration database.
os.environ['EHR_DATA_DIR']=tempfile.mkdtemp(prefix='ehr-tests-')
if os.getenv('EHR_TEST_DATABASE_URL'):
    if not os.environ['EHR_TEST_DATABASE_URL'].split('?',1)[0].endswith('_test'):
        raise RuntimeError('Test database name must end in _test')
    os.environ['DATABASE_URL']=os.environ['EHR_TEST_DATABASE_URL']
else:
    os.environ.pop('DATABASE_URL',None)

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from app.main import app
from app.db import SessionLocal, engine, lock_writes
from app.models import User, Facility, UserFacility, Patient, Encounter
from app.seed import seed
from app.security import password_hash
from app.worker import run_once

PASSWORD='Test-only-'+uuid4().hex


@pytest.fixture(scope='session',autouse=True)
def setup():
    command.upgrade(Config('alembic.ini'),'head')
    with SessionLocal() as db:
        lock_writes(db); seed(db,PASSWORD); db.commit()
    yield


def client(role='doctor',facility=None):
    c=TestClient(app)
    response=c.post('/api/auth/login',json={'email':role+'@demo.local','password':PASSWORD})
    assert response.status_code==200,response.text
    c.headers['X-CSRF-Token']=response.json()['csrf']
    me=c.get('/api/auth/me').json()
    # Pick Neelankarai explicitly; UUID order is not a branch preference.
    c.headers['X-Facility-ID']=facility or next(x['id'] for x in me['facilities'] if x['code']=='HYN')
    return c


def ok(response,status=200):
    assert response.status_code==status,response.text
    return response.json()


def patient(c,name=None):
    return ok(c.post('/api/patients',json={'first_name':name or 'Workflow'+uuid4().hex[:8],'last_name':'Synthetic','dob':'1970-01-12','sex':'Female','facility_ids':[c.headers['X-Facility-ID']]}))


def staff(c,role):
    return next(x for x in ok(c.get('/api/staff')) if x['role']==role)


def date_slot(day=1,hour=10):
    # Known future Monday plus whole weeks makes independent fixtures deterministic.
    return f'2032-03-{day:02d}T{hour:02d}:00:00+05:30'


def note_payload(version=1):
    return {'version':version,'chief_complaint':'Synthetic workflow observation','hpi':'Fictional training history',
        'objective':'Recorded for software testing','assessment':'Training assessment','plan':'Demonstration follow-up only',
        'symptoms':[{'name':'Swelling in legs','response':'Not assessed','narrative':''}]}


def encounter(c,p):
    return ok(c.post('/api/encounters',json={'patient_id':p['id'],'provider_id':staff(c,'doctor')['id'],'assistant_id':staff(c,'assistant')['id']}))


def booking(c,p,day=1,hour=10,**kwargs):
    return {'patient_id':p['id'],'provider_id':staff(c,'doctor')['id'],'start_at':date_slot(day,hour),'duration_minutes':30,'visit_type':'Test consultation',**kwargs}


def test_reception_registration_search_booking_checkin():
    c=client('reception');p=patient(c)
    found=ok(c.get('/api/patients',params={'q':p['mrn']}))
    assert found['total']==1 and found['items'][0]['id']==p['id']
    a=ok(c.post('/api/appointments',json=booking(c,p)))[0]
    a=ok(c.post(f"/api/appointments/{a['id']}/status",json={'version':a['version'],'status':'checked-in'}))
    assert a['status']=='checked-in' and a['checked_in_at'].endswith('Z')
    chart=ok(c.get('/api/patients/'+p['id']))
    assert 'encounters' not in chart and 'vitals' not in chart


def test_appointment_label_is_saved_without_changing_lifecycle_status():
    c=client('reception');p=patient(c)
    a=ok(c.post('/api/appointments',json=booking(c,p,day=10,hour=19)))[0]
    labeled=ok(c.post(f"/api/appointments/{a['id']}/label",json={
        'version':a['version'],'label':'Patient Discontinued',
    }))
    assert labeled['status_label']=='Patient Discontinued'
    assert labeled['status']=='confirmed'
    labeled=ok(c.post(f"/api/appointments/{a['id']}/label",json={
        'version':labeled['version'],'label':'Custom Calendar Status',
    }))
    checked_in=ok(c.post(f"/api/appointments/{a['id']}/status",json={
        'version':labeled['version'],'status':'checked-in',
    }))
    assert checked_in['status']=='checked-in' and checked_in['status_label'] is None
    ok(c.post(f"/api/appointments/{a['id']}/label",json={
        'version':checked_in['version'],'label':'x'*81,
    }),422)


def test_duplicates_and_patient_updates_require_current_version():
    c=client('reception');p=patient(c)
    body={'first_name':p['first_name'],'last_name':p['last_name'],'dob':p['dob'],'sex':p['sex'],'facility_ids':p['facility_ids']}
    ok(c.post('/api/patients',json=body),409)
    body['duplicate_reason']='Reviewed as a separate synthetic patient'
    ok(c.post('/api/patients',json=body))
    ok(c.put('/api/patients/'+p['id']+'?version=99',json=body),409)
    body['phone']='TEST-EXT-100'
    edited=ok(c.put('/api/patients/'+p['id']+'?version=1',json=body))
    assert edited['version']==2 and edited['phone']=='TEST-EXT-100'


def test_doctor_assistant_sign_amend_and_immutable_database():
    doctor=client();p=patient(doctor);e=encounter(doctor,p)
    assistant=client('assistant')
    v=ok(assistant.post('/api/records/vitals',json={'patient_id':p['id'],'encounter_id':e['id'],'bp_sys':123,'bp_dia':77,'spo2_pct':98,'central_sys':115,'cr_pwv':7.1}))
    assert v['patient_id']==p['id']
    ok(assistant.post('/api/encounters/'+e['id']+'/sign',json={'version':1}),403)
    saved=ok(doctor.put('/api/encounters/'+e['id'],json=note_payload()))
    ok(doctor.put('/api/encounters/'+e['id'],json=note_payload()),409)
    chart=ok(doctor.get('/api/patients/'+p['id']))
    assert chart['vitals'][0]['id']==v['id']
    signed=ok(doctor.post('/api/encounters/'+e['id']+'/sign',json={'version':saved['version']}))
    assert signed['status']=='signed' and len(signed['signature_digest'])==64
    ok(doctor.put('/api/encounters/'+e['id'],json=note_payload(signed['version'])),409)
    amended=ok(doctor.post('/api/encounters/'+e['id']+'/amend',json={'reason':'Training correction','content':'Append-only correction for verification.'}))
    assert amended['assessment']==signed['assessment'] and len(amended['amendments'])==1
    with engine.connect() as connection:
        with pytest.raises(Exception): connection.execute(text("UPDATE encounters SET assessment='overwrite' WHERE id=:id"),{'id':e['id']})
        connection.rollback()
    history=ok(doctor.get('/api/encounters/'+e['id']+'/history'))
    assert any(x['action']=='signed' for x in history)


def test_carry_forward_is_attributed_and_same_patient_only():
    c=client();p=patient(c);prior=encounter(c,p)
    saved=ok(c.put('/api/encounters/'+prior['id'],json=note_payload()))
    ok(c.post('/api/encounters/'+prior['id']+'/sign',json={'version':saved['version']}))
    e=encounter(c,p)
    carried=ok(c.post('/api/encounters/'+e['id']+'/carry-forward',json={'version':1,'source_id':prior['id'],'section':'hpi'}))
    assert '[Historical text from' in carried['hpi'] and carried['carry_forwards'][0]['source_id']==prior['id']
    other=encounter(c,patient(c))
    ok(c.post('/api/encounters/'+other['id']+'/carry-forward',json={'version':1,'source_id':prior['id'],'section':'hpi'}),422)


def test_assistant_assignment_and_cross_patient_link_rejected():
    c=client();p=patient(c);e=encounter(c,p);other=patient(c)
    assistant=client('assistant')
    ok(assistant.post('/api/records/vitals',json={'patient_id':other['id'],'encounter_id':e['id'],'bp_sys':120}),422)
    ok(assistant.post('/api/records/vitals',json={'patient_id':p['id'],'bp_sys':120}),422)
    e2=ok(c.post('/api/encounters',json={'patient_id':p['id'],'provider_id':staff(c,'doctor')['id']}))
    ok(assistant.post('/api/records/vitals',json={'patient_id':p['id'],'encounter_id':e2['id'],'bp_sys':120}),403)
    ok(c.post('/api/records/vitals',json={'patient_id':p['id'],'spo2_pct':101}),422)


def test_scheduling_conflicts_recurrence_rollback_and_reschedule():
    c=client('reception');p=patient(c)
    a=ok(c.post('/api/appointments',json=booking(c,p,day=8,hour=10)))[0]
    ok(c.post('/api/appointments',json=booking(c,patient(c),day=8,hour=10)),409)
    # First new occurrence would fit; second conflicts. Neither may persist.
    before=len(ok(c.get('/api/appointments')))
    ok(c.post('/api/appointments',json=booking(c,p,day=1,hour=10,repeat_count=2,interval_days=7)),409)
    assert len(ok(c.get('/api/appointments')))==before
    moved=ok(c.post('/api/appointments/'+a['id']+'/reschedule',json={'version':a['version'],'start_at':date_slot(8,12),'duration_minutes':30,'provider_id':a['provider_id'],'resource_id':None,'reason':'Synthetic schedule correction'}))
    assert moved['id']==a['id'] and moved['start_at']!=a['start_at']
    ok(c.post('/api/appointments',json=booking(c,p,day=8,hour=22)),409)


def eecp_setup(c,count=2,day=15):
    p=patient(c);plan=ok(c.post('/api/eecp/plans',json={'patient_id':p['id'],'session_count':count,'therapist_id':staff(c,'therapist')['id'],'start_date':'2032-03-01'}))
    bed=next(r for r in ok(c.get('/api/resources')) if r['kind']=='EECP bed')
    appointments=ok(c.post('/api/appointments',json=booking(c,p,day=day,hour=10,plan_id=plan['id'],provider_id=plan['therapist_id'],resource_id=bed['id'],duration_minutes=60,repeat_count=count)))
    return p,plan,appointments


def test_eecp_authorization_consent_daily_weekly_progress():
    doctor=client();p,plan,appointments=eecp_setup(doctor)
    therapist=client('therapist');a=appointments[0]
    a=ok(therapist.post('/api/appointments/'+a['id']+'/status',json={'version':1,'status':'checked-in'}))
    ok(therapist.post('/api/eecp/appointments/'+a['id']+'/start',json={'version':a['version']}),409)
    ok(therapist.post('/api/eecp/plans/'+plan['id']+'/authorize',json={'version':1}),403)
    plan=ok(doctor.post('/api/eecp/plans/'+plan['id']+'/authorize',json={'version':1}))
    ok(therapist.post('/api/eecp/appointments/'+a['id']+'/start',json={'version':a['version']}),409)
    doc=ok(doctor.post('/api/documents',data={'patient_id':p['id'],'title':'Synthetic signed consent'},files={'file':('consent.pdf',b'%PDF-1.4\nSynthetic consent test','application/pdf')}))
    plan=ok(doctor.post('/api/eecp/plans/'+plan['id']+'/consent',json={'version':plan['version'],'document_id':doc['id']}))
    session=ok(therapist.post('/api/eecp/appointments/'+a['id']+'/start',json={'version':a['version']}))
    partial=ok(therapist.put('/api/eecp/sessions/'+session['id'],json={'version':1,'pre_hr':72,'pressure_unit':'mmHg'}))
    ok(therapist.post('/api/eecp/sessions/'+session['id']+'/complete',json={'version':partial['version']}),422)
    values={'version':partial['version'],'pressure_unit':'mmHg','pre_o2_l':0,'pre_weight_kg':70,'pre_bp_sys':124,'pre_bp_dia':78,'pre_hr':72,'pre_spo2':98}
    for minute in (15,45):
        values.update({f'min{minute}_ds_peak':1.2,f'min{minute}_ds_area':1.1,f'min{minute}_hr':73,f'min{minute}_pressure':200})
    saved=ok(therapist.put('/api/eecp/sessions/'+session['id'],json=values))
    completed=ok(therapist.post('/api/eecp/sessions/'+session['id']+'/complete',json={'version':saved['version']}))
    assert completed['plan']['completed']==1 and completed['session']['status']=='completed'
    ok(therapist.put('/api/eecp/sessions/'+session['id'],json={**values,'version':completed['session']['version']}),409)
    weekly=ok(therapist.post('/api/records/weekly',json={'patient_id':p['id'],'plan_id':plan['id'],'week_number':1,'nyha_class':'II','ccs_class':'II','qol_score':1,'walk_distance_m':350}))
    review=ok(doctor.post('/api/eecp/weekly/'+weekly['id']+'/review',json={'version':1,'evaluation':'Synthetic physician review'}))
    assert review['physician_id']==staff(doctor,'doctor')['id']


def test_billing_installments_idempotency_credit_balance():
    c=client('reception');p=patient(c)
    inv=ok(c.post('/api/invoices',json={'patient_id':p['id'],'lines':[{'description':'Synthetic EECP package','quantity':35,'unit_paise':350000}],'discount_paise':50000}))
    assert inv['total_paise']==12200000
    payload={'amount_paise':200000,'mode':'UPI','idempotency_key':uuid4().hex,'simulated':True}
    paid=ok(c.post('/api/invoices/'+inv['id']+'/payments',json=payload))
    replay=ok(c.post('/api/invoices/'+inv['id']+'/payments',json=payload))
    assert replay['replayed'] and replay['receipt']['id']==paid['receipt']['id']
    assert paid['invoice']['balance_paise']==12000000 and paid['invoice']['status']=='partial'
    ok(c.post('/api/invoices/'+inv['id']+'/payments',json={**payload,'amount_paise':300000}),409)
    ok(c.post('/api/invoices/'+inv['id']+'/payments',json={**payload,'simulated':False}),422)
    credited=ok(c.post('/api/invoices/'+inv['id']+'/credits',json={'amount_paise':100000,'reason':'Synthetic discount correction'}))
    assert credited['balance_paise']==11900000
    final=ok(c.post('/api/invoices/'+inv['id']+'/payments',json={**payload,'idempotency_key':uuid4().hex,'amount_paise':11900000}))
    assert final['invoice']['status']=='paid' and final['invoice']['balance_paise']==0
    ok(c.post('/api/invoices/'+inv['id']+'/payments',json={**payload,'idempotency_key':uuid4().hex}),409)


def test_concurrent_bookings_and_payments_do_not_overbook_or_overpay():
    reception=client('reception');p=patient(reception);p2=patient(reception)
    clients=[client('reception'),client('reception')]
    bodies=[booking(reception,p,day=22,hour=14),booking(reception,p2,day=22,hour=14)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(lambda i:clients[i].post('/api/appointments',json=bodies[i]),range(2)))
    assert sorted(r.status_code for r in responses)==[200,409]
    inv=ok(reception.post('/api/invoices',json={'patient_id':p['id'],'lines':[{'description':'Test service','quantity':1,'unit_paise':10000}]}))
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(lambda i:clients[i].post('/api/invoices/'+inv['id']+'/payments',json={'amount_paise':10000,'mode':'Cash','idempotency_key':uuid4().hex}),range(2)))
    assert sorted(r.status_code for r in responses)==[200,409]


def test_branch_permissions_and_protected_documents():
    doctor=client();p=patient(doctor)
    doc=ok(doctor.post('/api/documents',data={'patient_id':p['id'],'title':'Synthetic report'},files={'file':('report.pdf',b'%PDF-1.4\nTraining','application/pdf')}))
    reception=client('reception');ok(reception.get('/api/documents/'+doc['id']+'/download'),403)
    ok(reception.get('/api/records/vitals'),403)
    assert doctor.get('/api/documents/'+doc['id']+'/download').status_code==200
    second=next(f['id'] for f in doctor.get('/api/auth/me').json()['facilities'] if f['code']=='HYR')
    doctor.headers['X-Facility-ID']=second
    ok(doctor.get('/api/patients/'+p['id']),404)
    ok(doctor.get('/api/documents/'+doc['id']+'/download'),404)
    therapist=client('therapist');therapist.headers['X-Facility-ID']='not-authorized';ok(therapist.get('/api/patients'),403)


def test_orders_results_prescriptions_and_review_lock():
    c=client();p=patient(c);e=encounter(c,p)
    rx=ok(c.post('/api/records/medications',json={'patient_id':p['id'],'encounter_id':e['id'],'trade_name':'Training tablet','generic_name':'Synthetic ingredient','dose':'1 unit','route':'Training route','maen':'0-0-0-1','duration_days':3,'quantity':3}))
    assert rx['status']=='draft'
    order=ok(c.post('/api/records/orders',json={'patient_id':p['id'],'encounter_id':e['id'],'kind':'Lab','name':'Synthetic panel'}))
    result=ok(client('assistant').post('/api/orders/'+order['id']+'/result',json={'version':1,'result':'Training result','values':[{'parameter':'Synthetic analyte','value':'10','unit':'training unit'}]}))
    reviewed=ok(c.post('/api/orders/'+order['id']+'/review',json={'version':result['version']}))
    assert reviewed['status']=='reviewed'
    ok(c.post('/api/orders/'+order['id']+'/result',json={'version':reviewed['version'],'result':'Overwrite'}),409)


def test_inventory_tasks_recall_worker_and_admin_audit():
    admin=client('admin');p=patient(admin)
    item=ok(admin.post('/api/inventory',json={'name':'Synthetic consumable','category':'Supplies','reorder_level':2}))
    ok(admin.post('/api/inventory/'+item['id']+'/movements',json={'quantity':5,'reason':'Opening synthetic stock'}))
    ok(admin.post('/api/inventory/'+item['id']+'/movements',json={'quantity':-6,'reason':'Invalid stock issue'}),409)
    t=ok(admin.post('/api/records/tasks',json={'patient_id':p['id'],'kind':'recall','title':'Synthetic recall','assignee_id':staff(admin,'reception')['id'],'priority':'normal','due_date':'2020-01-01'}))
    job=ok(admin.post('/api/jobs/recall-scan',json={}))
    assert run_once()
    result=next(j for j in ok(admin.get('/api/jobs')) if j['id']==job['id'])
    assert result['status']=='completed' and 'due_recalls' in result['result']
    ok(client('reception').post('/api/records/tasks/'+t['id']+'/status',json={'version':1,'status':'completed'}))
    assert ok(admin.get('/api/admin/audit'))
    report=admin.get('/api/analytics/export');assert report.status_code==200 and 'Metric,Value' in report.text


def test_authentication_csrf_logout_upload_and_role_boundaries():
    anonymous=TestClient(app);ok(anonymous.get('/api/patients'),401)
    c=client('reception');p=patient(c)
    ok(c.post('/api/encounters',json={'patient_id':p['id'],'provider_id':staff(c,'doctor')['id']}),403)
    csrf=c.headers.pop('X-CSRF-Token');ok(c.post('/api/patients',json={'first_name':'Test','last_name':'Person','dob':'1970-01-01','sex':'Male','facility_ids':[c.headers['X-Facility-ID']]}),403)
    c.headers['X-CSRF-Token']=csrf
    ok(c.post('/api/auth/logout',json={}));ok(c.get('/api/patients'),401)
    doctor=client();ok(doctor.post('/api/documents',data={'patient_id':p['id'],'title':'Unsafe format'},files={'file':('page.html',b'<script>alert(1)</script>','text/html')}),422)
    ok(doctor.post('/api/eecp/plans',json={'patient_id':p['id'],'therapist_id':staff(doctor,'doctor')['id'],'session_count':35,'start_date':'2032-01-01'}),422)


def test_persistence_uses_database_and_session_revocation():
    c=client('admin');p=patient(c)
    with SessionLocal() as db:
        assert db.get(Patient,p['id']).mrn==p['mrn']
    email='restricted-'+uuid4().hex[:8]+'@demo.local'
    user=ok(c.post('/api/admin/users',json={'name':'Restricted Synthetic','email':email,'password':PASSWORD,'role':'assistant','facility_ids':[c.headers['X-Facility-ID']]}))
    other=TestClient(app);login=ok(other.post('/api/auth/login',json={'email':email,'password':PASSWORD}));other.headers['X-CSRF-Token']=login['csrf']
    ok(other.get('/api/auth/me'))
    ok(c.post('/api/admin/users/'+user['id']+'/deactivate',json={}))
    ok(other.get('/api/auth/me'),401)
