/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- TIPOS Y CONSTANTES DE BASE DE DATOS (ESPAÑOL) ---
export type RolUsuario = 'admin' | 'recep' | 'barber' | 'client';
export type EstadoCita = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type EstadoTurno = 'waiting' | 'serving' | 'completed' | 'cancelled';
export type MetodoPago = 'cash' | 'card' | 'transfer' | 'mixed';
export type TipoTransaccion = 'in' | 'out' | 'adjustment' | 'sale' | 'purchase';
export type EstadoSesionCaja = 'open' | 'closed';
export type TipoMovimientoCaja = 'income' | 'expense';

// Mantenemos los alias en inglés para compatibilidad fluida con componentes UI
export type UserRole = RolUsuario;
export type AppointmentStatus = EstadoCita;
export type QueueStatus = EstadoTurno;
export type PaymentMethod = MetodoPago;
export type TransactionType = TipoTransaccion;
export type CashSessionStatus = EstadoSesionCaja;
export type CashMovementType = TipoMovimientoCaja;

// --- ENTIDADES DEL DOMINIO DE BASE DE DATOS (ESPAÑOL) ---

/** 0. Información General de la Empresa */
export interface InformacionEmpresa {
  id: string;
  name: string;
  slogan: string;
  nitRuc: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  receiptFooterMsg: string;
  currencySymbol: string;
  defaultCommission: number;
}
export type CompanyInfo = InformacionEmpresa;

/** 1. Tabla: EMPRESAS (Tenants) */
export interface Empresa {
  id: string;
  nombre?: string;
  subdominio?: string;
  urlLogo?: string;
  creadoEn?: string;
  
  // Mapeos de compatibilidad
  name?: string;
  subdomain?: string;
  logoUrl?: string;
  createdAt?: string;
}
export type Tenant = Empresa;

/** 2. Tabla: SUCURSALES (Branches) */
export interface Sucursal {
  id: string;
  empresaId?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  horarioAtencion?: {
    [key: string]: { open: string; close: string; active: boolean };
  };
  creadoEn?: string;

  // Compatibilidad
  tenantId?: string;
  name?: string;
  address?: string;
  phone?: string;
  openingHours?: {
    [key: string]: { open: string; close: string; active: boolean };
  };
  createdAt?: string;
}
export type Branch = Sucursal;

/** 3. Tabla: USUARIOS (Users) */
export interface Usuario {
  id: string;
  correo?: string;
  rol?: RolUsuario;
  nombreCompleto?: string;
  telefono?: string;
  urlAvatar?: string;
  creadoEn?: string;

  // Compatibilidad
  email?: string;
  role?: UserRole;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
}
export type User = Usuario;

/** 4. Tabla: EMPLEADOS (Employees / Barberos) */
export interface Empleado {
  id: string;
  sucursalId?: string;
  usuarioId?: string;
  nombreCompleto?: string;
  telefono?: string;
  correo?: string;
  rol?: 'admin' | 'recep' | 'barber';
  especialidades?: string[];
  porcentajeComision?: number;
  horarioTrabajo?: {
    [key: string]: { start: string; end: string; active: boolean; breaks: { start: string; end: string }[] };
  };
  vacaciones?: { start: string; end: string }[];
  activo?: boolean;
  creadoEn?: string;

  // Compatibilidad
  branchId?: string;
  userId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  role?: 'admin' | 'recep' | 'barber';
  specialties?: string[];
  commissionRate?: number;
  schedule?: {
    [key: string]: { start: string; end: string; active: boolean; breaks: { start: string; end: string }[] };
  };
  vacations?: { start: string; end: string }[];
  active?: boolean;
  createdAt?: string;
}
export type Employee = Empleado;

/** 5. Tabla: SERVICIOS (Services) */
export interface Servicio {
  id: string;
  empresaId?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  duracion?: number; // en minutos
  tiempoLimpieza?: number; // en minutos
  categoria?: string;
  color?: string;
  urlImagen?: string;
  activo?: boolean;
  creadoEn?: string;

