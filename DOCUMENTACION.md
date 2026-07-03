# DOCUMENTACIÓN DE ARQUITECTURA Y DISEÑO DE SISTEMA - BARBERÍA PRO
**Autor:** Senior Software Architect & Tech Lead
**Versión:** 1.0.0
**Fecha:** Julio 2026

Este documento detalla el diseño de software para **Barbería Pro**, una plataforma empresarial SaaS Multi-Tenant y omnicanal para la administración integral de barberías modernas.

---

## 1. ARQUITECTURA GENERAL
El sistema se diseña bajo los principios de **Clean Architecture** (Arquitectura Limpia) y el **Patrón de Repositorio** para garantizar un desacoplamiento estricto entre las reglas de negocio, la lógica de presentación y el mecanismo de persistencia.

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│      React (Vite) + Tailwind CSS + Framer Motion (UI)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     APPLICATION LAYER                       │
│        Services, DTOs, Use Cases, State Management          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        DOMAIN LAYER                         │
│               Core Entities & Repository Interfaces         │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                    INFRASTRUCTURE LAYER                     │
│    MockRelationalDB (LocalStorage) / Supabase REST Client    │
└─────────────────────────────────────────────────────────────┘
```

### Capas del Sistema:
1. **Dominio (Domain):** Define las entidades del negocio (e.g., `Client`, `Appointment`, `Service`) y los contratos/interfaces de repositorio. No tiene dependencias de ningún framework ni base de datos.
2. **Aplicación (Application):** Contiene las reglas del negocio específicas de la aplicación, servicios (e.g., calculador de comisiones, motor de disponibilidad real) y transformadores DTO.
3. **Infraestructura (Infrastructure):** Implementación de los repositorios y servicios externos (e.g., persistencia en base de datos PostgreSQL, llamadas al API de Gemini, logs).
4. **Presentación (Presentation):** Componentes visuales interactivos de React estructurados de manera modular, con vistas diferenciadas para clientes y personal administrativo.

---

## 2. FLUJO DE USUARIOS (USER FLOWS)

### A. Flujo de Reserva del Cliente (Registrado o Walk-In)
1. **Selección de Sucursal y Servicio:** El cliente elige la ubicación y el servicio.
2. **Asignación de Barbero:** El cliente elige un barbero específico o selecciona "Cualquiera" (asigna por disponibilidad).
3. **Consulta de Agenda en Tiempo Real:** El sistema filtra la disponibilidad real del barbero, excluyendo descansos, bloqueos de agenda u otros servicios reservados.
4. **Registro de Datos:**
   - Si está autenticado, sus datos se cargan automáticamente.
   - Si no tiene cuenta, ingresa: *Nombre*, *Email* y *Teléfono*. El sistema valida si ya existe un perfil asociado a ese correo/teléfono para evitar duplicados.
5. **Confirmación y Ticket:** Se crea la reserva, se actualiza el calendario administrativo en tiempo real, y se genera un ticket digital.

### B. Flujo Administrativo (Personal / Dashboard)
1. **Punto de Venta (POS):** El recepcionista registra ventas rápidas, asocia servicios completados o productos comprados, procesa pagos mixtos (e.g., efectivo + tarjeta) y calcula propinas.
2. **Control de Caja (Arqueo):** Apertura obligatoria de caja para registrar movimientos. Al final del día, se efectúa un cierre comparando el saldo esperado con el real.
3. **Agenda y Arrastre (Drag & Drop):** El administrador visualiza las citas en un calendario y puede moverlas para reagendar automáticamente.

---

## 3. DIAGRAMA DE MÓDULOS

```
                     ┌──────────────────┐
                     │   Barbería Pro   │
                     └────────┬─────────┘
      ┌───────────────────────┼────────────────────────┐
