import sqlite3

db_path = r'C:\Users\sanju\Downloads\HUH\charm_health-main\backend\ehr_templates.db'
con = sqlite3.connect(db_path)
cur = con.cursor()
tables = [t[0] for t in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables in charm_health-main db:", tables)
counts = {t: cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0] for t in tables}
print("Counts:", counts)
con.close()
