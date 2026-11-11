import sqlite3
con = sqlite3.connect('backend/data/ehr.db')
cur = con.cursor()
print("Facilities:")
for f in cur.execute("SELECT id, code, name FROM facilities").fetchall():
    print(f"  {f[0]} | {f[1]} | {f[2]}")

print("\nPatient Facility Associations:")
for pf in cur.execute("SELECT p.first_name, p.last_name, f.code, f.name FROM patient_facilities pf JOIN patients p ON p.id = pf.patient_id JOIN facilities f ON f.id = pf.facility_id").fetchall():
    print(f"  {pf[0]} {pf[1]} -> {pf[2]} ({pf[3]})")

print("\nPatients WITHOUT facility:")
for p in cur.execute("SELECT p.id, p.first_name, p.last_name FROM patients p WHERE p.id NOT IN (SELECT patient_id FROM patient_facilities)").fetchall():
    print(f"  {p[0]} {p[1]} {p[2]}")

con.close()

