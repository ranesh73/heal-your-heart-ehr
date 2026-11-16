import math
import re
import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, and_
from . import models as m
from .security import context, CLINICAL
from .serialization import serialize

router = APIRouter(prefix='/api/rx')


def normalize_term(text: str) -> str:
    return re.sub(r'[\s\-_/\\]+', ' ', text.strip().lower())


# Pydantic Schemas
class DrugInput(BaseModel):
    product_name: str = Field(min_length=1, max_length=250)
    trade_name: Optional[str] = Field(default='', max_length=250)
    dosage_form: Optional[str] = Field(default='Tablet', max_length=80)
    strength: Optional[str] = Field(default='', max_length=80)
    route: Optional[str] = Field(default='Oral', max_length=60)


class SupplementInput(BaseModel):
    name: str = Field(min_length=1, max_length=250)
    dosage_form: Optional[str] = Field(default='Tablet', max_length=80)
    strength: Optional[str] = Field(default='', max_length=80)
    route: Optional[str] = Field(default='Oral', max_length=60)


class BulkDeleteInput(BaseModel):
    ids: List[str]


# ---------------------------------------------------------------------------
# 1. DRUGS MANAGEMENT ENDPOINTS
# ---------------------------------------------------------------------------

@router.get('/drugs')
def list_drugs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=100, ge=1, le=200),
    q: str = Query(default=''),
    c=Depends(context)
):
    c.allow(CLINICAL | {'reception', 'billing'})
    term = q.strip()
    norm_term = normalize_term(term) if term else ''

    base_query = select(m.MedicineCatalog).where(m.MedicineCatalog.is_active == True)
    if term:
        base_query = base_query.where(
            or_(
                m.MedicineCatalog.product_name.ilike(f'%{term}%'),
                m.MedicineCatalog.trade_name.ilike(f'%{term}%'),
                m.MedicineCatalog.normalized_name.ilike(f'%{norm_term}%'),
                m.MedicineCatalog.normalized_trade.ilike(f'%{norm_term}%')
            )
        )

    # Total matching records count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_records = c.db.scalar(count_query) or 0

    # Paginated slice
    offset = (page - 1) * limit
    paginated_query = base_query.order_by(m.MedicineCatalog.product_name.asc()).offset(offset).limit(limit)
    drugs = c.db.scalars(paginated_query).all()

    # Get active inventory items with catalogue_id
    inv_catalogue_ids = set(
        c.db.scalars(
            select(m.InventoryItem.catalogue_id)
            .where(
                m.InventoryItem.catalogue_id.isnot(None),
                m.InventoryItem.is_active == True
            )
        ).all()
    )

    # Get prescription templates mapped by catalogue_id
    pt_rows = c.db.execute(
        select(m.PrescriptionTemplate.catalogue_id, m.PrescriptionTemplate.template_name)
        .where(
            m.PrescriptionTemplate.catalogue_id.isnot(None),
            m.PrescriptionTemplate.is_active == True
        )
    ).all()
    
    pt_count_map: Dict[str, int] = {}
    pt_names_map: Dict[str, List[str]] = {}
    for cat_id, t_name in pt_rows:
        if not cat_id:
            continue
        pt_count_map[cat_id] = pt_count_map.get(cat_id, 0) + 1
        if cat_id not in pt_names_map:
            pt_names_map[cat_id] = []
        if t_name not in pt_names_map[cat_id]:
            pt_names_map[cat_id].append(t_name)

    items = []
    for d in drugs:
        tpl_count = pt_count_map.get(d.id, 0)
        tpl_names = pt_names_map.get(d.id, [])
        is_in_inv = d.id in inv_catalogue_ids

        items.append({
            'id': d.id,
            'product_name': d.product_name,
            'trade_name': d.trade_name,
            'template_count': tpl_count,
            'template_names': tpl_names,
            'is_in_inventory': is_in_inv,
            'inventory_status': 'Yes' if is_in_inv else 'No',
            'is_active': d.is_active,
            'created_at': d.created_at.isoformat() if d.created_at else None,
            'version': d.version
        })

    total_pages = max(1, math.ceil(total_records / limit))
    return {
        'items': items,
        'total': total_records,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    }


