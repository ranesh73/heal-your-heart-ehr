import sqlite3
import uuid

conn = sqlite3.connect('backend/data/ehr.db')
c = conn.cursor()

# Map existing IDs if name matches roughly
existing = c.execute('SELECT id, code, name FROM facilities').fetchall()
print("Existing facilities:")
for e in existing:
    print(e)

facilities_data = [
    {
        "name": "4R Health & Wellness",
        "code": "4RH01",
        "mobile": "9003070064",
        "phone": "9003070065",
        "address": "No.357,First floor, Shri kapaleeswar nagar,Neelankarai , chennai",
        "active": 1
    },
    {
        "name": "Dr.S.Ramasamy (Reg No:60626)",
        "code": "DSR01",
        "mobile": "9003070065",
        "phone": "9003070065",
        "address": "Plot No.357, First Floor, ECR , Sri Kapaleeswarar Nagar,Neelankarai , Chennai",
        "active": 1
    },
    {
        "name": "Dr.S.Ramasamy (Royapettah)",
        "code": "DSR02",
        "mobile": "9003070065",
        "phone": "",
        "address": "No 155,156 GP Road , Mount Road , Chennai",
        "active": 1
    },
    {
        "name": "Heal Your Heart - Manapakkam - HUH003",
        "code": "HYM",
        "mobile": "9003070064",
        "phone": "9003070065",
        "address": "3/249,J Krishna Enclave , Manapakkam Main Road , Chennai",
        "active": 1
    },
    {
        "name": "Heal Your Heart Neelankarai - HUH001",
        "code": "HYN",
        "mobile": "9003070065",
        "phone": "9003070065",
        "address": "Plot No.357, Second Floor, ECR , Sri Kapaleeswarar Nagar,Neelankarai , Chennai",
        "active": 1
    },
    {
        "name": "Heal Your Heart Royapettah - HUH002",
        "code": "HYR",
        "mobile": "9003070065",
        "phone": "8939996958",
        "address": "Sundar Krishna Complex, First Floor , No.155/156, GP Lane, OffAnna Salai , Chennai",
        "active": 1
    },
    {
        "name": "Heal Your Heart-Madurai - 005",
        "code": "HYD",
        "mobile": "",
        "phone": "",
        "address": "No 28,Velayudham Pillai Street, , Goripalayam , Madurai",
        "active": 1
    },
    {
        "name": "Heal Your Heart-Tirunelveli - 004",
        "code": "HYT",
        "mobile": "",
        "phone": "",
        "address": "9L,Madurai Road,Thilak Nagar , Tirunelveli",
        "active": 1
    },
    {
        "name": "Heal Your Heart - Krishnagiri - HUH006",
        "code": "HYK01",
        "mobile": "9848881262",
        "phone": "9003070065",
        "address": "No 545, TNHB Phase II, Wahab Nagar, , Kathujuganapalli, Krishnagiri , Krishnagiri",
        "active": 0
    },
    {
        "name": "Heal Your Heart-Krishnagiri - 004",
        "code": "HYK02",
        "mobile": "",
        "phone": "",
        "address": "117 TNHB Phase 1 , Near Hemavarshini Hyundai Car Showr , Krishnagiri",
        "active": 0
    },
]

# Update existing where code matches, insert new ones
admin_id = c.execute("SELECT id FROM users WHERE role='admin'").fetchone()[0]

for f in facilities_data:
    match = c.execute("SELECT id FROM facilities WHERE code=?", (f['code'],)).fetchone()
    if match:
        fid = match[0]
        c.execute("UPDATE facilities SET name=?, address=?, active=? WHERE id=?", (f['name'], f['address'], f['active'], fid))
        print(f"Updated {f['name']} ({fid})")
    else:
        fid = str(uuid.uuid4())
        c.execute("INSERT INTO facilities (id, code, name, address, active, created_at, version) VALUES (?, ?, ?, ?, ?, datetime('now'), 1)",
                  (fid, f['code'], f['name'], f['address'], f['active']))
        # Assign admin to facility
        c.execute("INSERT OR IGNORE INTO user_facilities (user_id, facility_id) VALUES (?, ?)", (admin_id, fid))
        print(f"Inserted {f['name']} ({fid})")

# Ensure all users are assigned to at least active facilities
users = c.execute("SELECT id FROM users").fetchall()
all_facs = c.execute("SELECT id FROM facilities WHERE active=1").fetchall()
for u in users:
    for fa in all_facs:
        c.execute("INSERT OR IGNORE INTO user_facilities (user_id, facility_id) VALUES (?, ?)", (u[0], fa[0]))

conn.commit()
print("All 10 facilities synchronized.")

