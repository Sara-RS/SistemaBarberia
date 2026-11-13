/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext } from 'react';
import { mockDb } from '../db/mockDb';
import { ThemeMode, themeManager } from '../services/themeManager';
import { authManager, AuthResult } from '../services/authManager';
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
  loginAdmin: (username: string, password: string) => AuthResult;
  logoutAdmin: () => void;
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
    this.setState(prevState => ({
      theme: themeManager.getToggledTheme(prevState.theme),
    }));
  };

  private setCurrentRole = (role: UserRole): void => {
    if (role === 'admin' && !this.state.isAdminAuthenticated) {
      return;
    }
    this.setState({ currentRole: role });
  };

  private loginAdmin = (username: string, password: string): AuthResult => {
    const result = authManager.login(username, password);
    if (result.success) {
      this.setState({
        isAdminAuthenticated: true,
        currentRole: 'admin',
      });
    }
    return result;
  };

  private logoutAdmin = (): void => {
    authManager.logout();
    this.setState({
      isAdminAuthenticated: false,
      currentRole: 'client',
    });
  };

  private setSelectedBranchId = (id: string): void => {
    this.setState({ selectedBranchId: id });
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
    mockDb.updateCompanyInfo(updates);
    this.refreshAll();
  };

  private addClient = (client: Omit<Client, 'id' | 'createdAt'>): Client => {
    const res = mockDb.createClient(client);
    this.refreshAll();
    return res;
  };

  private addAppointment = (apt: Omit<Appointment, 'id' | 'createdAt'>): Appointment => {
    const res = mockDb.createAppointment(apt);
    this.refreshAll();
    return res;
  };

  private updateAptStatus = (id: string, status: any): void => {
    mockDb.updateAppointmentStatus(id, status);
    this.refreshAll();
  };

  private updateApt = (id: string, updates: Partial<Appointment>): void => {
    mockDb.updateAppointment(id, updates);
    this.refreshAll();
  };

  private addToQueue = (item: Omit<QueueItem, 'id' | 'joinedAt' | 'status'>): void => {
    mockDb.addToQueue(item);
    this.refreshAll();
  };

  private updateQueueStatus = (id: string, status: any, employeeId?: string): void => {
    mockDb.updateQueueStatus(id, status, employeeId);
    this.refreshAll();
  };

  private addSale = (sale: Omit<Sale, 'id' | 'createdAt' | 'date'>, items: any[]): Sale => {
    const res = mockDb.createSale(sale, items);
    this.refreshAll();
    return res;
  };

  private openCash = (openingBalance: number): void => {
    mockDb.openCashSession({
      branchId: this.state.selectedBranchId,
      employeeId: 'emp-sofia',
      openingBalance,
    });
    this.refreshAll();
  };

  private closeCash = (closingBalance: number, notes?: string): void => {
    const session = mockDb.getActiveCashSession(this.state.selectedBranchId);
    if (session) {
      mockDb.closeCashSession(session.id, closingBalance, notes);
    }
    this.refreshAll();
  };

  private addCashMovement = (type: 'income' | 'expense', amount: number, reason: string): void => {
    const session = mockDb.getActiveCashSession(this.state.selectedBranchId);
    if (session) {
      mockDb.createCashMovement({
        sessionId: session.id,
        type,
        amount,
        reason,
      });
    }
    this.refreshAll();
  };

  private addProduct = (prod: Omit<Product, 'id' | 'createdAt'>): Product => {
    const created = mockDb.createProduct({ ...prod, branchId: this.state.selectedBranchId });
    this.refreshAll();
    return created;
  };

  private updateProduct = (id: string, updates: Partial<Product>): void => {
    mockDb.updateProduct(id, updates);
    this.refreshAll();
  };

  private deleteProduct = (id: string): void => {
    mockDb.deleteProduct(id);
    this.refreshAll();
  };

  private adjustProductStock = (productId: string, qty: number, reason: string): void => {
    mockDb.adjustStock(this.state.selectedBranchId, productId, qty, reason, 'emp-carlos');
    this.refreshAll();
  };

  private addService = (ser: Omit<Service, 'id' | 'createdAt'>): void => {
    mockDb.createService({ ...ser, tenantId: 'tenant-1' });
    this.refreshAll();
  };

  private updateService = (id: string, updates: Partial<Service>): void => {
    mockDb.updateService(id, updates);
    this.refreshAll();
  };

  private addEmployee = (emp: Omit<Employee, 'id' | 'createdAt'>): void => {
    mockDb.createEmployee({ ...emp, branchId: this.state.selectedBranchId });
    this.refreshAll();
  };

  private updateEmployee = (id: string, updates: Partial<Employee>): void => {
    mockDb.updateEmployee(id, updates);
    this.refreshAll();
  };

  private deleteEmployee = (id: string): void => {
    mockDb.deleteEmployee(id);
    this.refreshAll();
  };

  private addProvider = (prov: Omit<Provider, 'id' | 'createdAt'>): void => {
    mockDb.createProvider({ ...prov, tenantId: 'tenant-1' });
    this.refreshAll();
  };

  private updateProvider = (id: string, updates: Partial<Provider>): void => {
    mockDb.updateProvider(id, updates);
    this.refreshAll();
  };

  private deleteProvider = (id: string): void => {
    mockDb.deleteProvider(id);
    this.refreshAll();
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
    return res;
  };

  private deletePurchase = (id: string): void => {
    mockDb.deletePurchase(id);
    this.refreshAll();
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
