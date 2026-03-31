"""
🌱 SMART PE — SEED MASIVO v2 (COLUMN NAMES VERIFIED)
Inserta ~2 meses de datos realistas.
"""
from sqlalchemy import text
from app.core.database import SessionLocal
from datetime import datetime, timedelta
import random

db = SessionLocal()
print("🌱 Seed masivo v2...")

# =========================================
# 1. PROVEEDORES
# =========================================
print("  📦 Proveedores...")
suppliers_data = [
    ("Importaciones Tech SAC", "20512345678", "contacto@importech.pe", "Lima, Los Olivos", "Carlos Mendoza", "999888777"),
    ("DistribuPeru EIRL", "20601234569", "ventas@distribuperu.pe", "Lima, Santa Anita", "Luisa Fernandez", "998877665"),
    ("Samsung Peru Oficial", "20453216789", "b2b@samsung.pe", "San Isidro", "Roberto Kim", "997766554"),
    ("Xiaomi Distributors", "20678901239", "wholesale@xiaomi-dist.pe", "Callao", "Zhang Wei", "996655443"),
    ("Apple Premium Reseller", "20567890128", "orders@apple-reseller.pe", "Miraflores", "Andrea Vargas", "995544332"),
]
sup_ids = []
for name, ruc, email, addr, contact, phone in suppliers_data:
    existing = db.execute(text("SELECT supplier_id FROM suppliers WHERE ruc = :ruc"), {"ruc": ruc}).fetchone()
    if existing:
        sup_ids.append(existing[0])
    else:
        db.execute(text("""INSERT INTO suppliers (name, ruc, email, address, contact_name, phone, is_active) 
                          VALUES (:n, :r, :e, :a, :c, :p, true)"""),
                   {"n": name, "r": ruc, "e": email, "a": addr, "c": contact, "p": phone})
        db.flush()
        sup_ids.append(db.execute(text("SELECT supplier_id FROM suppliers WHERE ruc = :ruc"), {"ruc": ruc}).fetchone()[0])
print(f"    ✅ {len(sup_ids)} proveedores")

# =========================================
# 2. CLIENTES (40)
# =========================================
print("  👥 Clientes...")
clients_raw = [
    ("María","García López","DNI","74512300"),("Juan","Pérez Rodriguez","DNI","41236500"),
    ("Rosa","Huamán Torres","DNI","45678100"),("Carlos","Quispe Mamani","DNI","32165400"),
    ("Ana","Flores Díaz","DNI","56789000"),("Pedro","Ramos Soto","DNI","23456700"),
    ("Luz","Mendoza Chávez","DNI","67890100"),("Miguel","Torres Vargas","DNI","34567800"),
    ("Carmen","Castillo Rivera","DNI","78901200"),("Jorge","Rojas Paredes","DNI","45612300"),
    ("Patricia","Díaz Cornejo","DNI","89012300"),("Luis","Vargas Espinoza","DNI","56123400"),
    ("Sandra","Gonzales Ruiz","DNI","90123400"),("David","Castro Medina","DNI","67234500"),
    ("Diana","Herrera Salazar","DNI","12345600"),("Raúl","Morales Delgado","DNI","78345600"),
    ("Sofía","Peña Alvarado","DNI","23456000"),("Fernando","Gutiérrez Lara","DNI","89456100"),
    ("Claudia","Jiménez Ortiz","DNI","34567000"),("Andrés","Silva Campos","DNI","90567100"),
    ("TechSol SAC","","RUC","20456789012"),("Corporación Norte SAC","","RUC","20567890128"),
    ("Municipalidad SJL","","RUC","20678901230"),("StartUp Innovatech","","RUC","20789012340"),
    ("Estela","Paredes Vega","DNI","45678900"),("Tomás","Alarcón Cruz","DNI","56789020"),
    ("Verónica","Mejía Choque","DNI","67890130"),("Roberto","Paz Montalvo","DNI","78901240"),
    ("Gabriela","López Aliaga","DNI","89012350"),("Héctor","Núñez Barrios","DNI","90123460"),
    ("Natalia","Vega Saavedra","DNI","12346570"),("Óscar","Ramírez Tello","DNI","23457680"),
    ("Isabella","Córdova Peña","DNI","34568790"),("Martín","Huanca Rojas","DNI","45679800"),
    ("Alejandra","Tapia Solís","DNI","56780910"),("Ricardo","Cáceres Luna","DNI","67891020"),
    ("Valentina","Ochoa Prado","DNI","78902130"),("Sebastián","Miranda Ávila","DNI","89013240"),
    ("Camila","Rosas Figueroa","DNI","90124350"),("Diego","Palomino Ríos","DNI","12435670"),
]
client_ids = []
for fn, ln, dt, dn in clients_raw:
    ex = db.execute(text("SELECT client_id FROM clients WHERE document_number = :d"), {"d": dn}).fetchone()
    if ex:
        client_ids.append(ex[0])
    else:
        db.execute(text("""INSERT INTO clients (document_type, document_number, first_name, last_name, current_points, is_active)
                          VALUES (:dt, :dn, :fn, :ln, :pts, true)"""),
                   {"dt": dt, "dn": dn, "fn": fn, "ln": ln, "pts": random.randint(0, 150)})
        db.flush()
        client_ids.append(db.execute(text("SELECT client_id FROM clients WHERE document_number = :d"), {"d": dn}).fetchone()[0])
