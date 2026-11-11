import os
import secrets
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, func, delete
from . import models as m, schemas as s
from .db import get_db
from .security import context, digest, password_hash, password_matches
from .serialization import serialize

router = APIRouter(prefix='/api')


@router.post('/auth/login')
def login(data: s.Login, request: Request, response: Response, db=Depends(get_db)):
    key = digest(data.email.lower()+'|'+(request.client.host if request.client else 'local'))
    recent = m.now()-timedelta(minutes=15)
    attempts = db.scalar(select(func.count()).select_from(m.LoginAttempt).where(m.LoginAttempt.key==key,m.LoginAttempt.created_at>recent))
    if attempts >= 10:
        raise HTTPException(429,'Too many sign-in attempts. Try again in 15 minutes.')
    user = db.scalar(select(m.User).where(m.User.email==data.email.lower()))
    if not user or not user.active or not password_matches(data.password,user.password_hash):
        # Retain failed attempt even though the request fails.
        db.add(m.LoginAttempt(key=key))
        db.commit()
        raise HTTPException(401,'Invalid email or password')
    db.execute(delete(m.LoginAttempt).where(m.LoginAttempt.key==key))
    raw = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    session = m.StaffSession(token_hash=digest(raw),csrf=csrf,user_id=user.id,expires_at=m.now()+timedelta(hours=8))
    db.add(session)
    db.add(m.AuditEvent(actor_id=user.id,action='sign_in',entity_type='users',entity_id=user.id))
    facilities = list(db.scalars(select(m.Facility).join(m.UserFacility).where(m.UserFacility.user_id==user.id,m.Facility.active==True)))
    facility_id = facilities[0].id if facilities else ''
    db.commit()
    response.set_cookie('ehr_session',raw,httponly=True,samesite='lax',secure=os.getenv('EHR_SECURE_COOKIES')=='1',max_age=28800,path='/')
    return {
        'user': serialize(user),
        'csrf': csrf,
        'facility_id': facility_id,
        'facilities': [serialize(x) for x in facilities]
    }


@router.get('/auth/me')
def me(c=Depends(context)):
    return {'user':serialize(c.user),'csrf':c.session.csrf,'facility_id':c.facility_id,
        'facilities':[serialize(x) for x in c.db.scalars(select(m.Facility).where(m.Facility.id.in_(c.facility_ids)))]}


@router.post('/auth/logout')
def logout(response: Response,c=Depends(context)):
    c.db.delete(c.session)
    c.db.commit()
    response.delete_cookie('ehr_session',path='/')
    return {'ok':True}


@router.get('/metadata')
def metadata(c=Depends(context)):
    return {'record_fields':s.RECORD_FIELDS,'daily_fields':s.DAILY_FIELDS,
        'timezone':'Asia/Kolkata','currency':'INR','development':True,
        'integrations':{'payments':False,'prescribing':False,'external_messages':False}}


@router.get('/staff')
def staff(c=Depends(context)):
    return [serialize(x) for x in c.db.scalars(select(m.User).join(m.UserFacility).where(m.UserFacility.facility_id==c.facility_id,m.User.active==True))]


@router.get('/resources')
def resources(c=Depends(context)):
    return [serialize(x) for x in c.db.scalars(select(m.Resource).where(m.Resource.facility_id==c.facility_id,m.Resource.active==True).order_by(m.Resource.name))]


@router.post('/admin/users')
def create_user(data:s.StaffInput,c=Depends(context)):
    c.allow({'admin'})
    if any(f not in c.facility_ids for f in data.facility_ids):
        raise HTTPException(403,'Cannot grant access to an unauthorized branch')
    if c.db.scalar(select(m.User).where(m.User.email==data.email.lower())):
        raise HTTPException(409,'Email already exists')
    row=m.User(email=data.email.lower(),name=data.name,role=data.role,password_hash=password_hash(data.password))
    c.db.add(row); c.db.flush()
    for fid in set(data.facility_ids): c.db.add(m.UserFacility(user_id=row.id,facility_id=fid))
    c.audit('create_staff',row)
    return serialize(row)


@router.post('/admin/users/{identifier}/deactivate')
def deactivate_user(identifier:str,c=Depends(context)):
    c.allow({'admin'})
    row=c.staff(identifier)
    if row.id==c.user.id: raise HTTPException(409,'Cannot deactivate your own account')
    # A branch administrator may not deactivate staff with additional branch access.
    fids=list(c.db.scalars(select(m.UserFacility.facility_id).where(m.UserFacility.user_id==row.id)))
    if not set(fids).issubset(c.facility_ids): raise HTTPException(403,'Staff has access outside your scope')
    row.active=False; row.version+=1
    c.db.execute(delete(m.StaffSession).where(m.StaffSession.user_id==row.id))
    c.audit('deactivate_staff',row)
    return serialize(row)


@router.get('/facilities')
def list_facilities(c=Depends(context)):
    return [serialize(x) for x in c.db.scalars(select(m.Facility).order_by(m.Facility.active.desc(), m.Facility.name))]


@router.post('/admin/facilities')
def facility(data:s.FacilityInput,c=Depends(context)):
    c.allow({'admin'})
    d = data.model_dump()
    # Filter out extra schema fields that are not in m.Facility table
    facility_fields = {'code', 'name', 'address', 'phone', 'mobile', 'active'}
    clean_d = {k: v for k, v in d.items() if k in facility_fields}
    row=m.Facility(**clean_d); c.db.add(row); c.db.flush()
    c.db.add(m.UserFacility(user_id=c.user.id,facility_id=row.id))
    c.audit('create_facility',row)
    return serialize(row)


