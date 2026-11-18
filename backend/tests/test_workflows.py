import os
import io
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
from app import models as m
from app.seed import seed
from app.security import password_hash
from app.worker import run_once

from tests.conftest import PASSWORD


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


def test_patient_flowsheet_templates_create_update_order_and_delete():
    c=client()
    p=patient(c)
    templates=ok(c.get('/api/flowsheets/templates'))
    assert [item['name'] for item in templates[:4]] == [
        'Sphygmocor Report',
        'Vaso-Meditech Blood Sugar Chart',
        'Vaso-Meditech EECP Daily Chart',
        'Vaso-Meditech EECP Weekly Chart',
    ]
    staff_roster=ok(c.get('/api/flowsheets/staff'))
    assert len(staff_roster['therapists'])==60
    assert staff_roster['therapists'][0]=='Divya A'
    assert staff_roster['therapists'][-1]=='Vidhya R'
    assert staff_roster['physicians']==[
        'Dr.Ramya R','Dr.Aravind K','Dr.Deepika S','Dr.Karthik M',
        'Dr.Meenakshi V','Dr.Nithya R','Dr.Prakash S','Dr.Priya M',
        'Dr.Ramasamy S','Dr.Sathish K','Dr.Suresh Babu','Dr.Vidhya S',
    ]
    sphygmocor=templates[0]
    aix=next(field for section in sphygmocor['schema_json']['sections'] for field in section['fields'] if field['key']=='pre_augmentation_index')
    assert len(aix['options'])==101 and aix['options'][0]=='0' and aix['options'][-1]=='100'
    daily=next(item for item in templates if item['slug']=='vaso-meditech-eecp-daily-chart')
    bp=next(field for section in daily['schema_json']['sections'] for field in section['fields'] if field['key']=='pre_bp')
    assert bp['format']=='blood-pressure' and bp['unit']=='mmHg'
    slug='vaso-meditech-eecp-weekly-chart'
    invalid=ok(c.post(f"/api/patients/{p['id']}/flowsheets/{slug}/entries",json={
        'recorded_at':'2032-03-02T10:00:00+05:30',
        'values_json':{'nyha':'Class V'},
    }),422)
    created=ok(c.post(f"/api/patients/{p['id']}/flowsheets/{slug}/entries",json={
        'recorded_at':'2032-03-02T10:00:00+05:30',
        'values_json':{'week_no':2,'weight':60,'height':160,'nyha':'Class II'},
        'therapist_name':'Divya A',
        'physician_name':'Dr.Ramya R',
    }))
    assert created['values_json']['bmi']==23.4
    assert created['therapist_name']=='Divya A'
    assert created['physician_name']=='Dr.Ramya R'
    older=ok(c.post(f"/api/patients/{p['id']}/flowsheets/{slug}/entries",json={
        'recorded_at':'2032-03-01T10:00:00+05:30',
        'values_json':{'week_no':1},
    }))
    chart=ok(c.get(f"/api/patients/{p['id']}/flowsheets/{slug}"))
    assert [entry['id'] for entry in chart['entries']]==[older['id'],created['id']]
    updated=ok(c.put(f"/api/flowsheets/entries/{created['id']}",json={
        'values_json':{'week_no':2,'weight':60,'height':150},
        'therapist_name':None,
        'physician_name':None,
    }))
    assert updated['values_json']['bmi']==26.7
    assert updated['therapist_name'] is None
    manual_bmi=ok(c.put(f"/api/flowsheets/entries/{created['id']}",json={
        'values_json':{'weight':60,'height':150,'bmi':24.2},
    }))
    assert manual_bmi['values_json']['bmi']==24.2
    ok(c.delete(f"/api/flowsheets/entries/{created['id']}"))
    chart=ok(c.get(f"/api/patients/{p['id']}/flowsheets/{slug}"))
    assert [entry['id'] for entry in chart['entries']]==[older['id']]


def test_daily_flowsheet_accepts_blood_pressure_format_and_rejects_invalid_values():
    c=client()
    p=patient(c)
    slug='vaso-meditech-eecp-daily-chart'
    created=ok(c.post(f"/api/patients/{p['id']}/flowsheets/{slug}/entries",json={
        'recorded_at':'2032-03-02T10:00:00+05:30',
        'values_json':{'pre_bp':'120/70'},
    }))
    assert created['values_json']['pre_bp']=='120/70'
    ok(c.post(f"/api/patients/{p['id']}/flowsheets/{slug}/entries",json={
        'recorded_at':'2032-03-03T10:00:00+05:30',
        'values_json':{'pre_bp':'120-70'},
    }),422)


def test_patient_flowsheet_catalog_selection_and_inpatient_values():
    c=client()
    p=patient(c)
    catalog_url=f"/api/patients/{p['id']}/flowsheets/templates"
    catalog=ok(c.get(catalog_url))
    assert [item['name'] for item in catalog['available']]==[
        'Admission Flowsheet Nursing',
        'Admission Treatment &Progress',
        'ER Flowsheet',
        'Follow up',
        'Heart Failure Patient 6 min Walk Test',
        'Patient Flowsheet',
    ]
    assert all(item['name']!='Potassium Diet Recommendation' for item in catalog['available'])
    selected=ok(c.put(catalog_url,json={
        'slugs':['admission-flowsheet-nursing','heart-failure-6-min-walk-test'],
    }))
    assert [item['slug'] for item in selected['templates'][-2:]]==[
        'admission-flowsheet-nursing','heart-failure-6-min-walk-test',
    ]
    ok(c.put(catalog_url,json={'slugs':['not-a-flowsheet']}),422)

    admission_url=f"/api/patients/{p['id']}/flowsheets/admission-flowsheet-nursing/entries"
    entry=ok(c.post(admission_url,json={
        'recorded_at':'2032-03-02T10:00:00+05:30',
        'values_json':{
            'temperature':36.6,
            'temperature_unit':'°C',
            'bp':'120/80',
            'iv_fluids':['IV Adrenaline','IV RL -500 ml'],
            'spo2':98,
        },
    }))
    assert entry['values_json']['temperature']==36.6
    assert entry['values_json']['temperature_unit']=='°C'
    assert entry['values_json']['iv_fluids']==['IV Adrenaline','IV RL -500 ml']
    default_unit=ok(c.post(admission_url,json={
        'recorded_at':'2032-03-04T10:00:00+05:30',
        'values_json':{'temperature':98.6},
    }))
    assert default_unit['values_json']['temperature_unit']=='°F'
    ok(c.post(admission_url,json={
        'recorded_at':'2032-03-03T10:00:00+05:30',
        'values_json':{'iv_fluids':['Unknown Fluid']},
    }),422)
    ok(c.get(f"/api/patients/{p['id']}/flowsheets/er-flowsheet"),404)

    cleared=ok(c.put(catalog_url,json={'slugs':[]}))
    assert [item['slug'] for item in cleared['templates']]==[
        'sphygmocor-report',
        'vaso-meditech-blood-sugar-chart',
        'vaso-meditech-eecp-daily-chart',
        'vaso-meditech-eecp-weekly-chart',
    ]


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
    # When allow_overlap=True, concurrent appointments for the same provider at the same slot are allowed
    p2=patient(c)
    book2=booking(c,p2,day=8,hour=12)
    book2['allow_overlap']=True
    a2=ok(c.post('/api/appointments',json=book2))[0]
    assert a2['start_at']==moved['start_at'] and a2['patient_id']!=moved['patient_id']
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