┌─────▼──────┐         ┌──────▼───────┐         ┌──────▼──────┐
│    CORE    │         │ OPERACIONES  │         │ FINANCIERO  │
├────────────┤         ├──────────────┤         ├─────────────┤
│ - Auth     │         │ - Agenda     │         │ - Ventas    │
│ - Usuarios │         │ - Reservas   │         │ - Compras   │
│ - Clientes │         │ - Walk-Ins   │         │ - Caja      │
│ - Sucursal │         │ - Inventario │         │ - Reportes  │
└────────────┘         └──────────────┘         └─────────────┘
```

---

## 4. MODELO ENTIDAD-RELACIÓN (MER)

Las relaciones clave para soportar múltiples sucursales (Multi-Tenant) y la consistencia transaccional son:

```
  ┌───────────────┐          ┌───────────────┐          ┌─────────────────┐
  │    Tenants    │◄─────────│   Branches    │◄─────────│   Appointments  │
  │ (SaaS Client) │          │  (Sucursales) │          │     (Citas)     │
  └───────────────┘          └───────────────┘          └────────┬────────┘
                                     ▲                           │ (FK Client,
                                     │ (FK Branch)               │  FK Employee,
  ┌───────────────┐          ┌───────┴───────┐                   │  FK Service)
  │     Users     │◄─────────│   Employees   │◄──────────────────┘
  │ (Auth & Roles)│          │ (Barbers/Staff│
  └───────────────┘          └───────────────┘
```

### Tablas Principales:
- `tenants`: Organización principal del SaaS.
- `branches`: Sucursales físicas de la barbería.
- `users` y `employees`: Roles, salarios, comisiones y especialidades.
- `services`: Catálogo de servicios con precios, tiempos de ejecución y limpieza.
- `clients`: Clientes (con o sin cuenta de usuario).
- `appointments`: Reservas que ligan cliente, barbero, servicio, fecha y estado.
- `queue_items`: Lista de espera en tiempo real para clientes sin cita previa (Walk-Ins).
- `products` y `inventory_transactions`: Control detallado de stock e historial de movimientos.
- `providers` y `purchases`: Gestión de abastecimiento de insumos.
- `sales` y `sale_items`: Facturación rápida y registro de comisiones devengadas por barberos.
- `cash_sessions` y `cash_movements`: Control contable de la caja física diario.

---

## 5. DISEÑO DE LA BASE DE DATOS (POSTGRESQL / SUPABASE)
En el archivo `/src/db/schema.sql` se implementará el script SQL completo de creación con:
- Constraints de integridad referencial.
- Índices de rendimiento en `appointments (employee_id, start_time)` y `products (sku)`.
- Políticas de seguridad a nivel de fila (**RLS - Row Level Security**) para aislar la información entre sucursales.
- Triggers para actualizar automáticamente el stock al registrar una venta de productos.

---

## 6. ESTRUCTURA COMPLETA DE CARPETAS

```
/
├── .env.example
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── DOCUMENTACION.md
├── server.ts                 # Servidor Express Full-Stack (Proxy seguro de Gemini AI)
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx
    ├── types/
    │   └── index.ts          # Definición estricta de interfaces y dominios TS
    ├── db/
    │   ├── schema.sql        # Script SQL para producción (Supabase / Postgres)
    │   └── mockDb.ts         # Motor relacional cliente/servidor para la demo en tiempo real
    ├── repositories/
    │   ├── AppointmentRepository.ts
    │   ├── ClientRepository.ts
    │   ├── InventoryRepository.ts
    │   └── SalesRepository.ts
    ├── services/
    │   ├── scheduleEngine.ts # Reglas de negocio para disponibilidad inteligente
    │   └── geminiService.ts  # Generador de reportes inteligentes y predicciones con IA
    ├── components/
    │   ├── ui/               # Componentes atómicos (Botones, Modales, Inputs)
    │   ├── shared/           # Sidebar, Navbar, DarkMode, Layout principal
    │   ├── client/           # Módulo de reservas y perfil para clientes
    │   └── admin/            # Módulo de administración
    │       ├── Dashboard.tsx # Métricas de negocio en tiempo real (KPIs y Gráficos)
    │       ├── CalendarView.tsx # Agenda interactiva con soporte interactivo
    │       ├── QueueList.tsx # Clientes sin cita (Walk-In / Lista de espera)
    │       ├── ServicesAdmin.tsx # Catálogo de servicios
    │       ├── InventoryAdmin.tsx# Productos, proveedores y control de stock
    │       ├── SalesPOS.tsx   # Punto de venta (POS) y caja diaria
    │       └── StaffAdmin.tsx # Barberos, horarios y comisiones
    └── utils/
        └── helpers.ts        # Funciones de utilidad común (fechas, monedas)
```

---

## 7. CONVENCIONES DE NOMBRES Y CALIDAD
- **TypeScript:** Modo estricto habilitado. No se permite el tipo `any`. Todas las funciones deben estar tipadas.
- **Componentes:** Naming PascalCase (`CalendarView.tsx`).
- **Interfaces/Tipos:** Definidos de manera centralizada en `src/types/index.ts`.
- **Estilos:** Clases utilitarias de TailwindCSS agrupadas con el helper `cn()` de forma limpia.
- **SOLID & DRY:** Responsabilidad única para cada vista y componente. La lógica de persistencia se abstrae del componente visual mediante los repositorios.

---

## 8. ESTRATEGIA DE DESPLIEGUE, RESPALDOS Y ESCALABILIDAD
- **Despliegue Frontend/SaaS:** Vercel para una latencia de carga instantánea mediante SSR e ISR en páginas estáticas de promoción.
- **Despliegue Base de Datos:** Supabase, aprovechando PostgreSQL nativo y su motor de Realtime mediante WebSockets para sincronizar las pantallas del personal y los clientes.
- **Respaldo:** Snapshots diarios automáticos en Supabase con retención de 30 días, y exportación de archivos WAL (Write-Ahead Logging) para Point-in-Time Recovery (PITR).
- **Escalabilidad Multi-Tenant:** Cada tabla cuenta con una columna `tenant_id` vinculada a las políticas RLS. De esta forma, un usuario de una barbería jamás podrá visualizar los datos de otra, garantizando seguridad absoluta en una única base de datos lógica compartida (Shared Database, Shared Schema).