  // Compatibilidad
  tenantId?: string;
  code?: string;
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  cleanupTime?: number;
  category?: string;
  imageUrl?: string;
  active?: boolean;
  createdAt?: string;
}
export type Service = Servicio;

/** 6. Tabla: CLIENTES (Clients) */
export interface Cliente {
  id: string;
  empresaId?: string;
  nombreCompleto?: string;
  telefono?: string;
  correo?: string;
  estaRegistrado?: boolean;
  creadoEn?: string;

  // Compatibilidad
  tenantId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  isRegistered?: boolean;
  createdAt?: string;
}
export type Client = Cliente;

/** 7. Tabla: CITAS (Appointments) */
export interface Cita {
  id: string;
  sucursalId?: string;
  clienteId?: string;
  empleadoId?: string;
  servicioId?: string;
  fecha?: string; // YYYY-MM-DD
  horaInicio?: string; // HH:MM
  horaFin?: string; // HH:MM
  estado?: EstadoCita;
  precio?: number;
  notas?: string;
  esSinCita?: boolean;
  creadoEn?: string;

  // Compatibilidad
  branchId?: string;
  clientId?: string;
  employeeId?: string;
  serviceId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  price?: number;
  notes?: string;
  isWalkIn?: boolean;
  createdAt?: string;
}
export type Appointment = Cita;

/** 8. Tabla: TURNOS_ESPERA (QueueItems) */
export interface TurnoEspera {
  id: string;
  sucursalId?: string;
  nombreCompleto?: string;
  telefono?: string;
  correo?: string;
  empleadoId?: string;
  servicioId?: string;
  estado?: EstadoTurno;
  fechaLlegada?: string;
  fechaAtencion?: string;
  tiempoEsperaEstimado?: number;
  prioridad?: 'normal' | 'high';

  // Compatibilidad
  branchId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  employeeId?: string;
  employeeIdVal?: string;
  serviceId?: string;
  serviceIdVal?: string;
  status?: QueueStatus;
  joinedAt?: string;
  servedAt?: string;
  estimatedWaitTime?: number;
  priority?: 'normal' | 'high';
}
export type QueueItem = TurnoEspera;

/** 9. Tabla: PROVEEDORES (Providers) */
export interface Proveedor {
  id: string;
  empresaId?: string;
  nombre?: string;
  nombreContacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  creadoEn?: string;

  // Compatibilidad
  tenantId?: string;
  name?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt?: string;
}
export type Provider = Proveedor;

/** 10. Tabla: PRODUCTOS (Products) */
export interface Producto {
  id: string;
  sucursalId?: string;
  nombre?: string;
  sku?: string;
  descripcion?: string;
  precio?: number;
  costo?: number;
  existencia?: number;
  existenciaMinima?: number;
  categoria?: string;
  proveedorId?: string;
  activo?: boolean;
  creadoEn?: string;

  // Compatibilidad
  branchId?: string;
  name?: string;
  description?: string;
  price?: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  category?: string;
  providerId?: string;
  active?: boolean;
  createdAt?: string;
}
export type Product = Producto;

/** 11. Tabla: MOVIMIENTOS_INVENTARIO (InventoryTransactions) */
export interface MovimientoInventario {
  id: string;
  sucursalId?: string;
  productoId?: string;
  tipo?: TipoTransaccion;
  cantidad?: number;
  motivo?: string;
  fecha?: string;
  empleadoId?: string;

  // Compatibilidad
  branchId?: string;
  productId?: string;
  type?: TransactionType;
  quantity?: number;
  reason?: string;
  date?: string;
  employeeId?: string;
  employeeIdVal?: string;
}
export type InventoryTransaction = MovimientoInventario;

/** 12. Tabla: COMPRAS (Purchases) */
export interface Compra {
  id: string;
  sucursalId?: string;
  proveedorId?: string;
  numeroFactura?: string;
  estado?: 'pending' | 'completed' | 'cancelled';
  metodoPago?: 'cash' | 'transfer' | 'card' | 'credit';
  notas?: string;
  total?: number;
  fecha?: string;
  detalles?: DetalleCompra[];
  creadoEn?: string;