def test_complete_inventory_module_endpoints():
    admin = client('admin')
    # 1. Categories CRUD
    cat = ok(admin.post('/api/inventory/categories', json={
        'name': 'Test Tablets',
        'group_name': 'Drug',
        'description': 'Oral solid medications'
    }))
    assert cat['name'] == 'Test Tablets'
    categories = ok(admin.get('/api/inventory/categories'))
    assert any(c['name'] == 'Test Tablets' for c in categories)

    # 2. Suppliers CRUD
    sup = ok(admin.post('/api/inventory/suppliers', json={
        'name': 'Apex Pharma Dist',
        'contact_person': 'Ravi Kumar',
        'mobile_phone': '9876543210',
        'email': 'ravi@apexpharma.invalid',
        'city': 'Chennai'
    }))
    assert sup['name'] == 'Apex Pharma Dist'
    suppliers = ok(admin.get('/api/inventory/suppliers'))
    assert any(s['name'] == 'Apex Pharma Dist' for s in suppliers)

    # 3. Create Product with initial batch
    product = ok(admin.post('/api/inventory', json={
        'name': 'Atorvastatin 20mg',
        'trade_name': 'Atorva',
        'category': 'Test Tablets',
        'reorder_level': 10,
        'unit': 'Strips',
        'group_name': 'Drug',
        'dose_form': 'Tablet',
        'cost_price': 85.0,
        'retail_price': 120.0,
        'batch_number': 'AT-991',
        'expiry_date': '2028-12-31',
        'quantity': 50,
        'supplier': 'Apex Pharma Dist'
    }))
    assert product['name'] == 'Atorvastatin 20mg'
    assert product['balance'] == 50
    assert product['status'] == 'In Stock'

    # 4. Add another batch
    batch2 = ok(admin.post('/api/inventory/batches', json={
        'item_id': product['id'],
        'batch_number': 'AT-992',
        'expiry_date': '2029-06-30',
        'quantity': 30,
        'cost_price': 80.0,
        'retail_price': 115.0,
        'supplier_name': 'Apex Pharma Dist'
    }))
    assert batch2['balance'] == 80

    # 5. Inventory search & filter
    inv_list = ok(admin.get('/api/inventory?q=Atorva'))
    assert len(inv_list) >= 1
    assert inv_list[0]['id'] == product['id']

    # 6. Bulk inventory intake
    bulk_res = ok(admin.post('/api/inventory/bulk', json={
        'group_name': 'Drug',
        'category': 'Test Tablets',
        'supplier': 'Apex Pharma Dist',
        'rows': [
            {
                'product_name': 'Metoprolol 25mg',
                'trade_name': 'Betaloc',
                'category': 'Test Tablets',
                'quantity': 100,
                'batch_number': 'MET-101',
                'expiry_date': '2027-10-15',
                'cost_price': 45.0,
                'retail_price': 65.0
            }
        ]
    }))
    assert bulk_res['success'] is True
    assert bulk_res['count'] == 1

    # 7. Reports
    rec_list = ok(admin.get('/api/inventory/reports/received-list'))
    assert rec_list['count'] >= 2

    by_prod = ok(admin.get('/api/inventory/reports/by-product'))
    assert any(p['name'] == 'Atorvastatin 20mg' for p in by_prod['rows'])

    by_bth = ok(admin.get('/api/inventory/reports/by-batch'))
    assert any(b['batch_number'] == 'AT-991' for b in by_bth['rows'])

    exp_rep = ok(admin.get('/api/inventory/reports/expiry'))
    assert 'rows' in exp_rep

    # 8. Export history
    export_rec = ok(admin.post('/api/inventory/reports/export-history', json={
        'report_name': 'Inventory by Product',
        'date_range': 'Past 3 Months',
        'status': 'Ready',
        'record_count': by_prod['count']
    }))
    assert export_rec['report_name'] == 'Inventory by Product'
    history = ok(admin.get('/api/inventory/reports/export-history'))
    assert any(h['id'] == export_rec['id'] for h in history)


def test_centralized_catalogue_search():
    admin = client('admin')
    doctor = client('doctor')
    p = patient(doctor)

    # 1. Add injection to master injection catalogue
    inj_cat = ok(admin.post('/api/admin/injections/catalog', json={
        'name': 'Deform 20ml Test'
    }))
    assert inj_cat['name'] == 'Deform 20ml Test'
    assert inj_cat['id']

    # 2. Central search by type='injection'
    res = ok(doctor.get('/api/catalogue/search?type=injection&q=Deform'))
    assert len(res) >= 1
    matched = next((x for x in res if 'deform' in x['name'].lower()), None)
    assert matched is not None
    assert matched['catalogue_id'] == inj_cat['id']
    assert matched['kind'] == 'injection'

    # 3. Legacy /api/catalogs?kind=injection enrichment
    cat_inj = ok(doctor.get('/api/catalogs?kind=injection&q=Deform'))
    assert any(x['id'] == inj_cat['id'] for x in cat_inj)

    # 4. Central search by type='medicine'
    res_med = ok(doctor.get('/api/catalogue/search?type=medicine&q=Atorva'))
    assert len(res_med) >= 1
    assert any('atorva' in x['name'].lower() or 'atorva' in (x.get('trade_name') or '').lower() for x in res_med)

    # 5. Global search by type='all'
    res_all = ok(doctor.get('/api/catalogue/search?type=all&q=Deform'))
    assert len(res_all) >= 1
    assert res_all[0]['badge'] == 'Injection'

    # 6. Create injection order linking catalogue_id
    order = ok(doctor.post('/api/injections/orders', json={
        'patient_id': p['id'],
        'catalogue_id': inj_cat['id'],
        'medication_name_snapshot': inj_cat['name'],
        'dosage': '20ml',
        'route': 'Intravenous',
        'status': 'ordered'
    }))
    assert order['catalogue_id'] == inj_cat['id']
    assert order['medication_name_snapshot'] == 'Deform 20ml Test'

    # 7. Record patient injection administration with catalogue_id
    rec_inj = ok(doctor.post('/api/records/injections', json={
        'patient_id': p['id'],
        'catalogue_id': inj_cat['id'],
        'order_id': order['id'],
        'name': inj_cat['name'],
        'dose': '20ml',
        'route': 'Intravenous',
        'site': 'Right Deltoid',
        'status': 'administered'
    }))
    assert rec_inj['catalogue_id'] == inj_cat['id']


