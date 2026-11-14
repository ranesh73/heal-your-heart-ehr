"""Explicit opt-in synthetic data seeder. Never imports the reference patient record."""
import os
import secrets
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from sqlalchemy import select
from . import models as m
from .db import SessionLocal, lock_writes, DATA_DIR
from .security import password_hash, next_number


def seed(db,password):
    if db.scalar(select(m.User)):
        return False
    branches=[]
    for code,name,beds in [('HYN','Neelankarai',13),('HYR','Royapettah',3),('HYM','Manapakkam',2),('HYT','Tirunelveli',3),('HYD','Madurai',2)]:
        branch=m.Facility(code=code,name='Heal Your Heart · '+name,address='Demonstration facility · Tamil Nadu')
        db.add(branch); db.flush(); branches.append(branch)
        for n in range(1,beds+1): db.add(m.Resource(facility_id=branch.id,name=f'EECP Room {n:02}',kind='EECP bed'))
        db.add(m.Resource(facility_id=branch.id,name='Consultation room',kind='Consultation room'))
    users={}
    for role,name in [('admin','Dev Administrator'),('doctor','Dr. Ananya Demo'),('assistant','Nila Demo'),('therapist','Kavin Demo'),('reception','Priya Demo'),('billing','Dev Billing')]:
        user=m.User(name=name,email=role+'@demo.local',role=role,password_hash=password_hash(password)); db.add(user); db.flush(); users[role]=user
        for branch in branches if role in ('admin','doctor','billing') else branches[:2]:
            db.add(m.UserFacility(user_id=user.id,facility_id=branch.id))
            if role in ('doctor','therapist'):
                for weekday in range(6): db.add(m.Availability(facility_id=branch.id,user_id=user.id,weekday=weekday,start_minute=7*60,end_minute=20*60+30))
    branch=branches[0]
    def common(p): return dict(patient_id=p.id,facility_id=branch.id,author_id=users['doctor'].id)
    patients=[]
    for i,(first,last,sex,year) in enumerate([('Aarav','Demo','Male',1968),('Mira','Sample','Female',1975),('Dev','Example','Male',1958),('Leela','Demo','Female',1982),('Arjun','Sample','Male',1971),('Tara','Example','Female',1990)]):
        p=m.Patient(mrn=next_number(db,branch.code+'-MR'),first_name=first,last_name=last,sex=sex,dob=date(year,i+1,12),
            primary_facility_id=branch.id,provider_id=users['doctor'].id,city='Chennai',state='Tamil Nadu',email=f'synthetic-{i+1}@example.invalid')
        db.add(p); db.flush(); patients.append(p)
        db.add(m.PatientFacility(patient_id=p.id,facility_id=branch.id))
        if i<2: db.add(m.PatientFacility(patient_id=p.id,facility_id=branches[1].id))
        db.add(m.History(**common(p),category='Medical',content='Synthetic training record. Confirm history during the demonstration consultation.'))
        db.add(m.PatientEntry(**common(p),kind='alert',title='Synthetic demonstration patient',content='No live patient data. Development workflows only.'))
    today=datetime.now(ZoneInfo('Asia/Kolkata')).date()
    if today.weekday()==6: today+=timedelta(days=1)
    bed=db.scalar(select(m.Resource).where(m.Resource.facility_id==branch.id,m.Resource.kind=='EECP bed').order_by(m.Resource.name))
    for i,p in enumerate(patients):
        start=datetime.combine(today,datetime.min.time(),tzinfo=ZoneInfo('Asia/Kolkata')).replace(hour=9+i).astimezone(timezone.utc).replace(tzinfo=None)
        db.add(m.Appointment(**common(p),provider_id=users['doctor'].id,start_at=start,end_at=start+timedelta(minutes=30),visit_type='New consultation' if i%2==0 else 'Follow-up',status='checked-in' if i<2 else 'confirmed'))
    p=patients[0]
    db.add(m.Vital(**common(p),weight_kg=72.4,height_cm=170,bp_sys=124,bp_dia=78,pulse_bpm=74,spo2_pct=98,central_sys=116,central_dia=76,cr_pwv=7.2,cf_pwv=8.1))
    db.add(m.Allergy(**common(p),category='Drug',allergen='Allergy status not yet assessed',severity='Unknown',reaction='Verify during consultation'))
    encounter=m.Encounter(**common(p),provider_id=users['doctor'].id,assistant_id=users['assistant'].id,visit_type='Baseline assessment',chief_complaint='Synthetic baseline consultation',hpi='Training encounter awaiting clinician documentation.')
    db.add(encounter)
    plan=m.Plan(**common(p),program='EECP · 35-session course',session_count=35,therapist_id=users['therapist'].id,start_date=today)
    db.add(plan); db.flush()
    # Start with a draft plan: authorization and consent must be exercised, never assumed.
    start=datetime.combine(today,datetime.min.time(),tzinfo=ZoneInfo('Asia/Kolkata')).replace(hour=11).astimezone(timezone.utc).replace(tzinfo=None)
    for n in range(3):
        day=start+timedelta(days=n)
        if day.replace(tzinfo=timezone.utc).astimezone(ZoneInfo('Asia/Kolkata')).weekday()==6: day+=timedelta(days=1)
        db.add(m.Appointment(**common(p),provider_id=users['therapist'].id,resource_id=bed.id,plan_id=plan.id,session_number=n+1,start_at=day,end_at=day+timedelta(hours=1),visit_type='EECP session'))
    db.add(m.ClinicalOrder(**common(p),kind='Lab',name='Baseline laboratory review',instructions='Synthetic order for result-entry training.'))
    for assignee,title,kind in [(users['doctor'],'Review baseline consultation','task'),(users['therapist'],'Verify EECP consent documentation','task'),(users['reception'],'Arrange follow-up appointment','recall')]:
        db.add(m.Task(**common(p),assignee_id=assignee.id,title=title,kind=kind,due_date=today,priority='normal'))
    for b in branches:
        for code,name,amount in [('CONSULT','Cardiology consultation',150000),('EECP-1','EECP session',350000),('EECP-35','EECP 35-session package',12250000),('EECP-20','EECP 20-session package',7000000),('KIT','EECP patient kit',50000)]:
            db.add(m.Catalog(facility_id=b.id,kind='service',code=code,name=name,price_paise=amount,content='Development catalog; verify fees before use.'))
        for code,name,body in [('CARDIAC','Cardiology assessment','Chief complaint; exertional symptoms; cardiac history; examination; clinician assessment; plan.'),('EECP','EECP review','Review documented daily observations, functional class, exercise tolerance, and patient-reported outcomes.')]:
            db.add(m.Catalog(facility_id=b.id,kind='template',code=code,name=name,content=body))
        db.add(m.Catalog(facility_id=b.id,kind='medication',code='TRAINING',name='Training tablet (synthetic)',content='Demo ingredient. Not a medication for patient use.'))
    item=m.InventoryItem(facility_id=branch.id,name='EECP training kit',category='Treatment supplies',supplier='Synthetic supplier',reorder_level=10)
    db.add(item); db.flush(); db.add(m.StockMovement(item_id=item.id,quantity=24,reason='Synthetic opening stock',actor_id=users['admin'].id))
    invoice=m.Invoice(**common(p),number=next_number(db,branch.code+'-INV'),total_paise=150000)
    db.add(invoice); db.flush(); db.add(m.InvoiceLine(invoice_id=invoice.id,code='CONSULT',description='Cardiology consultation',quantity=1,unit_paise=150000))
    return True


if __name__=='__main__':
    password=os.getenv('EHR_DEMO_PASSWORD') or secrets.token_urlsafe(18)
    with SessionLocal() as db:
        lock_writes(db)
        created=seed(db,password); db.commit()
    if created:
        try:
            output=Path(__file__).resolve().parents[2]/'.demo-credentials.txt'
            output.write_text('LOCAL DEVELOPMENT ONLY — generated credentials\n\nAccounts:\n'+''.join(r+'@demo.local\n' for r in ['admin','doctor','assistant','therapist','reception','billing'])+'\nPassword for all demo accounts: '+password+'\n',encoding='utf-8')
            print('Synthetic records created. Credentials saved to .demo-credentials.txt in the project root.')
        except Exception as e:
            print(f'Synthetic records created. Note on credentials file: {e}')
    else: print('Existing database retained; seeding skipped.')
    try:
        from scripts.seed_clinical_catalogs import seed_catalogs
        seed_catalogs()
        from scripts.seed_injection_catalogs import seed_injection_catalogs
        seed_injection_catalogs()
    except Exception as e:
        pass
