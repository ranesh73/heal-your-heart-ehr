import io
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy import select, or_, func, delete
from . import models as m, schemas as s
from .security import context, CLINICAL, BILLING, check_version, next_number
from .serialization import serialize, patient_out, encounter_out, invoice_out, plan_out

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
    return {'total':total,'items':[patient_out(c.db,p) for p in c.db.scalars(query.order_by(m.Patient.first_name).offset(offset).limit(limit))]}


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
    values=data.model_dump(exclude={'facility_ids','duplicate_reason'})
    row=m.Patient(**values,primary_facility_id=c.facility_id,mrn=next_number(c.db,branch.code+'-MR'))
    c.db.add(row); c.db.flush()
    for fid in set(data.facility_ids): c.db.add(m.PatientFacility(patient_id=row.id,facility_id=fid))
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
    for k,v in data.model_dump(exclude={'facility_ids','duplicate_reason'}).items(): setattr(row,k,v)
    for fid in set(data.facility_ids)-previous: c.db.add(m.PatientFacility(patient_id=row.id,facility_id=fid))
    row.version+=1; c.audit('edit_demographics',row)
    return patient_out(c.db,row)


@router.get('/{identifier}')
def chart(identifier:str,c=Depends(context)):
    row=c.patient(identifier)
    result={'patient':patient_out(c.db,row),'scope':'Current branch'}
    def rows(model):
        return c.db.scalars(select(model).where(model.patient_id==row.id,model.facility_id==c.facility_id).order_by(model.created_at.desc())).all()
    result['appointments']=[serialize(x) for x in rows(m.Appointment)]
    result['tasks']=[serialize(x) for x in rows(m.Task) if x.assignee_id==c.user.id or c.user.role in {'doctor','admin','reception'}]
    if c.user.role in CLINICAL:
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
