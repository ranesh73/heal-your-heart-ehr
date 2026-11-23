import io
import csv
import base64
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, or_, func, delete
from . import models as m, schemas as s
from .db import DATA_DIR
from .patient_alerts import active_alerts_for_patients
from .quick_notes import quick_notes_for_patients
from .security import context, CLINICAL, BILLING, check_version, next_number
from .serialization import serialize, patient_out, encounter_out, invoice_out, plan_out
from .phr_service import extract_6digit_patient_id, hash_password_bcrypt

PHOTO_DIR = DATA_DIR / 'patient_photos'
PHOTO_DIR.mkdir(parents=True, exist_ok=True)


def save_patient_photo(patient_id: str, photo_data: str) -> str:
    if not photo_data:
        return ""
    try:
        if ',' in photo_data:
            header, b64str = photo_data.split(',', 1)
        else:
            b64str = photo_data
        raw = base64.b64decode(b64str)
        out_file = PHOTO_DIR / f"{patient_id}.jpg"
        with open(out_file, "wb") as f:
            f.write(raw)
        return f"/api/patients/{patient_id}/photo"
    except Exception:
        return ""

router=APIRouter(prefix='/api/patients')


@router.get('')
def patients(q:str='',offset:int=0,limit:int=100,active:bool|None=None,c=Depends(context)):
    if len(q)>100 or offset<0 or not 1<=limit<=200: raise HTTPException(422,'Invalid search or page')
    query=select(m.Patient).join(m.PatientFacility).where(m.PatientFacility.facility_id==c.facility_id)
    if active is not None:
        query=query.where(m.Patient.active==active)
    if q:
        pattern='%'+q.replace('%','\\%').replace('_','\\_')+'%'
        query=query.where(or_(m.Patient.first_name.ilike(pattern,escape='\\'),m.Patient.last_name.ilike(pattern,escape='\\'),
            (m.Patient.first_name+' '+m.Patient.last_name).ilike(pattern,escape='\\'),m.Patient.mrn.ilike(pattern,escape='\\'),m.Patient.phone.ilike(pattern,escape='\\')))
    total=c.db.scalar(select(func.count()).select_from(query.subquery()))
    rows = list(c.db.scalars(query.order_by(m.Patient.first_name).offset(offset).limit(limit)))
    pids = [p.id for p in rows]
    alerts_map = active_alerts_for_patients(c.db, pids)
    notes_map = quick_notes_for_patients(c.db, pids)
    items = []
    for p in rows:
        item = patient_out(c.db, p)
        item['active_alerts'] = alerts_map.get(p.id, [])
        item['quick_notes'] = notes_map.get(p.id, [])
        items.append(item)
    return {'total': total, 'items': items}


@router.get('/import/template')
def import_template(c=Depends(context)):
    c.allow({'reception','admin','doctor'})
    headers = [
        "Patient Record ID", "First Name", "Last Name", "Gender", "Date Of Birth(mm/dd/yyyy)",
        "Email", "Home Phone", "Mobile Phone", "Work Phone",
        "AddressLine1", "AddressLine2", "City", "Country", "State", "Zip Code",
        "Caregiver First Name", "Caregiver Last Name"
    ]
    sample_rows = [
        ["HUHNKR7263", "Aarav", "Sharma", "Male", "05/14/1988", "aarav.sharma@example.com", "", "9840123456", "", "14 Beach Road", "Neelankarai", "Chennai", "India", "Tamil Nadu", "600041", "", ""],
        ["HUHNKR7264", "Priya", "Natarajan", "Female", "11/20/1992", "priya.n@example.com", "", "9840123457", "", "22 East Coast Rd", "", "Chennai", "India", "Tamil Nadu", "600041", "", ""]
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in sample_rows:
        writer.writerow(row)
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type='text/csv',
        headers={"Content-Disposition": "attachment; filename=patient_import_template.csv"}
    )


