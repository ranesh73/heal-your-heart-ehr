import sqlite3
import sys
import uuid
sys.path.insert(0, '.')
from backend.app.security import password_hash

conn = sqlite3.connect('backend/data/ehr.db')
c = conn.cursor()

# Get existing facilities
facilities = [r[0] for r in c.execute("SELECT id FROM facilities").fetchall()]
neelankarai_id = c.execute("SELECT id FROM facilities WHERE name LIKE '%Neelankarai%'").fetchone()[0]

staff_data = [
    {"name": "Dr. Ramasamy S", "email": "dr.ramasamy@healyourheart.in", "role": "doctor", "phone": "9003070065", "active": 1, "title": "Physician"},
    {"name": "Dr. Ebinesh Joel", "email": "dr.ebinesh@healyourheart.in", "role": "doctor", "phone": "9789455491", "active": 1, "title": "Physician Assistant"},
    {"name": "Dr. Elakkiya M", "email": "dr.elakkiya@healyourheart.in", "role": "doctor", "phone": "9363651319", "active": 1, "title": "Physician Assistant"},
    {"name": "Dr.Raja Ganesh R", "email": "dr.rajaganesh@healyourheart.in", "role": "doctor", "phone": "6369707151", "active": 1, "title": "Physician Assistant"},
    {"name": "Aakash Dr", "email": "aakashhuh2000@gmail.com", "role": "assistant", "phone": "9003070065", "active": 1, "title": "Physician Assistant"},
    {"name": "Aksharra P", "email": "aksharra@healyourheart.in", "role": "assistant", "phone": "9345573783", "active": 1, "title": "Physician Assistant"},
    {"name": "Susan Sekar", "email": "susan@healyourheart.in", "role": "assistant", "phone": "9003070065", "active": 1, "title": "Physician Assistant"},
    {"name": "Chandra Mohan R", "email": "chandramohan@healyourheart.in", "role": "assistant", "phone": "9003222611", "active": 1, "title": "Charm Assistant"},
    {"name": "Hariharan S", "email": "hariharan@healyourheart.in", "role": "therapist", "phone": "9003070065", "active": 1, "title": "Therapist"},
    {"name": "Kausiq SR", "email": "kausiq@healyourheart.in", "role": "therapist", "phone": "9003070065", "active": 1, "title": "Therapist"},
    {"name": "Nathiya V", "email": "nathiya@healyourheart.in", "role": "therapist", "phone": "9003070065", "active": 1, "title": "Therapist"},
    {"name": "Divya A", "email": "divyadivya89412@gmail.com", "role": "therapist", "phone": "9003070065", "active": 1, "title": "Therapist"},
    {"name": "Ellammal E", "email": "negashree94@gmail.com", "role": "therapist", "phone": "9003070065", "active": 1, "title": "Therapist"},
    {"name": "Leelarani H", "email": "leelarani@healyourheart.in", "role": "reception", "phone": "9003070065", "active": 1, "title": "Receptionist"},
    {"name": "Ranesh B", "email": "ranesh@healyourheart.in", "role": "reception", "phone": "9003070065", "active": 1, "title": "Receptionist"},
    {"name": "Ranjitha P", "email": "ranjitha@healyourheart.in", "role": "billing", "phone": "9003070065", "active": 1, "title": "Billing Specialist"},
    {"name": "Sanjana K", "email": "sanjana@healyourheart.in", "role": "assistant", "phone": "9003070065", "active": 1, "title": "Clinical Assistant"},
    {"name": "Sarala D", "email": "sarala@healyourheart.in", "role": "assistant", "phone": "9003070065", "active": 1, "title": "Nurse"},
    {"name": "Muthulakshmi A", "email": "muthulakshmi@healyourheart.in", "role": "assistant", "phone": "9003070065", "active": 1, "title": "Assistant"},
    {"name": "Issac G", "email": "issac@healyourheart.in", "role": "admin", "phone": "9003070065", "active": 1, "title": "Practice Admin"},
    {"name": "Aruna A", "email": "pradeeparuna0118@gmail.com", "role": "therapist", "phone": "9003070065", "active": 0, "title": "Therapist"},
    {"name": "Mr. Ashwin K", "email": "ashwin@healyourheart.in", "role": "billing", "phone": "9080565886", "active": 0, "title": "Charted Accountant"},
    {"name": "Gayathri Kasinathan", "email": "gayathri@healyourheart.in", "role": "therapist", "phone": "8807521904", "active": 0, "title": "Therapist"},
]

pwd_hash = password_hash("password123")

for s in staff_data:
    row = c.execute("SELECT id FROM users WHERE email=?", (s['email'],)).fetchone()
    if row:
        uid = row[0]
        c.execute("UPDATE users SET name=?, role=?, active=? WHERE id=?", (s['name'], s['role'], s['active'], uid))
    else:
        uid = str(uuid.uuid4())
        c.execute("INSERT INTO users (id, email, name, role, password_hash, active, created_at, version) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)",
                  (uid, s['email'], s['name'], s['role'], pwd_hash, s['active']))
    # Map to facilities
    for fid in facilities:
        c.execute("INSERT OR IGNORE INTO user_facilities (user_id, facility_id) VALUES (?, ?)", (uid, fid))

conn.commit()
print("All CharmHealth staff members synchronized successfully.")