def test_rx_module_workflows():
    admin = client('admin')
    doctor = client('doctor')
    p = patient(doctor)

    # 1. Create drugs via API
    d1 = ok(admin.post('/api/rx/drugs', json={
        'product_name': 'Atorvastatin 20mg Test',
        'trade_name': 'Atorva-20 Test',
        'dosage_form': 'Tablet'
    }))
    d2 = ok(admin.post('/api/rx/drugs', json={
        'product_name': 'Telmisartan 40mg Test',
        'trade_name': 'Telma-40 Test',
        'dosage_form': 'Tablet'
    }))
    d3 = ok(admin.post('/api/rx/drugs', json={
        'product_name': 'Deletable Drug 10mg Test',
        'trade_name': 'DelDrug-10 Test',
        'dosage_form': 'Capsule'
    }))

    # 2. List Drugs with genuine server pagination
    drugs_res = ok(doctor.get('/api/rx/drugs?page=1&limit=2'))
    assert 'items' in drugs_res
    assert drugs_res['total'] >= 3
    assert len(drugs_res['items']) == 2
    assert drugs_res['page'] == 1
    assert drugs_res['total_pages'] >= 2

    # 3. Search Drugs case-insensitively
    search_res = ok(doctor.get('/api/rx/drugs?q=atorva'))
    assert search_res['total'] >= 1
    assert any('atorva' in (d['product_name'] + d['trade_name']).lower() for d in search_res['items'])

    # 4. Create supplements via API
    s1 = ok(admin.post('/api/rx/supplements', json={
        'name': 'CoQ10 Ubiquinol 100mg Capsule Test',
        'dosage_form': 'Capsule',
        'strength': '100mg'
    }))
    s2 = ok(admin.post('/api/rx/supplements', json={
        'name': 'L-Arginine 1000mg Sachet Test',
        'dosage_form': 'Sachet',
        'strength': '1000mg'
    }))
    s3 = ok(admin.post('/api/rx/supplements', json={
        'name': 'Deletable Organic Herb 50mg Test',
        'dosage_form': 'Tablet',
        'strength': '50mg'
    }))

    # 5. List Supplements with server pagination
    supp_res = ok(doctor.get('/api/rx/supplements?page=1&limit=2'))
    assert 'items' in supp_res
    assert supp_res['total'] >= 3
    assert len(supp_res['items']) == 2

    # 6. Search Supplements
    search_supp = ok(doctor.get('/api/rx/supplements?q=arginine'))
    assert search_supp['total'] >= 1
    assert any('arginine' in s['name'].lower() for s in search_supp['items'])

    # 7. Add inventory item linked to d1 and s1
    inv_d1 = ok(admin.post('/api/inventory', json={
        'name': d1['product_name'],
        'trade_name': d1['trade_name'],
        'category': 'Drug',
        'group_name': 'Drug',
        'unit': 'Tablet',
        'reorder_level': 10,
        'order_quantity': 50,
        'catalogue_id': d1['id']
    }))

    inv_s1 = ok(admin.post('/api/inventory', json={
        'name': s1['name'],
        'category': 'Supplement',
        'group_name': 'Supplement',
        'unit': 'Capsule',
        'reorder_level': 10,
        'order_quantity': 50,
        'catalogue_id': s1['id']
    }))

    # 8. Add template linked to d2 and s2
    with SessionLocal() as db:
        pt = m.PrescriptionTemplate(
            template_name='CAD Protocol Test',
            catalogue_id=d2['id'],
            drug_name=d2['product_name'],
            dosage='1 Tab',
            route='Oral',
            is_active=True
        )
        st = m.SupplementTemplate(
            template_name='Wellness Protocol Test',
            catalogue_id=s2['id'],
            supplement_name=s2['name'],
            dosage='1 Sachet',
            route='Oral',
            is_active=True
        )
        db.add(pt)
        db.add(st)
        db.commit()

    # 9. Verify inventory and template statuses in lists
    d_check = ok(doctor.get(f"/api/rx/drugs?q={d1['product_name']}"))['items'][0]
    assert d_check['is_in_inventory'] is True
    assert d_check['inventory_status'] == 'Yes'

    d2_check = ok(doctor.get(f"/api/rx/drugs?q={d2['product_name']}"))['items'][0]
    assert d2_check['template_count'] >= 1

    s_check = ok(doctor.get(f"/api/rx/supplements?q={s1['name']}"))['items'][0]
    assert s_check['is_in_inventory'] is True
    assert s_check['inventory_status'] == 'Yes'

    s2_check = ok(doctor.get(f"/api/rx/supplements?q={s2['name']}"))['items'][0]
    assert s2_check['template_count'] >= 1

    # 10. Deletion restriction: Inventory-linked items cannot be deleted
    d1_del_fail = doctor.delete(f"/api/rx/drugs/{d1['id']}")
    assert d1_del_fail.status_code == 400
    assert 'inventory' in d1_del_fail.json()['detail'].lower()

    s1_del_fail = doctor.delete(f"/api/rx/supplements/{s1['id']}")
    assert s1_del_fail.status_code == 400
    assert 'inventory' in s1_del_fail.json()['detail'].lower()

    # 11. Deletion restriction: Template-referenced items cannot be deleted
    d2_del_fail = doctor.delete(f"/api/rx/drugs/{d2['id']}")
    assert d2_del_fail.status_code == 400
    assert 'templates' in d2_del_fail.json()['detail'].lower()

    s2_del_fail = doctor.delete(f"/api/rx/supplements/{s2['id']}")
    assert s2_del_fail.status_code == 400
    assert 'templates' in s2_del_fail.json()['detail'].lower()

    # 12. Deletion on unlinked items succeeds
    d3_del_ok = ok(doctor.delete(f"/api/rx/drugs/{d3['id']}"))
    assert d3_del_ok['ok'] is True

    s3_del_ok = ok(doctor.delete(f"/api/rx/supplements/{s3['id']}"))
    assert s3_del_ok['ok'] is True

    # 13. Bulk delete independent validation
    bulk_res = ok(doctor.post('/api/rx/drugs/bulk-delete', json={
        'ids': [d1['id']]
    }))
    assert len(bulk_res['blocked']) == 1
    assert bulk_res['blocked'][0]['id'] == d1['id']

    # 14. Prescribe medication retaining catalogue_id
    med_order = ok(doctor.post('/api/records/medications', json={
        'patient_id': p['id'],
        'catalogue_id': d1['id'],
        'trade_name': d1['trade_name'],
        'generic_name': d1['product_name'],
        'dose': '20mg',
        'route': 'Oral',
        'frequency': 'Once daily',
        'maen': '0-0-0-1',
        'duration_days': 30,
        'quantity': 30,
        'substitution_allowed': True
    }))
    assert med_order['catalogue_id'] == d1['id']
    assert med_order['trade_name'] == d1['trade_name']