@router.post('/import')
async def import_patients(file: UploadFile = File(...), c=Depends(context)):
    c.allow({'reception','admin','doctor'})
    content = await file.read()
    try:
        text_content = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        text_content = content.decode('latin-1', errors='replace')
    
    reader = csv.reader(io.StringIO(text_content))
    rows = list(reader)
    if not rows:
        raise HTTPException(422, 'Uploaded file is empty')
    
    header = [h.strip() for h in rows[0]]
    header_lower = [h.lower() for h in header]
    
    def find_col(possible_names):
        for name in possible_names:
            name_l = name.lower()
            if name_l in header_lower:
                return header_lower.index(name_l)
        return -1
    
    col_rec_id = find_col(['patient record id', 'record id', 'mrn', 'patient id'])
    col_first_name = find_col(['first name', 'firstname'])
    col_last_name = find_col(['last name', 'lastname'])
    col_gender = find_col(['gender', 'sex'])
    col_dob = find_col(['date of birth(mm/dd/yyyy)', 'date of birth', 'dob'])
    col_email = find_col(['email'])
    col_home_phone = find_col(['home phone'])
    col_mobile_phone = find_col(['mobile phone', 'phone', 'mobile'])
    col_work_phone = find_col(['work phone'])
    col_addr1 = find_col(['addressline1', 'address line 1', 'address1', 'address'])
    col_addr2 = find_col(['addressline2', 'address line 2', 'address2'])
    col_area = find_col(['area'])
    col_city = find_col(['city'])
    col_country = find_col(['country'])
    col_state = find_col(['state'])
    col_zip = find_col(['zip code', 'zip', 'postal code', 'postal_code'])
    col_cg_first = find_col(['caregiver first name', 'caregiver name'])
    col_cg_last = find_col(['caregiver last name'])

    missing_cols = []
    if col_first_name == -1: missing_cols.append("First Name")
    if col_last_name == -1: missing_cols.append("Last Name")
    if col_gender == -1: missing_cols.append("Gender")
    if col_dob == -1: missing_cols.append("Date Of Birth")
    if missing_cols:
        raise HTTPException(422, f"Missing required column(s): {', '.join(missing_cols)}")
    
    data_rows = rows[1:]
    if len(data_rows) > 500:
        raise HTTPException(422, "You can only import a maximum of 500 patients.")
    
    branch = c.db.get(m.Facility, c.facility_id)
    imported = []
    skipped = []
    errors = []

    for idx, r in enumerate(data_rows, start=2):
        if not r or all(not cell.strip() for cell in r):
            continue
        
        def val(col_idx):
            return r[col_idx].strip() if col_idx != -1 and col_idx < len(r) else ''
        
        rec_id = val(col_rec_id)
        first_name = val(col_first_name)
        last_name = val(col_last_name)
        gender_raw = val(col_gender)
        dob_raw = val(col_dob)
        email = val(col_email)
        mobile_phone = val(col_mobile_phone)
        home_phone = val(col_home_phone)
        addr1 = val(col_addr1)
        addr2 = val(col_addr2)
        area = val(col_area)
        city = val(col_city)
        country = val(col_country) or 'India'
        state = val(col_state) or 'Tamil Nadu'
        zip_code = val(col_zip)
        cg_name = (val(col_cg_first) + (' ' + val(col_cg_last) if val(col_cg_last) else '')).strip()

        if not first_name or not last_name or not gender_raw or not dob_raw:
            errors.append(f"Row {idx}: First Name, Last Name, Gender, and Date Of Birth should not be empty.")
            continue
        
        gender_clean = gender_raw.capitalize()
        if gender_clean.startswith('M'):
            sex = 'Male'
        elif gender_clean.startswith('F'):
            sex = 'Female'
        elif gender_clean in {'Other', 'Unknown'}:
            sex = gender_clean
        else:
            sex = 'Other'
        
        parsed_dob = None
        for fmt in ('%m/%d/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m-%d-%Y'):
            try:
                parsed_dob = datetime.strptime(dob_raw, fmt).date()
                break
            except ValueError:
                pass
        if not parsed_dob:
            errors.append(f"Row {idx}: Invalid Date Of Birth '{dob_raw}'. Expected format mm/dd/yyyy.")
            continue

        phone = mobile_phone or home_phone
        dup_conditions = [
            (func.lower(m.Patient.first_name) == first_name.lower()) &
            (func.lower(m.Patient.last_name) == last_name.lower()) &
            (m.Patient.dob == parsed_dob)
        ]
        if phone:
            dup_conditions.append(m.Patient.phone == phone)
        if email:
            dup_conditions.append((func.lower(m.Patient.email) == email.lower()) & (m.Patient.email != ''))
        if rec_id:
            dup_conditions.append(m.Patient.mrn == rec_id)
        
        existing = c.db.scalar(select(m.Patient).where(or_(*dup_conditions)))
        if existing:
            skipped.append({"row": idx, "name": f"{first_name} {last_name}", "reason": f"Duplicate of existing patient (MRN: {existing.mrn})"})
            continue
        
        mrn = rec_id if rec_id and not c.db.scalar(select(m.Patient).where(m.Patient.mrn == rec_id)) else next_number(c.db, branch.code + '-MR')
        full_address = f"{addr1}, {addr2}".strip(', ') if addr1 or addr2 else ''
        
        patient = m.Patient(
            mrn=mrn,
            first_name=first_name,
            last_name=last_name,
            dob=parsed_dob,
            sex=sex,
            primary_facility_id=c.facility_id,
            phone=phone,
            email=email,
            address=full_address,
            area=area,
            city=city,
            district=city,
            state=state,
            postal_code=zip_code,
            emergency_name=cg_name,
            active=True
        )
        c.db.add(patient)
        c.db.flush()
        c.db.add(m.PatientFacility(patient_id=patient.id, facility_id=c.facility_id))
        imported.append({"id": patient.id, "name": f"{patient.first_name} {patient.last_name}", "mrn": patient.mrn})
    
    c.audit('import_patients', branch, f"Imported {len(imported)} patients, skipped {len(skipped)}")
    return {
        "imported": len(imported),
        "skipped": len(skipped),
        "total": len(data_rows),
        "errors": errors,
        "records": imported,
        "skipped_records": skipped
    }


