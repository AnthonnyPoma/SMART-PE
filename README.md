# SMART PE — Sistema de Planificación de Recursos Empresariales (ERP) para Retail Tecnológico

## Descripción del Proyecto

SMART PE es un sistema ERP integral y modular diseñado específicamente para empresas del sector retail de tecnología. La plataforma permite la gestión avanzada de inventarios seriados (IMEI/Series), la orquestación de logística multi-sucursal y una integración profunda con estándares locales de facturación electrónica.

## Módulos Funcionales Clave

### Gestión de Inventarios y Logística
- **Control de Series e IMEI**: Sistema sofisticado de trazabilidad para productos seriados con integración automatizada de Kardex, permitiendo un seguimiento histórico exhaustivo.
- **Logística Multi-Sede**: Gestión de sucursales con aislamiento de datos y protocolos seguros de transferencia de mercadería inter-tienda.
- **Abastecimiento**: Ciclo completo de gestión de órdenes de compra, incluyendo generación automatizada de documentos en PDF y evaluación de proveedores.

### Operaciones de Punto de Venta (POS)
- **POS de Alto Rendimiento**: Interfaz de gestión en tiempo real con soporte para múltiples métodos de pago (Efectivo, Tarjetas, QR).
- **Facturación Electrónica**: Integración nativa con NubeFact (Cumplimiento SUNAT) para la emisión de comprobantes electrónicos, asegurando la precisión fiscal.
- **Integridad de Transacciones**: Implementación de estados atómicos para garantizar la consistencia de datos durante operaciones complejas de checkout.

### CRM y Ecosistema de Fidelización
- **Inteligencia de Clientes**: CRM centralizado con validación automatizada de documentos de identidad (DNI/RUC).
- **Estrategia de Retención**: Programa de fidelización por puntos con lógica de canje automatizada y configurable.
- **Motor de Promociones**: Sistema dinámico de cupones y ofertas con validación en tiempo real al nivel del carrito de compras.

### Inteligencia de Negocios y Control Operativo
- **Dashboard Ejecutivo**: Visualización en tiempo real de indicadores clave de desempeño (KPIs), alertas de stock y métricas de comisiones.
- **Protocolos de Auditoría Ciega**: Sistema estandarizado de verificación de inventarios con resultados vinculados y reportes detallados en PDF.
- **Reportes Avanzados**: Generación automatizada de estados financieros, registros de comisiones para RRHH e historiales de flujo de caja.

## Arquitectura Técnica

- **Backend**: Desarrollo en **FastAPI** (Python 3.10+) utilizando operaciones asíncronas para optimizar el rendimiento y la escalabilidad.
- **Frontend**: Interfaz construida en **React 18+** con **Material UI 5**, ofreciendo una experiencia de usuario estandarizada de nivel empresarial.
- **Arquitectura de Datos**: **PostgreSQL** con el ORM **SQLAlchemy**, garantizando la integridad referencial y la optimización de consultas complejas.
- **Infraestructura y DevOps**: Despliegue distribuido utilizando **Vercel** para la entrega del frontend, **Railway** para servicios de backend y **Supabase** para la persistencia robusta de datos.

## Innovación Técnica y Mejores Prácticas

- **Resiliencia de Integración**: Diseño de protocolos de comunicación adaptativos para manejar latencia y modos de fallo en APIs críticas de terceros (Facturación Electrónica).
- **Integridad Fiscal**: Capas estrictas de normalización y validación para documentación tributaria, asegurando el cumplimiento con las regulaciones locales.
- **Arquitectura Escalable**: Patrón de diseño modular que permite el escalamiento independiente del storefront de comercio electrónico y el dashboard de gestión interna.

---
© 2024 SMART PE. Todos los derechos reservados.
