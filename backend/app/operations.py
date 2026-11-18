import csv
import io
import json
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select, func, or_, delete
from . import models as m, schemas as s
from .security import context, BILLING, CLINICAL, next_number
from .serialization import serialize, invoice_out, plan_out

router=APIRouter(prefix='/api')


@router.get('/invoices')
def invoices(patient_id: str | None = None, c=Depends(context)):
    c.allow(BILLING)
    stmt = select(m.Invoice)
    if patient_id:
        stmt = stmt.where(m.Invoice.patient_id == patient_id)
    else:
        stmt = stmt.where(m.Invoice.facility_id == c.facility_id)
    return [invoice_out(c.db, x) for x in c.db.scalars(stmt.order_by(m.Invoice.created_at.desc()).limit(1000))]


@router.get('/invoices/{identifier}')
def get_single_invoice(identifier: str, c=Depends(context)):
    c.allow(BILLING)
    row = c.record(m.Invoice, identifier)
    return invoice_out(c.db, row)


@router.get('/invoices/{identifier}/pdf')
def get_invoice_pdf(identifier: str, template: str = Query('standard'), c=Depends(context)):
    c.allow(BILLING)
    row = c.record(m.Invoice, identifier)
    lines = list(c.db.scalars(select(m.InvoiceLine).where(m.InvoiceLine.invoice_id == row.id).order_by(m.InvoiceLine.id)))
    pat = c.db.get(m.Patient, row.patient_id)
    fac = c.db.get(m.Facility, row.facility_id)
    
    ledger = invoice_out(c.db, row)
    row.paid_paise = ledger['paid_paise'] + ledger['credited_paise']
    row.balance_paise = ledger['balance_paise']
    
    from .invoice_pdf import generate_invoice_pdf
    tmpl = template if template in ('standard', 'superbill', 'envelope') else 'standard'
    pdf_bytes = generate_invoice_pdf(row, lines, pat, fac, template=tmpl)
    filename = f"Invoice_{row.number}_{tmpl}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Cache-Control": "no-cache",
        }
    )


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
    author_id = data.doctor_id if (data.doctor_id and c.db.get(m.User, data.doctor_id)) else c.user.id
    init_status = 'draft' if data.status == 'draft' else ('paid' if total == 0 else 'unpaid')

    row=m.Invoice(patient_id=data.patient_id,facility_id=c.facility_id,author_id=author_id,encounter_id=data.encounter_id,
        number=next_number(c.db,branch.code+'-INV'),discount_paise=data.discount_paise,total_paise=total,status=init_status)
    c.db.add(row); c.db.flush()
    for line in data.lines:
        line_data = line.model_dump()
        c.db.add(m.InvoiceLine(invoice_id=row.id,**line_data))

    if data.payment and data.payment.amount_paise > 0 and init_status != 'draft':
        pay_amount = min(data.payment.amount_paise, total)
        idem = f"inv_pay_{row.id}_{uuid.uuid4().hex[:12]}"
        receipt = m.Payment(
            invoice_id=row.id,
            receipt_number=next_number(c.db, branch.code+'-REC'),
            actor_id=c.user.id,
            amount_paise=pay_amount,
            mode=data.payment.mode or 'Cash',
            idempotency_key=idem,
            simulated=True
        )
        c.db.add(receipt)
        update_invoice(c, row)

    c.audit('create_invoice',row)
    return invoice_out(c.db,row)


@router.put('/invoices/{identifier}')
def update_invoice_details(identifier: str, data: s.InvoiceInput, c=Depends(context)):
    c.allow(BILLING)
    row = c.record(m.Invoice, identifier)
    if row.status in ('paid', 'cancelled'):
        raise HTTPException(400, f"Cannot edit an invoice in '{row.status}' status")

    c.db.execute(delete(m.InvoiceLine).where(m.InvoiceLine.invoice_id == row.id))
    total = sum(x.quantity * x.unit_paise for x in data.lines) - data.discount_paise
    if total < 0: raise HTTPException(422, 'Discount exceeds invoice subtotal')
    row.total_paise = total
    row.discount_paise = data.discount_paise
    if data.doctor_id and c.db.get(m.User, data.doctor_id):
        row.author_id = data.doctor_id
    if data.encounter_id:
        row.encounter_id = data.encounter_id
    if data.status:
        row.status = data.status
    for line in data.lines:
        c.db.add(m.InvoiceLine(invoice_id=row.id, **line.model_dump()))

    if data.payment and data.payment.amount_paise > 0 and row.status != 'draft':
        branch = c.db.get(m.Facility, c.facility_id)
        pay_amount = min(data.payment.amount_paise, total)
        idem = f"inv_pay_{row.id}_{uuid.uuid4().hex[:12]}"
        receipt = m.Payment(
            invoice_id=row.id,
            receipt_number=next_number(c.db, branch.code+'-REC'),
            actor_id=c.user.id,
            amount_paise=pay_amount,
            mode=data.payment.mode or 'Cash',
            idempotency_key=idem,
            simulated=True
        )
        c.db.add(receipt)

    update_invoice(c, row)
    c.audit('update_invoice', row)
    return invoice_out(c.db, row)


def update_invoice(c,row):
    c.db.flush(); ledger=invoice_out(c.db,row)
    row.status='paid' if ledger['balance_paise']==0 else ('partial' if ledger['paid_paise']+ledger['credited_paise']>0 else 'unpaid')
    row.version+=1


