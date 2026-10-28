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
    result['payments'] = [serialize(x) for x in db.scalars(select(m.Payment).where(m.Payment.invoice_id==row.id))]
    result['credits'] = [serialize(x) for x in db.scalars(select(m.Credit).where(m.Credit.invoice_id==row.id))]
    result['paid_paise'] = sum(x['amount_paise'] for x in result['payments'])
    result['credited_paise'] = sum(x['amount_paise'] for x in result['credits'])
    result['balance_paise'] = row.total_paise-result['paid_paise']-result['credited_paise']
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