db.commit()
print(f"    ✅ {len(client_ids)} clientes")

# =========================================
# 3. GET CONTEXT
# =========================================
products = db.execute(text("SELECT product_id, base_price, name, is_serializable FROM products")).fetchall()
stores = db.execute(text("SELECT store_id FROM stores")).fetchall()
store_ids = [s[0] for s in stores]
user_map = {}
for sid in store_ids:
    u = db.execute(text("SELECT user_id FROM users WHERE store_id = :s AND is_active = true"), {"s": sid}).fetchall()
    user_map[sid] = [x[0] for x in u] if u else [4]
print(f"    ℹ️  Productos: {len(products)}, Tiendas: {len(store_ids)}")

# =========================================
# 4. INVENTARIO
# =========================================
print("  📊 Stock...")
for p in products:
    pid = p[0]
    for sid in store_ids:
        ex = db.execute(text("SELECT inventory_id, quantity FROM inventory WHERE product_id=:p AND store_id=:s"), {"p": pid, "s": sid}).fetchone()
        if ex:
            if ex[1] < 50:
                db.execute(text("UPDATE inventory SET quantity=:q WHERE inventory_id=:i"), {"q": random.randint(80,200), "i": ex[0]})
        else:
            db.execute(text("INSERT INTO inventory (product_id, store_id, quantity) VALUES (:p,:s,:q)"),
                       {"p": pid, "s": sid, "q": random.randint(80,250)})
db.commit()
print("    ✅ Stock OK")

# =========================================
# 5. VENTAS (~250 en 60 días)
# =========================================
print("  💰 Ventas...")
methods = ["Efectivo", "Yape", "Plin", "Tarjeta"]
inv_counter = db.execute(text("SELECT COALESCE(MAX(sale_id),0) FROM sales")).scalar() + 1
total_sales = 0