def test_immunization_message_task_workflows():
    admin = client('admin')
    doctor = client('doctor')

    # 1. List Vaccines - default CDC seed or catalog query
    v_list = ok(doctor.get('/api/settings/immunization/vaccines?page=1&limit=25'))
    assert 'items' in v_list
    assert 'total' in v_list
    assert 'page' in v_list

    # 2. Add Vaccine
    new_v = ok(admin.post('/api/settings/immunization/vaccines', json={
        'vaccine_name': 'Hepatitis A Adult Test Vaccine',
        'description': 'Inactivated Hepatitis A vaccine for cardiovascular risk travel prophylaxis',
        'dose': '1.0',
        'dose_unit': 'mL',
        'duration_of_protection': '20 Years',
        'diagnosis_code': 'Z23',
        'cvx_code': 'CVX-83',
        'route': 'Intramuscular (IM)',
        'doses_count': 2,
        'schedule': '0, 6 Months',
        'billing_code': '90632',
        'emergency': False
    }))
    assert new_v['success'] is True
    assert 'id' in new_v

    # 3. Search Vaccine
    search_res = ok(doctor.get('/api/settings/immunization/vaccines?search=Hepatitis%20A%20Adult%20Test'))
    assert search_res['total'] >= 1
    found = [x for x in search_res['items'] if x['id'] == new_v['id']]
    assert len(found) == 1
    assert found[0]['is_added_in_inventory'] in ('Yes', 'No')

    # 4. Delete Single Vaccine
    del_res = ok(admin.delete(f"/api/settings/immunization/vaccines/{new_v['id']}"))
    assert del_res['success'] is True

    # 5. List VIS Statements
    vis_res = ok(doctor.get('/api/settings/immunization/vis'))
    assert isinstance(vis_res, list)
    assert len(vis_res) >= 10
    assert any('Influenza' in item['name'] for item in vis_res)

    # 6. Vaccine Charts
    charts = ok(doctor.get('/api/settings/immunization/charts'))
    assert isinstance(charts, list)
    assert len(charts) >= 1

    # Create new Chart
    chart_res = ok(admin.post('/api/settings/immunization/charts', json={
        'name': 'Custom Cardiology Prophylaxis Chart',
        'description': 'Tailored schedule for post-coronary stenting',
        'entries': [
            {'vaccine_name': 'Influenza seasonal', 'milestone': 'Annual', 'doses': 1, 'route': 'Intramuscular (IM)'}
        ]
    }))
    assert chart_res['success'] is True
    chart_id = chart_res['id']

    # Delete chart
    del_chart = ok(admin.delete(f'/api/settings/immunization/charts/{chart_id}'))
    assert del_chart['success'] is True

    # 7. User Preferences - Message Signature
    sig_saved = ok(doctor.put('/api/settings/user-preferences/message:signature', json={
        'enabled': True,
        'signature_html': '<p>Best,<br><strong>Dr. Prem</strong></p>'
    }))
    assert sig_saved['success'] is True
    sig_fetched = ok(doctor.get('/api/settings/user-preferences/message:signature'))
    assert sig_fetched['enabled'] is True
    assert 'Dr. Prem' in sig_fetched['signature_html']

    # 8. User Preferences - Vacation Reply
    vac_saved = ok(doctor.put('/api/settings/user-preferences/message:vacation', json={
        'enabled': True,
        'send_to_members': True,
        'send_to_patients': False,
        'subject': 'Attending Cardiology Summit',
        'start_date': '2026-12-01',
        'end_date': '2026-12-05',
        'mark_non_working': True,
        'message_html': '<p>Away at summit.</p>'
    }))
    assert vac_saved['success'] is True
    vac_fetched = ok(doctor.get('/api/settings/user-preferences/message:vacation'))
    assert vac_fetched['subject'] == 'Attending Cardiology Summit'
    assert vac_fetched['mark_non_working'] is True

    # 9. User Preferences - Message Preferences
    msg_pref = ok(doctor.put('/api/settings/user-preferences/message:preferences', json={
        'notification_email': 'Not Required',
        'receive_from_patients': 'Yes',
        'questionnaire_notification': 'Required',
        'feedback_notification': 'Not Required',
        'shared_member_ids': []
    }))
    assert msg_pref['success'] is True
    msg_pref_fetched = ok(doctor.get('/api/settings/user-preferences/message:preferences'))
    assert msg_pref_fetched['notification_email'] == 'Not Required'
    assert msg_pref_fetched['feedback_notification'] == 'Not Required'

    # 10. User Preferences - Task Preferences
    task_pref = ok(doctor.put('/api/settings/user-preferences/task:preferences', json={
        'reminder_email': False,
        'reminder_charm_message': True,
        'assigned_charm_message': True,
        'completed_charm_message': False,
        'sort_by': 'Due Date'
    }))
    assert task_pref['success'] is True
    task_pref_fetched = ok(doctor.get('/api/settings/user-preferences/task:preferences'))
    assert task_pref_fetched['reminder_email'] is False
    assert task_pref_fetched['sort_by'] == 'Due Date'

    # 11. Practice Members List
    members = ok(doctor.get('/api/settings/practice-members'))
    assert isinstance(members, list)
    assert len(members) >= 2
    assert any(m['role'] == 'doctor' for m in members)


def test_settings_modules_workflows():
    admin = client('admin')
    doctor = client('doctor')

    # Recall types & statuses
    types = ok(admin.get('/api/settings/recall/types'))
    assert len(types) >= 5
    new_type = ok(admin.post('/api/settings/recall/types', json={'name': 'Cardiology Annual Follow-up'}))
    assert 'id' in new_type

    statuses = ok(admin.get('/api/settings/recall/statuses'))
    assert any(s['name'] == 'Pending' and s['is_default'] for s in statuses)

    # Quick text
    qt = ok(doctor.post('/api/settings/quick-text', json={
        'keyword': '.eecp35',
        'content': 'Patient advised for 35 sessions of EECP treatment daily.',
        'description': 'EECP 35 course advice'
    }))
    assert 'id' in qt
    qts = ok(doctor.get('/api/settings/quick-text'))
    assert any(q['keyword'] == '.eecp35' for q in qts)

    # Directory
    prov = ok(admin.post('/api/settings/directory/providers', json={
        'first_name': 'Ramanathan',
        'last_name': 'Sundaram',
        'specialty': 'Interventional Cardiology',
        'practice_name': 'Heal Your Heart Specialty Centre',
        'email': 'ramanathan@healyourheart.in',
        'phone': '9840123456'
    }))
    assert 'id' in prov
    provs = ok(admin.get('/api/settings/directory/providers'))
    assert any('Ramanathan' in p['name'] for p in provs)


def test_billing_settings_workflows():
    admin = client('admin')
    doctor = client('doctor')

    # 1. Procedure Codes
    procs = ok(admin.get('/api/settings/billing/procedure-codes'))
    assert len(procs) >= 20
    assert any(p['code'] == '86300' and 'CA 15-3' in p['description'] for p in procs)
    assert any(p['code'] == '92971' and 'EECP' in p['description'] for p in procs)

    # Create new procedure code
    new_proc = ok(admin.post('/api/settings/billing/procedure-codes', json={
        'code': '93000-TEST',
        'description': '12-Lead Electrocardiogram Rhythm Analysis',
        'sac_code': '999312',
        'charge': 750.0,
        'category': 'Diagnostics',
        'is_lab_code': False
    }))
    assert 'id' in new_proc
    searched = ok(admin.get('/api/settings/billing/procedure-codes?q=93000-TEST'))
    assert len(searched) == 1
    assert searched[0]['charge'] == 750.0

    # 2. Fee Schedules
    fs_list = ok(admin.get('/api/settings/billing/fee-schedules'))
    assert len(fs_list) >= 2
    assert any(fs['name'] == 'Master Fee Schedule' and fs['is_default'] for fs in fs_list)

    new_fs = ok(admin.post('/api/settings/billing/fee-schedules', json={
        'name': 'Corporate Partner Tier',
        'description': 'Discounted tariff for corporate tie-ups',
        'schedule_type': 'Payer Specific',
        'differential_prices': {
            '93000-TEST': {'charge': 600.0, 'discount': '20%'}
        }
    }))
    assert 'id' in new_fs

    # 3. Billing Account Settings
    acc_settings = ok(admin.get('/api/settings/billing/account-settings'))
    assert 'allow_inter_facility_receipts' in acc_settings
    assert acc_settings['enable_invoice_round_off'] is True

    updated_acc = ok(admin.put('/api/settings/billing/account-settings', json={
        **acc_settings,
        'round_off_label': 'Rounding Adj'
    }))
    assert updated_acc['message'] == 'Billing settings saved'

    # 4. Payment Methods & Write-offs & Taxes
    pms = ok(admin.get('/api/settings/billing/payment-methods'))
    assert any(pm['name'] == 'Cash' for pm in pms)
    assert any(pm['name'] == 'UPI' for pm in pms)

    wos = ok(admin.get('/api/settings/billing/write-off-types'))
    assert any(wo['name'] == 'Contractual' for wo in wos)

    taxes = ok(admin.get('/api/settings/billing/taxes'))
    assert any(t['percentage'] == 0.0 for t in taxes)

    # 5. Patient Billing Automation
    p_auto = ok(admin.get('/api/settings/billing/patient-automation'))
    assert p_auto['reminder_days_interval'] == 30
    assert '$FACILITY_NAME' in p_auto['invoice_sms_template']

    # 6. Lab Mappings
    lab_maps = ok(admin.get('/api/settings/billing/lab-mappings'))
    assert len(lab_maps) >= 3
    assert any('Cardiac Panel' in lm['test_name'] for lm in lab_maps)

    # 7. Billing Packages
    pkgs = ok(admin.get('/api/settings/billing/packages'))
    assert len(pkgs) >= 3
    assert any('EECP Complete Treatment' in pkg['name'] for pkg in pkgs)

    # 8. Invoice Templates
    inv_tmpls = ok(admin.get('/api/settings/billing/invoice-templates'))
    assert len(inv_tmpls) >= 3
    assert any(t['is_default'] for t in inv_tmpls)