@router.post('/drugs')
def create_drug(data: DrugInput, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    p_name = data.product_name.strip()
    t_name = (data.trade_name or p_name).strip()
    norm_p = normalize_term(p_name)
    norm_t = normalize_term(t_name)

    # Duplicate check
    existing = c.db.scalars(
        select(m.MedicineCatalog).where(
            m.MedicineCatalog.is_active == True,
            or_(
                m.MedicineCatalog.normalized_name == norm_p,
                m.MedicineCatalog.product_name.ilike(p_name)
            )
        )
    ).first()
    if existing:
        raise HTTPException(400, f'Drug "{p_name}" already exists in the catalogue.')

    drug = m.MedicineCatalog(
        id=str(uuid.uuid4()),
        product_name=p_name,
        trade_name=t_name,
        normalized_name=norm_p,
        normalized_trade=norm_t,
        is_active=True,
        version=1
    )
    c.db.add(drug)
    c.audit('create_drug', drug)
    c.db.commit()

    return serialize(drug)


@router.put('/drugs/{identifier}')
def update_drug(identifier: str, data: DrugInput, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    drug = c.record(m.MedicineCatalog, identifier)
    p_name = data.product_name.strip()
    t_name = (data.trade_name or p_name).strip()
    
    drug.product_name = p_name
    drug.trade_name = t_name
    drug.normalized_name = normalize_term(p_name)
    drug.normalized_trade = normalize_term(t_name)
    drug.version += 1
    
    c.audit('update_drug', drug)
    c.db.commit()
    return serialize(drug)


@router.delete('/drugs/{identifier}')
def delete_drug(identifier: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    drug = c.record(m.MedicineCatalog, identifier)

    # 1. Dependency check: Inventory
    inv_count = c.db.scalar(
        select(func.count(m.InventoryItem.id)).where(
            m.InventoryItem.catalogue_id == identifier,
            m.InventoryItem.is_active == True
        )
    ) or 0
    if inv_count > 0:
        raise HTTPException(
            400,
            'Drugs added in Inventory, cannot be deleted here. They can be deleted only from Inventory section.'
        )

    # 2. Dependency check: Templates
    tpl_count = c.db.scalar(
        select(func.count(m.PrescriptionTemplate.id)).where(
            m.PrescriptionTemplate.catalogue_id == identifier,
            m.PrescriptionTemplate.is_active == True
        )
    ) or 0
    if tpl_count > 0:
        raise HTTPException(
            400,
            f'Drugs used in templates cannot be deleted. To delete from here, remove them from Settings > Templates.'
        )

    drug.is_active = False
    drug.version += 1
    c.audit('delete_drug', drug)
    c.db.commit()
    return {'ok': True, 'id': identifier, 'message': f'Drug "{drug.product_name}" removed successfully.'}


@router.post('/drugs/bulk-delete')
def bulk_delete_drugs(data: BulkDeleteInput, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    if not data.ids:
        raise HTTPException(400, 'No drug IDs provided for deletion.')

    deleted_ids: List[str] = []
    blocked_items: List[Dict[str, Any]] = []

    for drug_id in data.ids:
        drug = c.db.scalars(
            select(m.MedicineCatalog).where(
                m.MedicineCatalog.id == drug_id,
                m.MedicineCatalog.is_active == True
            )
        ).first()

        if not drug:
            continue

        # Check Inventory dependency
        inv_count = c.db.scalar(
            select(func.count(m.InventoryItem.id)).where(
                m.InventoryItem.catalogue_id == drug_id,
                m.InventoryItem.is_active == True
            )
        ) or 0
        if inv_count > 0:
            blocked_items.append({
                'id': drug_id,
                'name': drug.product_name,
                'reason': 'Added in Inventory. Can be deleted only from Inventory section.'
            })
            continue

        # Check Template dependency
        tpl_count = c.db.scalar(
            select(func.count(m.PrescriptionTemplate.id)).where(
                m.PrescriptionTemplate.catalogue_id == drug_id,
                m.PrescriptionTemplate.is_active == True
            )
        ) or 0
        if tpl_count > 0:
            blocked_items.append({
                'id': drug_id,
                'name': drug.product_name,
                'reason': f'Used in {tpl_count} prescription template(s). Remove from Settings > Templates first.'
            })
            continue

        # Allowed to delete
        drug.is_active = False
        drug.version += 1
        c.audit('bulk_delete_drug', drug)
        deleted_ids.append(drug_id)

    c.db.commit()

    return {
        'ok': True,
        'deleted': deleted_ids,
        'blocked': blocked_items,
        'message': f'{len(deleted_ids)} drug(s) deleted. {len(blocked_items)} blocked by dependencies.'
    }


# ---------------------------------------------------------------------------
# 2. SUPPLEMENTS MANAGEMENT ENDPOINTS
# ---------------------------------------------------------------------------

@router.get('/supplements')
def list_supplements(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=100, ge=1, le=200),
    q: str = Query(default=''),
    c=Depends(context)
):
    c.allow(CLINICAL | {'reception', 'billing'})
    term = q.strip()
    norm_term = normalize_term(term) if term else ''

    base_query = select(m.SupplementCatalog).where(m.SupplementCatalog.is_active == True)
    if term:
        base_query = base_query.where(
            or_(
                m.SupplementCatalog.name.ilike(f'%{term}%'),
                m.SupplementCatalog.normalized_name.ilike(f'%{norm_term}%'),
                m.SupplementCatalog.dosage_form.ilike(f'%{term}%'),
                m.SupplementCatalog.strength.ilike(f'%{term}%')
            )
        )

    # Total matching records count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_records = c.db.scalar(count_query) or 0

    # Paginated slice
    offset = (page - 1) * limit
    paginated_query = base_query.order_by(m.SupplementCatalog.name.asc()).offset(offset).limit(limit)
    supplements = c.db.scalars(paginated_query).all()

    # Get active inventory items with catalogue_id
    inv_catalogue_ids = set(
        c.db.scalars(
            select(m.InventoryItem.catalogue_id)
            .where(
                m.InventoryItem.catalogue_id.isnot(None),
                m.InventoryItem.is_active == True
            )
        ).all()
    )

    # Get supplement templates mapped by catalogue_id
    st_rows = c.db.execute(
        select(m.SupplementTemplate.catalogue_id, m.SupplementTemplate.template_name)
        .where(
            m.SupplementTemplate.catalogue_id.isnot(None),
            m.SupplementTemplate.is_active == True
        )
    ).all()

    st_count_map: Dict[str, int] = {}
    st_names_map: Dict[str, List[str]] = {}
    for cat_id, t_name in st_rows:
        if not cat_id:
            continue
        st_count_map[cat_id] = st_count_map.get(cat_id, 0) + 1
        if cat_id not in st_names_map:
            st_names_map[cat_id] = []
        if t_name not in st_names_map[cat_id]:
            st_names_map[cat_id].append(t_name)

    items = []
    for s in supplements:
        tpl_count = st_count_map.get(s.id, 0)
        tpl_names = st_names_map.get(s.id, [])
        is_in_inv = s.id in inv_catalogue_ids

        items.append({
            'id': s.id,
            'name': s.name,
            'dosage_form': s.dosage_form or 'Tablet',
            'strength': s.strength or '',
            'route': s.route or 'Oral',
            'template_count': tpl_count,
            'template_names': tpl_names,
            'is_in_inventory': is_in_inv,
            'inventory_status': 'Yes' if is_in_inv else 'No',
            'is_active': s.is_active,
            'created_at': s.created_at.isoformat() if s.created_at else None,
            'version': s.version
        })

    total_pages = max(1, math.ceil(total_records / limit))
    return {
        'items': items,
        'total': total_records,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    }


@router.post('/supplements')
def create_supplement(data: SupplementInput, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    s_name = data.name.strip()
    norm_s = normalize_term(s_name)

    # Duplicate check
    existing = c.db.scalars(
        select(m.SupplementCatalog).where(
            m.SupplementCatalog.is_active == True,
            or_(
                m.SupplementCatalog.normalized_name == norm_s,
                m.SupplementCatalog.name.ilike(s_name)
            )
        )
    ).first()
    if existing:
        raise HTTPException(400, f'Supplement "{s_name}" already exists in the catalogue.')

    supp = m.SupplementCatalog(
        id=str(uuid.uuid4()),
        name=s_name,
        normalized_name=norm_s,
        dosage_form=data.dosage_form or 'Tablet',
        strength=data.strength or '',
        route=data.route or 'Oral',
        is_active=True,
        version=1
    )
    c.db.add(supp)
    c.audit('create_supplement', supp)
    c.db.commit()

    return serialize(supp)


@router.put('/supplements/{identifier}')
def update_supplement(identifier: str, data: SupplementInput, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    supp = c.record(m.SupplementCatalog, identifier)
    s_name = data.name.strip()
    
    supp.name = s_name
    supp.normalized_name = normalize_term(s_name)
    supp.dosage_form = data.dosage_form or 'Tablet'
    supp.strength = data.strength or ''
    supp.route = data.route or 'Oral'
    supp.version += 1

    c.audit('update_supplement', supp)
    c.db.commit()
    return serialize(supp)


@router.delete('/supplements/{identifier}')
def delete_supplement(identifier: str, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    supp = c.record(m.SupplementCatalog, identifier)

    # 1. Dependency check: Inventory
    inv_count = c.db.scalar(
        select(func.count(m.InventoryItem.id)).where(
            m.InventoryItem.catalogue_id == identifier,
            m.InventoryItem.is_active == True
        )
    ) or 0
    if inv_count > 0:
        raise HTTPException(
            400,
            'Supplements added in Inventory, cannot be deleted here. They can be deleted only from Inventory section.'
        )

    # 2. Dependency check: Templates
    tpl_count = c.db.scalar(
        select(func.count(m.SupplementTemplate.id)).where(
            m.SupplementTemplate.catalogue_id == identifier,
            m.SupplementTemplate.is_active == True
        )
    ) or 0
    if tpl_count > 0:
        raise HTTPException(
            400,
            'Supplements used in templates cannot be deleted. To delete from here, remove them from Settings > Templates (Supplement).'
        )

    supp.is_active = False
    supp.version += 1
    c.audit('delete_supplement', supp)
    c.db.commit()
    return {'ok': True, 'id': identifier, 'message': f'Supplement "{supp.name}" removed successfully.'}


@router.post('/supplements/bulk-delete')
def bulk_delete_supplements(data: BulkDeleteInput, c=Depends(context)):
    c.allow({'admin', 'doctor'})
    if not data.ids:
        raise HTTPException(400, 'No supplement IDs provided for deletion.')

    deleted_ids: List[str] = []
    blocked_items: List[Dict[str, Any]] = []

    for supp_id in data.ids:
        supp = c.db.scalars(
            select(m.SupplementCatalog).where(
                m.SupplementCatalog.id == supp_id,
                m.SupplementCatalog.is_active == True
            )
        ).first()

        if not supp:
            continue

        # Check Inventory dependency
        inv_count = c.db.scalar(
            select(func.count(m.InventoryItem.id)).where(
                m.InventoryItem.catalogue_id == supp_id,
                m.InventoryItem.is_active == True
            )
        ) or 0
        if inv_count > 0:
            blocked_items.append({
                'id': supp_id,
                'name': supp.name,
                'reason': 'Added in Inventory. Can be deleted only from Inventory section.'
            })
            continue

        # Check Template dependency
        tpl_count = c.db.scalar(
            select(func.count(m.SupplementTemplate.id)).where(
                m.SupplementTemplate.catalogue_id == supp_id,
                m.SupplementTemplate.is_active == True
            )
        ) or 0
        if tpl_count > 0:
            blocked_items.append({
                'id': supp_id,
                'name': supp.name,
                'reason': f'Used in {tpl_count} supplement template(s). Remove from Settings > Templates (Supplement) first.'
            })
            continue

        # Allowed to delete
        supp.is_active = False
        supp.version += 1
        c.audit('bulk_delete_supplement', supp)
        deleted_ids.append(supp_id)

    c.db.commit()

    return {
        'ok': True,
        'deleted': deleted_ids,
        'blocked': blocked_items,
        'message': f'{len(deleted_ids)} supplement(s) deleted. {len(blocked_items)} blocked by dependencies.'
    }


# ---------------------------------------------------------------------------
# 3. TEMPLATES INSPECTION ENDPOINTS
# ---------------------------------------------------------------------------

@router.get('/templates')
def get_rx_templates(
    type: str = Query(default='all', description='prescription, supplement, or all'),
    catalogue_id: Optional[str] = Query(default=None),
    c=Depends(context)
):
    c.allow(CLINICAL | {'reception', 'billing'})
    results: List[Dict[str, Any]] = []

    # Prescription templates
    if type in ('all', 'prescription', 'drug'):
        stmt = select(m.PrescriptionTemplate).where(m.PrescriptionTemplate.is_active == True)
        if catalogue_id:
            stmt = stmt.where(m.PrescriptionTemplate.catalogue_id == catalogue_id)
        for pt in c.db.scalars(stmt.order_by(m.PrescriptionTemplate.template_name)).all():
            results.append({
                'id': pt.id,
                'template_name': pt.template_name,
                'type': 'prescription',
                'catalogue_id': pt.catalogue_id,
                'item_name': pt.drug_name,
                'generic_name': pt.generic_name,
                'dosage': pt.dosage,
                'route': pt.route,
                'frequency': pt.frequency,
                'maen': pt.maen,
                'duration': pt.duration,
                'instructions': pt.instructions
            })

    # Supplement templates
    if type in ('all', 'supplement'):
        stmt = select(m.SupplementTemplate).where(m.SupplementTemplate.is_active == True)
        if catalogue_id:
            stmt = stmt.where(m.SupplementTemplate.catalogue_id == catalogue_id)
        for st in c.db.scalars(stmt.order_by(m.SupplementTemplate.template_name)).all():
            results.append({
                'id': st.id,
                'template_name': st.template_name,
                'type': 'supplement',
                'catalogue_id': st.catalogue_id,
                'item_name': st.supplement_name,
                'dosage': st.dosage,
                'route': st.route,
                'frequency': st.frequency,
                'duration': st.duration,
                'instructions': st.instructions
            })

    return results