for day in range(60, 0, -1):
    date = datetime.now() - timedelta(days=day)
    wd = date.weekday()
    n = random.randint(2,6) if wd < 5 else random.randint(4,8)
    
    for _ in range(n):
        sid = random.choice(store_ids)
        uid = random.choice(user_map.get(sid, [4]))
        num_items = random.choices([1,2,3], weights=[55,30,15])[0]
        sel = random.sample(products, min(num_items, len(products)))
        cid = random.choice(client_ids) if random.random() < 0.6 else None
        
        total = 0; items = []
        for sp in sel:
            pid, price, pname, _ = sp
            qty = random.randint(1,3)
            up = float(price)
            sub = round(up*qty, 2)
            total += sub
            items.append((pid, qty, up, sub))
        
        disc = round(total * random.uniform(0.05,0.15), 2) if random.random() < 0.15 else 0
        net = round(total - disc, 2)
        method = random.choice(methods)
        h = random.randint(9,20)
        m = random.randint(0,59)
        dt = date.replace(hour=h, minute=m, second=random.randint(0,59))
        
        inv_type = "BOLETA"
        if cid:
            cdoc = db.execute(text("SELECT document_type FROM clients WHERE client_id=:c"), {"c": cid}).fetchone()
            if cdoc and cdoc[0] == "RUC": inv_type = "FACTURA"
        
        inv_s = "B001" if inv_type == "BOLETA" else "F001"
        inv_n = f"{inv_counter:08d}"
        pts = int(net/10) if cid else 0
        
        db.execute(text("""INSERT INTO sales (store_id, user_id, client_id, total_amount, discount_amount, net_amount,
                           date_created, invoice_type, invoice_series, invoice_number, sunat_status, points_earned, points_used)
                          VALUES (:sid,:uid,:cid,:tot,:disc,:net,:dt,:it,:is_,:in_,'ACEPTADO',:pe,0)"""),
                   {"sid":sid,"uid":uid,"cid":cid,"tot":total,"disc":disc,"net":net,"dt":dt,
                    "it":inv_type,"is_":inv_s,"in_":inv_n,"pe":pts})
        db.flush()
        sale_id = db.execute(text("SELECT MAX(sale_id) FROM sales")).scalar()
        
        for pid, qty, up, sub in items:
            db.execute(text("INSERT INTO sale_details (sale_id,product_id,quantity,unit_price,subtotal) VALUES (:s,:p,:q,:u,:sub)"),
                       {"s":sale_id,"p":pid,"q":qty,"u":up,"sub":sub})
        
        db.execute(text("INSERT INTO sale_payments (sale_id,method,amount,created_at) VALUES (:s,:m,:a,:dt)"),
                   {"s":sale_id,"m":method,"a":net,"dt":dt})
        
        if cid and pts > 0:
            db.execute(text("UPDATE clients SET current_points=current_points+:p WHERE client_id=:c"), {"p":pts,"c":cid})
        
        inv_counter += 1; total_sales += 1

db.commit()
print(f"    ✅ {total_sales} ventas")

# =========================================
# 6. CAJA (60 días)
# =========================================
print("  🏧 Cajas...")
cc = 0
for day in range(60, 0, -1):
    date = datetime.now() - timedelta(days=day)
    for sid in store_ids[:2]:
        uid = user_map.get(sid, [4])[0]
        st = date.replace(hour=9, minute=0, second=0)
        et = date.replace(hour=21, minute=0, second=0)
        sa = round(random.uniform(150,300),2)
        daily = round(random.uniform(800,4500),2)
        exp = round(sa+daily,2)
        act = round(exp+random.uniform(-50,30),2)
        diff = round(act-exp,2)
        
        db.execute(text("""INSERT INTO cash_registers (store_id,user_id,start_time,end_time,start_amount,
                           status,expected_cash,final_amount_real,difference,final_amount_system,notes)
                          VALUES (:sid,:uid,:st,:et,:sa,'CLOSED',:exp,:act,:diff,:exp,:n)"""),
                   {"sid":sid,"uid":uid,"st":st,"et":et,"sa":sa,"exp":exp,"act":act,"diff":diff,
                    "n":f"Cierre {date.strftime('%d/%m/%Y')}"})
        cc += 1
db.commit()
print(f"    ✅ {cc} registros de caja")

# =========================================
# 7. KARDEX (inventory_movements: type, date, no reference_id)
# =========================================
print("  📋 Kardex...")
kc = 0
for i in range(30):
    day = random.randint(1,60)
    prod = random.choice(products)
    pid = prod[0]; sid = random.choice(store_ids)
    qty = random.randint(5,30)
    dt = datetime.now() - timedelta(days=day)
    mtype = random.choice(["IN","IN","IN","OUT"])
    reason = random.choice(["COMPRA","DEVOLUCION","AJUSTE"]) if mtype=="IN" else random.choice(["VENTA","TRANSFERENCIA","DAÑO"])
    
    db.execute(text("""INSERT INTO inventory_movements (product_id, store_id, type, quantity, reason, user_id, date)
                      VALUES (:p,:s,:t,:q,:r,:u,:d)"""),
               {"p":pid,"s":sid,"t":mtype,"q":qty,"r":reason,"u":4,"d":dt})
    kc += 1
db.commit()
print(f"    ✅ {kc} movimientos")

