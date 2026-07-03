/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- ENUMS & CONSTANTS ---
export type UserRole = 'admin' | 'recep' | 'barber' | 'client';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type QueueStatus = 'waiting' | 'serving' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';
export type TransactionType = 'in' | 'out' | 'adjustment' | 'sale' | 'purchase';
export type CashSessionStatus = 'open' | 'closed';
export type CashMovementType = 'income' | 'expense';

// --- DOMAIN ENTITIES ---

export interface Tenant {
  id: string;
  name: string;
  logoUrl?: string;
  subdomain: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  phone: string;
  openingHours: {
    [key: string]: { open: string; close: string; active: boolean }; // key: 'monday', 'tuesday', etc.
  };
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Employee {
  id: string; // Refers to User.id or separate UUID
  branchId: string;
  userId?: string;
  fullName: string;
  phone: string;
  email: string;
  role: 'admin' | 'recep' | 'barber';
  specialties: string[]; // List of service category IDs or names
  commissionRate: number; // percentage (e.g. 0.30 for 30%)
  schedule: {
    [key: string]: { start: string; end: string; active: boolean; breaks: { start: string; end: string }[] };
  };
  vacations: { start: string; end: string }[];
  active: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  cleanupTime: number; // in minutes
  category: string; // e.g. 'Corte', 'Barba', 'Combo'
  color: string; // Hex or tailwind class for calendar representation
  imageUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  email: string;
  isRegistered: boolean; // registered auth user or walk-in client
  createdAt: string;
}

export interface Appointment {
  id: string;
  branchId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: AppointmentStatus;
  price: number;
  notes?: string;
  isWalkIn: boolean;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  branchId: string;
  fullName: string;
  phone: string;
  email?: string;
  employeeId?: string; // Optional (assigns to "first available" if null)
  serviceId: string;
  status: QueueStatus;
  joinedAt: string; // Date ISO string
  servedAt?: string; // Date ISO string
  estimatedWaitTime: number; // in minutes
  priority: 'normal' | 'high';
}

export interface Provider {
  id: string;
  tenantId: string;
  name: string;
  contactName?: string;
  phone: string;
  email: string;
  address?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  branchId: string;
  name: string;
  sku: string;
  description?: string;
  price: number; // selling price
  cost: number; // cost of purchase
  stock: number;
  minStock: number;
  category: string;
  providerId?: string;
  active: boolean;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  branchId: string;
  productId: string;
  type: TransactionType;
  quantity: number; // positive or negative
  reason: string; // 'sale', 'purchase', 'adjustment', etc.
  date: string;
  employeeId: string;
}

export interface Purchase {
  id: string;
  branchId: string;
  providerId: string;
  invoiceNumber?: string;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  date: string;
  items: PurchaseItem[];
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  cost: number;
}

export interface Sale {
  id: string;
  branchId: string;
  clientId?: string;
  cashierId: string; // employee who made the sale
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    cashAmount?: number;
    cardAmount?: number;
    transactionId?: string;
  };
  date: string; // ISO string
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  type: 'service' | 'product';
  itemId: string; // serviceId or productId
  quantity: number;
  price: number;
  employeeId?: string; // Barbero que realizó el servicio o vendió el producto (para comisiones)
  commissionAmount: number; // calculated commission
}

export interface CashSession {
  id: string;
  branchId: string;
  employeeId: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  status: CashSessionStatus;
  notes?: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  date: string;
}

export interface DashboardKPIs {
  todaySales: number;
  todaySalesGrowth: number; // percent
  todayAppointments: number;
  todayAppointmentsGrowth: number;
  activeClients: number;
  criticalStockCount: number;
}
