import sqlite3

for db_path in ['backend/data/ehr.db', 'backend/seed_data/ehr_master.db']:
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    pwhash = cur.execute('SELECT password_hash FROM users WHERE email = ?', ('doctor@demo.local',)).fetchone()[0]
    cur.execute('''
        INSERT OR REPLACE INTO users (id, email, name, role, password_hash, active, created_at, version)
        VALUES ('u-sanju-guru', 'sanju2kguru@gmail.com', 'Dr. Sanju Guru', 'doctor', ?, 1, datetime('now'), 1)
    ''', (pwhash,))
    con.commit()
    con.close()
    print(f'User added to {db_path}')