# =========================================
# 8. ORDENES DE COMPRA (purchase_orders: po_id, date_created)
# =========================================
print("  📄 OCs...")
for i in range(10):
    day = random.randint(5,55)
    dt = datetime.now() - timedelta(days=day)
    sup = random.choice(sup_ids)
    prod = random.choice(products)
    pid, price = prod[0], float(prod[1])
    qty = random.randint(10,50)
    cost = round(price*0.6,2)
    total_oc = round(qty*cost,2)
    status = random.choice(["PENDIENTE","APROBADA","RECIBIDA","RECIBIDA","RECIBIDA"])
    
    db.execute(text("""INSERT INTO purchase_orders (supplier_id, user_id, status, total_amount, notes, date_created)
                      VALUES (:sup, 4, :st, :tot, :n, :dt)"""),
               {"sup":sup,"st":status,"tot":total_oc,"n":f"Reposición #{i+1}","dt":dt})
    db.flush()
    po_id = db.execute(text("SELECT MAX(po_id) FROM purchase_orders")).scalar()
    
    db.execute(text("""INSERT INTO purchase_order_details (po_id, product_id, quantity, unit_cost, subtotal)
                      VALUES (:o,:p,:q,:c,:sub)"""),
               {"o":po_id,"p":pid,"q":qty,"c":cost,"sub":total_oc})
db.commit()
print("    ✅ 10 OCs")

# =========================================
# 9. TRANSFERENCIAS
# =========================================
print("  🚛 Transferencias...")
if len(store_ids) >= 2:
    for i in range(8):
        day = random.randint(3,50)
        dt = datetime.now() - timedelta(days=day)
        src, dst = store_ids[0], store_ids[1]
        if random.random() < 0.3 and len(store_ids) > 2: dst = store_ids[2]
        prod = random.choice(products)
        qty = random.randint(3,15)
        status = random.choice(["PENDING","DISPATCHED","RECEIVED","RECEIVED"])
        
        db.execute(text("""INSERT INTO transfers (source_store_id,target_store_id,status,user_request_id,date_requested)
                          VALUES (:src,:dst,:st,4,:dt)"""),
                   {"src":src,"dst":dst,"st":status,"dt":dt})
        db.flush()
        tid = db.execute(text("SELECT MAX(transfer_id) FROM transfers")).scalar()
        
        db.execute(text("INSERT INTO transfer_details (transfer_id,product_id,quantity) VALUES (:t,:p,:q)"),
                   {"t":tid,"p":prod[0],"q":qty})
    db.commit()
    print("    ✅ 8 transferencias")

# =========================================
# 10. AUDITORÍAS (inventory_audits)
# =========================================
print("  📝 Auditorías...")
for i in range(4):
    day = random.randint(10,55)
    dt = datetime.now() - timedelta(days=day)
    sid = store_ids[0] if i < 2 else (store_ids[1] if len(store_ids) > 1 else store_ids[0])
    
    db.execute(text("""INSERT INTO inventory_audits (store_id, user_id, status, start_date, end_date, notes)
                      VALUES (:s, 4, 'completed', :st, :et, :n)"""),
               {"s":sid,"st":dt,"et":dt+timedelta(hours=2),"n":f"Auditoría mensual #{i+1}"})
    db.flush()
    aid = db.execute(text("SELECT MAX(audit_id) FROM inventory_audits")).scalar()
    
    for prod in random.sample(products, min(5, len(products))):
        inv = db.execute(text("SELECT quantity FROM inventory WHERE product_id=:p AND store_id=:s"),
                         {"p":prod[0],"s":sid}).fetchone()
        sys_q = inv[0] if inv else random.randint(10,50)
        cnt = sys_q + random.randint(-3,2)
        db.execute(text("""INSERT INTO audit_items (audit_id,product_id,expected_quantity,counted_quantity)
                          VALUES (:a,:p,:sq,:cq)"""),
                   {"a":aid,"p":prod[0],"sq":sys_q,"cq":cnt})
db.commit()
print("    ✅ 4 auditorías")

# =========================================
# 11. RMAs
# =========================================
print("  🔧 RMAs...")
recent = db.execute(text("SELECT sale_id FROM sales ORDER BY sale_id DESC LIMIT 50")).fetchall()
reasons_rma = ["Pantalla rayada","No enciende","Batería defectuosa","Botón no funciona","Pixel muerto","No carga"]
for i in range(6):
    if recent:
        sale = random.choice(recent)[0]
        prod = random.choice(products)[0]
        st = random.choice(["PENDING","IN_REPAIR","REPLACED","REFUNDED","REJECTED"])
        dt = datetime.now() - timedelta(days=random.randint(1,30))
        db.execute(text("""INSERT INTO rma_tickets (sale_id,product_id,store_id,user_id,issue_description,status,created_at)
                          VALUES (:s,:p,1,4,:desc,:st,:dt)"""),
                   {"s":sale,"p":prod,"desc":random.choice(reasons_rma),"st":st,"dt":dt})