def test_patient_import_workflow():
    c = client("admin")

    # 1. Download CSV template
    res = c.get("/api/patients/import/template")
    assert res.status_code == 200, res.text
    assert "text/csv" in res.headers["content-type"]
    text = res.text
    assert "Patient Record ID" in text
    assert "First Name" in text
    assert "Last Name" in text
    assert "Gender" in text
    assert "Date Of Birth" in text

    # 2. Test importing valid CSV
    suffix = uuid4().hex[:6]
    csv_data = (
        "Patient Record ID,First Name,Last Name,Gender,Date Of Birth(mm/dd/yyyy),Email,Home Phone,Mobile Phone,Work Phone,AddressLine1,AddressLine2,City,Country,State,Zip Code,Caregiver First Name,Caregiver Last Name\n"
        f"TEST_IMP_{suffix}1,Kavita{suffix},Raman,Female,05/14/1988,kavita.{suffix}@example.com,,98401{suffix[:5]}1,,12 Beach Rd,,Chennai,India,Tamil Nadu,600041,,\n"
        f"TEST_IMP_{suffix}2,Suresh{suffix},Babu,Male,11/20/1975,suresh.{suffix}@example.com,,98401{suffix[:5]}2,,45 Lake St,,Chennai,India,Tamil Nadu,600041,,\n"
    )
    files = {"file": ("test_patients.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = c.post("/api/patients/import", files=files)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["imported"] == 2
    assert data["skipped"] == 0
    assert len(data["errors"]) == 0

    # 3. Test duplicate detection (importing same CSV again)
    files_dup = {"file": ("test_patients.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res_dup = c.post("/api/patients/import", files=files_dup)
    assert res_dup.status_code == 200, res_dup.text
    data_dup = res_dup.json()
    assert data_dup["imported"] == 0
    assert data_dup["skipped"] == 2

    # 4. Test active/inactive filtering
    res_active = c.get("/api/patients?active=true")
    assert res_active.status_code == 200, res_active.text
    assert res_active.json()["total"] >= 2

    res_inactive = c.get("/api/patients?active=false")
    assert res_inactive.status_code == 200, res_inactive.text


def test_consultation_and_discharge_summary_workflow():
    c = client("doctor")
    p = patient(c)
    provider_id = staff(c, "doctor")["id"]
    created = ok(c.post(f"/api/patients/{p['id']}/consultations", json={
        "provider_id": provider_id,
        "facility_id": c.headers["X-Facility-ID"],
        "visit_type": "EECP Treatment Completed",
        "visit_mode": "In Person",
        "visit_date": "2032-03-01T10:00:00+05:30",
        "soap_json": {
            "subjective": {
                "chief_complaints": "Training complaint",
                "history_of_present_illness": "Training history",
            },
            "assessment": {"notes": "Training assessment"},
            "plan": {"notes": "Training plan"},
        },
    }))
    assert created["status"] == "unsigned"
    assert created["encounter"]["chief_complaint"] == "Training complaint"
    assert c.get("/api/template-responses").status_code == 200
    assert ok(c.get(f"/api/patients/{p['id']}/consultations", params={"tab": "all"}))[0]["id"] == created["id"]
    assert ok(c.get(f"/api/patients/{p['id']}/consultations", params={"tab": "last_visit"}))[0]["id"] == created["id"]

    updated = ok(c.put(f"/api/consultations/{created['id']}", json={
        "version": created["version"],
        "status": "co_sign",
        "soap_json": {
            "subjective": {"chief_complaints": "Training complaint", "history_of_present_illness": "Training history"},
            "assessment": {"notes": "Training assessment"},
            "plan": {"notes": "Training plan"},
        },
    }))
    assert updated["status"] == "co_sign"
    assert len(ok(c.get(f"/api/patients/{p['id']}/consultations", params={"tab": "co_sign"}))) == 1

    report = ok(c.get(f"/api/consultations/{created['id']}/discharge-summary"))
    assert report["patient_information"]["registration_no"] == p["mrn"]
    assert report["brief_history"] == "Training assessment"
    assert len(report["investigation_tables"]) == 7
    report["patient_information"]["name"] = "Incorrect patient"
    report["treatment_information"]["sponsor"] = "Training sponsor"
    report["investigation_tables"]["Vitals"][0]["pre"] = "64"
    saved = ok(c.put(f"/api/consultations/{created['id']}/discharge-summary", json={
        "version": report["version"],
        "report_data_json": report,
    }))
    assert saved["treatment_information"]["sponsor"] == "Training sponsor"
    assert saved["patient_information"]["name"] == p["name"]
    assert saved["investigation_tables"]["Vitals"][0]["pre"] == "64"
    revised_report = ok(c.put(f"/api/consultations/{created['id']}/discharge-summary", json={
        "version": saved["version"],
        "report_data_json": saved,
    }))
    assert revised_report["version"] == saved["version"] + 1
    assert c.put(f"/api/consultations/{created['id']}/discharge-summary", json={
        "version": report["version"],
        "report_data_json": report,
    }).status_code == 409
    signed = ok(c.post(f"/api/consultations/{created['id']}/sign", json={"version": updated["version"]}))
    assert signed["status"] == "signed"

    addendum = ok(c.post(f"/api/consultations/{created['id']}/addendums", json={"note_text": "Training addendum"}))
    assert addendum["note_text"] == "Training addendum"
    assert len(ok(c.get(f"/api/consultations/{created['id']}/addendums"))) == 1
    ccda = c.get(f"/api/consultations/{created['id']}/export/ccda")
    assert ccda.status_code == 200 and b"ClinicalDocument" in ccda.content
    pdf = c.get(f"/api/consultations/{created['id']}/export/pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")

    unauthorized = client("reception")
    assert unauthorized.get(f"/api/patients/{p['id']}/consultations").status_code == 403


def test_clinical_tasks_workflow_templates_lock_and_handoff():
    creator = client("doctor")
    p = patient(creator)

    # 1. Verify all 4 seeded workflow templates
    templates = ok(creator.get("/api/workflow-templates"))
    names = [t["name"] for t in templates]
    for required_name in ("EECP Lab + Demo", "Lab Alone", "Lab + Treatment Started", "Admission"):
        assert required_name in names
    admission = next(t for t in templates if t["name"] == "Admission")
    assert admission["has_optional_lab_flow"] is True
    assert len(admission["optional_lab_steps"]) == 2

    # 2. Custom Template Builder
    custom = ok(creator.post("/api/workflow-templates", json={
        "name": "Custom Post-EECP Check",
        "description": "Custom follow-up flow",
        "steps": [
            {"step_order": 1, "title": "Call patient after 1 week", "default_priority": "High", "allowed_assignees": ["Susan Sekar"]},
        ],
    }))
    assert custom["name"] == "Custom Post-EECP Check"
    assert custom["is_system"] is False

    # 3. Resolve seeded staff users: Nathiya (Step 1), Sarala D (Step 2), Dr. Elakkiya M (Step 3), Susan Sekar (unrelated third party)
    all_staff = ok(creator.get("/api/staff"))
    nathiya = next(s for s in all_staff if s["name"] == "Nathiya")
    sarala = next(s for s in all_staff if s["name"] == "Sarala D")
    elakkiya = next(s for s in all_staff if s["name"] == "Dr. Elakkiya M")
    susan = next(s for s in all_staff if s["name"] == "Susan Sekar")

    eecp_tmpl = next(t for t in templates if t["name"] == "EECP Lab + Demo")
    created_steps = ok(creator.post("/api/clinical-tasks", json={
        "mode": "template",
        "template_id": eecp_tmpl["id"],
        "patient_id": p["id"],
        "steps": [
            {"step_order": 1, "title": "Check the billing and payment done", "short_label": "Billing", "priority": "High", "assigned_to_user_id": nathiya["id"], "due_date": "2020-01-01"},
            {"step_order": 2, "title": "Complete the Laboratory Testing", "short_label": "Lab Test", "sub_type": "Lab Test", "priority": "Medium", "assigned_to_user_id": sarala["id"]},
            {"step_order": 3, "title": "Verify Laboratory Report", "short_label": "Verify Lab", "priority": "Medium", "assigned_to_user_id": elakkiya["id"]},
            {"step_order": 4, "title": "Arrange demo and treatment", "short_label": "Demo", "priority": "Medium", "assigned_to_user_id": susan["id"]},
            {"step_order": 5, "title": "Complete patient counselling and treatment decision", "short_label": "Counselling", "priority": "Medium", "assigned_to_user_id": susan["id"]},
        ],
    }))
    assert len(created_steps) == 5
    step1 = created_steps[0]
    assert step1["is_overdue"] is True

    # 4. Login as Nathiya, Sarala D, and Susan Sekar to verify Notifications, Two-Person Edit Lock, and Auto-Handoff
    def login_as(email: str):
        cl = TestClient(app)
        res = ok(cl.post("/api/auth/login", json={"email": email, "password": "password123"}))
        cl.headers.update({"X-CSRF-Token": res["csrf"], "X-Facility-ID": creator.headers["X-Facility-ID"]})
        return cl

    nathiya_c = login_as("nathiya@healyourheart.local")
    sarala_c = login_as("sarala.d@healyourheart.local")
    susan_c = login_as("susan.sekar@healyourheart.local")

    # Nathiya received instant assignment notification for Step 1
    nathiya_notifs = ok(nathiya_c.get("/api/clinical-tasks/notifications"))
    assert nathiya_notifs["unread_count"] >= 1
    assert any(n["task"]["id"] == step1["id"] for n in nathiya_notifs["notifications"])

    # STRICT TWO-PERSON EDIT LOCK: Susan Sekar (neither creator nor assignee of Step 1) MUST get 403 Forbidden!
    forbidden = susan_c.patch(f"/api/clinical-tasks/{step1['id']}", json={"status": "Completed"})
    assert forbidden.status_code == 403
    assert "Editable only by" in forbidden.json()["detail"]

    # Comments drawer works
    cm = ok(susan_c.post(f"/api/clinical-tasks/{step1['id']}/comments", json={"body": "Patient waiting at billing counter"}))
    assert cm["body"] == "Patient waiting at billing counter"
    assert len(ok(nathiya_c.get(f"/api/clinical-tasks/{step1['id']}/comments"))) == 1

    # Nathiya (Assignee) completes Step 1 -> Auto-Handoff notifies Sarala D (Step 2)!
    completed_step1 = ok(nathiya_c.patch(f"/api/clinical-tasks/{step1['id']}", json={"status": "Completed"}))
    assert completed_step1["status"] == "Completed"
    assert completed_step1["handoff"]["next_assignee_name"] == "Sarala D"

    sarala_notifs = ok(sarala_c.get("/api/clinical-tasks/notifications"))
    assert any(n["kind"] == "handoff" and n["task"]["step_order"] == 2 for n in sarala_notifs["notifications"])

    # Live Workflow Progress (Calendar batch & Patient Banner) reflects 1/5 completed and Step 2 as bottleneck!
    batch = ok(creator.get("/api/clinical-tasks/workflow-progress-batch", params={"patient_ids": p["id"]}))
    wf = batch[p["id"]][0]
    assert wf["template_name"] == "EECP Lab + Demo"
    assert wf["completed_count"] == 1
    assert wf["total_count"] == 5
    assert wf["bottleneck"]["title"] == "Complete the Laboratory Testing"
    assert wf["bottleneck"]["assigned_to_name"] == "Sarala D"


# ==============================================================================
# CHARMHEALTH PATIENT PAYMENT & INVOICE ALLOCATION SUITE
# ==============================================================================

def create_billing_test_invoice(c, pat_id, total_paise=100000, lines=None):
    if lines is None:
        lines = [{'description': 'Cardiology Consultation', 'quantity': 1, 'unit_paise': total_paise}]
    return ok(c.post('/api/invoices', json={
        'patient_id': pat_id,
        'lines': lines,
    }))


def test_billing_scenario_a_patient_no_outstanding_invoices():
    c = client('reception')
    p = patient(c)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 500000,  # Rs. 5000.00
        'mode': 'UPI',
        'reference': 'UPI-ADV-12345',
        'description': 'Advance deposit for cardiology package',
        'allocations': []
    }))

    receipt = res['receipt']
    assert receipt['amount_paise'] == 500000
    assert receipt['unused_paise'] == 500000
    assert receipt['mode'] == 'UPI'
    assert receipt['reference'] == 'UPI-ADV-12345'
    assert receipt['receipt_number'].startswith('HYN-REC')
    assert len(receipt['allocations']) == 0

    all_recs = ok(c.get(f'/api/receipts?patient_id={p["id"]}'))
    assert any(r['receipt_number'] == receipt['receipt_number'] and r['unused_paise'] == 500000 for r in all_recs)


def test_billing_scenario_b_full_invoice_payment():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=150000)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 150000,
        'mode': 'Cash',
        'allocations': [
            {'invoice_id': inv['id'], 'amount_paise': 150000}
        ]
    }))

    receipt = res['receipt']
    assert receipt['amount_paise'] == 150000
    assert receipt['unused_paise'] == 0

    updated_inv = ok(c.get(f'/api/invoices/{inv["id"]}'))
    assert updated_inv['balance_paise'] == 0
    assert updated_inv['paid_paise'] == 150000
    assert updated_inv['status'] == 'paid'


