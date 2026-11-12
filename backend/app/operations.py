import csv
import io
import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select, func
from . import models as m, schemas as s
from .security import context, BILLING, CLINICAL, next_number
from .serialization import serialize, invoice_out, plan_out

router=APIRouter(prefix='/api')


@router.get('/invoices')
def invoices(c=Depends(context)):
    c.allow(BILLING)
    return [invoice_out(c.db,x) for x in c.db.scalars(select(m.Invoice).where(m.Invoice.facility_id==c.facility_id).order_by(m.Invoice.created_at.desc()).limit(1000))]


@router.post('/invoices')
def create_invoice(data:s.InvoiceInput,c=Depends(context)):
    c.allow(BILLING); c.patient(data.patient_id)
    if data.encounter_id:
        encounter=c.record(m.Encounter,data.encounter_id)
        if encounter.patient_id!=data.patient_id: raise HTTPException(422,'Encounter belongs to another patient')
    total=sum(x.quantity*x.unit_paise for x in data.lines)-data.discount_paise
    if total<0: raise HTTPException(422,'Discount exceeds invoice subtotal')
    if total>10000000000: raise HTTPException(422,'Invoice total exceeds supported amount')
    branch=c.db.get(m.Facility,c.facility_id)
    row=m.Invoice(patient_id=data.patient_id,facility_id=c.facility_id,author_id=c.user.id,encounter_id=data.encounter_id,
        number=next_number(c.db,branch.code+'-INV'),discount_paise=data.discount_paise,total_paise=total,status='paid' if total==0 else 'unpaid')
    c.db.add(row); c.db.flush()
    for line in data.lines: c.db.add(m.InvoiceLine(invoice_id=row.id,**line.model_dump()))
    c.audit('create_invoice',row)
    return invoice_out(c.db,row)


def update_invoice(c,row):
    c.db.flush(); ledger=invoice_out(c.db,row)
    row.status='paid' if ledger['balance_paise']==0 else ('partial' if ledger['paid_paise']+ledger['credited_paise']>0 else 'unpaid')
    row.version+=1


@router.post('/invoices/{identifier}/payments')
def payment(identifier:str,data:s.PaymentInput,c=Depends(context)):
    c.allow(BILLING); row=c.record(m.Invoice,identifier)
    existing=c.db.scalar(select(m.Payment).where(m.Payment.idempotency_key==data.idempotency_key))
    if existing:
        if existing.invoice_id!=row.id or existing.amount_paise!=data.amount_paise or existing.mode!=data.mode: raise HTTPException(409,'Payment key was already used with different details')
        return {'receipt':serialize(existing),'invoice':invoice_out(c.db,row),'replayed':True}
    balance=invoice_out(c.db,row)['balance_paise']
    if row.status=='cancelled' or data.amount_paise>balance: raise HTTPException(409,'Payment exceeds the outstanding invoice balance')
    branch=c.db.get(m.Facility,c.facility_id)
    receipt=m.Payment(invoice_id=row.id,receipt_number=next_number(c.db,branch.code+'-REC'),actor_id=c.user.id,**data.model_dump())
    c.db.add(receipt); update_invoice(c,row); c.audit('simulated_payment',row)
    return {'receipt':serialize(receipt),'invoice':invoice_out(c.db,row),'replayed':False}


@router.post('/invoices/{identifier}/credits')
def credit(identifier:str,data:s.CreditInput,c=Depends(context)):
    c.allow(BILLING); row=c.record(m.Invoice,identifier)
    if row.status=='cancelled' or data.amount_paise>invoice_out(c.db,row)['balance_paise']: raise HTTPException(409,'Credit exceeds outstanding balance')
    entry=m.Credit(invoice_id=row.id,actor_id=c.user.id,**data.model_dump()); c.db.add(entry)
    update_invoice(c,row); c.audit('credit_invoice',row)
    return invoice_out(c.db,row)


@router.post('/invoices/{identifier}/cancel')
def cancel(identifier:str,data:s.Version,c=Depends(context)):
    from .security import check_version
    c.allow(BILLING); row=c.record(m.Invoice,identifier); check_version(row,data.version)
    ledger=invoice_out(c.db,row)
    if row.status=='cancelled' or ledger['paid_paise'] or ledger['credited_paise']: raise HTTPException(409,'Only unpaid, uncredited invoices can be cancelled')
    row.status='cancelled'; row.version+=1; c.audit('cancel_invoice',row)
    return invoice_out(c.db,row)