db.commit()
print("    ✅ 6 RMAs")

# =========================================
# 12. FIDELIZACIÓN
# =========================================
print("  ⭐ Fidelización...")
lc = 0
for cid in client_ids[:20]:
    for _ in range(random.randint(1,5)):
        dt = datetime.now() - timedelta(days=random.randint(1,60))
        pts = random.randint(5,50)
        tp = random.choice(["SALE","SALE","SALE","BONUS"])
        r = "Compra en tienda" if tp=="SALE" else "Bonus referido"
        db.execute(text("INSERT INTO loyalty_transactions (client_id,points,type,reason,created_at) VALUES (:c,:p,:t,:r,:d)"),
                   {"c":cid,"p":pts,"t":tp,"r":r,"d":dt})
        lc += 1
db.commit()
print(f"    ✅ {lc} transacciones")

# =========================================
# 13. PROMOCIONES
# =========================================
print("  🎟️ Promociones...")
promos = [
    ("Día de la Madre 2026","MAMA2026","PERCENTAGE",15.0,100.0),
    ("Cyber Monday","CYBER26","PERCENTAGE",20.0,200.0),
    ("Descuento Empleado","STAFF10","PERCENTAGE",10.0,0.0),
    ("S/50 Off +S/500","AHORRA50","FIXED",50.0,500.0),
]
for name, code, dtype, val, minp in promos:
    ex = db.execute(text("SELECT promotion_id FROM promotions WHERE code=:c"), {"c":code}).fetchone()
    if not ex:
        db.execute(text("""INSERT INTO promotions (name,code,discount_type,value,min_purchase,is_active,
                           valid_from,valid_until)
                          VALUES (:n,:c,:dt,:v,:mp,true,'2026-01-01','2026-12-31')"""),
                   {"n":name,"c":code,"dt":dtype,"v":val,"mp":minp})
db.commit()
print("    ✅ Promos")

# =========================================
# 14. NOTAS DE CRÉDITO (anulaciones)
# =========================================
print("  🚫 Notas de crédito...")
anuladas = db.execute(text("SELECT sale_id, total_amount, net_amount, store_id, user_id FROM sales WHERE sunat_status='ACEPTADO' ORDER BY RANDOM() LIMIT 8")).fetchall()
for sale in anuladas:
    sid, tot, net, store, uid = sale
    dt = datetime.now() - timedelta(days=random.randint(1,30))
    reasons_nc = ["Producto defectuoso","Error de precio","Cambio de opinión","Duplicado","Devolución"]
    db.execute(text("""INSERT INTO sales (store_id,user_id,total_amount,discount_amount,net_amount,date_created,
                       invoice_type,invoice_series,invoice_number,sunat_status,related_sale_id,credit_note_reason,points_earned,points_used)
                      VALUES (:store,:uid,:tot,0,:net,:dt,'NC','BC01',:inv,'ACEPTADO',:sid,:r,0,0)"""),
               {"store":store,"uid":uid,"tot":float(tot)*-1,"net":float(net or tot)*-1,"dt":dt,
                "inv":f"NC{sid:08d}","sid":sid,"r":random.choice(reasons_nc)})
db.commit()
print("    ✅ 8 NCs")

# =========================================
print("\n" + "=" * 60)
print("🎉 SEED COMPLETADO EXITOSAMENTE")
print("=" * 60)
print(f"  📦 Proveedores:     {len(sup_ids)}")
print(f"  👥 Clientes:        {len(client_ids)}")
print(f"  💰 Ventas:          ~{total_sales}")
print(f"  🏧 Registros caja:  {cc}")
print(f"  📋 Mov. Kardex:     {kc}")
print(f"  📄 OCs:             10")
print(f"  🚛 Transferencias:  8")
print(f"  📝 Auditorías:      4")
print(f"  🔧 RMAs:            6")
print(f"  ⭐ Fidelización:    {lc}")
print(f"  🎟️ Promos:          {len(promos)}")
print(f"  🚫 Notas crédito:   8")
print("=" * 60)
db.close()
