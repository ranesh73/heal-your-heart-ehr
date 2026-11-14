import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, func
from . import models as m
from .security import context, CLINICAL
from .serialization import serialize

router = APIRouter(prefix='/api')


def normalize_search_term(term: str) -> str:
    """Normalize search term: lowercase and strip extra punctuation."""
    cleaned = re.sub(r'[\s\-_/\\]+', ' ', term.strip().lower())
    return cleaned


@router.get('/catalogue/search')
@router.get('/catalog/search')
def search_catalogue(
    q: str = Query(default='', description='Search term (name, trade name, code, strength)'),
    type: str = Query(default='all', description='Catalogue type: all, medicine, drug, injection, inventory, lab, imaging, vaccine'),
    limit: int = Query(default=50, ge=1, le=200),
    c=Depends(context)
) -> List[Dict[str, Any]]:
    c.allow(CLINICAL | {'reception', 'billing'})
    term = q.strip()
    norm_term = normalize_search_term(term) if term else ''
    search_type = type.strip().lower()
    results: List[Dict[str, Any]] = []
    seen_keys = set()

    # 1. INJECTIONS
    if search_type in ('all', 'injection', 'injections'):
        inj_stmt = select(m.InjectionCatalog).where(m.InjectionCatalog.is_active == True)
        if term:
            inj_stmt = inj_stmt.where(
                or_(
                    m.InjectionCatalog.name.ilike(f'%{term}%'),
                    m.InjectionCatalog.normalized_name.ilike(f'%{norm_term}%'),
                    m.InjectionCatalog.original_source_name.ilike(f'%{term}%')
                )
            )
        inj_stmt = inj_stmt.order_by(m.InjectionCatalog.name.asc()).limit(limit)
        injections = c.db.scalars(inj_stmt).all()
        for inj in injections:
            dedup_key = f"injection:{inj.normalized_name or inj.name.lower()}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            results.append({
                'id': inj.id,
                'catalogue_id': inj.id,
                'name': inj.name,
                'display_name': inj.name,
                'trade_name': inj.name,
                'generic_name': inj.original_source_name or inj.name,
                'kind': 'injection',
                'badge': 'Injection',
                'route': 'Intramuscular (IM) / Intravenous (IV)',
                'details': {
                    'original_source_name': inj.original_source_name,
                    'verification_status': inj.verification_status
                }
            })

        # Also search practice catalogs with kind == 'injection'
        cat_inj_stmt = select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'injection',
            m.Catalog.active == True
        )
        if term:
            cat_inj_stmt = cat_inj_stmt.where(m.Catalog.name.ilike(f'%{term}%'))
        for item in c.db.scalars(cat_inj_stmt.limit(limit)).all():
            norm_name = item.name.lower().strip()
            dedup_key = f"injection:{norm_name}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            results.append({
                'id': item.id,
                'catalogue_id': item.id,
                'name': item.name,
                'display_name': item.name,
                'trade_name': item.name,
                'generic_name': item.name,
                'kind': 'injection',
                'badge': 'Injection',
                'route': 'Intramuscular / Subcutaneous',
                'details': {
                    'code': item.code or '',
                    'content': item.content or ''
                }
            })

    # 2. MEDICINES & DRUGS
    if search_type in ('all', 'medicine', 'medicines', 'drug', 'drugs', 'medication', 'medications'):
        # Master medicine catalogue (219 extracted formulary records)
        med_stmt = select(m.MedicineCatalog).where(m.MedicineCatalog.is_active == True)
        if term:
            med_stmt = med_stmt.where(
                or_(
                    m.MedicineCatalog.product_name.ilike(f'%{term}%'),
                    m.MedicineCatalog.trade_name.ilike(f'%{term}%'),
                    m.MedicineCatalog.normalized_name.ilike(f'%{norm_term}%'),
                    m.MedicineCatalog.normalized_trade.ilike(f'%{norm_term}%')
                )
            )
        med_stmt = med_stmt.order_by(m.MedicineCatalog.product_name.asc()).limit(limit)
        medicines = c.db.scalars(med_stmt).all()
        for med in medicines:
            dedup_key = f"medication:{med.normalized_name or med.product_name.lower()}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            disp = med.product_name
            if med.trade_name and med.trade_name.lower() != med.product_name.lower():
                disp = f"{med.product_name} ({med.trade_name})"
            results.append({
                'id': med.id,
                'catalogue_id': med.id,
                'name': med.product_name,
                'display_name': disp,
                'trade_name': med.trade_name,
                'generic_name': med.product_name,
                'kind': 'medication',
                'badge': 'Medication',
                'dose_form': 'Tablet',
                'route': 'Oral',
                'details': {
                    'trade_name': med.trade_name,
                    'generic_name': med.product_name
                }
            })

        # Practice catalogs table with kind == 'medication'
        cat_med_stmt = select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'medication',
            m.Catalog.active == True
        )
        if term:
            cat_med_stmt = cat_med_stmt.where(m.Catalog.name.ilike(f'%{term}%'))
        for item in c.db.scalars(cat_med_stmt.limit(limit)).all():
            norm_name = item.name.lower().strip()
            dedup_key = f"medication:{norm_name}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            results.append({
                'id': item.id,
                'catalogue_id': item.id,
                'name': item.name,
                'display_name': item.name,
                'trade_name': item.name,
                'generic_name': item.name,
                'kind': 'medication',
                'badge': 'Medication',
                'dose_form': 'Tablet',
                'route': 'Oral',
                'details': {
                    'code': item.code or '',
                    'content': item.content or ''
                }
            })

    # 2b. SUPPLEMENTS
    if search_type in ('all', 'supplement', 'supplements', 'medicine', 'medicines'):
        supp_stmt = select(m.SupplementCatalog).where(m.SupplementCatalog.is_active == True)
        if term:
            supp_stmt = supp_stmt.where(
                or_(
                    m.SupplementCatalog.name.ilike(f'%{term}%'),
                    m.SupplementCatalog.normalized_name.ilike(f'%{norm_term}%'),
                    m.SupplementCatalog.dosage_form.ilike(f'%{term}%'),
                    m.SupplementCatalog.strength.ilike(f'%{term}%')
                )
            )
        supp_stmt = supp_stmt.order_by(m.SupplementCatalog.name.asc()).limit(limit)
        for supp in c.db.scalars(supp_stmt).all():
            dedup_key = f"supplement:{supp.normalized_name or supp.name.lower()}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            results.append({
                'id': supp.id,
                'catalogue_id': supp.id,
                'name': supp.name,
                'display_name': supp.name,
                'trade_name': supp.name,
                'generic_name': supp.name,
                'kind': 'supplement',
                'badge': 'Supplement',
                'dose_form': supp.dosage_form or 'Tablet',
                'strength': supp.strength or '',
                'route': supp.route or 'Oral',
                'details': {
                    'dosage_form': supp.dosage_form,
                    'strength': supp.strength,
                    'is_supplement': True
                }
            })

    # 3. INVENTORY ITEMS (Facility scoped)
    if search_type in ('all', 'inventory', 'product', 'products'):
        inv_stmt = select(m.InventoryItem).where(
            m.InventoryItem.facility_id == c.facility_id,
            m.InventoryItem.is_active == True
        )
        if term:
            inv_stmt = inv_stmt.where(
                or_(
                    m.InventoryItem.name.ilike(f'%{term}%'),
                    m.InventoryItem.trade_name.ilike(f'%{term}%'),
                    m.InventoryItem.product_code.ilike(f'%{term}%'),
                    m.InventoryItem.manufacturer.ilike(f'%{term}%')
                )
            )
        inv_stmt = inv_stmt.order_by(m.InventoryItem.name.asc()).limit(limit)
        items = c.db.scalars(inv_stmt).all()
        for itm in items:
            dedup_key = f"inventory:{itm.id}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            disp = itm.name
            if itm.trade_name and itm.trade_name.lower() != itm.name.lower():
                disp = f"{itm.name} ({itm.trade_name})"
            results.append({
                'id': itm.id,
                'catalogue_id': itm.id,
                'name': itm.name,
                'display_name': disp,
                'trade_name': itm.trade_name or '',
                'generic_name': itm.name,
                'kind': 'inventory',
                'badge': 'Inventory',
                'dose_form': itm.dose_form or '',
                'strength': itm.strength or '',
                'route': itm.route or '',
                'unit': itm.unit or 'Units',
                'details': {
                    'product_code': itm.product_code,
                    'category': itm.category,
                    'cost_price': itm.cost_price,
                    'retail_price': itm.retail_price
                }
            })

    # 4. LABS
    if search_type in ('all', 'lab', 'labs', 'lab_test'):
        lab_stmt = select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'lab_test',
            m.Catalog.active == True
        )
        if term:
            lab_stmt = lab_stmt.where(
                or_(
                    m.Catalog.name.ilike(f'%{term}%'),
                    m.Catalog.code.ilike(f'%{term}%')
                )
            )
        lab_stmt = lab_stmt.order_by(m.Catalog.name.asc()).limit(limit)
        labs = c.db.scalars(lab_stmt).all()
        for lab in labs:
            dedup_key = f"lab:{lab.id}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            results.append({
                'id': lab.id,
                'catalogue_id': lab.id,
                'name': lab.name,
                'display_name': f"{lab.name} [{lab.code}]" if lab.code else lab.name,
                'trade_name': '',
                'generic_name': lab.name,
                'kind': 'lab',
                'badge': 'Lab Test',
                'details': {
                    'code': lab.code,
                    'content': lab.content
                }
            })

    # 5. IMAGING
    if search_type in ('all', 'imaging', 'image', 'image_test'):
        img_stmt = select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind.in_(['image_test', 'image_type']),
            m.Catalog.active == True
        )
        if term:
            img_stmt = img_stmt.where(m.Catalog.name.ilike(f'%{term}%'))
        img_stmt = img_stmt.order_by(m.Catalog.name.asc()).limit(limit)
        images = c.db.scalars(img_stmt).all()
        for img in images:
            dedup_key = f"imaging:{img.id}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            results.append({
                'id': img.id,
                'catalogue_id': img.id,
                'name': img.name,
                'display_name': img.name,
                'trade_name': '',
                'generic_name': img.name,
                'kind': 'imaging',
                'badge': 'Imaging',
                'details': {
                    'code': img.code
                }
            })

    # 6. VACCINES
    if search_type in ('all', 'vaccine', 'vaccines'):
        vac_stmt = select(m.Catalog).where(
            m.Catalog.facility_id == c.facility_id,
            m.Catalog.kind == 'vaccine',
            m.Catalog.active == True
        )
        if term:
            vac_stmt = vac_stmt.where(m.Catalog.name.ilike(f'%{term}%'))
        vac_stmt = vac_stmt.order_by(m.Catalog.name.asc()).limit(limit)
        for vac in c.db.scalars(vac_stmt).all():
            dedup_key = f"vaccine:{vac.id}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            results.append({
                'id': vac.id,
                'catalogue_id': vac.id,
                'name': vac.name,
                'display_name': vac.name,
                'trade_name': vac.name,
                'generic_name': vac.name,
                'kind': 'vaccine',
                'badge': 'Vaccine',
                'route': 'Intramuscular',
                'details': {
                    'code': vac.code
                }
            })

    return results[:limit]
