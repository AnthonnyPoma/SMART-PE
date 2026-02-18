-- Script para insertar tiendas de ejemplo en la base de datos
-- Ejecutar este script en pgAdmin o usando psql

INSERT INTO stores (store_id, name, address, city, status, phone, ruc) 
VALUES 
    (1, 'Tienda Principal', 'Av. La Tecnología 123', 'Lima', true, '(01) 444-5555', '20601234567'),
    (2, 'Sucursal Norte', 'Av. Túpac Amaru 456', 'Lima', true, '(01) 555-6666', '20601234568'),
    (3, 'Almacén Central', 'Jr. Industrial 789', 'Lima', true, '(01) 666-7777', '20601234569')
ON CONFLICT (store_id) DO NOTHING;

-- Resetear la secuencia para futuros inserts
SELECT setval('stores_store_id_seq', (SELECT MAX(store_id) FROM stores));
