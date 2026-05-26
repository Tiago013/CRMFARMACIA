import sqlite3
import json

def cleanup_future_sales():
    conn = sqlite3.connect('farmaai_local.db')
    cursor = conn.cursor()
    
    # Get all future sales
    cursor.execute("SELECT id FROM sales WHERE created_at > '2026-05-24'")
    future_sales = [row[0] for row in cursor.fetchall()]
    
    if not future_sales:
        print("No future sales found.")
        return
        
    print(f"Deleting {len(future_sales)} future sales: {future_sales}")
    
    # 1. Delete sale items
    placeholders = ','.join(['?'] * len(future_sales))
    cursor.execute(f"DELETE FROM sale_items WHERE sale_id IN ({placeholders})", future_sales)
    print(f"Deleted {cursor.rowcount} sale items.")
    
    # 2. Delete timeline events matching these sale IDs
    # Since event_data is JSON, we can do a LIKE search for the sale_id
    deleted_events = 0
    for sid in future_sales:
        cursor.execute("DELETE FROM patient_timeline_events WHERE event_data LIKE ?", (f'%{sid}%',))
        deleted_events += cursor.rowcount
    print(f"Deleted {deleted_events} timeline events.")
    
    # 3. Delete the sales themselves
    cursor.execute(f"DELETE FROM sales WHERE id IN ({placeholders})", future_sales)
    print(f"Deleted {cursor.rowcount} sales.")
    
    conn.commit()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    cleanup_future_sales()
