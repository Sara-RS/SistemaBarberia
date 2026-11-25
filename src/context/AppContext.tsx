/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext } from 'react';
import { mockDb } from '../db/mockDb';
import { ThemeMode, themeManager } from '../services/themeManager';
import { authManager, AuthResult } from '../services/authManager';
import { auditService } from '../services/auditService';
import {
  UserRole,
  Branch,
  Employee,
  Service,
  Client,
  Appointment,
  QueueItem,
  Product,
  Provider,
  Purchase,
  PurchaseItem,
  Sale,
  CashSession,
  CompanyInfo,
} from '../types';

export interface AppContextProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isAdminAuthenticated: boolean;
  loginAdmin: (
    username: string,
    password: string,
    captchaId: string,
    captchaAnswer: string
  ) => Promise<AuthResult>;
  logoutAdmin: () => Promise<void>;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  theme: ThemeMode;
  toggleTheme: () => void;

  // Data vectors (reactive state)
  companyInfo: CompanyInfo;
  branches: Branch[];
  employees: Employee[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  queueItems: QueueItem[];
  products: Product[];
  providers: Provider[];
  purchases: Purchase[];
  sales: Sale[];
  activeSession: CashSession | undefined;

  // Actions
  refreshAll: () => void;
  updateCompanyInfo: (updates: Partial<CompanyInfo>) => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt'>) => Appointment;
  updateAptStatus: (id: string, status: any) => void;
  updateApt: (id: string, updates: Partial<Appointment>) => void;
  addToQueue: (item: Omit<QueueItem, 'id' | 'joinedAt' | 'status'>) => void;
  updateQueueStatus: (id: string, status: any, employeeId?: string) => void;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'date'>, items: any[]) => Sale;
  openCash: (openingBalance: number) => void;
  closeCash: (closingBalance: number, notes?: string) => void;
  addCashMovement: (type: 'income' | 'expense', amount: number, reason: string) => void;
  addProduct: (prod: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustProductStock: (productId: string, qty: number, reason: string) => void;
  addService: (ser: Omit<Service, 'id' | 'createdAt'>) => void;
  updateService: (id: string, updates: Partial<Service>) => void;
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addProvider: (prov: Omit<Provider, 'id' | 'createdAt'>) => void;
  updateProvider: (id: string, updates: Partial<Provider>) => void;
  deleteProvider: (id: string) => void;
  addPurchase: (
    pur: Omit<Purchase, 'id' | 'createdAt' | 'total'>,
    items: (Omit<PurchaseItem, 'id' | 'purchaseId'> & {
      profitMargin?: number;
      salePrice?: number;
      updateSalePrice?: boolean;
    })[]
  ) => Purchase;
  deletePurchase: (id: string) => void;
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

interface AppProviderProps {
  children: React.ReactNode;
}

interface AppProviderState {
  currentRole: UserRole;
  isAdminAuthenticated: boolean;
  selectedBranchId: string;
  theme: ThemeMode;
  companyInfo: CompanyInfo;
  branches: Branch[];
  employees: Employee[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  queueItems: QueueItem[];
  products: Product[];
  providers: Provider[];
  purchases: Purchase[];
  sales: Sale[];
  activeSession: CashSession | undefined;
}

/**
 * Proveedor de estado global implementado como Clase React orientada a objetos.
 * Sincroniza cada mutación hacia `db_barberia` en el servidor para activar los triggers hacia `db_barberia_logs`.
 */
export class AppProvider extends React.Component<AppProviderProps, AppProviderState> {
  constructor(props: AppProviderProps) {
    super(props);
    const defaultBranchId = 'branch-coyoacan';
    const initialTheme = themeManager.loadTheme();
    const initialAuth = authManager.isAuthenticated();
    themeManager.applyTheme(initialTheme);
    this.state = {
      currentRole: initialAuth ? 'admin' : 'client',
      isAdminAuthenticated: initialAuth,
      selectedBranchId: defaultBranchId,
      theme: initialTheme,
      companyInfo: mockDb.getCompanyInfo(),
      branches: mockDb.getBranches(),
      employees: mockDb.getEmployees(),
      services: mockDb.getServices(),
      clients: mockDb.getClients(),
      appointments: mockDb.getAppointments(),
      queueItems: mockDb.getQueueItems(defaultBranchId),
      products: mockDb.getProducts(defaultBranchId),
      providers: mockDb.getProviders(),
      purchases: mockDb.getPurchases(defaultBranchId),
      sales: mockDb.getSales(defaultBranchId),
      activeSession: mockDb.getActiveCashSession(defaultBranchId),
    };
  }

  public componentDidMount(): void {
    themeManager.applyTheme(this.state.theme);
    this.refreshAll();
  }

  public componentDidUpdate(_prevProps: AppProviderProps, prevState: AppProviderState): void {
    if (prevState.theme !== this.state.theme) {
      themeManager.applyTheme(this.state.theme);
    }
    if (prevState.selectedBranchId !== this.state.selectedBranchId) {
      this.refreshAll(this.state.selectedBranchId);
    }
  }

  private toggleTheme = (): void => {
    const nextTheme = themeManager.getToggledTheme(this.state.theme);
    this.setState({ theme: nextTheme });
    auditService.recordPageEvent({
      tipoEvento: 'THEME_CHANGE',
      modulo: 'Interfaz',
      sucursalId: this.state.selectedBranchId,
      resumen: `Cambio de tema visual a modo ${nextTheme === 'dark' ? 'Oscuro' : 'Claro'}.`,
      detalles: { previousTheme: this.state.theme, nextTheme },
      nivel: 'INFO',
    });
  };

  private setCurrentRole = (role: UserRole): void => {
    if (role === 'admin' && !this.state.isAdminAuthenticated) {
      return;
    }
    this.setState({ currentRole: role });
    auditService.recordPageEvent({
      tipoEvento: 'ROLE_SWITCH',
      modulo: 'Navegación',
      sucursalId: this.state.selectedBranchId,
      resumen: `Cambio de vista activa hacia modo ${role === 'client' ? 'Cliente Público' : 'Administración'}.`,
      detalles: { role },
      nivel: 'INFO',
    });
  };

  private loginAdmin = async (
    username: string,
    password: string,
    captchaId: string,
    captchaAnswer: string
  ): Promise<AuthResult> => {
    const result = await authManager.login(username, password, captchaId, captchaAnswer);
    if (result.success) {
      this.setState({
        isAdminAuthenticated: true,
        currentRole: 'admin',
      });
    }
    return result;
  };

  private logoutAdmin = async (): Promise<void> => {
    await authManager.logout();
    this.setState({
      isAdminAuthenticated: false,
      currentRole: 'client',
    });
  };

  private setSelectedBranchId = (id: string): void => {
    const branch = this.state.branches.find(b => b.id === id);
    this.setState({ selectedBranchId: id });
    auditService.recordPageEvent({
      tipoEvento: 'BRANCH_CHANGE',
      modulo: 'Sucursales',
      sucursalId: id,
      resumen: `Cambio de sucursal activa a "${branch?.name || id}".`,
      detalles: { branchId: id, branchName: branch?.name || id },
      nivel: 'INFO',
    });
  };

  private refreshAll = (branchId: string = this.state.selectedBranchId): void => {
    this.setState({
      companyInfo: mockDb.getCompanyInfo(),
      branches: mockDb.getBranches(),
      employees: mockDb.getEmployees(),
      services: mockDb.getServices(),
      clients: mockDb.getClients(),
      appointments: mockDb.getAppointments(),
      queueItems: mockDb.getQueueItems(branchId),
      products: mockDb.getProducts(branchId),
      providers: mockDb.getProviders(),
      purchases: mockDb.getPurchases(branchId),
      sales: mockDb.getSales(branchId),
      activeSession: mockDb.getActiveCashSession(branchId),
    });
  };

  private updateCompanyInfo = (updates: Partial<CompanyInfo>): void => {
    const updated = mockDb.updateCompanyInfo(updates);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateCompanyInfo',
      tablaAfectada: 'empresas',
      operacion: 'UPDATE',
      modulo: 'Parametrización',
      resumen: `Actualización de datos institucionales de "${updated.name}".`,
      payload: updated,
      triggerNombre: 'trg_empresas_au',
    });
  };

  private addClient = (client: Omit<Client, 'id' | 'createdAt'>): Client => {
    const res = mockDb.createClient(client);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createClient',
      tablaAfectada: 'clientes',
      operacion: 'INSERT',
      modulo: 'Clientes',
      resumen: `Registro/verificación de cliente: ${res.fullName || res.nombreCompleto || 'Cliente'}.`,
      payload: res,
      triggerNombre: 'trg_clientes_ai',
      actorHint: res.fullName || res.nombreCompleto,
    });
    return res;
  };

  private addAppointment = (apt: Omit<Appointment, 'id' | 'createdAt'>): Appointment => {
    const res = mockDb.createAppointment(apt);
    const client = mockDb.getClients().find(c => c.id === res.clientId);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createAppointment',
      tablaAfectada: 'citas',
      operacion: 'INSERT',
      modulo: this.state.currentRole === 'client' ? 'Reservas Cliente' : 'Agenda',
      resumen: `Nueva cita agendada para el ${res.date} a las ${res.startTime} (${client?.fullName || res.clientId}).`,
      payload: res,
      triggerNombre: 'trg_citas_ai',
      actorHint: client?.fullName,
    });
    return res;
  };

  private updateAptStatus = (id: string, status: any): void => {
    const updated = mockDb.updateAppointmentStatus(id, status);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateAppointmentStatus',
      tablaAfectada: 'citas',
      operacion: 'UPDATE',
      modulo: 'Agenda',
      resumen: `Estado de cita ${id} actualizado a "${status}".`,
      payload: updated,
      triggerNombre: 'trg_citas_au',
      nivel: status === 'cancelled' || status === 'no-show' ? 'WARNING' : 'INFO',
    });
  };

  private updateApt = (id: string, updates: Partial<Appointment>): void => {
    const updated = mockDb.updateAppointment(id, updates);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateAppointment',
      tablaAfectada: 'citas',
      operacion: 'UPDATE',
      modulo: 'Agenda',
      resumen: `Reprogramación/edición de cita ${id} (${updated.date} ${updated.startTime}).`,
      payload: updated,
      triggerNombre: 'trg_citas_au',
    });
  };

  private addToQueue = (item: Omit<QueueItem, 'id' | 'joinedAt' | 'status'>): void => {
    const created = mockDb.addToQueue(item);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'addToQueue',
      tablaAfectada: 'turnos_espera',
      operacion: 'INSERT',
      modulo: 'Agenda',
      resumen: `Cliente agregado a fila de espera: ${created.fullName || created.nombreCompleto || 'Walk-In'}.`,
      payload: created,
      triggerNombre: 'trg_turnos_espera_ai',
    });
  };

  private updateQueueStatus = (id: string, status: any, employeeId?: string): void => {
    const updated = mockDb.updateQueueStatus(id, status, employeeId);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateQueueStatus',
      tablaAfectada: 'turnos_espera',
      operacion: 'UPDATE',
      modulo: 'Agenda',
      resumen: `Turno de espera ${id} (${updated.fullName || ''}) cambió a "${status}".`,
      payload: updated,
      triggerNombre: 'trg_turnos_espera_au',
    });
  };

  private addSale = (sale: Omit<Sale, 'id' | 'createdAt' | 'date'>, items: any[]): Sale => {
    const res = mockDb.createSale(sale, items);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createSale',
      tablaAfectada: 'ventas',
      operacion: 'INSERT',
      modulo: 'Caja / POS',
      resumen: `Venta POS registrada #${res.id} por Bs. ${Number(res.total || 0).toFixed(2)} (${res.paymentMethod}).`,
      payload: { ...res, itemsCount: items.length, items },
      triggerNombre: 'trg_ventas_ai',
    });
    return res;
  };

  private openCash = (openingBalance: number): void => {
    const session = mockDb.openCashSession({
      branchId: this.state.selectedBranchId,
      employeeId: 'emp-sofia',
      openingBalance,
    });
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'openCashSession',
      tablaAfectada: 'sesiones_caja',
      operacion: 'INSERT',
      modulo: 'Caja / POS',
      resumen: `Apertura de caja registrada con saldo inicial de Bs. ${openingBalance.toFixed(2)}.`,
      payload: session,
      triggerNombre: 'trg_sesiones_caja_ai',
    });
  };

  private closeCash = (closingBalance: number, notes?: string): void => {
    const session = mockDb.getActiveCashSession(this.state.selectedBranchId);
    if (session) {
      const closed = mockDb.closeCashSession(session.id, closingBalance, notes);
      this.refreshAll();
      auditService.recordDatabaseMutation({
        action: 'closeCashSession',
        tablaAfectada: 'sesiones_caja',
        operacion: 'UPDATE',
        modulo: 'Caja / POS',
        resumen: `Cierre de caja #${closed.id} · Declarado: Bs. ${closingBalance.toFixed(2)} / Esperado: Bs. ${(closed.expectedBalance ?? closingBalance).toFixed(2)}.`,
        payload: closed,
        triggerNombre: 'trg_sesiones_caja_au',
        nivel:
          Math.abs(closingBalance - (closed.expectedBalance ?? closingBalance)) > 0.01
            ? 'WARNING'
            : 'INFO',
      });
      return;
    }
    this.refreshAll();
  };

  private addCashMovement = (type: 'income' | 'expense', amount: number, reason: string): void => {
    const session = mockDb.getActiveCashSession(this.state.selectedBranchId);
    if (session) {
      const mov = mockDb.createCashMovement({
        sessionId: session.id,
        type,
        amount,
        reason,
      });
      this.refreshAll();
      auditService.recordDatabaseMutation({
        action: 'createCashMovement',
        tablaAfectada: 'movimientos_caja',
        operacion: 'INSERT',
        modulo: 'Caja / POS',
        resumen: `Movimiento de caja (${type === 'income' ? 'Ingreso' : 'Egreso'}): Bs. ${amount.toFixed(2)} · ${reason}`,
        payload: { ...mov, branchId: this.state.selectedBranchId },
        triggerNombre: 'trg_movimientos_caja_ai',
        nivel: type === 'expense' ? 'WARNING' : 'INFO',
      });
      return;
    }
    this.refreshAll();
  };

  private addProduct = (prod: Omit<Product, 'id' | 'createdAt'>): Product => {
    const created = mockDb.createProduct({ ...prod, branchId: this.state.selectedBranchId });
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createProduct',
      tablaAfectada: 'productos',
      operacion: 'INSERT',
      modulo: 'Inventario',
      resumen: `Producto creado: ${created.name} (Stock inicial: ${created.stock}, Precio: Bs. ${created.price}).`,
      payload: created,
      triggerNombre: 'trg_productos_ai',
    });
    return created;
  };

  private updateProduct = (id: string, updates: Partial<Product>): void => {
    const updated = mockDb.updateProduct(id, updates);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateProduct',
      tablaAfectada: 'productos',
      operacion: 'UPDATE',
      modulo: 'Inventario',
      resumen: `Producto actualizado: ${updated.name} (Precio: Bs. ${updated.price}, Stock: ${updated.stock}).`,
      payload: updated,
      triggerNombre: 'trg_productos_au',
    });
  };

  private deleteProduct = (id: string): void => {
    const target = this.state.products.find(p => p.id === id);
    mockDb.deleteProduct(id);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'deleteProduct',
      tablaAfectada: 'productos',
      operacion: 'DELETE',
      modulo: 'Inventario',
      resumen: `Producto eliminado del inventario: ${target?.name || id}.`,
      payload: target || { id, branchId: this.state.selectedBranchId },
      triggerNombre: 'trg_productos_ad',
      nivel: 'WARNING',
    });
  };

  private adjustProductStock = (productId: string, qty: number, reason: string): void => {
    const prevProduct = this.state.products.find(p => p.id === productId);
    const previousStock = prevProduct?.stock ?? 0;
    mockDb.adjustStock(this.state.selectedBranchId, productId, qty, reason, 'emp-carlos');
    const updatedProduct = mockDb.getProducts(this.state.selectedBranchId).find(p => p.id === productId);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'adjustStock',
      tablaAfectada: 'productos',
      operacion: 'UPDATE',
      modulo: 'Inventario',
      resumen: `Ajuste de stock (${qty >= 0 ? `+${qty}` : qty}) en "${updatedProduct?.name || productId}": ${reason}.`,
      payload: {
        ...(updatedProduct || { id: productId, branchId: this.state.selectedBranchId }),
        previousStock,
        delta: qty,
        reason,
      },
      triggerNombre: 'trg_productos_au',
      nivel: qty < 0 ? 'WARNING' : 'INFO',
    });
  };

  private addService = (ser: Omit<Service, 'id' | 'createdAt'>): void => {
    const created = mockDb.createService({ ...ser, tenantId: 'tenant-1' });
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createService',
      tablaAfectada: 'servicios',
      operacion: 'INSERT',
      modulo: 'Servicios',
      resumen: `Servicio creado: [${created.code || created.codigo}] ${created.name} (Bs. ${created.price}).`,
      payload: created,
      triggerNombre: 'trg_servicios_ai',
    });
  };

  private updateService = (id: string, updates: Partial<Service>): void => {
    const updated = mockDb.updateService(id, updates);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateService',
      tablaAfectada: 'servicios',
      operacion: 'UPDATE',
      modulo: 'Servicios',
      resumen: `Servicio actualizado: [${updated.code || updated.codigo}] ${updated.name} (Bs. ${updated.price}).`,
      payload: updated,
      triggerNombre: 'trg_servicios_au',
    });
  };

  private addEmployee = (emp: Omit<Employee, 'id' | 'createdAt'>): void => {
    const created = mockDb.createEmployee({ ...emp, branchId: this.state.selectedBranchId });
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createEmployee',
      tablaAfectada: 'empleados',
      operacion: 'INSERT',
      modulo: 'Barberos',
      resumen: `Barbero/personal registrado: ${created.fullName} (${created.role}).`,
      payload: created,
      triggerNombre: 'trg_empleados_ai',
    });
  };

  private updateEmployee = (id: string, updates: Partial<Employee>): void => {
    const updated = mockDb.updateEmployee(id, updates);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateEmployee',
      tablaAfectada: 'empleados',
      operacion: 'UPDATE',
      modulo: 'Barberos',
      resumen: `Datos de barbero/personal actualizados: ${updated.fullName}.`,
      payload: updated,
      triggerNombre: 'trg_empleados_au',
    });
  };

  private deleteEmployee = (id: string): void => {
    const target = this.state.employees.find(e => e.id === id);
    mockDb.deleteEmployee(id);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'deleteEmployee',
      tablaAfectada: 'empleados',
      operacion: 'DELETE',
      modulo: 'Barberos',
      resumen: `Barbero/personal eliminado: ${target?.fullName || id}.`,
      payload: target || { id, branchId: this.state.selectedBranchId },
      triggerNombre: 'trg_empleados_ad',
      nivel: 'WARNING',
    });
  };

  private addProvider = (prov: Omit<Provider, 'id' | 'createdAt'>): void => {
    const created = mockDb.createProvider({ ...prov, tenantId: 'tenant-1' });
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createProvider',
      tablaAfectada: 'proveedores',
      operacion: 'INSERT',
      modulo: 'Proveedores',
      resumen: `Proveedor registrado: ${created.name}.`,
      payload: created,
      triggerNombre: 'trg_proveedores_ai',
    });
  };

  private updateProvider = (id: string, updates: Partial<Provider>): void => {
    const updated = mockDb.updateProvider(id, updates);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'updateProvider',
      tablaAfectada: 'proveedores',
      operacion: 'UPDATE',
      modulo: 'Proveedores',
      resumen: `Proveedor actualizado: ${updated.name}.`,
      payload: updated,
      triggerNombre: 'trg_proveedores_au',
    });
  };

  private deleteProvider = (id: string): void => {
    const target = this.state.providers.find(p => p.id === id);
    mockDb.deleteProvider(id);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'deleteProvider',
      tablaAfectada: 'proveedores',
      operacion: 'DELETE',
      modulo: 'Proveedores',
      resumen: `Proveedor eliminado: ${target?.name || id}.`,
      payload: target || { id },
      triggerNombre: 'trg_proveedores_ad',
      nivel: 'WARNING',
    });
  };

  private addPurchase = (
    pur: Omit<Purchase, 'id' | 'createdAt' | 'total'>,
    items: (Omit<PurchaseItem, 'id' | 'purchaseId'> & {
      profitMargin?: number;
      salePrice?: number;
      updateSalePrice?: boolean;
    })[]
  ): Purchase => {
    const res = mockDb.createPurchase(pur, items);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'createPurchase',
      tablaAfectada: 'compras',
      operacion: 'INSERT',
      modulo: 'Compras',
      resumen: `Compra registrada #${res.invoiceNumber || res.id} por Bs. ${Number(res.total || 0).toFixed(2)} (${items.length} ítems).`,
      payload: { ...res, itemsCount: items.length },
      triggerNombre: 'trg_compras_ai',
    });
    return res;
  };

  private deletePurchase = (id: string): void => {
    const target = this.state.purchases.find(p => p.id === id);
    mockDb.deletePurchase(id);
    this.refreshAll();
    auditService.recordDatabaseMutation({
      action: 'deletePurchase',
      tablaAfectada: 'compras',
      operacion: 'DELETE',
      modulo: 'Compras',
      resumen: `Compra eliminada #${target?.invoiceNumber || id}.`,
      payload: target || { id, branchId: this.state.selectedBranchId },
      triggerNombre: 'trg_compras_ad',
      nivel: 'WARNING',
    });
  };

  public render(): React.ReactNode {
    const contextValue: AppContextProps = {
      currentRole: this.state.currentRole,
      setCurrentRole: this.setCurrentRole,
      isAdminAuthenticated: this.state.isAdminAuthenticated,
      loginAdmin: this.loginAdmin,
      logoutAdmin: this.logoutAdmin,
      selectedBranchId: this.state.selectedBranchId,
      setSelectedBranchId: this.setSelectedBranchId,
      theme: this.state.theme,
      toggleTheme: this.toggleTheme,
      companyInfo: this.state.companyInfo,
      branches: this.state.branches,
      employees: this.state.employees,
      services: this.state.services,
      clients: this.state.clients,
      appointments: this.state.appointments,
      queueItems: this.state.queueItems,
      products: this.state.products,
      providers: this.state.providers,
      purchases: this.state.purchases,
      sales: this.state.sales,
      activeSession: this.state.activeSession,
      refreshAll: () => this.refreshAll(),
      updateCompanyInfo: this.updateCompanyInfo,
      addClient: this.addClient,
      addAppointment: this.addAppointment,
      updateAptStatus: this.updateAptStatus,
      updateApt: this.updateApt,
      addToQueue: this.addToQueue,
      updateQueueStatus: this.updateQueueStatus,
      addSale: this.addSale,
      openCash: this.openCash,
      closeCash: this.closeCash,
      addCashMovement: this.addCashMovement,
      addProduct: this.addProduct,
      updateProduct: this.updateProduct,
      deleteProduct: this.deleteProduct,
      adjustProductStock: this.adjustProductStock,
      addService: this.addService,
      updateService: this.updateService,
      addEmployee: this.addEmployee,
      updateEmployee: this.updateEmployee,
      deleteEmployee: this.deleteEmployee,
      addProvider: this.addProvider,
      updateProvider: this.updateProvider,
      deleteProvider: this.deleteProvider,
      addPurchase: this.addPurchase,
      deletePurchase: this.deletePurchase,
    };

    return (
      <AppContext.Provider value={contextValue}>
        {this.props.children}
      </AppContext.Provider>
    );
  }
}

/**
 * Clase base abstracta para todos los componentes de vista de la aplicación.
 * Provee acceso encapsulado al contexto global mediante herencia OOP.
 */
export abstract class BaseAppComponent<P = {}, S = {}> extends React.Component<P, S> {
  public static contextType = AppContext;
  declare context: React.ContextType<typeof AppContext>;

  protected get app(): AppContextProps {
    if (!this.context) {
      throw new Error('BaseAppComponent debe utilizarse dentro de un AppProvider.');
    }
    return this.context;
  }
}
