"""Generates the comprehensive SMART PE documentation file"""
import os

# Read sources
with open('all_code.txt', 'r', encoding='utf-8') as f:
    all_code = f.read()
with open('app/main.py', 'r', encoding='utf-8') as f:
    main_py = f.read()
with open('requirements.txt', 'r', encoding='utf-8') as f:
    reqs = f.read()
with open('../frontend/package.json', 'r', encoding='utf-8') as f:
    pkg = f.read()
with open('../backend_tree_utf8.txt', 'r', encoding='utf-8') as f:
    btree = f.read()
with open('../frontend_tree_utf8.txt', 'r', encoding='utf-8') as f:
    ftree = f.read()

# Build the doc
doc = []

doc.append("=" * 80)
doc.append("               SMART PE - SISTEMA DE GESTION RETAIL")
doc.append("           Sistema ERP para tiendas de tecnologia")
doc.append("=" * 80)
doc.append("")
doc.append("Autor:        Anthonny Poma")
doc.append("Tecnologias:  Python (FastAPI) + React (Vite) + PostgreSQL")
doc.append("Lineas:       ~14,200 lineas de codigo (6,281 backend + 7,933 frontend)")
doc.append("Estado:       En produccion / Portafolio profesional")
doc.append("")

doc.append("=" * 80)
doc.append("DESCRIPCION DEL PROYECTO (PARA CV)")
doc.append("=" * 80)
doc.append("""
SMART PE es un sistema ERP (Enterprise Resource Planning) completo diseñado para
la gestion integral de tiendas de tecnologia con soporte multi-sucursal.

El proyecto fue desarrollado como solucion full-stack end-to-end, abarcando desde
la arquitectura de base de datos hasta la interfaz de usuario, implementando
patrones de diseño empresariales y flujos de negocio reales del sector retail
peruano.

MODULOS IMPLEMENTADOS (19 modulos):
  1.  Autenticacion JWT con roles (Admin/Cajero/Almacenero)
  2.  Dashboard con KPIs en tiempo real y graficos de ventas
  3.  Punto de Venta (POS) con multiples metodos de pago
  4.  Gestion de Catalogo (Productos serializados y no serializados)
  5.  Control de Inventario con Kardex automatizado
  6.  Ingreso de Mercaderia con trazabilidad por series
  7.  Gestion de Proveedores (CRUD completo)
  8.  Gestion de Clientes (CRM basico con consulta RENIEC/SUNAT)
  9.  Gestion Multi-Tienda con aislamiento de datos
  10. Cupones y Promociones (porcentaje/monto fijo con validacion)
  11. Facturacion Electronica simulada (XML SUNAT/Boleta/Factura/NC)
  12. Arqueo de Caja (Apertura/Cierre/Historial con diferencias)
  13. Fidelizacion de Clientes (Sistema de puntos + historial)
  14. Reportes Avanzados (5 tipos: ventas, productos, categorias, vendedores, pagos)
  15. Ordenes de Compra (con generacion PDF via ReportLab)
  16. Transferencias Inter-Tienda (Solicitar/Despachar/Recibir/Rechazar)
  17. RRHH y Comisiones (Metas mensuales + calculo automatico)
  18. Auditoria Ciega de Inventario (con exportacion PDF)
  19. Garantias y Devoluciones (RMA con flujo de estados)

LOGROS TECNICOS DESTACADOS:
  - Arquitectura REST con 60+ endpoints documentados (Swagger/OpenAPI)
  - Base de datos relacional con 27 tablas y relaciones complejas
  - Aislamiento multi-tienda: cada admin solo ve datos de su sucursal
  - Generacion de PDFs nativos (tickets, OCs, auditorias) con ReportLab
  - Integracion con APIs externas (RENIEC, SUNAT mock)
  - Sistema de facturacion electronica con XML firmado digitalmente
  - Dashboard con graficos dinamicos (Recharts) y metricas en tiempo real
  - UI profesional con Material UI, tema claro/oscuro, y responsive design
  - Simulacion automatizada de 55 tests funcionales con 100%% pass rate

STACK TECNOLOGICO:
  Backend:   Python 3.11 | FastAPI | SQLAlchemy ORM | PostgreSQL
  Frontend:  React 19 | Vite 7 | Material UI 7 | Recharts | Axios
  Auth:      JWT (JSON Web Tokens) con bcrypt
  PDF:       ReportLab
  XML:       lxml + signxml (facturacion electronica)
  Testing:   Pytest + Script de simulacion integral
""")

doc.append("=" * 80)
doc.append("ARCHIVO PRINCIPAL: main.py")
doc.append("=" * 80)
doc.append(main_py)

doc.append("=" * 80)
doc.append("DEPENDENCIAS BACKEND: requirements.txt")
doc.append("=" * 80)
doc.append(reqs)

doc.append("=" * 80)
doc.append("DEPENDENCIAS FRONTEND: package.json")
doc.append("=" * 80)
doc.append(pkg)

doc.append("=" * 80)
doc.append("ESTRUCTURA DE CARPETAS - BACKEND (app/)")
doc.append("=" * 80)
doc.append(btree)

doc.append("=" * 80)
doc.append("ESTRUCTURA DE CARPETAS - FRONTEND (src/)")
doc.append("=" * 80)
doc.append(ftree)

doc.append(all_code)

doc.append("")
doc.append("=" * 80)
doc.append("FIN DEL DOCUMENTO - SMART PE")
doc.append("=" * 80)

result = "\n".join(doc)
output_path = os.path.join('..', 'SMART_PE_DOCUMENTACION_COMPLETA.txt')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(result)

lines = result.count('\n') + 1
print(f"Archivo generado: {output_path}")
print(f"Total lineas: {lines}")