def validate_patient(data,c,existing=None):
    if c.facility_id not in data.facility_ids or any(x not in c.facility_ids for x in data.facility_ids):
        raise HTTPException(403,'Choose authorized branches including the current branch')
    if data.provider_id: c.staff(data.provider_id,{'doctor'})
    conditions=[(func.lower(m.Patient.first_name)==data.first_name.lower()) & (func.lower(m.Patient.last_name)==data.last_name.lower()) & (m.Patient.dob==data.dob)]
    if data.phone: conditions.append(m.Patient.phone==data.phone)
    duplicates=select(m.Patient).where(or_(*conditions))
    if existing: duplicates=duplicates.where(m.Patient.id!=existing.id)
    if c.db.scalar(duplicates) and len(data.duplicate_reason)<8:
        raise HTTPException(409,'Possible duplicate patient. Verify identity and enter a duplicate override reason (at least 8 characters).')


@router.post('')
def register(data:s.PatientInput,c=Depends(context)):
    c.allow({'reception','admin','doctor'}); validate_patient(data,c)
    branch=c.db.get(m.Facility,c.facility_id)
    values=data.model_dump(exclude={'facility_ids','duplicate_reason','photo_data','send_phr_invitation'})
    if not values.get('email'):
        values['email'] = ''
    if not values.get('phone'):
        values['phone'] = ''
    pat_id = str(uuid4())
    row=m.Patient(id=pat_id,**values,primary_facility_id=c.facility_id,mrn=next_number(c.db,branch.code+'-MR'))
    if data.photo_data:
        saved_url = save_patient_photo(row.id, data.photo_data)
        if saved_url:
            row.photo_url = saved_url
    c.db.add(row); c.db.flush()
    for fid in set(data.facility_ids): c.db.add(m.PatientFacility(patient_id=row.id,facility_id=fid))
    
    # Auto-enable PHR invitation if selected and email provided
    invitation = (data.send_phr_invitation or '').strip().lower()
    if invitation in ('patient', 'representative') and row.email and row.email.strip():
        six_digit_id = extract_6digit_patient_id(row.mrn or row.id)
        hashed_pw = hash_password_bcrypt(six_digit_id)
        existing_acc = c.db.scalar(select(m.PatientPhrAccount).where(m.PatientPhrAccount.patient_id == row.id))
        if not existing_acc:
            phr_acc = m.PatientPhrAccount(
                id=str(uuid4()),
                patient_id=row.id,
                phone_or_email=row.email.strip().lower(),
                password_hash=hashed_pw,
                is_active=True,
                created_at=m.now(),
            )
            c.db.add(phr_acc)

    c.audit('register_patient',row,'Duplicate override recorded' if data.duplicate_reason else '')
    if data.duplicate_reason:
        c.db.add(m.PatientEntry(patient_id=row.id,facility_id=c.facility_id,author_id=c.user.id,kind='quick note',title='Duplicate review',content=data.duplicate_reason))
    return patient_out(c.db,row)