@router.post('/invoices/{identifier}/payments')
def payment(identifier:str,data:s.PaymentInput,c=Depends(context)):
    c.allow(BILLING); row=c.record(m.Invoice,identifier)
    idem = data.idempotency_key or f"pay_{row.id}_{uuid.uuid4().hex[:16]}"
    existing=c.db.scalar(select(m.Payment).where(m.Payment.idempotency_key==idem))
    if existing:
        if existing.invoice_id!=row.id or existing.amount_paise!=data.amount_paise or existing.mode!=data.mode: raise HTTPException(409,'Payment key was already used with different details')
        return {'receipt':serialize(existing),'invoice':invoice_out(c.db,row),'replayed':True}
    balance=invoice_out(c.db,row)['balance_paise']
    if row.status=='cancelled' or data.amount_paise>balance: raise HTTPException(409,'Payment exceeds the outstanding invoice balance')
    branch=c.db.get(m.Facility,c.facility_id)
    receipt=m.Payment(
        invoice_id=row.id,
        receipt_number=next_number(c.db,branch.code+'-REC'),
        actor_id=c.user.id,
        amount_paise=data.amount_paise,
        mode=data.mode,
        idempotency_key=idem,
        simulated=data.simulated
    )
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


@router.delete('/invoices/{identifier}')
def delete_invoice(identifier: str, c=Depends(context)):
    c.allow(BILLING)
    row = c.record(m.Invoice, identifier)
    if row.status != 'draft':
        raise HTTPException(409, f"Only Draft invoices can be deleted. Invoice '{row.number}' is in '{row.status}' status.")
    c.db.execute(delete(m.InvoiceLine).where(m.InvoiceLine.invoice_id == row.id))
    c.db.delete(row)
    c.audit('delete_invoice', row, f"Deleted draft invoice {row.number}")
    return {'status': 'deleted', 'id': identifier, 'number': row.number}


@router.post('/invoices/bulk-action')
def invoice_bulk_action(data: s.InvoiceBulkActionInput, c=Depends(context)):
    c.allow(BILLING)
    affected = []
    
    if data.action == 'delete':
        for inv_id in data.invoice_ids:
            inv = c.db.get(m.Invoice, inv_id)
            if not inv:
                continue
            if inv.facility_id != c.facility_id:
                raise HTTPException(403, f"Cannot delete invoice {inv.number} from another facility")
            if inv.status != 'draft':
                raise HTTPException(409, f"Only Draft invoices can be deleted. Invoice '{inv.number}' is in '{inv.status}' status.")
            affected.append(inv)
        
        for inv in affected:
            c.audit('delete_draft_invoice', inv, f"Deleted draft invoice {inv.number}")
            c.db.execute(delete(m.InvoiceLine).where(m.InvoiceLine.invoice_id == inv.id))
            c.db.delete(inv)
        
        return {'action': 'delete', 'count': len(affected), 'affected_ids': [x.id for x in affected]}

    for inv_id in data.invoice_ids:
        inv = c.db.get(m.Invoice, inv_id)
        if not inv or inv.facility_id != c.facility_id:
            continue
        
        if data.action == 'mark_as_mailed':
            inv.is_mailed = True
            inv.mailed_at = m.now()
            inv.version += 1
            affected.append(inv)
        elif data.action == 'flag':
            inv.is_flagged = True
            inv.version += 1
            affected.append(inv)
        elif data.action == 'clear_flags':
            inv.is_flagged = False
            inv.version += 1
            affected.append(inv)
        elif data.action == 'sent_for_collection':
            inv.sent_for_collection = True
            inv.collection_at = m.now()
            inv.version += 1
            affected.append(inv)
        elif data.action == 'clear_collection':
            inv.sent_for_collection = False
            inv.collection_at = None
            inv.version += 1
            affected.append(inv)
        elif data.action == 'add_notes':
            new_note = (data.notes or '').strip()
            if new_note:
                existing = inv.notes or ''
                inv.notes = f"{existing}\n{new_note}".strip() if existing else new_note
                inv.version += 1
                affected.append(inv)
        elif data.action == 'set_follow_up':
            if data.follow_up_date:
                from datetime import date as dt_date
                inv.follow_up_date = dt_date.fromisoformat(data.follow_up_date)
                inv.version += 1
                affected.append(inv)
        elif data.action == 'add_procedure':
            if data.procedure and inv.status not in ('paid', 'cancelled'):
                proc = data.procedure
                qty = int(proc.get('quantity', 1))
                unit_paise = int(proc.get('unit_paise', 0))
                line_entry = m.InvoiceLine(
                    invoice_id=inv.id,
                    code=str(proc.get('code', '')),
                    description=str(proc.get('description', 'Procedure Item')),
                    quantity=max(1, qty),
                    unit_paise=max(0, unit_paise)
                )
                c.db.add(line_entry)
                c.db.flush()
                lines = list(c.db.scalars(select(m.InvoiceLine).where(m.InvoiceLine.invoice_id == inv.id)))
                inv.total_paise = max(0, sum(l.quantity * l.unit_paise for l in lines) - (inv.discount_paise or 0))
                update_invoice(c, inv)
                affected.append(inv)
        else:
            raise HTTPException(400, f"Unsupported bulk action '{data.action}'")

    for inv in affected:
        c.audit(f"invoice_{data.action}", inv, json.dumps({'action': data.action}))
    return {'action': data.action, 'count': len(affected), 'affected_ids': [x.id for x in affected]}


