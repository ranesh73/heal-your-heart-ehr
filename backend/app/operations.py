import csv
import io
import json
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select, func, or_
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
                'cost_price': bth.cost_price if bth else itm.cost_price,
                'total_cost': (bth.cost_price if bth else itm.cost_price) * mv.quantity,
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
                'total_valuation': det['balance'] * itm.cost_price,
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
