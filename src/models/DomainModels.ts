/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompanyInfo,
  Branch,
  User,
  Employee,
  Service,
  Client,
  Appointment,
  QueueItem,
  Provider,
  Product,
  Purchase,
  PurchaseItem,
  Sale,
  CashSession,
  CashMovement,
} from '../types';

/**
 * Clase base abstracta para todas las entidades del dominio.
 * Aplica Abstracción y Encapsulamiento.
 */
export abstract class BaseEntity<TData extends { id: string }> {
  protected readonly data: TData;

  constructor(data: TData) {
    this.data = data;
  }

  public get id(): string {
    return this.data.id;
  }

  public toJSON(): TData {
    return { ...this.data };
  }

  public abstract getSummary(): string;
}

/**
 * Clase abstracta Persona para demostrar Herencia y Polimorfismo
 * entre Clientes, Empleados y Usuarios del sistema.
 */
export abstract class PersonModel<
  TData extends {
    id: string;
    fullName?: string;
    nombreCompleto?: string;
    phone?: string;
    telefono?: string;
    email?: string;
    correo?: string;
  }
> extends BaseEntity<TData> {
  public get fullName(): string {
    return this.data.fullName || this.data.nombreCompleto || 'Sin Nombre';
  }

  public get phone(): string {
    return this.data.phone || this.data.telefono || '';
  }

  public get email(): string {
    return this.data.email || this.data.correo || '';
  }

  public getInitials(): string {
    const parts = this.fullName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return this.fullName.slice(0, 2).toUpperCase();
  }

  public getWhatsAppPhone(): string {
    const digits = this.phone.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return digits.startsWith('591') ? digits : `591${digits}`;
  }

  public abstract getRoleLabel(): string;

  public getSummary(): string {
    return `${this.fullName} (${this.getRoleLabel()})`;
  }
}

export class UserModel extends PersonModel<User> {
  public get role(): string {
    return this.data.role || this.data.rol || 'client';
  }

  public getRoleLabel(): string {
    switch (this.role) {
      case 'admin':
        return 'Administrador';
      case 'recep':
        return 'Recepcionista';
      case 'barber':
        return 'Barbero';
      default:
        return 'Cliente';
    }
  }
}

export class EmployeeModel extends PersonModel<Employee> {
  public get role(): 'admin' | 'recep' | 'barber' {
    return (this.data.role || this.data.rol || 'barber') as 'admin' | 'recep' | 'barber';
  }

  public get active(): boolean {
    return this.data.active ?? this.data.activo ?? true;
  }

  public get commissionRate(): number {
    return this.data.commissionRate ?? this.data.porcentajeComision ?? 0.35;
  }

  public get specialties(): string[] {
    return this.data.specialties || this.data.especialidades || [];
  }

  public get schedule(): NonNullable<Employee['schedule']> {
    return this.data.schedule || this.data.horarioTrabajo || {};
  }

  public isBarber(): boolean {
    return this.role === 'barber';
  }

  public getCommissionPercentage(): number {
    return Math.round(this.commissionRate * 100);
  }

  public getOffDays(dayNamesMap: Record<string, string>): string[] {
    return Object.keys(this.schedule)
      .filter(day => !this.schedule[day]?.active)
      .map(day => dayNamesMap[day] || day);
  }

  public getFirstActiveShift(): { start: string; end: string; breakStart: string; breakEnd: string } {
    const activeKeys = Object.keys(this.schedule).filter(day => this.schedule[day]?.active);
    const firstDay = activeKeys.length > 0 ? this.schedule[activeKeys[0]] : null;
    const firstBreak = firstDay?.breaks?.[0];
    return {
      start: firstDay?.start || 'N/A',
      end: firstDay?.end || 'N/A',
      breakStart: firstBreak?.start || 'N/A',
      breakEnd: firstBreak?.end || 'N/A',
    };
  }

  public getRoleLabel(): string {
    return this.role === 'barber' ? 'Barbero Profesional' : this.role;
  }
}

export class ClientModel extends PersonModel<Client> {
  public get isRegistered(): boolean {
    return this.data.isRegistered ?? this.data.estaRegistrado ?? false;
  }

  public get createdAt(): string {
    return this.data.createdAt || this.data.creadoEn || '';
  }

  public getRoleLabel(): string {
    return this.isRegistered ? 'Cliente Registrado' : 'Cliente Walk-In';
  }
}

export class CompanyInfoModel extends BaseEntity<CompanyInfo> {
  public get name(): string {
    return this.data.name || 'Barbería';
  }