  // Compatibilidad
  branchId?: string;
  providerId?: string;
  invoiceNumber?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: 'cash' | 'transfer' | 'card' | 'credit';
  notes?: string;
  date?: string;
  items?: DetalleCompra[];
  createdAt?: string;
}
export type Purchase = Compra;

/** 13. Tabla: DETALLES_COMPRA (PurchaseItems) */
export interface DetalleCompra {
  id: string;
  compraId?: string;
  productoId?: string;
  cantidad?: number;
  costo?: number;
  margenUtilidad?: number;
  precioVenta?: number;
  actualizarPrecioVenta?: boolean;

  // Compatibilidad
  purchaseId?: string;
  productId?: string;
  quantity?: number;
  cost?: number;
  profitMargin?: number;
  salePrice?: number;
  updateSalePrice?: boolean;
}
export type PurchaseItem = DetalleCompra;

/** 14. Tabla: VENTAS (Sales) */
export interface Venta {
  id: string;
  sucursalId?: string;
  clienteId?: string;
  cajeroId?: string;
  subtotal?: number;
  descuento?: number;
  impuesto?: number;
  propina?: number;
  total?: number;
  metodoPago?: MetodoPago;
  detallesPago?: {
    cashAmount?: number;
    cardAmount?: number;
    transactionId?: string;
  };
  fecha?: string;
  creadoEn?: string;

  // Compatibilidad
  branchId?: string;
  clientId?: string;
  cashierId?: string;
  employeeId?: string;
  discount?: number;
  tax?: number;
  paymentMethod?: PaymentMethod;
  paymentDetails?: {
    cashAmount?: number;
    cardAmount?: number;
    transactionId?: string;
  };
  date?: string;
  createdAt?: string;
  tip?: number;
  items?: any[];
  commissionPaid?: number;
}
export type Sale = Venta;

/** 15. Tabla: DETALLES_VENTA (SaleItems) */
export interface DetalleVenta {
  id: string;
  ventaId?: string;
  tipo?: 'service' | 'product';
  itemId?: string;
  cantidad?: number;
  precio?: number;
  empleadoId?: string;
  montoComision?: number;

  // Compatibilidad
  saleId?: string;
  type?: 'service' | 'product';
  quantity?: number;
  price?: number;
  employeeId?: string;
  employeeIdVal?: string;
  commissionAmount?: number;
}
export type SaleItem = DetalleVenta;

/** 16. Tabla: SESIONES_CAJA (CashSessions) */
export interface SesionCaja {
  id: string;
  sucursalId?: string;
  empleadoId?: string;
  fechaApertura?: string;
  fechaCierre?: string;
  saldoInicial?: number;
  saldoFinal?: number;
  saldoEsperado?: number;
  estado?: EstadoSesionCaja;
  notas?: string;
  creadoEn?: string;

  // Compatibilidad
  branchId?: string;
  cashierId?: string;
  employeeId?: string;
  openedAt?: string;
  closedAt?: string;
  openingBalance?: number;
  closingBalance?: number;
  expectedBalance?: number;
  status?: CashSessionStatus;
  notes?: string;
  createdAt?: string;
}
export type CashSession = SesionCaja;

/** 17. Tabla: MOVIMIENTOS_CAJA (CashMovements) */
export interface MovimientoCaja {
  id: string;
  sesionId?: string;
  tipo?: TipoMovimientoCaja;
  monto?: number;
  motivo?: string;
  fecha?: string;

  // Compatibilidad
  sessionId?: string;
  type?: CashMovementType;
  amount?: number;
  reason?: string;
  date?: string;
}
export type CashMovement = MovimientoCaja;

export interface DashboardKPIs {
  todaySales: number;
  todaySalesGrowth: number;
  todayAppointments: number;
  todayAppointmentsGrowth: number;
  activeClients: number;
  criticalStockCount: number;
}
