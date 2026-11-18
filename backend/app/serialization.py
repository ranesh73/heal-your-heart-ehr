from datetime import date, datetime
from . import models as m
from sqlalchemy import select, func


def serialize(row, exclude=()):
    result = {}
    for col in row.__table__.columns:
        if col.name in exclude or col.name in ('password_hash','storage_key'):
            continue
        val = getattr(row,col.name)
        if isinstance(val,datetime):
            val = val.isoformat()+'Z'
        elif isinstance(val,date):
            val = val.isoformat()
        result[col.name] = val
    return result


def patient_out(db,p):
    result = serialize(p)
    result['name'] = p.first_name+' '+p.last_name
    result['facility_ids'] = list(db.scalars(select(m.PatientFacility.facility_id).where(m.PatientFacility.patient_id==p.id)))
    return result


def invoice_out(db,row):
    result = serialize(row)
    result['lines'] = [serialize(x) for x in db.scalars(select(m.InvoiceLine).where(m.InvoiceLine.invoice_id==row.id))]
    all_payments = [serialize(x) for x in db.scalars(select(m.Payment).where(m.Payment.invoice_id==row.id))]
    
    # Query void billing receipts to exclude voided transactions from active balance
    void_receipt_numbers = set(db.scalars(
        select(m.BillingReceipt.receipt_number).where(m.BillingReceipt.is_void == True)
    ))
    active_payments = []
    for p in all_payments:
        base_rec = p['receipt_number'].rsplit('-', 1)[0] if '-' in p['receipt_number'] else p['receipt_number']
        if base_rec in void_receipt_numbers or p['receipt_number'] in void_receipt_numbers:
            p['is_void'] = True
        else:
            p['is_void'] = False
            active_payments.append(p)

    all_credits = [serialize(x) for x in db.scalars(select(m.Credit).where(m.Credit.invoice_id==row.id))]
    active_credits = []
    for c in all_credits:
        if any(vr in (c.get('reason') or '') for vr in void_receipt_numbers):
            c['is_void'] = True
        else:
            c['is_void'] = False
            active_credits.append(c)

    result['payments'] = all_payments
    result['credits'] = all_credits
    result['paid_paise'] = sum(x['amount_paise'] for x in active_payments)
    result['credited_paise'] = sum(x['amount_paise'] for x in active_credits)
    result['balance_paise'] = 0 if row.status == 'cancelled' else max(0, row.total_paise-result['paid_paise']-result['credited_paise'])
    if 'created_at' in result and result['created_at']:
        result['date'] = result['created_at'].split('T')[0]
        result['invoice_date'] = result['date']
    from datetime import timedelta
    if not result.get('due_date') and row.created_at:
        result['due_date'] = (row.created_at + timedelta(days=30)).date().isoformat()
    result['is_overdue'] = bool(
        result['balance_paise'] > 0
        and result.get('due_date')
        and date.today().isoformat() > result['due_date']
        and row.status != 'cancelled'
    )
    fac = db.get(m.Facility, row.facility_id)
    result['facility_name'] = fac.name if fac else 'Heal Your Heart Neelankarai'
    pat = db.get(m.Patient, row.patient_id)
    if pat:
        result['patient_name'] = f"{pat.first_name} {pat.last_name}".strip()
        result['patient_mrn'] = pat.mrn
    doc = db.get(m.User, row.author_id)
    result['consultant_name'] = doc.name if doc else 'Dr. Ramasamy S'
    if row.encounter_id:
        enc = db.get(m.Encounter, row.encounter_id)
        if enc:
            result['consultation_date'] = str(enc.created_at)
            enc_doc = db.get(m.User, enc.provider_id)
            if enc_doc:
                result['consultant_name'] = enc_doc.name
    return result


def plan_out(db,row):
    result = serialize(row)
    result['completed'] = db.scalar(select(func.count()).select_from(m.DailySession).where(m.DailySession.plan_id==row.id,m.DailySession.status=='completed'))
    result['scheduled'] = db.scalar(select(func.count()).select_from(m.Appointment).where(m.Appointment.plan_id==row.id))
    return result


def encounter_out(db,row):
    result=serialize(row)
    result['symptoms']=[serialize(x) for x in db.scalars(select(m.Symptom).where(m.Symptom.encounter_id==row.id))]
    result['amendments']=[serialize(x) for x in db.scalars(select(m.Amendment).where(m.Amendment.encounter_id==row.id).order_by(m.Amendment.created_at))]
    result['carry_forwards']=[serialize(x) for x in db.scalars(select(m.CarryForward).where(m.CarryForward.encounter_id==row.id))]
    return result