@router.put('/{identifier}')
def edit(identifier:str,data:s.PatientInput,version:int,c=Depends(context)):
    c.allow({'reception','admin','doctor'}); row=c.patient(identifier); check_version(row,version); validate_patient(data,c,row)
    previous=set(c.db.scalars(select(m.PatientFacility.facility_id).where(m.PatientFacility.patient_id==row.id)))
    if not previous.issubset(c.facility_ids): raise HTTPException(403,'Patient has branch associations outside your scope')
    if not previous.issubset(data.facility_ids): raise HTTPException(409,'Existing branch associations are retained to preserve chart access')
    values=data.model_dump(exclude={'facility_ids','duplicate_reason','photo_data','send_phr_invitation'})
    if not values.get('email'):
        values['email'] = ''
    if not values.get('phone'):
        values['phone'] = ''
    if data.photo_data:
        saved_url = save_patient_photo(row.id, data.photo_data)
        if saved_url:
            values['photo_url'] = saved_url
    for k,v in values.items(): setattr(row,k,v)
    for fid in set(data.facility_ids)-previous: c.db.add(m.PatientFacility(patient_id=row.id,facility_id=fid))
    row.version+=1; c.audit('edit_demographics',row)
    return patient_out(c.db,row)


@router.get('/{identifier}/photo')
def get_patient_photo(identifier: str, c=Depends(context)):
    row = c.patient(identifier)
    for ext, mtype in (('.jpg', 'image/jpeg'), ('.png', 'image/png')):
        file_path = PHOTO_DIR / f"{row.id}{ext}"
        if file_path.is_file():
            return FileResponse(file_path, media_type=mtype)
    raise HTTPException(404, "No profile photo uploaded for this patient")


class PatientPhotoPayload(BaseModel):
    photo_data: str


@router.post('/{identifier}/photo')
def upload_patient_photo(identifier: str, payload: PatientPhotoPayload, c=Depends(context)):
    c.allow({'reception', 'admin', 'doctor'})
    row = c.patient(identifier)
    saved_url = save_patient_photo(row.id, payload.photo_data)
    if not saved_url:
        raise HTTPException(400, "Invalid image data provided")
    row.photo_url = saved_url
    c.db.commit()
    return {"status": "ok", "photo_url": row.photo_url}