def serialize_billing_receipt(db, rec: m.BillingReceipt):
    pat = db.get(m.Patient, rec.patient_id)
    fac = db.get(m.Facility, rec.facility_id)
    allocations = list(db.scalars(
        select(m.ReceiptAllocation)
        .where(m.ReceiptAllocation.receipt_id == rec.id)
        .order_by(m.ReceiptAllocation.created_at)
    ))
    inv_ids = [a.invoice_id for a in allocations]
    inv_map = {}
    if inv_ids:
        invoices = list(db.scalars(select(m.Invoice).where(m.Invoice.id.in_(inv_ids))))
        for inv in invoices:
            inv_map[inv.id] = {
                "number": inv.number,
                "total_paise": inv.total_paise,
                "status": inv.status,
            }

    alloc_list = []
    for a in allocations:
        inv_info = inv_map.get(a.invoice_id, {})
        alloc_list.append({
            "id": a.id,
            "invoice_id": a.invoice_id,
            "invoice_number": inv_info.get("number", ""),
            "invoice_total_paise": inv_info.get("total_paise", 0),
            "amount_paise": a.amount_paise,
            "write_off_paise": a.write_off_paise,
            "write_off_reason": a.write_off_reason,
            "comments": a.comments,
        })

    primary_invoice = alloc_list[0] if alloc_list else None

    return {
        "id": rec.id,
        "receipt_number": rec.receipt_number,
        "invoice_id": primary_invoice["invoice_id"] if primary_invoice else None,
        "invoice_number": primary_invoice["invoice_number"] if primary_invoice else "",
        "patient_id": rec.patient_id,
        "patient_name": f"{pat.first_name} {pat.last_name}".strip() if pat else "",
        "patient_mrn": pat.mrn if pat else "",
        "facility_id": rec.facility_id,
        "facility_name": fac.name if fac else "Heal Your Heart · Neelankarai",
        "receipt_date": rec.created_at.isoformat() if rec.created_at else "",
        "amount_paise": rec.amount_paise,
        "mode": rec.mode,
        "reference": rec.reference,
        "other_reference": rec.other_reference,
        "description": rec.description,
        "payment_from": rec.payment_from,
        "refund_paise": 0,
        "unused_paise": rec.unused_paise,
        "is_void": rec.is_void,
        "allocations": alloc_list,
    }


@router.post('/billing/payments')
@router.post('/payments')
def create_patient_payment(data: s.PatientPaymentInput, c=Depends(context)):
    c.allow(BILLING)
    c.patient(data.patient_id)
    if data.amount_paise <= 0:
        raise HTTPException(422, "Payment amount must be greater than zero")

    # Check idempotency
    if data.idempotency_key:
        existing = c.db.scalar(select(m.BillingReceipt).where(m.BillingReceipt.idempotency_key == data.idempotency_key))
        if existing:
            if existing.patient_id != data.patient_id or existing.amount_paise != data.amount_paise or existing.mode != data.mode:
                raise HTTPException(409, "Payment key was already used with different details")
            return {"receipt": serialize_billing_receipt(c.db, existing), "replayed": True}

    total_alloc_paise = sum(a.amount_paise for a in data.allocations)
    if total_alloc_paise > data.amount_paise:
        raise HTTPException(422, "Total payment applied exceeds received payment amount")

    unused_paise = data.amount_paise - total_alloc_paise

    # Validate allocations and write-offs
    invoices_to_update = []
    seen_invoice_ids = set()
    for a in data.allocations:
        if a.amount_paise < 0 or a.write_off_paise < 0:
            raise HTTPException(422, "Allocation and write-off amounts cannot be negative")
        if a.amount_paise == 0 and a.write_off_paise == 0:
            continue
        if a.invoice_id in seen_invoice_ids:
            raise HTTPException(422, "Duplicate invoice allocation in single payment request")
        seen_invoice_ids.add(a.invoice_id)

        inv = c.db.get(m.Invoice, a.invoice_id)
        if not inv:
            raise HTTPException(404, f"Invoice {a.invoice_id} not found")
        if inv.facility_id != c.facility_id:
            raise HTTPException(403, "Cannot apply payment to an invoice from another facility")
        if inv.patient_id != data.patient_id:
            raise HTTPException(422, f"Invoice {inv.number} belongs to another patient")
        if inv.status == 'cancelled':
            raise HTTPException(409, f"Cannot allocate payment to cancelled invoice {inv.number}")

        ledger = invoice_out(c.db, inv)
        curr_balance = ledger['balance_paise']
        if a.amount_paise > curr_balance:
            raise HTTPException(409, f"Payment allocation of Rs. {a.amount_paise/100:.2f} exceeds remaining invoice balance of Rs. {curr_balance/100:.2f}")

        if a.write_off_paise > 0:
            if not a.write_off_reason or not a.write_off_reason.strip():
                raise HTTPException(422, "Write-off reason is required when a write-off amount is specified")
            if a.write_off_paise > (curr_balance - a.amount_paise):
                raise HTTPException(409, f"Write-off amount exceeds remaining balance after payment on invoice {inv.number}")

        invoices_to_update.append((inv, a))

    branch = c.db.get(m.Facility, c.facility_id)
    prefix = (branch.code if branch and branch.code else 'HYN') + '-REC'
    receipt_num = next_number(c.db, prefix)

    idem = data.idempotency_key or f"rec_{data.patient_id}_{uuid.uuid4().hex[:16]}"
    receipt = m.BillingReceipt(
        patient_id=data.patient_id,
        facility_id=c.facility_id,
        author_id=c.user.id,
        receipt_number=receipt_num,
        amount_paise=data.amount_paise,
        unused_paise=unused_paise,
        mode=data.mode or 'Cash',
        reference=data.reference or '',
        other_reference=data.other_reference or '',
        description=data.description or '',
        payment_from='Patient',
        is_void=False,
        idempotency_key=idem,
    )
    c.db.add(receipt)
    c.db.flush()

    for inv, a in invoices_to_update:
        alloc_row = m.ReceiptAllocation(
            receipt_id=receipt.id,
            invoice_id=inv.id,
            amount_paise=a.amount_paise,
            write_off_paise=a.write_off_paise,
            write_off_reason=a.write_off_reason or '',
            comments=a.comments or '',
        )
        c.db.add(alloc_row)

        if a.amount_paise > 0:
            child_pay = m.Payment(
                invoice_id=inv.id,
                receipt_number=f"{receipt_num}-{inv.id[:8]}",
                actor_id=c.user.id,
                amount_paise=a.amount_paise,
                mode=data.mode or 'Cash',
                idempotency_key=f"pay_alloc_{receipt.id}_{inv.id}_{uuid.uuid4().hex[:8]}",
                simulated=True,
            )
            c.db.add(child_pay)

        if a.write_off_paise > 0:
            reason_str = a.write_off_reason
            if a.comments:
                reason_str = f"{reason_str} - {a.comments}"
            credit_entry = m.Credit(
                invoice_id=inv.id,
                amount_paise=a.write_off_paise,
                reason=reason_str,
                actor_id=c.user.id,
            )
            c.db.add(credit_entry)

        update_invoice(c, inv)

    c.audit('record_patient_payment', receipt, json.dumps({'receipt_number': receipt_num, 'amount_paise': data.amount_paise, 'unused_paise': unused_paise, 'allocations_count': len(invoices_to_update)}))
    return {'receipt': serialize_billing_receipt(c.db, receipt), 'replayed': False}


