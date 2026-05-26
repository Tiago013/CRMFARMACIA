import sqlite3

def adjust_local_prices(multiplier=4000):
    conn = sqlite3.connect('c:/Users/santi/Downloads/CRMFARMAIA/backend/farmaai_local.db')
    cursor = conn.cursor()
    
    # 1. Update Products
    print("Updating products...")
    cursor.execute("UPDATE products SET unit_price = unit_price * ?, cost_price = cost_price * ?", (multiplier, multiplier))
    
    # 2. Update Sales
    print("Updating sales...")
    cursor.execute("UPDATE sales SET subtotal = subtotal * ?, grand_total = grand_total * ?", (multiplier, multiplier))
    
    # 3. Update Sale Items
    print("Updating sale items...")
    cursor.execute("UPDATE sale_items SET unit_price_at_sale = unit_price_at_sale * ?, cogs = cogs * ?", (multiplier, multiplier))
    
    conn.commit()
    conn.close()
    print("Local database prices adjusted successfully.")

if __name__ == "__main__":
    adjust_local_prices()