@router.put('/admin/facilities/{identifier}')
def update_facility(identifier:str, data:s.FacilityInput, c=Depends(context)):
    c.allow({'admin'})
    row = c.db.get(m.Facility, identifier)
    if not row: raise HTTPException(404, 'Facility not found')
    d = data.model_dump()
    row.name = d['name']
    row.code = d['code']
    if 'active' in d and d['active'] is not None:
        row.active = d['active']
    if d.get('address') is not None:
        row.address = d['address']
    if 'phone' in d and d['phone'] is not None:
        row.phone = d['phone']
    if 'mobile' in d and d['mobile'] is not None:
        row.mobile = d['mobile']
    row.version += 1
    c.audit('update_facility', row)
    return serialize(row)


@router.post('/admin/facilities/{identifier}/status')
def toggle_facility_status(identifier:str, c=Depends(context)):
    c.allow({'admin'})
    row = c.db.get(m.Facility, identifier)
    if not row: raise HTTPException(404, 'Facility not found')
    row.active = not row.active
    row.version += 1
    c.audit('toggle_facility_status', row)
    return serialize(row)


@router.get('/facilities/{identifier}/members')
def facility_members(identifier:str, c=Depends(context)):
    all_users = list(c.db.scalars(select(m.User).order_by(m.User.name)))
    mapped_uids = set(c.db.scalars(select(m.UserFacility.user_id).where(m.UserFacility.facility_id==identifier)))
    return [
        {**serialize(u), 'mapped': u.id in mapped_uids}
        for u in all_users
    ]


@router.post('/admin/facilities/{identifier}/members')
def update_facility_members(identifier:str, data:dict, c=Depends(context)):
    c.allow({'admin'})
    user_ids = set(data.get('user_ids', []))
    # Remove existing associations for this facility
    c.db.execute(delete(m.UserFacility).where(m.UserFacility.facility_id==identifier))
    # Add new associations
    for uid in user_ids:
        c.db.add(m.UserFacility(user_id=uid, facility_id=identifier))
    c.db.commit()
    return {'ok': True, 'count': len(user_ids)}


@router.get('/facility-resources')
def list_facility_resources(c=Depends(context)):
    stmt = (
        select(m.Resource, m.Facility.name.label('facility_name'), m.Facility.code.label('facility_code'))
        .join(m.Facility, m.Resource.facility_id == m.Facility.id)
        .order_by(m.Resource.name, m.Facility.name)
    )
    results = []
    for res, fac_name, fac_code in c.db.execute(stmt):
        s = serialize(res)
        s['facility_name'] = fac_name
        s['facility_code'] = fac_code
        results.append(s)
    return results


@router.post('/admin/facility-resources')
def add_facility_resource(data:dict, c=Depends(context)):
    c.allow({'admin'})
    fid = data.get('facility_id') or c.facility_id
    row = m.Resource(
        facility_id=fid,
        name=data['name'],
        kind=data.get('kind', 'EECP Room'),
        active=True
    )
    c.db.add(row)
    c.audit('create_facility_resource', row)
    return serialize(row)


@router.post('/admin/resources')
def resource(data:s.ResourceInput,c=Depends(context)):
    c.allow({'admin'})
    row=m.Resource(**data.model_dump(),facility_id=c.facility_id); c.db.add(row); c.audit('create_resource',row)
    return serialize(row)


@router.get('/availability')
def availability(c=Depends(context)):
    return [serialize(x) for x in c.db.scalars(select(m.Availability).where(m.Availability.facility_id==c.facility_id))]


@router.post('/admin/availability')
def create_availability(data:s.AvailabilityInput,c=Depends(context)):
    c.allow({'admin'}); c.staff(data.user_id,{'doctor','therapist'})
    if data.start_minute>=data.end_minute: raise HTTPException(422,'End must follow start')
    row=m.Availability(**data.model_dump(),facility_id=c.facility_id); c.db.add(row); c.audit('create_availability',row)
    return serialize(row)


@router.delete('/admin/availability/{identifier}')
def remove_availability(identifier:str,c=Depends(context)):
    c.allow({'admin'}); row=c.record(m.Availability,identifier); c.audit('remove_availability',row); c.db.delete(row)
    return {'ok':True}


@router.get('/catalogs')
def catalogs(kind:str|None=None,q:str|None=None,c=Depends(context)):
    query=select(m.Catalog).where(m.Catalog.facility_id==c.facility_id,m.Catalog.active==True)
    if kind: query=query.where(m.Catalog.kind==kind)
    if q: query=query.where(m.Catalog.name.ilike(f'%{q}%'))
    return [serialize(x) for x in c.db.scalars(query.order_by(m.Catalog.name))]


@router.post('/admin/catalogs')
def catalog(data:s.CatalogInput,c=Depends(context)):
    c.allow({'admin'})
    row=m.Catalog(**data.model_dump(),facility_id=c.facility_id); c.db.add(row); c.audit('create_catalog',row)
    return serialize(row)


@router.put('/admin/catalogs/{identifier}')
def edit_catalog(identifier:str,data:s.CatalogInput,version:int,c=Depends(context)):
    from .security import check_version
    c.allow({'admin'}); row=c.record(m.Catalog,identifier); check_version(row,version)
    for k,v in data.model_dump().items(): setattr(row,k,v)
    row.version+=1; c.audit('edit_catalog',row)
    return serialize(row)


@router.get('/admin/audit')
def audit(c=Depends(context)):
    c.allow({'admin'})
    return [serialize(x) for x in c.db.scalars(select(m.AuditEvent).where(m.AuditEvent.facility_id.in_(c.facility_ids)).order_by(m.AuditEvent.created_at.desc()).limit(500))]