@router.get('/receipts')
def receipts(patient_id: str | None = None, c=Depends(context)):
    c.allow(BILLING)
    out = []

    # 1. Query BillingReceipts
    stmt_rec = select(m.BillingReceipt)
    if patient_id:
        stmt_rec = stmt_rec.where(m.BillingReceipt.patient_id == patient_id)
    else:
        stmt_rec = stmt_rec.where(m.BillingReceipt.facility_id == c.facility_id)
    
    billing_recs = list(c.db.scalars(stmt_rec.order_by(m.BillingReceipt.created_at.desc()).limit(1000)))
    rec_numbers = {r.receipt_number for r in billing_recs}
    for r in billing_recs:
        out.append(serialize_billing_receipt(c.db, r))

    # 2. Query legacy Payments that were created directly on invoices without a BillingReceipt
    stmt_pay = select(m.Payment, m.Invoice, m.Patient, m.Facility)\
        .join(m.Invoice, m.Payment.invoice_id == m.Invoice.id)\
        .join(m.Patient, m.Invoice.patient_id == m.Patient.id)\
        .outerjoin(m.Facility, m.Invoice.facility_id == m.Facility.id)
    if patient_id:
        stmt_pay = stmt_pay.where(m.Invoice.patient_id == patient_id)
    else:
        stmt_pay = stmt_pay.where(m.Invoice.facility_id == c.facility_id)

    legacy_pays = c.db.execute(stmt_pay.order_by(m.Payment.created_at.desc()).limit(1000)).all()
    for pay, inv, pat, fac in legacy_pays:
        # Check if this payment's receipt_number belongs to one of the BillingReceipts (e.g. REC-12345-abcd)
        base_rec_num = pay.receipt_number.rsplit('-', 1)[0] if '-' in pay.receipt_number else pay.receipt_number
        if base_rec_num in rec_numbers or pay.receipt_number in rec_numbers:
            continue
        out.append({
            "id": pay.id,
            "receipt_number": pay.receipt_number,
            "invoice_id": inv.id,
            "invoice_number": inv.number,
            "patient_id": pat.id,
            "patient_name": f"{pat.first_name} {pat.last_name}".strip(),
            "patient_mrn": pat.mrn,
            "facility_name": fac.name if fac else "Heal Your Heart · Neelankarai",
            "receipt_date": pay.created_at.isoformat() if pay.created_at else "",
            "amount_paise": pay.amount_paise,
            "mode": pay.mode,
            "reference": "",
            "other_reference": "",
            "description": "",
            "simulated": pay.simulated,
            "is_void": inv.status == 'cancelled',
            "payment_from": "Patient",
            "refund_paise": 0,
            "unused_paise": 0,
            "allocations": [
                {
                    "invoice_id": inv.id,
                    "invoice_number": inv.number,
                    "amount_paise": pay.amount_paise,
                    "write_off_paise": 0,
                    "write_off_reason": "",
                    "comments": "",
                }
            ],
        })

    # Sort combined receipts by date descending
    out.sort(key=lambda x: x.get("receipt_date") or "", reverse=True)
    return out


@router.post('/receipts/{identifier}/void')
def void_receipt(identifier: str, c=Depends(context)):
    c.allow(BILLING)

    # 1. Try finding in BillingReceipt
    billing_rec = c.db.get(m.BillingReceipt, identifier)
    if not billing_rec:
        billing_rec = c.db.scalar(select(m.BillingReceipt).where(m.BillingReceipt.receipt_number == identifier))

    if billing_rec:
        if billing_rec.is_void:
            return {"message": "Receipt is already voided", "receipt_number": billing_rec.receipt_number}
        billing_rec.is_void = True
        billing_rec.unused_paise = 0
        c.db.flush()

        allocations = list(c.db.scalars(
            select(m.ReceiptAllocation).where(m.ReceiptAllocation.receipt_id == billing_rec.id)
        ))
        for alloc in allocations:
            inv = c.db.get(m.Invoice, alloc.invoice_id)
            if inv:
                update_invoice(c, inv)

        c.audit('void_receipt', billing_rec, json.dumps({'receipt_number': billing_rec.receipt_number}))
        return {"message": "Receipt voided successfully", "receipt_number": billing_rec.receipt_number}

    # 2. Fallback to legacy Payment
    pay = c.record(m.Payment, identifier)
    # Check if a synthetic void BillingReceipt should be created to mark this legacy receipt void
    inv = c.db.get(m.Invoice, pay.invoice_id)
    synth_rec = m.BillingReceipt(
        patient_id=inv.patient_id if inv else c.user.id,
        facility_id=inv.facility_id if inv else c.facility_id,
        author_id=c.user.id,
        receipt_number=pay.receipt_number,
        amount_paise=pay.amount_paise,
        unused_paise=0,
        mode=pay.mode,
        reference='',
        other_reference='',
        description='Voided legacy payment',
        payment_from='Patient',
        is_void=True,
    )
    c.db.add(synth_rec)
    c.db.flush()
    if inv:
        update_invoice(c, inv)
    return {"message": "Receipt voided successfully", "receipt_number": pay.receipt_number}


# --- INVENTORY ENGINE ---