def test_billing_scenario_b_partial_invoice_payment():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=200000)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 80000,
        'mode': 'Debit Card',
        'allocations': [
            {'invoice_id': inv['id'], 'amount_paise': 80000}
        ]
    }))

    receipt = res['receipt']
    assert receipt['unused_paise'] == 0

    updated_inv = ok(c.get(f'/api/invoices/{inv["id"]}'))
    assert updated_inv['balance_paise'] == 120000
    assert updated_inv['paid_paise'] == 80000
    assert updated_inv['status'] == 'partial'


def test_billing_payment_across_multiple_invoices():
    c = client('reception')
    p = patient(c)
    inv1 = create_billing_test_invoice(c, p['id'], total_paise=100000)
    inv2 = create_billing_test_invoice(c, p['id'], total_paise=250000)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 300000,
        'mode': 'Net Banking',
        'allocations': [
            {'invoice_id': inv1['id'], 'amount_paise': 100000},
            {'invoice_id': inv2['id'], 'amount_paise': 200000},
        ]
    }))

    receipt = res['receipt']
    assert receipt['amount_paise'] == 300000
    assert receipt['unused_paise'] == 0
    assert len(receipt['allocations']) == 2

    u1 = ok(c.get(f'/api/invoices/{inv1["id"]}'))
    assert u1['balance_paise'] == 0 and u1['status'] == 'paid'

    u2 = ok(c.get(f'/api/invoices/{inv2["id"]}'))
    assert u2['balance_paise'] == 50000 and u2['status'] == 'partial'


