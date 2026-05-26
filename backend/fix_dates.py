import sqlite3

conn = sqlite3.connect('farmaai_local.db')
cursor = conn.cursor()

# Fix sales
cursor.execute("UPDATE sales SET created_at = substr(created_at, 1, 10) || ' ' || substr(created_at, 12, 8) WHERE created_at LIKE '%T%'")

# Fix timeline events
cursor.execute("UPDATE patient_timeline_events SET created_at = substr(created_at, 1, 10) || ' ' || substr(created_at, 12, 8) WHERE created_at LIKE '%T%'")

conn.commit()
conn.close()
print("Dates fixed.")