@router.get('/inventory')
def inventory(c=Depends(context)):
    c.allow({'admin','reception','therapist','doctor'})
    result=[]
    for item in c.db.scalars(select(m.InventoryItem).where(m.InventoryItem.facility_id==c.facility_id).order_by(m.InventoryItem.name)):
        row=serialize(item)
        row['movements']=[serialize(x) for x in c.db.scalars(select(m.StockMovement).where(m.StockMovement.item_id==item.id).order_by(m.StockMovement.created_at.desc()))]
        row['balance']=sum(x['quantity'] for x in row['movements'])
        result.append(row)
    return result


@router.post('/inventory')
def create_item(data:s.InventoryInput,c=Depends(context)):
    c.allow({'admin','reception','doctor'})
    row=m.InventoryItem(facility_id=c.facility_id,**data.model_dump()); c.db.add(row); c.audit('create_inventory_item',row)
    return serialize(row)


@router.post('/inventory/{identifier}/movements')
def stock(identifier:str,data:s.StockInput,c=Depends(context)):
    c.allow({'admin','reception','therapist','doctor'}); row=c.record(m.InventoryItem,identifier)
    current=c.db.scalar(select(func.coalesce(func.sum(m.StockMovement.quantity),0)).where(m.StockMovement.item_id==row.id))
    if not data.quantity or current+data.quantity<0: raise HTTPException(409,'Stock movement would create an invalid balance')
    move=m.StockMovement(item_id=row.id,actor_id=c.user.id,**data.model_dump()); c.db.add(move); c.audit('stock_movement',row)
    return serialize(move)