def test_billing_payment_greater_than_total_outstanding_excess_unused():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=100000)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 350000,
        'mode': 'Cash',
        'allocations': [
            {'invoice_id': inv['id'], 'amount_paise': 100000}
        ]
    }))

    receipt = res['receipt']
    assert receipt['amount_paise'] == 350000
    assert receipt['unused_paise'] == 250000

    u = ok(c.get(f'/api/invoices/{inv["id"]}'))
    assert u['balance_paise'] == 0 and u['status'] == 'paid'


def test_billing_payment_without_allocation_when_invoices_exist():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=500000)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 200000,
        'mode': 'UPI',
        'allocations': []
    }))

    receipt = res['receipt']
    assert receipt['unused_paise'] == 200000

    u = ok(c.get(f'/api/invoices/{inv["id"]}'))
    assert u['balance_paise'] == 500000 and u['status'] == 'unpaid'


def test_billing_write_off_with_valid_reason():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=100000)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 80000,
        'mode': 'Cash',
        'allocations': [
            {
                'invoice_id': inv['id'],
                'amount_paise': 80000,
                'write_off_paise': 20000,
                'write_off_reason': 'Rounding Adjustment',
                'comments': 'Approved by clinic manager'
            }
        ]
    }))

    receipt = res['receipt']
    assert receipt['amount_paise'] == 80000
    assert receipt['unused_paise'] == 0

    u = ok(c.get(f'/api/invoices/{inv["id"]}'))
    assert u['paid_paise'] == 80000
    assert u['credited_paise'] == 20000
    assert u['balance_paise'] == 0
    assert u['status'] == 'paid'


def test_billing_write_off_without_reason_rejected():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=100000)

    ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 80000,
        'allocations': [
            {
                'invoice_id': inv['id'],
                'amount_paise': 80000,
                'write_off_paise': 20000,
                'write_off_reason': ''
            }
        ]
    }), 422)


def test_billing_invalid_negative_allocation_rejected():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=100000)

    ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 50000,
        'allocations': [{'invoice_id': inv['id'], 'amount_paise': -1000}]
    }), 422)


def test_billing_allocation_exceeds_invoice_due_rejected():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=100000)

    ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 200000,
        'allocations': [{'invoice_id': inv['id'], 'amount_paise': 150000}]
    }), 409)


def test_billing_payment_for_another_patient_invoice_rejected():
    c = client('reception')
    p1 = patient(c, 'PatientOne')
    p2 = patient(c, 'PatientTwo')
    inv2 = create_billing_test_invoice(c, p2['id'], total_paise=100000)

    ok(c.post('/api/billing/payments', json={
        'patient_id': p1['id'],
        'amount_paise': 100000,
        'allocations': [{'invoice_id': inv2['id'], 'amount_paise': 100000}]
    }), 422)


def test_billing_cross_facility_invoice_allocation_rejected():
    c1 = client('reception')
    c2 = client('doctor')
    me = c2.get('/api/auth/me').json()
    roy_id = next(x['id'] for x in me['facilities'] if x['code'] == 'HYR')
    hyn_id = c1.headers['X-Facility-ID']

    p1 = ok(c1.post('/api/patients', json={
        'first_name': 'MultiBranch' + uuid4().hex[:6],
        'last_name': 'Patient',
        'dob': '1985-05-20',
        'sex': 'Male',
        'facility_ids': [hyn_id, roy_id]
    }))

    inv1 = create_billing_test_invoice(c1, p1['id'], total_paise=100000)

    c2.headers['X-Facility-ID'] = roy_id

    ok(c2.post('/api/billing/payments', json={
        'patient_id': p1['id'],
        'amount_paise': 100000,
        'allocations': [{'invoice_id': inv1['id'], 'amount_paise': 100000}]
    }), 403)


def test_billing_cancelled_invoice_allocation_rejected():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=100000)

    ok(c.post(f'/api/invoices/{inv["id"]}/cancel', json={'version': inv['version']}))

    ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 100000,
        'allocations': [{'invoice_id': inv['id'], 'amount_paise': 100000}]
    }), 409)


def test_billing_receipt_voiding_restores_balances():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=250000)

    res = ok(c.post('/api/billing/payments', json={
        'patient_id': p['id'],
        'amount_paise': 200000,
        'allocations': [
            {'invoice_id': inv['id'], 'amount_paise': 150000}
        ]
    }))
    receipt = res['receipt']
    assert receipt['unused_paise'] == 50000

    u = ok(c.get(f'/api/invoices/{inv["id"]}'))
    assert u['balance_paise'] == 100000 and u['status'] == 'partial'

    void_res = ok(c.post(f'/api/receipts/{receipt["id"]}/void'))
    assert 'voided' in void_res['message'].lower()

    restored_inv = ok(c.get(f'/api/invoices/{inv["id"]}'))
    assert restored_inv['balance_paise'] == 250000
    assert restored_inv['paid_paise'] == 0
    assert restored_inv['status'] == 'unpaid'

    recs = ok(c.get(f'/api/receipts?patient_id={p["id"]}'))
    voided_rec = next(r for r in recs if r['receipt_number'] == receipt['receipt_number'])
    assert voided_rec['is_void'] is True
    assert voided_rec['unused_paise'] == 0


def test_billing_idempotent_duplicate_submission():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=100000)

    idem_key = f"test_idem_{uuid4().hex}"
    payload = {
        'patient_id': p['id'],
        'amount_paise': 100000,
        'mode': 'Cash',
        'idempotency_key': idem_key,
        'allocations': [{'invoice_id': inv['id'], 'amount_paise': 100000}]
    }

    first = ok(c.post('/api/billing/payments', json=payload))
    assert first['replayed'] is False

    second = ok(c.post('/api/billing/payments', json=payload))
    assert second['replayed'] is True
    assert second['receipt']['id'] == first['receipt']['id']

    ok(c.post('/api/billing/payments', json={**payload, 'amount_paise': 50000}), 409)


def test_billing_concurrent_payment_requests_do_not_double_allocate():
    c1 = client('reception')
    c2 = client('reception')
    p = patient(c1)
    inv = create_billing_test_invoice(c1, p['id'], total_paise=100000)

    req1 = {
        'patient_id': p['id'],
        'amount_paise': 100000,
        'idempotency_key': f"c1_{uuid4().hex}",
        'allocations': [{'invoice_id': inv['id'], 'amount_paise': 100000}]
    }
    req2 = {
        'patient_id': p['id'],
        'amount_paise': 100000,
        'idempotency_key': f"c2_{uuid4().hex}",
        'allocations': [{'invoice_id': inv['id'], 'amount_paise': 100000}]
    }

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(
            lambda r: (c1 if r == 0 else c2).post('/api/billing/payments', json=req1 if r == 0 else req2),
            [0, 1]
        ))

    codes = sorted(r.status_code for r in responses)
    assert codes == [200, 409]

    final_inv = ok(c1.get(f'/api/invoices/{inv["id"]}'))
    assert final_inv['balance_paise'] == 0
    assert final_inv['paid_paise'] == 100000
    assert final_inv['status'] == 'paid'