  public get currencySymbol(): string {
    return this.data.currencySymbol || 'Bs.';
  }

  public getSummary(): string {
    return `${this.name} (${this.currencySymbol})`;
  }
}

export class BranchModel extends BaseEntity<Branch> {
  public get name(): string {
    return this.data.name || this.data.nombre || 'Sucursal';
  }

  public get address(): string {
    return this.data.address || this.data.direccion || '';
  }

  public get phone(): string {
    return this.data.phone || this.data.telefono || '';
  }

  public get openingHours(): NonNullable<Branch['openingHours']> {
    return this.data.openingHours || this.data.horarioAtencion || {};
  }

  public isOpenOnDay(dayName: string): boolean {
    return Boolean(this.openingHours[dayName]?.active);
  }

  public getSummary(): string {
    return `${this.name} - ${this.address}`;
  }
}

export class ServiceModel extends BaseEntity<Service> {
  public get name(): string {
    return this.data.name || this.data.nombre || 'Servicio';
  }

  public get code(): string {
    return this.data.codigo || this.data.code || 'SRV-000';
  }

  public get price(): number {
    return this.data.price ?? this.data.precio ?? 0;
  }

  public get duration(): number {
    return this.data.duration ?? this.data.duracion ?? 30;
  }

  public getTotalDuration(): number {
    return this.duration + (this.data.cleanupTime ?? this.data.tiempoLimpieza ?? 0);
  }

  public getSummary(): string {
    return `${this.code} - ${this.name} (${this.duration} min)`;
  }
}

export class AppointmentModel extends BaseEntity<Appointment> {
  public get date(): string {
    return this.data.date || this.data.fecha || '';
  }

  public get startTime(): string {
    return this.data.startTime || this.data.horaInicio || '09:00';
  }

  public get endTime(): string {
    return this.data.endTime || this.data.horaFin || '09:30';
  }

  public get status(): string {
    return this.data.status || this.data.estado || 'pending';
  }

  public get price(): number {
    return this.data.price ?? this.data.precio ?? 0;
  }

  public isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  public isCompleted(): boolean {
    return this.status === 'completed';
  }

  public isActive(): boolean {
    return !this.isCancelled();
  }

  public getSummary(): string {
    return `Cita ${this.id} (${this.date} ${this.startTime})`;
  }
}

export class QueueItemModel extends BaseEntity<QueueItem> {
  public get fullName(): string {
    return this.data.fullName || this.data.nombreCompleto || 'Cliente';
  }

  public get status(): string {
    return this.data.status || this.data.estado || 'waiting';
  }

  public getSummary(): string {
    return `Turno ${this.fullName} (${this.status})`;
  }
}

export class ProviderModel extends BaseEntity<Provider> {
  public get name(): string {
    return this.data.name || this.data.nombre || 'Proveedor';
  }

  public get contactName(): string {
    return this.data.contactName || this.data.nombreContacto || 'Contacto No Especificado';
  }

  public get phone(): string {
    return this.data.phone || this.data.telefono || '';
  }

  public get email(): string {
    return this.data.email || this.data.correo || '';
  }

  public get address(): string {
    return this.data.address || this.data.direccion || '';
  }

  public getWhatsAppPhone(): string {
    const digits = this.phone.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return digits.startsWith('591') ? digits : `591${digits}`;
  }

  public getSummary(): string {
    return `${this.name} (${this.contactName})`;
  }
}

export class ProductModel extends BaseEntity<Product> {
  public get name(): string {
    return this.data.name || this.data.nombre || 'Producto';
  }

  public get sku(): string {
    return this.data.sku || '';
  }

  public get category(): string {
    return this.data.category || this.data.categoria || '';
  }

  public get stock(): number {
    return this.data.stock ?? this.data.existencia ?? 0;
  }

  public get minStock(): number {
    return this.data.minStock ?? this.data.existenciaMinima ?? 0;
  }

  public get cost(): number {
    return this.data.cost ?? this.data.costo ?? 0;
  }

  public get price(): number {
    return this.data.price ?? this.data.precio ?? 0;
  }

  public isOutOfStock(): boolean {
    return this.stock <= 0;
  }

  public isCriticalStock(): boolean {
    return this.stock <= this.minStock;
  }

  public getProfitAmount(): number {
    return this.price - this.cost;
  }

  public getProfitMargin(): number {
    if (this.cost <= 0) return 0;
    return ((this.price - this.cost) / this.cost) * 100;
  }