@router.get('/{identifier}')
def chart(identifier:str,c=Depends(context)):
    row=c.patient(identifier)
    alerts_map = active_alerts_for_patients(c.db, [row.id])
    notes_map = quick_notes_for_patients(c.db, [row.id])
    patient_alerts = alerts_map.get(row.id, [])
    patient_notes = notes_map.get(row.id, [])
    pat_payload = patient_out(c.db, row)
    pat_payload['active_alerts'] = patient_alerts
    pat_payload['quick_notes'] = patient_notes
    result={'patient': pat_payload, 'active_alerts': patient_alerts, 'quick_notes': patient_notes, 'scope': 'Current branch'}
    def rows(model):
        return c.db.scalars(select(model).where(model.patient_id==row.id,model.facility_id==c.facility_id).order_by(model.created_at.desc())).all()
    result['appointments']=[serialize(x) for x in rows(m.Appointment)]
    result['tasks']=[serialize(x) for x in rows(m.Task) if x.assignee_id==c.user.id or c.user.role in {'doctor','admin','reception'}]
    if c.user.role in CLINICAL:
        result['referrals'] = [serialize(x) for x in c.db.scalars(select(m.Referral).where(m.Referral.patient_id == row.id).order_by(m.Referral.created_at.desc())).all()]
        for key,model in [('history',m.History),('diagnoses',m.Diagnosis),('allergies',m.Allergy),
                           ('medications',m.Medication),('injections',m.Injection),('vaccines',m.Vaccine),
                           ('vitals',m.Vital),('orders',m.ClinicalOrder),('documents',m.Document),
                           ('sessions',m.DailySession),('weekly',m.WeeklyAssessment),('entries',m.PatientEntry)]:
            result[key]=[serialize(x) for x in rows(model)]
        for inj in result.get('injections', []):
            if not inj.get('dosage') and inj.get('dose'): inj['dosage'] = inj['dose']
            if inj.get('administered_by'):
                st = c.db.get(m.User, inj['administered_by'])
                if st:
                    inj['administered_by_name'] = st.name
                    inj['administered_by_role'] = st.role
            elif inj.get('author_id'):
                st = c.db.get(m.User, inj['author_id'])
                if st:
                    inj['administered_by_name'] = st.name
                    inj['administered_by_role'] = st.role
        result['injection_orders'] = [serialize(x) for x in rows(m.InjectionOrder)]
        for io in result['injection_orders']:
            io['name'] = io.get('medication_name_snapshot') or ''
            if io.get('ordered_by'):
                st = c.db.get(m.User, io['ordered_by'])
                if st:
                    io['ordered_by_name'] = f"Dr. {st.name}" if st.role == 'doctor' and not st.name.startswith("Dr.") else st.name
                    io['ordered_by_role'] = st.role
        for vac in result.get('vaccines', []):
            if not vac.get('name') and vac.get('vaccine_name'): vac['name'] = vac['vaccine_name']
            if not vac.get('dosage') and vac.get('dose'): vac['dosage'] = vac['dose']
        result['encounters']=[encounter_out(c.db,x) for x in rows(m.Encounter)]
        for encounter in result['encounters']:
            consultation = c.db.get(m.Consultation, encounter['id'])
            encounter['consultation_status'] = consultation.status if consultation else (
                'signed' if encounter['status'] == 'signed' else 'unsigned'
            )
            if consultation:
                encounter['soap_json'] = consultation.soap_json
                encounter['facility_name'] = consultation.facility_name
                if consultation.signed_by:
                    encounter['signed_by'] = consultation.signed_by
                if consultation.signed_at:
                    encounter['signed_at'] = consultation.signed_at.isoformat()
        result['plans']=[plan_out(c.db,x) for x in rows(m.Plan)]
        for order in result['orders']:
            order['values']=[serialize(x) for x in c.db.scalars(select(m.LabValue).where(m.LabValue.order_id==order['id']))]
    elif c.user.role=='reception':
        result['plans']=[{k:v for k,v in plan_out(c.db,x).items() if k in {'id','patient_id','program','session_count','completed','scheduled','status','therapist_id','start_date'}} for x in rows(m.Plan)]
    if c.user.role in BILLING:
        result['invoices']=[invoice_out(c.db,x) for x in rows(m.Invoice)]
    result['messages']=[serialize(x) for x in rows(m.Message) if c.user.id in (x.author_id,x.recipient_id)]
    c.audit('view_patient',row)
    return result


