import hashlib
import hmac
import secrets
from dataclasses import dataclass
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from .db import get_db
from .models import StaffSession, User, UserFacility, Facility, Patient, PatientFacility, AuditEvent, Sequence, now

CLINICAL = {'doctor','assistant','therapist','admin'}
BILLING = {'billing','reception','admin','doctor'}
SCHEDULING = {'reception','doctor','therapist','admin'}


def password_hash(password):
    salt = secrets.token_bytes(16)
    result = hashlib.scrypt(password.encode(), salt=salt, n=16384,r=8,p=1,dklen=32)
    return salt.hex()+':'+result.hex()


def password_matches(password, stored):
    try:
        salt, expected = stored.split(':')
        actual = hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1,dklen=32)
        return hmac.compare_digest(actual.hex(),expected)
    except (ValueError, TypeError):
        return False


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


@dataclass
class Context:
    db: object
    user: User
    facility_id: str
    facility_ids: list[str]
    session: StaffSession

    def allow(self, roles):
        if self.user.role not in roles:
            raise HTTPException(403,'Your role does not permit this action')

    def patient(self, patient_id):
        p = self.db.get(Patient,patient_id)
        if not p or not self.db.get(PatientFacility,(patient_id,self.facility_id)):
            raise HTTPException(404,'Patient not available in this branch')
        return p

    def record(self, model, identifier):
        row = self.db.get(model,identifier)
        if not row or getattr(row,'facility_id',self.facility_id) != self.facility_id:
            raise HTTPException(404,'Record not available in this branch')
        if hasattr(row,'patient_id'):
            self.patient(row.patient_id)
        return row

    def staff(self, user_id, roles=None):
        user = self.db.get(User,user_id)
        if not user or not user.active or not self.db.get(UserFacility,(user_id,self.facility_id)):
            raise HTTPException(422,'Staff member is not active in this branch')
        if roles and user.role not in roles:
            raise HTTPException(422,'Staff member has an incompatible role')
        return user

    def audit(self, action, row, detail=''):
        self.db.flush()
        self.db.add(AuditEvent(facility_id=self.facility_id,actor_id=self.user.id,
            action=action,entity_type=row.__tablename__,entity_id=row.id,detail=detail))


def context(request: Request, db=Depends(get_db)):
    raw = request.cookies.get('ehr_session','')
    session = db.get(StaffSession,digest(raw)) if raw else None
    if not session or session.expires_at <= now():
        raise HTTPException(401,'Please sign in')
    user = db.get(User,session.user_id)
    if not user or not user.active:
        raise HTTPException(401,'Please sign in')
    if request.method not in ('GET','HEAD','OPTIONS'):
        csrf = request.headers.get('X-CSRF-Token','')
        if not hmac.compare_digest(csrf,session.csrf):
            raise HTTPException(403,'Invalid session verification token')
    facilities = list(db.scalars(select(UserFacility.facility_id).join(Facility).where(UserFacility.user_id==user.id,Facility.active==True)))
    branch = request.headers.get('X-Facility-ID') or (facilities[0] if facilities else '')
    if branch not in facilities:
        raise HTTPException(403,'Branch access denied')
    return Context(db,user,branch,facilities,session)


def check_version(row, version):
    if row.version != version:
        raise HTTPException(409,'This record changed. Reload before saving.')


def next_number(db, prefix):
    seq = db.get(Sequence,prefix)
    if not seq:
        seq = Sequence(key=prefix,value=0)
        db.add(seq)
    seq.value += 1
    db.flush()
    return f'{prefix}-{seq.value:06d}'