  public getSummary(): string {
    return `${this.name} [${this.sku}] - Stock: ${this.stock}`;
  }
}

export class PurchaseItemModel {
  private readonly data: PurchaseItem;

  constructor(data: PurchaseItem) {
    this.data = data;
  }

  public get quantity(): number {
    return this.data.quantity ?? this.data.cantidad ?? 0;
  }

  public get cost(): number {
    return this.data.cost ?? this.data.costo ?? 0;
  }

  public get profitMargin(): number {
    if (this.data.profitMargin !== undefined) return this.data.profitMargin;
    if (this.data.margenUtilidad !== undefined) return this.data.margenUtilidad;
    if (this.salePrice > 0 && this.cost > 0) {
      return ((this.salePrice - this.cost) / this.cost) * 100;
    }
    return 50;
  }

  public get salePrice(): number {
    if (this.data.salePrice !== undefined) return this.data.salePrice;
    if (this.data.precioVenta !== undefined) return this.data.precioVenta;
    return this.cost * 1.5;
  }

  public getLineSubtotal(): number {
    return this.quantity * this.cost;
  }

  public getLineProjectedRevenue(): number {
    return this.quantity * this.salePrice;
  }
}

export class PurchaseModel extends BaseEntity<Purchase> {
  public get invoiceNumber(): string {
    return this.data.invoiceNumber || this.data.numeroFactura || this.data.id;
  }

  public get date(): string {
    return this.data.date || this.data.fecha || this.data.createdAt || '';
  }

  public get status(): string {
    return this.data.status || this.data.estado || 'completed';
  }

  public get paymentMethod(): string {
    return this.data.paymentMethod || this.data.metodoPago || 'cash';
  }

  public get total(): number {
    return this.data.total ?? 0;
  }

  public getItemModels(): PurchaseItemModel[] {
    const items = this.data.items || this.data.detalles || [];
    return items.map(it => new PurchaseItemModel(it));
  }

  public getTotalUnits(): number {
    return this.getItemModels().reduce((acc, item) => acc + item.quantity, 0);
  }

  public isCompleted(): boolean {
    return this.status === 'completed';
  }

  public getSummary(): string {
    return `Compra #${this.invoiceNumber} (${this.getTotalUnits()} uds)`;
  }
}

export class SaleModel extends BaseEntity<Sale> {
  public get total(): number {
    return this.data.total ?? 0;
  }

  public get subtotal(): number {
    return this.data.subtotal ?? 0;
  }

  public get tip(): number {
    return this.data.tip ?? this.data.propina ?? 0;
  }

  public getSummary(): string {
    return `Venta ${this.id} - Total: ${this.total}`;
  }
}

export class CashSessionModel extends BaseEntity<CashSession> {
  public get openingBalance(): number {
    return this.data.openingBalance ?? this.data.saldoInicial ?? 0;
  }

  public get expectedBalance(): number {
    return this.data.expectedBalance ?? this.data.saldoEsperado ?? 0;
  }

  public getSummary(): string {
    return `Caja ${this.id} (${this.data.status || this.data.estado})`;
  }
}

export class CashMovementModel extends BaseEntity<CashMovement> {
  public isIncome(): boolean {
    return (this.data.type || this.data.tipo) === 'income';
  }

  public get amount(): number {
    return this.data.amount ?? this.data.monto ?? 0;
  }

  public get reason(): string {
    return this.data.reason || this.data.motivo || '';
  }

  public getSummary(): string {
    return `${this.isIncome() ? '+' : '-'}${this.amount}: ${this.reason}`;
  }
}

/**
 * Fábrica estática para instanciar modelos del dominio a partir de registros planos.
 */
export class ModelFactory {
  public static createBranch(data: Branch): BranchModel {
    return new BranchModel(data);
  }

  public static createEmployee(data: Employee): EmployeeModel {
    return new EmployeeModel(data);
  }

  public static createClient(data: Client): ClientModel {
    return new ClientModel(data);
  }

  public static createService(data: Service): ServiceModel {
    return new ServiceModel(data);
  }

  public static createAppointment(data: Appointment): AppointmentModel {
    return new AppointmentModel(data);
  }

  public static createProvider(data: Provider): ProviderModel {
    return new ProviderModel(data);
  }

  public static createProduct(data: Product): ProductModel {
    return new ProductModel(data);
  }

  public static createPurchase(data: Purchase): PurchaseModel {
    return new PurchaseModel(data);
  }

  public static createSale(data: Sale): SaleModel {
    return new SaleModel(data);
  }
}