def test_invoice_bulk_actions_and_draft_only_deletion():
    c = client('reception')
    p = patient(c)

    # 1. Create a draft invoice
    draft_payload = {
        'patient_id': p['id'],
        'status': 'draft',
        'lines': [{'description': 'Consultation Draft', 'quantity': 1, 'unit_paise': 50000}]
    }
    draft_inv = ok(c.post('/api/invoices', json=draft_payload))
    assert draft_inv['status'] == 'draft'

    # 2. Create an active unpaid invoice
    active_inv = create_billing_test_invoice(c, p['id'], total_paise=120000)
    assert active_inv['status'] == 'unpaid'

    # 3. Test flag and clear_flags
    flag_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'flag'
    }))
    assert flag_res['count'] == 1
    fetch1 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert fetch1['is_flagged'] is True

    clear_flag_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'clear_flags'
    }))
    assert clear_flag_res['count'] == 1
    fetch2 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert fetch2['is_flagged'] is False

    # 4. Test mark_as_mailed
    mail_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'mark_as_mailed'
    }))
    assert mail_res['count'] == 1
    fetch3 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert fetch3['is_mailed'] is True
    assert fetch3['mailed_at'] is not None

    # 5. Test sent_for_collection and clear_collection
    coll_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'sent_for_collection'
    }))
    assert coll_res['count'] == 1
    fetch4 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert fetch4['sent_for_collection'] is True

    clear_coll = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'clear_collection'
    }))
    assert clear_coll['count'] == 1
    fetch5 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert fetch5['sent_for_collection'] is False

    # 6. Test add_notes
    notes_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'add_notes',
        'notes': 'Called patient regarding balance due.'
    }))
    assert notes_res['count'] == 1
    fetch6 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert 'Called patient regarding balance due.' in fetch6['notes']

    # 7. Test set_follow_up
    fu_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'set_follow_up',
        'follow_up_date': '2026-12-01'
    }))
    assert fu_res['count'] == 1
    fetch7 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert fetch7['follow_up_date'] == '2026-12-01'

    # 8. Test add_procedure
    proc_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'add_procedure',
        'procedure': {'code': '93000', 'description': 'ECG 12-Lead', 'quantity': 1, 'unit_paise': 30000}
    }))
    assert proc_res['count'] == 1
    fetch8 = ok(c.get(f"/api/invoices/{active_inv['id']}"))
    assert fetch8['total_paise'] == 150000  # 120000 + 30000
    assert any(line['code'] == '93000' for line in fetch8['lines'])

    # 9. Test deleting active (non-draft) invoice is rejected with 409
    del_active_err = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [active_inv['id']],
        'action': 'delete'
    }), 409)
    assert 'Only Draft invoices can be deleted' in del_active_err['detail']

    del_active_single_err = ok(c.delete(f"/api/invoices/{active_inv['id']}"), 409)
    assert 'Only Draft invoices can be deleted' in del_active_single_err['detail']

    # 10. Test deleting draft invoice succeeds
    del_draft_res = ok(c.post('/api/invoices/bulk-action', json={
        'invoice_ids': [draft_inv['id']],
        'action': 'delete'
    }))
    assert del_draft_res['count'] == 1
    ok(c.get(f"/api/invoices/{draft_inv['id']}"), 404)


def test_invoice_pdf_generation_templates():
    c = client('reception')
    p = patient(c)
    inv = create_billing_test_invoice(c, p['id'], total_paise=95000)

    for template in ('standard', 'superbill', 'envelope'):
        res = c.get(f"/api/invoices/{inv['id']}/pdf?template={template}")
        assert res.status_code == 200
        assert res.headers['content-type'] == 'application/pdf'
        assert res.content.startswith(b'%PDF-1.4')
        assert len(res.content) > 500


def test_consultation_reports_same_day_orders_and_send_summary():
    c = client("doctor")
    p = patient(c)
    provider_id = staff(c, "doctor")["id"]
    created = ok(c.post(f"/api/patients/{p['id']}/consultations", json={
        "provider_id": provider_id,
        "facility_id": c.headers["X-Facility-ID"],
        "visit_type": "EECP Treatment Completed",
        "visit_mode": "In Person",
        "visit_date": "2032-05-16T11:30:00+05:30",
        "soap_json": {
            "subjective": {"chief_complaints": "POST EECP COMPLETE"},
            "assessment": {"notes": "Improved exercise tolerance"},
            "plan": {"notes": "Continue lifestyle modifications"},
        },
    }))

    lab_empty = c.get(f"/api/consultations/{created['id']}/export/lab-order")
    assert lab_empty.status_code == 404
    assert lab_empty.json()["detail"] == "No Lab Orders found for this consultation date."

    img_empty = c.get(f"/api/consultations/{created['id']}/export/image-order")
    assert img_empty.status_code == 404
    assert img_empty.json()["detail"] == "No Imaging Orders found for this consultation date."

    rx_empty = c.get(f"/api/consultations/{created['id']}/export/rx")
    assert rx_empty.status_code == 404
    assert rx_empty.json()["detail"] == "No prescriptions found for this consultation date."

    ok(c.post("/api/records/orders", json={
        "patient_id": p["id"],
        "kind": "Lab",
        "name": "Lipid Profile (Other Day)",
        "ordered_date": "May 10, 2032",
    }))
    assert c.get(f"/api/consultations/{created['id']}/export/lab-order").status_code == 404

    ok(c.post("/api/records/orders", json={
        "patient_id": p["id"],
        "kind": "Lab",
        "name": "Fasting Lipid Profile",
        "ordered_date": "May 16, 2032",
        "instructions": "12 hour fasting",
    }))
    ok(c.post("/api/records/orders", json={
        "patient_id": p["id"],
        "kind": "Imaging",
        "name": "ECG - Resting",
        "ordered_date": "May 16, 2032",
        "instructions": "12-lead ECG",
    }))
    ok(c.post("/api/records/medications", json={
        "patient_id": p["id"],
        "encounter_id": created["id"],
        "trade_name": "Pitavastatin",
        "dose": "4mg",
        "route": "Oral",
        "maen": "0-0-0-1",
        "duration_days": 30,
        "quantity": 30,
        "dispense_unit": "Tablets",
        "substitution_allowed": False,
        "instructions": "After dinner",
        "start_date": "2032-05-16",
    }))

    for path in (
        f"/api/consultations/{created['id']}/export/pdf?inline=1",
        f"/api/consultations/{created['id']}/export/clinical-summary?inline=1",
        f"/api/consultations/{created['id']}/export/lab-order?inline=1",
        f"/api/consultations/{created['id']}/export/image-order?inline=1",
        f"/api/consultations/{created['id']}/export/rx?inline=1",
    ):
        res = c.get(path)
        assert res.status_code == 200, f"{path}: {res.status_code} {res.text}"
        assert res.content.startswith(b"%PDF")
        assert len(res.content) > 2000

    summary = ok(c.get(f"/api/consultations/{created['id']}/clinical-summary"))
    assert summary["patient"]["mrn"] == p["mrn"]
    assert "[Substitution not allowed]" in summary["prescriptions"][0]["notes"]

    sent_email = ok(c.post(f"/api/consultations/{created['id']}/send-summary", json={
        "channel": "email",
        "recipient": "patient@demo.local",
    }))
    assert sent_email["status"] in ("sent", "queued")
    assert sent_email["pdf_size_bytes"] > 2000

    sent_sms = ok(c.post(f"/api/consultations/{created['id']}/send-summary", json={
        "channel": "sms",
        "recipient": "+919003070065",
    }))
    assert sent_sms["status"] in ("sent", "queued")
    assert sent_sms["pdf_size_bytes"] > 2000
