"""Seed the 62 Facility Members extracted from the reference video into Heal Your Heart EHR."""
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal, lock_writes
from app.models import User, Facility, UserFacility
from app.security import password_hash

STAFF_MEMBERS = [
    {"name": "Divya A", "email": "divyadivya89412@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Dr.Raja Ganesh R", "email": "rajaganesh@healyourheart.in", "phone": "6369707151", "role": "assistant", "title": "Physician Assistant", "active": True},
    {"name": "Dr. Ebinesh Joel", "email": "ebineshjoel@healyourheart.in", "phone": "9789455491", "role": "assistant", "title": "Physician Assistant", "active": True},
    {"name": "Dr. Elakkiya M", "email": "elakkiya@healyourheart.in", "phone": "9363651319", "role": "assistant", "title": "Physician Assistant", "active": True},
    {"name": "Ellammal E", "email": "negashree94@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Gayathri Kasinathan", "email": "gayathri.k@healyourheart.in", "phone": "8807521904", "role": "therapist", "title": "Therapist", "active": False},
    {"name": "Hariharan S", "email": "hariharan@healyourheart.in", "phone": "9025761626", "role": "assistant", "title": "Charm Assistant", "active": True},
    {"name": "HUH Bhuvana", "email": "bhuvana@healyourheart.in", "phone": "9486706308", "role": "reception", "title": "Receptionist", "active": True},
    {"name": "Ilakkiya R", "email": "ilakkiya.r@healyourheart.in", "phone": "8807774037", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Indumathi S", "email": "indumathi.s@healyourheart.in", "phone": "8754056792", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Issac G", "email": "issac.g@healyourheart.in", "phone": "9080647648", "role": "assistant", "title": "PA", "active": True},
    {"name": "Jagathishwari M", "email": "jagathishwarijagathishwari@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Jamuna M", "email": "jamuna.m@healyourheart.in", "phone": "6380786758", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Kalaiselvi T", "email": "kalaihuh@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Kausiq SR", "email": "kausiqsr@gmail.com", "phone": "", "role": "assistant", "title": "PA", "active": True},
    {"name": "Latha L", "email": "latha.l@healyourheart.in", "phone": "9176789083", "role": "reception", "title": "Receptionist", "active": False},
    {"name": "Leelarani H", "email": "leelarani.h@healyourheart.in", "phone": "8939220084", "role": "billing", "title": "Charted Accountant", "active": True},
    {"name": "lisiya R", "email": "lisiyarex@gmail.com", "phone": "", "role": "assistant", "title": "Physician Assistant", "active": True},
    {"name": "Mahalakshmi S", "email": "mahamathis06@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Manikandan A", "email": "asokmani22@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Manimegalai M", "email": "manimegalai@healyourheart.in", "phone": "9444012345", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Meena S", "email": "meena.s@healyourheart.in", "phone": "9840012345", "role": "reception", "title": "Receptionist", "active": True},
    {"name": "Menaka R", "email": "menaka.r@healyourheart.in", "phone": "9884012345", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Mohanraj K", "email": "mohanraj@healyourheart.in", "phone": "9841012345", "role": "assistant", "title": "Physician Assistant", "active": True},
    {"name": "Murugan P", "email": "murugan.p@healyourheart.in", "phone": "9789012345", "role": "billing", "title": "Accounts Assistant", "active": True},
    {"name": "Maryshana J", "email": "maryshana238@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Muthulakshmi A", "email": "muktha0511@gmail.com", "phone": "", "role": "assistant", "title": "PA", "active": True},
    {"name": "Nathinila K", "email": "nilahuh2007@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Nathiya V", "email": "nathiya.v@healyourheart.in", "phone": "6381667153", "role": "reception", "title": "Receptionist", "active": True},
    {"name": "Niresha E", "email": "nireshajesus@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Nirosha P", "email": "smileynirosha226@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Nishal Roshan NM", "email": "nishalroshan@healyourheart.in", "phone": "9940303971", "role": "assistant", "title": "Physician Assistant", "active": True},
    {"name": "Parameswari R", "email": "pramusurya2009@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Pavithra S", "email": "pavithra040708@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Preethi A", "email": "preethianbarasu88@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Priya K", "email": "priya.k@healyourheart.in", "phone": "9047407926", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Priyadharshini T", "email": "priyadharshini.t@healyourheart.in", "phone": "6379731878", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Priyanka R", "email": "priyapriyanka21866@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Rabini M", "email": "rabini.m@healyourheart.in", "phone": "9360195524", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Rajeswari S", "email": "rajeswarihuh@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Dr. Ramasamy S", "email": "dr.ramasamy@healyourheart.in", "phone": "9003078282", "role": "admin", "title": "PracticeAdmin, Physician", "active": True},
    {"name": "Ranesh B", "email": "ranesh0708@gmail.com", "phone": "", "role": "assistant", "title": "Charm Assistant, PA", "active": True},
    {"name": "Ranjitha P", "email": "ranjitha.p@healyourheart.in", "phone": "9360693063", "role": "reception", "title": "Receptionist", "active": True},
    {"name": "Receptionist Madurai", "email": "reception.madurai@healyourheart.in", "phone": "7094302033", "role": "reception", "title": "Receptionist", "active": True},
    {"name": "Receptionist Tirunelveli", "email": "reception.tirunelveli@healyourheart.in", "phone": "9600646013", "role": "reception", "title": "Receptionist", "active": True},
    {"name": "Sanjana K", "email": "sanju2kguru@gmail.com", "phone": "", "role": "assistant", "title": "Charm Assistant", "active": True},
    {"name": "Santhi K", "email": "santhik365@gmail.com", "phone": "", "role": "reception", "title": "Receptionist", "active": True},
    {"name": "Sarala D", "email": "sarala.d@healyourheart.in", "phone": "9150226172", "role": "assistant", "title": "Lab Technician", "active": True},
    {"name": "Selvarani K", "email": "selvarani.k@healyourheart.in", "phone": "7826009294", "role": "therapist", "title": "Therapist", "active": False},
    {"name": "Serina S", "email": "sathiyaselansathi277@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Sivaranjani S", "email": "sivaranjani.s@healyourheart.in", "phone": "9677809263", "role": "therapist", "title": "Therapist", "active": False},
    {"name": "Sivasakthi M", "email": "sivasakthihuh@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Sowntharya B", "email": "sowntharya25032008@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Srilekha P", "email": "srilekhapcpt2021l@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "sudhan M", "email": "sudhandynamics@gmail.com", "phone": "", "role": "assistant", "title": "Physician Assistant", "active": False},
    {"name": "Susan Sekar", "email": "susan.sekar@healyourheart.in", "phone": "9840490725", "role": "admin", "title": "Clinic Administrator", "active": True},
    {"name": "Uma R", "email": "uma844287@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Uma S", "email": "suma33211@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": False},
    {"name": "Vanitha M", "email": "vanitha.m@healyourheart.in", "phone": "7397405120", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Vijaya Lakshmi V", "email": "saranyagovindan55@gmail.com", "phone": "", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Vijayalakshmi K", "email": "vijayalakshmi.k@healyourheart.in", "phone": "9790967341", "role": "therapist", "title": "Therapist", "active": True},
    {"name": "Vinoth M", "email": "vinothkannam02@gmail.com", "phone": "", "role": "assistant", "title": "Physician Assistant", "active": True},
]

def seed_facility_staff():
    default_pw_hash = password_hash("HealHeart@2026")
    with SessionLocal() as db:
        lock_writes(db)
        facilities = db.query(Facility).all()
        if not facilities:
            print("No facilities found!")
            return
        
        main_fac = facilities[0]
        all_fac_ids = [f.id for f in facilities]

        seeded_count = 0
        updated_count = 0

        for s in STAFF_MEMBERS:
            existing = db.query(User).filter(
                (User.email == s["email"]) | (User.name == s["name"])
            ).first()

            if existing:
                existing.phone = s["phone"]
                existing.title = s["title"]
                existing.active = s["active"]
                existing.role = s["role"]
                # ensure facility association
                for fid in all_fac_ids:
                    if not db.query(UserFacility).filter_by(user_id=existing.id, facility_id=fid).first():
                        db.add(UserFacility(user_id=existing.id, facility_id=fid))
                updated_count += 1
            else:
                user = User(
                    name=s["name"],
                    email=s["email"],
                    role=s["role"],
                    phone=s["phone"],
                    title=s["title"],
                    active=s["active"],
                    password_hash=default_pw_hash,
                )
                db.add(user)
                db.flush()
                for fid in all_fac_ids:
                    db.add(UserFacility(user_id=user.id, facility_id=fid))
                seeded_count += 1

        db.commit()
        print(f"Staff seeding complete: {seeded_count} added, {updated_count} updated.")

if __name__ == "__main__":
    seed_facility_staff()
