/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockDb } from '../db/mockDb';
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
  Sale,
  CashSession,
} from '../types';

interface AppContextProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  
  // Data vectors (reactive state)
  branches: Branch[];
  employees: Employee[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  queueItems: QueueItem[];
  products: Product[];
  providers: Provider[];
  sales: Sale[];
  activeSession: CashSession | undefined;

  // Actions
  refreshAll: () => void;
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
  addProduct: (prod: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustProductStock: (productId: string, qty: number, reason: string) => void;
  addService: (ser: Omit<Service, 'id' | 'createdAt'>) => void;
  updateService: (id: string, updates: Partial<Service>) => void;
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Configuración de roles y sucursales por default para la experiencia fluida
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('branch-coyoacan');

  // React state vectors
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeSession, setActiveSession] = useState<CashSession | undefined>(undefined);

  // Cargar estado inicial desde el mock DB
  const refreshAll = () => {
    setBranches(mockDb.getBranches());
    setEmployees(mockDb.getEmployees());
    setServices(mockDb.getServices());
    setClients(mockDb.getClients());
    setAppointments(mockDb.getAppointments());
    setQueueItems(mockDb.getQueueItems(selectedBranchId));
    setProducts(mockDb.getProducts(selectedBranchId));
    setProviders(mockDb.getProviders());
    setSales(mockDb.getSales(selectedBranchId));
    setActiveSession(mockDb.getActiveCashSession(selectedBranchId));
  };

  useEffect(() => {
    refreshAll();
  }, [selectedBranchId]);

  // --- ACTIONS WITH MOCK DB SYNCHRONIZATION ---

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const res = mockDb.createClient(client);
    refreshAll();
    return res;
  };

  const addAppointment = (apt: Omit<Appointment, 'id' | 'createdAt'>) => {
    const res = mockDb.createAppointment(apt);
    refreshAll();
    return res;
  };

  const updateAptStatus = (id: string, status: any) => {
    mockDb.updateAppointmentStatus(id, status);
    refreshAll();
  };

  const updateApt = (id: string, updates: Partial<Appointment>) => {
    mockDb.updateAppointment(id, updates);
    refreshAll();
  };

  const addToQueue = (item: Omit<QueueItem, 'id' | 'joinedAt' | 'status'>) => {
    mockDb.addToQueue(item);
    refreshAll();
  };

  const updateQueueStatus = (id: string, status: any, employeeId?: string) => {
    mockDb.updateQueueStatus(id, status, employeeId);
    refreshAll();
  };

  const addSale = (sale: Omit<Sale, 'id' | 'createdAt' | 'date'>, items: any[]) => {
    const res = mockDb.createSale(sale, items);
    refreshAll();
    return res;
  };

  const openCash = (openingBalance: number) => {
    mockDb.openCashSession({
      branchId: selectedBranchId,
      employeeId: 'emp-sofia', // Sofía maneja caja por default en la demo
      openingBalance,
    });
    refreshAll();
  };

  const closeCash = (closingBalance: number, notes?: string) => {
    const session = mockDb.getActiveCashSession(selectedBranchId);
    if (session) {
      mockDb.closeCashSession(session.id, closingBalance, notes);
    }
    refreshAll();
  };

  const addCashMovement = (type: 'income' | 'expense', amount: number, reason: string) => {
    const session = mockDb.getActiveCashSession(selectedBranchId);
    if (session) {
      mockDb.createCashMovement({
        sessionId: session.id,
        type,
        amount,
        reason,
      });
    }
    refreshAll();
  };

  const addProduct = (prod: Omit<Product, 'id' | 'createdAt'>) => {
    mockDb.createProduct({ ...prod, branchId: selectedBranchId });
    refreshAll();
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    mockDb.updateProduct(id, updates);
    refreshAll();
  };

  const deleteProduct = (id: string) => {
    mockDb.deleteProduct(id);
    refreshAll();
  };

  const adjustProductStock = (productId: string, qty: number, reason: string) => {
    mockDb.adjustStock(selectedBranchId, productId, qty, reason, 'emp-carlos');
    refreshAll();
  };

  const addService = (ser: Omit<Service, 'id' | 'createdAt'>) => {
    mockDb.createService({ ...ser, tenantId: 'tenant-1' });
    refreshAll();
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    mockDb.updateService(id, updates);
    refreshAll();
  };

  const addEmployee = (emp: Omit<Employee, 'id' | 'createdAt'>) => {
    mockDb.createEmployee({ ...emp, branchId: selectedBranchId });
    refreshAll();
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    mockDb.updateEmployee(id, updates);
    refreshAll();
  };

  const deleteEmployee = (id: string) => {
    mockDb.deleteEmployee(id);
    refreshAll();
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        selectedBranchId,
        setSelectedBranchId,
        branches,
        employees,
        services,
        clients,
        appointments,
        queueItems,
        products,
        providers,
        sales,
        activeSession,
        refreshAll,
        addClient,
        addAppointment,
        updateAptStatus,
        updateApt,
        addToQueue,
        updateQueueStatus,
        addSale,
        openCash,
        closeCash,
        addCashMovement,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustProductStock,
        addService,
        updateService,
        addEmployee,
        updateEmployee,
        deleteEmployee,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
