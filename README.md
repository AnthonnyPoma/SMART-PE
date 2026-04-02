# SMART PE — Sistema de Gestión Empresarial (ERP) para Retail Tecnológico

## Descripción General
**SMART PE** es una solución integral diseñada para optimizar la operación de negocios en el sector de tecnología. La plataforma permite centralizar la gestión de múltiples sucursales, automatizar el control de inventarios críticos (como celulares por IMEI) y cumplir con la normativa fiscal peruana mediante facturación electrónica integrada.

---

## Módulos Funcionales (Visión Técnica y de Negocio)

### 1. Gestión de Inventarios y Logística Avanzada
- **Control por Series e IMEI**: Sistema de trazabilidad total para productos seriados. Implementa un **Kardex automatizado** que registra cada movimiento, garantizando la integridad del stock.
- **Logística Multi-Sede**: Administración aislada de sucursales con soporte para **transferencias inter-tienda**, asegurando que la mercadería viaje de forma registrada y segura.
- **Abastecimiento**: Ciclo de compras profesional con generación de órdenes de compra en PDF y seguimiento de proveedores.

### 2. Punto de Venta (POS) y Facturación Electrónica
- **Interfaz POS de Alto Rendimiento**: Procesamiento de ventas en tiempo real compatible con múltiples métodos de pago (Efectivo, Tarjetas, QR).
- **Integración con NubeFact (SUNAT)**: Emisión automática de boletas y facturas electrónicas. El sistema gestiona estados de envío y almacenamiento de XML/PDF para cumplimiento tributario.
- **Control Seguro de Transacciones**: Implementación de validaciones lógicas para evitar discrepancias entre lo cobrado y el stock de almacén.

### 3. CRM y Fidelización de Clientes
- **Registro Inteligente de Clientes**: CRM con validación de **DNI/RUC** para asegurar datos correctos en los comprobantes.
- **Programa de Lealtad**: Sistema configurable de acumulación y canje de puntos para incentivar la recurrencia de compra.
- **Motor de Promociones**: Validación dinámica de cupones y ofertas especiales directamente en el carrito de compras.

### 4. Business Intelligence y Control Operativo
- **Dashboard Ejecutivo**: Visualización en tiempo real de indicadores clave (**KPIs**), alertas de rotación de stock y cálculo de comisiones.
- **Auditoría Ciega**: Herramientas para la verificación de inventarios físicos con reportes comparativos automáticos.
- **Reportes Financieros**: Generación de archivos PDF para cierres de caja, flujos de efectivo y estados de ventas.

---

## Arquitectura y Stack Tecnológico

El sistema ha sido desarrollado bajo estándares modernos con un enfoque en escalabilidad y rendimiento:

- **Backend**: **FastAPI** (Python 3.10+) con operaciones asíncronas para una respuesta de servidor de baja latencia.
- **Frontend**: **React 18+** y **Material UI 5**, proporcionando una interfaz de usuario limpia, responsiva y profesional.
- **Base de Datos**: **PostgreSQL** con el ORM **SQLAlchemy**, asegurando la integridad referencial y seguridad de los datos.
- **Infraestructura**: Despliegue distribuido en **Vercel** (Frontend) y **Railway** (Backend/Database) para alta disponibilidad.

---
© 2024 SMART PE. Todos los derechos reservados.