# ============================================================================
# PHR ACCESS MANAGEMENT ENDPOINTS (1-Click Enable / Reset / Revoke)
# ============================================================================

@router.get('/{identifier}/phr-access')
def get_patient_phr_access(identifier: str, c=Depends(context)):
    patient = c.patient(identifier)
    acc = c.db.scalar(select(m.PatientPhrAccount).where(m.PatientPhrAccount.patient_id == patient.id))
    six_digit_id = extract_6digit_patient_id(patient.mrn or patient.id)
    return {
        "patient_id": patient.id,
        "mrn": patient.mrn,
        "email": patient.email or "",
        "patient_id_6digit": six_digit_id,
        "enabled": bool(acc and acc.is_active),
        "is_active": bool(acc.is_active) if acc else False,
        "has_account": acc is not None,
        "login_url": "/phr/login",
        "last_login_at": acc.last_login_at.isoformat() if acc and acc.last_login_at else None,
    }


@router.post('/{identifier}/phr-access/enable')
def enable_patient_phr_access(identifier: str, c=Depends(context)):
    patient = c.patient(identifier)
    email = (patient.email or "").strip().lower()
    if not email:
        raise HTTPException(400, "Please enter and save an Email Address for this patient before enabling PHR access.")

    six_digit_id = extract_6digit_patient_id(patient.mrn or patient.id)
    hashed_pw = hash_password_bcrypt(six_digit_id)

    acc = c.db.scalar(select(m.PatientPhrAccount).where(m.PatientPhrAccount.patient_id == patient.id))
    if acc:
        acc.phone_or_email = email
        acc.password_hash = hashed_pw
        acc.is_active = True
    else:
        # Avoid uniqueness collision on email if another test row had it
        existing = c.db.scalar(select(m.PatientPhrAccount).where(m.PatientPhrAccount.phone_or_email == email))
        if existing and existing.patient_id != patient.id:
            existing.phone_or_email = f"prev_{existing.patient_id}_{email}"
        acc = m.PatientPhrAccount(
            id=str(uuid4()),
            patient_id=patient.id,
            phone_or_email=email,
            password_hash=hashed_pw,
            is_active=True,
            created_at=m.now(),
        )
        c.db.add(acc)

    c.audit('enable_phr_access', patient)
    c.db.commit()

    return {
        "status": "ok",
        "enabled": True,
        "email": email,
        "login_url": "/phr/login",
        "default_password": six_digit_id,
        "message": "PHR Access enabled successfully",
    }


@router.post('/{identifier}/phr-access/reset-password')
def reset_patient_phr_password(identifier: str, c=Depends(context)):
    patient = c.patient(identifier)
    acc = c.db.scalar(select(m.PatientPhrAccount).where(m.PatientPhrAccount.patient_id == patient.id))
    if not acc:
        raise HTTPException(404, "No PHR account found for this patient. Please enable PHR access first.")

    six_digit_id = extract_6digit_patient_id(patient.mrn or patient.id)
    acc.password_hash = hash_password_bcrypt(six_digit_id)
    acc.is_active = True
    c.audit('reset_phr_password', patient)
    c.db.commit()

    return {
        "status": "ok",
        "enabled": True,
        "email": patient.email or acc.phone_or_email,
        "login_url": "/phr/login",
        "default_password": six_digit_id,
        "message": f"Password reset to 6-digit Patient ID ({six_digit_id}).",
    }


@router.post('/{identifier}/phr-access/disable')
def disable_patient_phr_access(identifier: str, c=Depends(context)):
    patient = c.patient(identifier)
    acc = c.db.scalar(select(m.PatientPhrAccount).where(m.PatientPhrAccount.patient_id == patient.id))
    if acc:
        acc.is_active = False
        c.db.execute(delete(m.PatientPhrSession).where(m.PatientPhrSession.patient_id == patient.id))
        c.audit('disable_phr_access', patient)
        c.db.commit()

    return {
        "status": "ok",
        "enabled": False,
        "message": "PHR access has been revoked.",
    }