def compute_item_details(c, item):
    today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
    movements = list(c.db.scalars(
        select(m.StockMovement)
        .where(m.StockMovement.item_id == item.id)
        .order_by(m.StockMovement.created_at.desc())
    ))
    balance = sum(x.quantity for x in movements)
    
    batches = list(c.db.scalars(
        select(m.InventoryBatch)
        .where(m.InventoryBatch.item_id == item.id)
        .order_by(m.InventoryBatch.expiry_date.asc())
    ))
    
    batch_rows = []
    has_expired_batch = False
    for b in batches:
        b_qty = sum(x.quantity for x in movements if x.batch_id == b.id)
        is_expired = bool(b.expiry_date and b.expiry_date < today)
        if is_expired and b_qty > 0:
            has_expired_batch = True
        b_dict = serialize(b)
        b_dict['current_balance'] = b_qty
        b_dict['is_expired'] = is_expired
        batch_rows.append(b_dict)
        
    if not item.is_active:
        status = 'Inactive'
    elif has_expired_batch:
        status = 'Expired'
    elif balance <= 0:
        status = 'Out of Stock'
    elif balance <= (item.reorder_level or 0):
        status = 'Low Stock'
    else:
        status = 'In Stock'
        
    res = serialize(item)
    res['balance'] = balance
    res['status'] = status
    res['batches'] = batch_rows
    res['batches_count'] = len(batch_rows)
    return res


@router.get('/inventory')
def inventory(
    category: str | None = None,
    status: str | None = None,
    q: str | None = None,
    c=Depends(context)
):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    stmt = select(m.InventoryItem).where(m.InventoryItem.facility_id == c.facility_id)
    
    if category and category.strip() and category.strip().lower() != 'all':
        stmt = stmt.where(m.InventoryItem.category == category.strip())
        
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                m.InventoryItem.name.ilike(term),
                m.InventoryItem.trade_name.ilike(term),
                m.InventoryItem.product_code.ilike(term),
                m.InventoryItem.manufacturer.ilike(term)
            )
        )
        
    items = list(c.db.scalars(stmt.order_by(m.InventoryItem.name)).all())
    result = []
    for item in items:
        details = compute_item_details(c, item)
        if status and status.strip() and status.strip().lower() != 'all':
            s_filter = status.strip().lower()
            if s_filter == 'active' and not item.is_active:
                continue
            elif s_filter == 'inactive' and item.is_active:
                continue
            elif s_filter == 'in stock' or s_filter == 'in_stock':
                if details['status'] != 'In Stock':
                    continue
            elif s_filter == 'low stock' or s_filter == 'low_stock':
                if details['status'] != 'Low Stock':
                    continue
            elif s_filter == 'out of stock' or s_filter == 'out_of_stock':
                if details['status'] != 'Out of Stock':
                    continue
            elif s_filter == 'expired':
                if details['status'] != 'Expired':
                    continue
        result.append(details)
    return result


@router.post('/inventory')
def create_item(data: s.InventoryProductInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    row = m.InventoryItem(
        facility_id=c.facility_id,
        name=data.name.strip(),
        category=data.category.strip(),
        reorder_level=data.reorder_level,
        unit=data.unit.strip(),
        group_name=data.group_name.strip(),
        product_code=data.product_code.strip(),
        hsn_code=data.hsn_code.strip(),
        trade_name=data.trade_name.strip(),
        strength=data.strength.strip(),
        strength_unit=data.strength_unit.strip(),
        route=data.route.strip(),
        dose_form=data.dose_form.strip(),
        tax_percent=data.tax_percent,
        order_quantity=data.order_quantity,
        cost_price=data.cost_price,
        retail_price=data.retail_price,
        is_active=data.is_active,
        manufacturer=data.manufacturer.strip(),
        catalogue_id=data.catalogue_id
    )
    c.db.add(row)
    c.db.flush()
    
    if data.quantity > 0 and data.batch_number and data.batch_number.strip():
        b_num = data.batch_number.strip()
        batch = m.InventoryBatch(
            facility_id=c.facility_id,
            item_id=row.id,
            batch_number=b_num,
            expiry_date=data.expiry_date,
            received_date=data.stock_received_date or datetime.now(ZoneInfo('Asia/Kolkata')).date(),
            supplier_name=data.supplier.strip(),
            manufacturer=data.manufacturer.strip(),
            cost_price=data.cost_price,
            retail_price=data.retail_price,
            storage_location=data.storage_location.strip(),
            pack=data.pack.strip(),
            reference_number=data.reference_number.strip(),
            initial_quantity=data.quantity
        )
        c.db.add(batch)
        c.db.flush()
        
        move = m.StockMovement(
            item_id=row.id,
            facility_id=c.facility_id,
            batch_id=batch.id,
            batch_number=b_num,
            quantity=data.quantity,
            reason='Opening Stock',
            movement_type='received',
            actor_id=c.user.id,
            reference=data.reference_number.strip()
        )
        c.db.add(move)
        
    c.audit('create_inventory_item', row)
    c.db.flush()
    return compute_item_details(c, row)


@router.get('/inventory/medicines/catalog')
def search_medicine_catalog(q: str = '', c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    stmt = select(m.MedicineCatalog).where(m.MedicineCatalog.is_active == True)
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                m.MedicineCatalog.normalized_name.ilike(term),
                m.MedicineCatalog.normalized_trade.ilike(term)
            )
        )
    stmt = stmt.order_by(m.MedicineCatalog.product_name).limit(50)
    items = c.db.scalars(stmt).all()
    return [serialize(x) for x in items]