@router.get('/inventory/requisitions')
def list_requisitions(c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor'})
    query = select(m.InventoryRequisition).where(
        (m.InventoryRequisition.source_facility_id == c.facility_id) | 
        (m.InventoryRequisition.destination_facility_id == c.facility_id)
    ).order_by(m.InventoryRequisition.created_at.desc())
    rows = c.db.scalars(query).all()
    out = []
    for r in rows:
        d = serialize(r)
        sf = c.db.get(m.Facility, r.source_facility_id)
        df = c.db.get(m.Facility, r.destination_facility_id)
        u = c.db.get(m.User, r.requested_by)
        d['source_facility_name'] = sf.name if sf else ''
        d['destination_facility_name'] = df.name if df else ''
        d['requested_by_name'] = u.name if u else ''
        out.append(d)
    return out


@router.post('/inventory/requisitions')
def create_requisition(data: s.InventoryRequisitionInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor'})
    row = m.InventoryRequisition(
        source_facility_id=data.source_facility_id,
        destination_facility_id=data.destination_facility_id,
        item_name=data.item_name.strip(),
        quantity=data.quantity,
        requested_by=c.user.id,
        status='requested',
        notes=data.notes.strip()
    )
    c.db.add(row)
    c.audit('create_requisition', row)
    c.db.flush()
    return serialize(row)


@router.patch('/inventory/requisitions/{identifier}/status')
def update_requisition_status(identifier: str, data: s.InventoryRequisitionStatusInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor'})
    row = c.db.get(m.InventoryRequisition, identifier)
    if not row:
        raise HTTPException(404, 'Requisition not found')
    old_status = row.status
    new_status = data.status
    row.status = new_status
    row.updated_at = datetime.now()
    row.version += 1
    
    # If transitioning to received, transfer stock between facility stores if items exist
    if old_status != 'received' and new_status == 'received':
        src_item = c.db.scalar(select(m.InventoryItem).where(
            m.InventoryItem.facility_id == row.source_facility_id,
            func.lower(m.InventoryItem.name) == func.lower(row.item_name)
        ))
        dest_item = c.db.scalar(select(m.InventoryItem).where(
            m.InventoryItem.facility_id == row.destination_facility_id,
            func.lower(m.InventoryItem.name) == func.lower(row.item_name)
        ))
        if src_item:
            c.db.add(m.StockMovement(
                item_id=src_item.id,
                quantity=-row.quantity,
                reason=f"Inter-branch transfer dispatch to {row.destination_facility_id}",
                actor_id=c.user.id
            ))
        if dest_item:
            c.db.add(m.StockMovement(
                item_id=dest_item.id,
                quantity=row.quantity,
                reason=f"Inter-branch transfer received from {row.source_facility_id}",
                actor_id=c.user.id
            ))
    c.audit('update_requisition_status', row)
    return serialize(row)



def metrics(db,facility_id):
    def count(model,condition=True): return db.scalar(select(func.count()).select_from(model).where(model.facility_id==facility_id,condition))
    appointment_status=dict(db.execute(select(m.Appointment.status,func.count()).where(m.Appointment.facility_id==facility_id).group_by(m.Appointment.status)).all())
    financial=[invoice_out(db,x) for x in db.scalars(select(m.Invoice).where(m.Invoice.facility_id==facility_id,m.Invoice.status!='cancelled'))]
    return {'patients':db.scalar(select(func.count()).select_from(m.PatientFacility).where(m.PatientFacility.facility_id==facility_id)),
        'appointments':appointment_status,'draft_encounters':count(m.Encounter,m.Encounter.status=='draft'),
        'signed_encounters':count(m.Encounter,m.Encounter.status=='signed'),'active_plans':count(m.Plan,m.Plan.status.in_(['active','approved'])),
        'completed_sessions':count(m.DailySession,m.DailySession.status=='completed'),
        'pending_tasks':count(m.Task,m.Task.status=='pending'),'invoiced_paise':sum(x['total_paise'] for x in financial),
        'paid_paise':sum(x['paid_paise'] for x in financial),'balance_paise':sum(x['balance_paise'] for x in financial),
        'credit_paise':sum(x['credited_paise'] for x in financial)}


@router.get('/dashboard')
def dashboard(c=Depends(context)):
    local=datetime.now(ZoneInfo('Asia/Kolkata')); start=local.replace(hour=0,minute=0,second=0,microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
    appointments=[serialize(x) for x in c.db.scalars(select(m.Appointment).where(m.Appointment.facility_id==c.facility_id,m.Appointment.start_at>=start,m.Appointment.start_at<start+timedelta(days=1)).order_by(m.Appointment.start_at))]
    tasks=[serialize(x) for x in c.db.scalars(select(m.Task).where(m.Task.facility_id==c.facility_id,m.Task.assignee_id==c.user.id,m.Task.status=='pending').order_by(m.Task.due_date))]
    stats=metrics(c.db,c.facility_id)
    if c.user.role not in BILLING:
        stats={k:v for k,v in stats.items() if not k.endswith('_paise')}
    if c.user.role not in CLINICAL:
        stats={k:v for k,v in stats.items() if k not in ('draft_encounters','signed_encounters')}
    return {'date':local.date().isoformat(),'appointments':appointments,'tasks':tasks,'metrics':stats}


@router.get('/analytics')
def analytics(c=Depends(context)):
    c.allow({'admin','doctor','billing','reception'})
    result=metrics(c.db,c.facility_id)
    if c.user.role not in BILLING: result={k:v for k,v in result.items() if not k.endswith('_paise')}
    return result


@router.get('/analytics/export')
def export(c=Depends(context)):
    data=analytics(c); stream=io.StringIO(); writer=csv.writer(stream); writer.writerow(['Metric','Value'])
    for k,v in data.items():
        if isinstance(v,dict):
            for a,b in v.items(): writer.writerow([k+' / '+a,b])
        else: writer.writerow([k,v])
    c.audit('export_analytics',c.db.get(m.Facility,c.facility_id))
    return Response(stream.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename=branch-report.csv'})


@router.post('/jobs/recall-scan')
def enqueue_scan(c=Depends(context)):
    c.allow({'admin','reception','doctor'})
    job=m.Job(facility_id=c.facility_id,kind='recall_scan'); c.db.add(job); c.audit('enqueue_recall_scan',job)
    return serialize(job)


@router.get('/jobs')
def jobs(c=Depends(context)):
    c.allow({'admin','reception','doctor'})
    return [serialize(x) for x in c.db.scalars(select(m.Job).where(m.Job.facility_id==c.facility_id).order_by(m.Job.created_at.desc()).limit(50))]
