import sqlite3
import json

conn = sqlite3.connect('farmaai_local.db')
cursor = conn.cursor()
cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for t in tables:
    print(f"Table: {t[0]}")
    print(t[1])
    print("-" * 50)
conn.close()