@router.get('/inventory/suppliers')
def list_suppliers(c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    stmt = select(m.InventorySupplier).where(m.InventorySupplier.facility_id == c.facility_id).order_by(m.InventorySupplier.name)
    return [serialize(x) for x in c.db.scalars(stmt).all()]


@router.post('/inventory/suppliers')
def create_supplier(data: s.InventorySupplierInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    row = m.InventorySupplier(facility_id=c.facility_id, **data.model_dump())
    c.db.add(row)
    c.audit('create_inventory_supplier', row)
    c.db.flush()
    return serialize(row)


@router.patch('/inventory/suppliers/{identifier}')
def update_supplier(identifier: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    row = c.db.get(m.InventorySupplier, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Supplier not found')
    for k, v in data.items():
        if hasattr(row, k) and k not in ('id', 'facility_id', 'created_at'):
            setattr(row, k, v)
    row.version += 1
    c.audit('update_inventory_supplier', row)
    c.db.flush()
    return serialize(row)


@router.delete('/inventory/suppliers/{identifier}')
def delete_supplier(identifier: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    row = c.db.get(m.InventorySupplier, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Supplier not found')
    row.is_active = False
    row.version += 1
    c.audit('deactivate_inventory_supplier', row)
    return {'status': 'deactivated'}


@router.get('/inventory/categories')
def list_categories(c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    stmt = select(m.InventoryCategory).where(m.InventoryCategory.facility_id == c.facility_id).order_by(m.InventoryCategory.name)
    return [serialize(x) for x in c.db.scalars(stmt).all()]


@router.post('/inventory/categories')
def create_category(data: s.InventoryCategoryInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    row = m.InventoryCategory(facility_id=c.facility_id, **data.model_dump())
    c.db.add(row)
    c.audit('create_inventory_category', row)
    c.db.flush()
    return serialize(row)


@router.patch('/inventory/categories/{identifier}')
def update_category(identifier: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    row = c.db.get(m.InventoryCategory, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Category not found')
    for k, v in data.items():
        if hasattr(row, k) and k not in ('id', 'facility_id', 'created_at'):
            setattr(row, k, v)
    row.version += 1
    c.audit('update_inventory_category', row)
    c.db.flush()
    return serialize(row)


@router.delete('/inventory/categories/{identifier}')
def delete_category(identifier: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    row = c.db.get(m.InventoryCategory, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Category not found')
    row.is_active = False
    row.version += 1
    c.audit('deactivate_inventory_category', row)
    return {'status': 'deactivated'}


@router.get('/inventory/{identifier}')
def get_inventory_item(identifier: str, c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    row = c.db.get(m.InventoryItem, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Inventory item not found')
    details = compute_item_details(c, row)
    details['movements'] = [
        serialize(x) for x in c.db.scalars(
            select(m.StockMovement)
            .where(m.StockMovement.item_id == row.id)
            .order_by(m.StockMovement.created_at.desc())
        )
    ]
    return details


@router.patch('/inventory/{identifier}')
def update_inventory_item(identifier: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    row = c.db.get(m.InventoryItem, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Inventory item not found')
    for k, v in data.items():
        if hasattr(row, k) and k not in ('id', 'facility_id', 'created_at'):
            setattr(row, k, v)
    row.version += 1
    c.audit('update_inventory_item', row)
    c.db.flush()
    return compute_item_details(c, row)


@router.delete('/inventory/{identifier}')
def delete_inventory_item(identifier: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    row = c.db.get(m.InventoryItem, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Inventory item not found')
    row.is_active = False
    row.version += 1
    c.audit('deactivate_inventory_item', row)
    c.db.flush()
    return {'status': 'deactivated', 'id': identifier}


@router.get('/inventory/items/{identifier}/batches')
def get_item_batches(identifier: str, c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    row = c.db.get(m.InventoryItem, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Inventory item not found')
    details = compute_item_details(c, row)
    return details['batches']


@router.post('/inventory/batches')
def add_inventory_batch(data: s.InventoryBatchInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    item = c.db.get(m.InventoryItem, data.item_id)
    if not item or item.facility_id != c.facility_id:
        raise HTTPException(404, 'Inventory item not found')
        
    b_num = data.batch_number.strip()
    batch = m.InventoryBatch(
        facility_id=c.facility_id,
        item_id=item.id,
        batch_number=b_num,
        expiry_date=data.expiry_date,
        received_date=data.received_date or datetime.now(ZoneInfo('Asia/Kolkata')).date(),
        supplier_name=data.supplier_name.strip(),
        manufacturer=data.manufacturer.strip(),
        cost_price=data.cost_price,
        retail_price=data.retail_price,
        storage_location=data.storage_location.strip(),
        pack=data.pack.strip(),
        reference_number=data.reference_number.strip(),
        initial_quantity=data.quantity
    )
    c.db.add(batch)
    c.db.flush()
    
    move = m.StockMovement(
        item_id=item.id,
        facility_id=c.facility_id,
        batch_id=batch.id,
        batch_number=b_num,
        quantity=data.quantity,
        reason='Stock Batch Received',
        movement_type='received',
        actor_id=c.user.id,
        reference=data.reference_number.strip()
    )
    c.db.add(move)
    c.audit('add_inventory_batch', batch)
    c.db.flush()
    return compute_item_details(c, item)


@router.get('/inventory/items/{identifier}/movements')
def get_item_movements(identifier: str, c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    row = c.db.get(m.InventoryItem, identifier)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Inventory item not found')
    movements = list(c.db.scalars(
        select(m.StockMovement)
        .where(m.StockMovement.item_id == row.id)
        .order_by(m.StockMovement.created_at.desc())
    ))
    res = []
    for mv in movements:
        d = serialize(mv)
        u = c.db.get(m.User, mv.actor_id)
        d['actor_name'] = u.name if u else 'Staff'
        res.append(d)
    return res


@router.post('/inventory/{identifier}/movements')
def create_movement(identifier: str, data: s.StockInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor'})
    row = c.record(m.InventoryItem, identifier)
    current = c.db.scalar(select(func.coalesce(func.sum(m.StockMovement.quantity), 0)).where(m.StockMovement.item_id == row.id))
    if not data.quantity or current + data.quantity < 0:
        raise HTTPException(409, 'Stock movement would create an invalid negative balance')
    move = m.StockMovement(
        item_id=row.id,
        facility_id=c.facility_id,
        actor_id=c.user.id,
        movement_type='received' if data.quantity > 0 else 'dispensed',
        **data.model_dump()
    )
    c.db.add(move)
    c.audit('stock_movement', row)
    c.db.flush()
    return serialize(move)


@router.post('/inventory/bulk')
def bulk_inventory(data: s.BulkInventoryInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'doctor'})
    created_items = []
    today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
    
    for row_data in data.rows:
        p_name = row_data.product_name.strip()
        if not p_name:
            continue
        grp = row_data.group_name.strip() or data.group_name.strip() or 'Drug'
        cat = row_data.category.strip() or data.category.strip() or 'General'
        sup = row_data.supplier.strip() or data.supplier.strip()
        recv_date = row_data.stock_received_date or data.stock_received_date or today
        
        # Check existing item or create
        existing = c.db.scalar(
            select(m.InventoryItem).where(
                m.InventoryItem.facility_id == c.facility_id,
                func.lower(m.InventoryItem.name) == p_name.lower()
            )
        )
        if not existing:
            item = m.InventoryItem(
                facility_id=c.facility_id,
                name=p_name,
                category=cat,
                group_name=grp,
                trade_name=row_data.trade_name.strip(),
                product_code=row_data.product_code.strip(),
                hsn_code=row_data.hsn_code.strip(),
                strength=row_data.strength.strip(),
                strength_unit=row_data.strength_unit.strip(),
                route=row_data.route.strip(),
                dose_form=row_data.dose_form.strip(),
                tax_percent=row_data.tax_percent,
                reorder_level=row_data.reorder_level,
                order_quantity=row_data.order_quantity,
                cost_price=row_data.cost_price,
                retail_price=row_data.retail_price,
                manufacturer=row_data.manufacturer.strip(),
                unit='Units',
                is_active=True
            )
            c.db.add(item)
            c.db.flush()
        else:
            item = existing
            
        if row_data.quantity > 0 and row_data.batch_number and row_data.batch_number.strip():
            b_num = row_data.batch_number.strip()
            batch = m.InventoryBatch(
                facility_id=c.facility_id,
                item_id=item.id,
                batch_number=b_num,
                expiry_date=row_data.expiry_date,
                received_date=recv_date,
                supplier_name=sup,
                manufacturer=row_data.manufacturer.strip(),
                cost_price=row_data.cost_price,
                retail_price=row_data.retail_price,
                storage_location=row_data.storage_location.strip(),
                pack=row_data.pack.strip(),
                reference_number=row_data.reference_number.strip(),
                initial_quantity=row_data.quantity
            )
            c.db.add(batch)
            c.db.flush()
            
            move = m.StockMovement(
                item_id=item.id,
                facility_id=c.facility_id,
                batch_id=batch.id,
                batch_number=b_num,
                quantity=row_data.quantity,
                reason='Bulk Inventory Intake',
                movement_type='received',
                actor_id=c.user.id,
                reference=row_data.reference_number.strip()
            )
            c.db.add(move)
            
        created_items.append(item.id)
        
    c.audit('bulk_inventory_intake', c.db.get(m.Facility, c.facility_id))
    c.db.flush()
    return {'success': True, 'count': len(created_items)}


@router.get('/inventory/reports/export-history')
def get_export_history(c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    stmt = (
        select(m.InventoryReportExport)
        .where(m.InventoryReportExport.facility_id == c.facility_id)
        .order_by(m.InventoryReportExport.created_at.desc())
    )
    return [serialize(x) for x in c.db.scalars(stmt).all()]


@router.post('/inventory/reports/export-history')
def record_export_history(data: s.InventoryReportExportInput, c=Depends(context)):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    row = m.InventoryReportExport(
        facility_id=c.facility_id,
        report_name=data.report_name,
        requested_by=c.user.id,
        requested_by_name=c.user.name,
        date_range=data.date_range,
        status=data.status,
        record_count=data.record_count
    )
    c.db.add(row)
    c.audit('export_inventory_report', row)
    c.db.flush()
    return serialize(row)


@router.get('/inventory/reports/{report_type}')
def inventory_reports(
    report_type: str,
    from_date: str | None = None,
    to_date: str | None = None,
    c=Depends(context)
):
    c.allow({'admin', 'reception', 'therapist', 'doctor', 'billing'})
    today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
    
    if report_type == 'received-list':
        # List of received stock movements with item, batch, supplier, quantity
        stmt = (
            select(m.StockMovement, m.InventoryItem, m.InventoryBatch)
            .join(m.InventoryItem, m.StockMovement.item_id == m.InventoryItem.id)
            .outerjoin(m.InventoryBatch, m.StockMovement.batch_id == m.InventoryBatch.id)
            .where(
                m.InventoryItem.facility_id == c.facility_id,
                m.StockMovement.quantity > 0
            )
            .order_by(m.StockMovement.created_at.desc())
        )
        rows = c.db.execute(stmt).all()
        data = []
        for mv, itm, bth in rows:
            data.append({
                'id': mv.id,
                'created_at': mv.created_at.isoformat() if mv.created_at else '',
                'item_name': itm.name,
                'category': itm.category,
                'batch_number': mv.batch_number or (bth.batch_number if bth else ''),
                'expiry_date': bth.expiry_date.isoformat() if bth and bth.expiry_date else '',
                'supplier_name': bth.supplier_name if bth else '',
                'quantity': mv.quantity,
                'cost_price': (bth.cost_price if (bth and bth.cost_price is not None) else (itm.cost_price or 0.0)),
                'total_cost': (bth.cost_price if (bth and bth.cost_price is not None) else (itm.cost_price or 0.0)) * mv.quantity,
                'reference': mv.reference or (bth.reference_number if bth else '')
            })
        return {'report_type': report_type, 'rows': data, 'count': len(data)}
        
    elif report_type == 'stock-flow':
        # Chronological audit of all movements
        stmt = (
            select(m.StockMovement, m.InventoryItem, m.User)
            .join(m.InventoryItem, m.StockMovement.item_id == m.InventoryItem.id)
            .outerjoin(m.User, m.StockMovement.actor_id == m.User.id)
            .where(m.InventoryItem.facility_id == c.facility_id)
            .order_by(m.StockMovement.created_at.desc())
        )
        rows = c.db.execute(stmt).all()
        data = []
        for mv, itm, usr in rows:
            data.append({
                'id': mv.id,
                'created_at': mv.created_at.isoformat() if mv.created_at else '',
                'item_name': itm.name,
                'batch_number': mv.batch_number,
                'movement_type': mv.movement_type,
                'quantity': mv.quantity,
                'reason': mv.reason,
                'actor_name': usr.name if usr else 'Staff',
                'reference': mv.reference
            })
        return {'report_type': report_type, 'rows': data, 'count': len(data)}
        
    elif report_type == 'by-product':
        items = list(c.db.scalars(
            select(m.InventoryItem)
            .where(m.InventoryItem.facility_id == c.facility_id)
            .order_by(m.InventoryItem.name)
        ))
        data = []
        for itm in items:
            det = compute_item_details(c, itm)
            data.append({
                'id': itm.id,
                'name': itm.name,
                'trade_name': itm.trade_name,
                'category': itm.category,
                'balance': det['balance'],
                'cost_price': itm.cost_price,
                'retail_price': itm.retail_price,
                'total_valuation': det['balance'] * (itm.cost_price or 0.0),
                'reorder_level': itm.reorder_level,
                'status': det['status']
            })
        return {'report_type': report_type, 'rows': data, 'count': len(data)}
        
    elif report_type == 'by-batch':
        stmt = (
            select(m.InventoryBatch, m.InventoryItem)
            .join(m.InventoryItem, m.InventoryBatch.item_id == m.InventoryItem.id)
            .where(m.InventoryBatch.facility_id == c.facility_id)
            .order_by(m.InventoryBatch.expiry_date.asc())
        )
        rows = c.db.execute(stmt).all()
        data = []
        for bth, itm in rows:
            mv_sum = c.db.scalar(
                select(func.coalesce(func.sum(m.StockMovement.quantity), 0))
                .where(m.StockMovement.batch_id == bth.id)
            )
            is_exp = bool(bth.expiry_date and bth.expiry_date < today)
            data.append({
                'id': bth.id,
                'item_name': itm.name,
                'batch_number': bth.batch_number,
                'expiry_date': bth.expiry_date.isoformat() if bth.expiry_date else '',
                'supplier_name': bth.supplier_name,
                'initial_quantity': bth.initial_quantity,
                'current_balance': mv_sum,
                'cost_price': bth.cost_price,
                'status': 'Expired' if is_exp else ('Out of Stock' if mv_sum <= 0 else 'Active')
            })
        return {'report_type': report_type, 'rows': data, 'count': len(data)}
        
    elif report_type == 'reorder-level':
        items = list(c.db.scalars(
            select(m.InventoryItem)
            .where(m.InventoryItem.facility_id == c.facility_id, m.InventoryItem.is_active == True)
        ))
        data = []
        for itm in items:
            det = compute_item_details(c, itm)
            if det['balance'] <= (itm.reorder_level or 0):
                data.append({
                    'id': itm.id,
                    'name': itm.name,
                    'category': itm.category,
                    'current_balance': det['balance'],
                    'reorder_level': itm.reorder_level,
                    'order_quantity': itm.order_quantity,
                    'status': det['status']
                })
        return {'report_type': report_type, 'rows': data, 'count': len(data)}
        
    elif report_type == 'reorder-by-supplier':
        items = list(c.db.scalars(
            select(m.InventoryItem)
            .where(m.InventoryItem.facility_id == c.facility_id, m.InventoryItem.is_active == True)
        ))
        data = []
        for itm in items:
            det = compute_item_details(c, itm)
            if det['balance'] <= (itm.reorder_level or 0):
                # find latest supplier from batches
                last_b = c.db.scalar(
                    select(m.InventoryBatch)
                    .where(m.InventoryBatch.item_id == itm.id)
                    .order_by(m.InventoryBatch.created_at.desc())
                )
                sup = last_b.supplier_name if last_b and last_b.supplier_name else 'Unassigned'
                data.append({
                    'id': itm.id,
                    'name': itm.name,
                    'supplier_name': sup,
                    'current_balance': det['balance'],
                    'reorder_level': itm.reorder_level,
                    'order_quantity': itm.order_quantity
                })
        return {'report_type': report_type, 'rows': data, 'count': len(data)}
        
    elif report_type == 'expiry':
        ninety_days = today + timedelta(days=90)
        stmt = (
            select(m.InventoryBatch, m.InventoryItem)
            .join(m.InventoryItem, m.InventoryBatch.item_id == m.InventoryItem.id)
            .where(
                m.InventoryBatch.facility_id == c.facility_id,
                m.InventoryBatch.expiry_date != None,
                m.InventoryBatch.expiry_date <= ninety_days
            )
            .order_by(m.InventoryBatch.expiry_date.asc())
        )
        rows = c.db.execute(stmt).all()
        data = []
        for bth, itm in rows:
            mv_sum = c.db.scalar(
                select(func.coalesce(func.sum(m.StockMovement.quantity), 0))
                .where(m.StockMovement.batch_id == bth.id)
            )
            is_exp = bool(bth.expiry_date and bth.expiry_date < today)
            days_left = (bth.expiry_date - today).days if bth.expiry_date else 0
            data.append({
                'id': bth.id,
                'item_name': itm.name,
                'batch_number': bth.batch_number,
                'expiry_date': bth.expiry_date.isoformat() if bth.expiry_date else '',
                'current_balance': mv_sum,
                'days_until_expiry': days_left,
                'status': 'Expired' if is_exp else f'Expiring in {days_left}d'
            })
        return {'report_type': report_type, 'rows': data, 'count': len(data)}
        
    raise HTTPException(400, f'Unknown report type {report_type}')


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
