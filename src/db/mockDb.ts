/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompanyInfo,
  Tenant,
  Branch,
  User,
  Employee,
  Service,
  Client,
  Appointment,
  QueueItem,
  Provider,
  Product,
  InventoryTransaction,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  CashSession,
  CashMovement,
  AppointmentStatus,
  QueueStatus,
} from '../types';
import { getTodayStr, getOffsetDateStr } from '../utils/helpers';

export interface IDataRepository {
  getCompanyInfo(): CompanyInfo;
  updateCompanyInfo(updates: Partial<CompanyInfo>): CompanyInfo;
  getBranches(): Branch[];
  getEmployees(branchId?: string): Employee[];
  getServices(): Service[];
  getClients(): Client[];
  getAppointments(branchId?: string, dateStr?: string): Appointment[];
}

export class MockDatabase implements IDataRepository {
  private storageKey = 'barberia_josue_db_v1';

  // State
  private companyInfo: CompanyInfo = {
    id: 'tenant-1',
    name: 'Barbería "Josué"',
    slogan: 'Estilo, Corte & Tradición de Caballero',
    nitRuc: '1029384029',
    address: 'Av. 16 de Julio #1420, El Prado, La Paz, Bolivia',
    phone: '71523456',
    email: 'contacto@barberiajosue.bo',
    logoUrl: '',
    receiptFooterMsg: '¡Gracias por su preferencia en Barbería "Josué"! Vuelva pronto. Válido para reclamos dentro de las 24 hrs.',
    currencySymbol: 'Bs.',
    defaultCommission: 35,
  };
  private tenants: Tenant[] = [];
  private branches: Branch[] = [];
  private users: User[] = [];
  private employees: Employee[] = [];
  private services: Service[] = [];
  private clients: Client[] = [];
  private appointments: Appointment[] = [];
  private queueItems: QueueItem[] = [];
  private providers: Provider[] = [];
  private products: Product[] = [];
  private inventoryTransactions: InventoryTransaction[] = [];
  private purchases: Purchase[] = [];
  private sales: Sale[] = [];
  private saleItems: SaleItem[] = [];
  private cashSessions: CashSession[] = [];
  private cashMovements: CashMovement[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.companyInfo || parsed.informacionEmpresa) {
          this.companyInfo = { ...this.companyInfo, ...(parsed.companyInfo || parsed.informacionEmpresa) };
        }
        this.tenants = parsed.tenants || parsed.empresas || [];
        this.branches = parsed.branches || parsed.sucursales || [];
        this.users = parsed.users || parsed.usuarios || [];
        this.employees = parsed.employees || parsed.empleados || [];
        this.services = parsed.services || parsed.servicios || [];
        this.clients = parsed.clients || parsed.clientes || [];
        this.appointments = parsed.appointments || parsed.citas || [];
        this.queueItems = parsed.queueItems || parsed.turnosEspera || [];
        this.providers = parsed.providers || parsed.proveedores || [];
        this.products = parsed.products || parsed.productos || [];
        this.inventoryTransactions = parsed.inventoryTransactions || parsed.movimientosInventario || [];
        this.purchases = parsed.purchases || parsed.compras || [];
        this.sales = parsed.sales || parsed.ventas || [];
        this.saleItems = parsed.saleItems || parsed.detallesVenta || [];
        this.cashSessions = parsed.cashSessions || parsed.sesionesCaja || [];
        this.cashMovements = parsed.cashMovements || parsed.movimientosCaja || [];

        // Migración automática de fechas: Si no hay citas para hoy, adaptar las citas de prueba a la fecha presente
        const todayStr = getTodayStr();
        const hasTodayApt = this.appointments.some(a => a.date === todayStr);
        if (!hasTodayApt && this.appointments.length > 0) {
          this.appointments = this.appointments.map(a => {
            if (a.date === '2026-07-02' || !a.date) {
              return { ...a, date: todayStr };
            }
            return a;
          });
          this.save();
        }
        return;
      } catch (e) {
        console.error('Error al cargar la Base de Datos simulada, reiniciando datos...', e);
      }
    }
    this.seed();
  }

  public save() {
    const data = {
      // Tablas en Español
      informacionEmpresa: this.companyInfo,
      empresas: this.tenants,
      sucursales: this.branches,
      usuarios: this.users,
      empleados: this.employees,
      servicios: this.services,
      clientes: this.clients,
      citas: this.appointments,
      turnosEspera: this.queueItems,
      proveedores: this.providers,
      productos: this.products,
      movimientosInventario: this.inventoryTransactions,
      compras: this.purchases,
      ventas: this.sales,
      detallesVenta: this.saleItems,
      sesionesCaja: this.cashSessions,
      movimientosCaja: this.cashMovements,

      // Mapeo legacy
      companyInfo: this.companyInfo,
      tenants: this.tenants,
      branches: this.branches,
      users: this.users,
      employees: this.employees,
      services: this.services,
      clients: this.clients,
      appointments: this.appointments,
      queueItems: this.queueItems,
      providers: this.providers,
      products: this.products,
      inventoryTransactions: this.inventoryTransactions,
      purchases: this.purchases,
      sales: this.sales,
      saleItems: this.saleItems,
      cashSessions: this.cashSessions,
      cashMovements: this.cashMovements,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  public reset() {
    localStorage.removeItem(this.storageKey);
    this.seed();
  }

  private seed() {
    // --- 1. Tenants ---
    const tenantId = 'tenant-1';
    this.tenants = [
      {
        id: tenantId,
        name: 'Barbería "Josue"',
        subdomain: 'josue',
        logoUrl: '',
        createdAt: new Date('2026-01-01').toISOString(),
      },
    ];

    // --- 2. Branches ---
    const branch1Id = 'branch-coyoacan';
    this.branches = [
      {
        id: branch1Id,
        tenantId,
        name: 'Sucursal Central (La Paz)',
        address: 'Av. 16 de Julio, El Prado, La Paz, Bolivia',
        phone: '71523456',
        openingHours: {
          monday: { open: '09:00', close: '20:00', active: true },
          tuesday: { open: '09:00', close: '20:00', active: true },
          wednesday: { open: '09:00', close: '20:00', active: true },
          thursday: { open: '09:00', close: '21:00', active: true },
          friday: { open: '09:00', close: '21:00', active: true },
          saturday: { open: '09:00', close: '19:00', active: true },
          sunday: { open: '10:00', close: '16:00', active: true },
        },
        createdAt: new Date('2026-01-01').toISOString(),
      },
    ];

    // --- 3. Users ---
    this.users = [
      { id: 'user-carlos', email: 'carlos@barberia.com', role: 'admin', fullName: 'Carlos Gómez', phone: '71512222', createdAt: '2026-01-01' },
      { id: 'user-luis', email: 'luis@barberia.com', role: 'barber', fullName: 'Luis Morales', phone: '72534444', createdAt: '2026-01-10' },
      { id: 'user-sofia', email: 'sofia@barberia.com', role: 'recep', fullName: 'Sofía Martínez', phone: '73556666', createdAt: '2026-01-15' },
      { id: 'user-mateo', email: 'mateo@barberia.com', role: 'barber', fullName: 'Mateo Herrera', phone: '76578888', createdAt: '2026-02-01' },
    ];

    // --- 4. Employees (linked to Branch Coyoacán) ---
    this.employees = [
      {
        id: 'emp-carlos',
        branchId: branch1Id,
        userId: 'user-carlos',
        fullName: 'Carlos Gómez',
        phone: '71512222',
        email: 'carlos@barberia.com',
        role: 'admin',
        specialties: ['Corte', 'Barba', 'Afeitado Clásico'],
        commissionRate: 0.40, // 40% commission
        schedule: {
          monday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          tuesday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          wednesday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          thursday: { start: '12:00', end: '21:00', active: true, breaks: [{ start: '16:00', end: '17:00' }] },
          friday: { start: '12:00', end: '21:00', active: true, breaks: [{ start: '16:00', end: '17:00' }] },
          saturday: { start: '09:00', end: '19:00', active: true, breaks: [{ start: '13:00', end: '14:00' }] },
          sunday: { start: '10:00', end: '16:00', active: false, breaks: [] },
        },
        vacations: [],
        active: true,
        createdAt: '2026-01-01',
      },
      {
        id: 'emp-luis',
        branchId: branch1Id,
        userId: 'user-luis',
        fullName: 'Luis Morales',
        phone: '72534444',
        email: 'luis@barberia.com',
        role: 'barber',
        specialties: ['Corte', 'Diseño de Barba', 'Color'],
        commissionRate: 0.35, // 35% commission
        schedule: {
          monday: { start: '10:00', end: '20:00', active: true, breaks: [{ start: '15:00', end: '16:00' }] },
          tuesday: { start: '10:00', end: '20:00', active: true, breaks: [{ start: '15:00', end: '16:00' }] },
          wednesday: { start: '10:00', end: '20:00', active: false, breaks: [] },
          thursday: { start: '10:00', end: '20:00', active: true, breaks: [{ start: '15:00', end: '16:00' }] },
          friday: { start: '10:00', end: '20:00', active: true, breaks: [{ start: '15:00', end: '16:00' }] },
          saturday: { start: '09:00', end: '19:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          sunday: { start: '10:00', end: '16:00', active: true, breaks: [] },
        },
        vacations: [],
        active: true,
        createdAt: '2026-01-10',
      },
      {
        id: 'emp-mateo',
        branchId: branch1Id,
        userId: 'user-mateo',
        fullName: 'Mateo Herrera',
        phone: '76578888',
        email: 'mateo@barberia.com',
        role: 'barber',
        specialties: ['Corte', 'Barba', 'Tinte'],
        commissionRate: 0.30,
        schedule: {
          monday: { start: '09:00', end: '18:00', active: false, breaks: [] },
          tuesday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '13:00', end: '14:00' }] },
          wednesday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '13:00', end: '14:00' }] },
          thursday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '13:00', end: '14:00' }] },
          friday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '13:00', end: '14:00' }] },
          saturday: { start: '09:00', end: '19:00', active: true, breaks: [{ start: '13:00', end: '14:00' }] },
          sunday: { start: '10:00', end: '16:00', active: true, breaks: [] },
        },
        vacations: [],
        active: true,
        createdAt: '2026-02-01',
      },
      {
        id: 'emp-sofia',
        branchId: branch1Id,
        userId: 'user-sofia',
        fullName: 'Sofía Martínez',
        phone: '73556666',
        email: 'sofia@barberia.com',
        role: 'recep',
        specialties: [],
        commissionRate: 0.00,
        schedule: {
          monday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          tuesday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          wednesday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          thursday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          friday: { start: '09:00', end: '18:00', active: true, breaks: [{ start: '14:00', end: '15:00' }] },
          saturday: { start: '09:00', end: '19:00', active: true, breaks: [{ start: '13:00', end: '14:00' }] },
          sunday: { start: '10:00', end: '16:00', active: false, breaks: [] },
        },
        vacations: [],
        active: true,
        createdAt: '2026-01-15',
      },
    ];

    // --- 5. Services ---
    this.services = [
      {
        id: 'ser-corte',
        tenantId,
        codigo: 'SRV-001',
        code: 'SRV-001',
        name: 'Corte de Cabello Tradicional',
        description: 'Servicio de corte con tijera o máquina, incluye lavado con shampoo premium, toalla caliente y peinado con cera.',
        price: 35,
        duration: 45,
        cleanupTime: 10,
        category: 'Corte',
        color: '#3B82F6', // Blue
        active: true,
        createdAt: '2026-01-01',
      },
      {
        id: 'ser-barba',
        tenantId,
        codigo: 'SRV-002',
        code: 'SRV-002',
        name: 'Perfilado y Ritual de Barba',
        description: 'Ritual de afeitado tradicional con navaja libre, toalla caliente hidratante, aceites esenciales y masaje relajante.',
        price: 20,
        duration: 30,
        cleanupTime: 10,
        category: 'Barba',
        color: '#10B981', // Green
        active: true,
        createdAt: '2026-01-01',
      },
      {
        id: 'ser-combo',
        tenantId,
        codigo: 'SRV-003',
        code: 'SRV-003',
        name: 'Combo Corte + Perfilado de Barba',
        description: 'Nuestra firma. Servicio completo de corte de cabello clásico y ritual de barba completo. Ahorro especial.',
        price: 50,
        duration: 75,
        cleanupTime: 15,
        category: 'Combo',
        color: '#8B5CF6', // Purple
        active: true,
        createdAt: '2026-01-01',
      },
      {
        id: 'ser-facial',
        tenantId,
        codigo: 'SRV-004',
        code: 'SRV-004',
        name: 'Limpieza Facial Exfoliante',
        description: 'Tratamiento facial rápido con mascarilla negra, exfoliación suave, toalla tibia y crema revitalizante.',
        price: 20,
        duration: 25,
        cleanupTime: 5,
        category: 'Insumo',
        color: '#F59E0B', // Amber
        active: true,
        createdAt: '2026-01-15',
      },
    ];

    // --- 6. Clients ---
    this.clients = [
      { id: 'cli-juan', tenantId, fullName: 'Juan Pérez', phone: '70545555', email: 'juan.perez@example.com', isRegistered: true, createdAt: '2026-01-02' },
      { id: 'cli-andres', tenantId, fullName: 'Andrés López', phone: '70667777', email: 'andres.l@example.com', isRegistered: false, createdAt: '2026-01-12' },
      { id: 'cli-ricardo', tenantId, fullName: 'Ricardo Silva', phone: '70889999', email: 'ricardo.silva@example.com', isRegistered: true, createdAt: '2026-01-20' },
      { id: 'cli-miguel', tenantId, fullName: 'Miguel Ángel', phone: '70990000', email: 'miguel.angel@example.com', isRegistered: false, createdAt: '2026-02-10' },
    ];

    // --- 7. Appointments (Dynamic relative to today) ---
    const todayStr = getTodayStr();
    const yesterdayStr = getOffsetDateStr(-1);
    this.appointments = [
      {
        id: 'apt-1',
        branchId: branch1Id,
        clientId: 'cli-juan',
        employeeId: 'emp-luis',
        serviceId: 'ser-corte',
        date: todayStr,
        startTime: '09:30',
        endTime: '10:15',
        status: 'completed',
        price: 35,
        notes: 'Cliente prefiere cera mate.',
        isWalkIn: false,
        createdAt: `${todayStr}T09:00:00Z`,
      },
      {
        id: 'apt-2',
        branchId: branch1Id,
        clientId: 'cli-andres',
        employeeId: 'emp-carlos',
        serviceId: 'ser-combo',
        date: todayStr,
        startTime: '10:30',
        endTime: '11:45',
        status: 'confirmed',
        price: 50,
        notes: 'Viene por primera vez.',
        isWalkIn: false,
        createdAt: `${todayStr}T09:30:00Z`,
      },
      {
        id: 'apt-3',
        branchId: branch1Id,
        clientId: 'cli-ricardo',
        employeeId: 'emp-luis',
        serviceId: 'ser-barba',
        date: todayStr,
        startTime: '12:00',
        endTime: '12:30',
        status: 'confirmed',
        price: 20,
        notes: '',
        isWalkIn: false,
        createdAt: `${todayStr}T08:00:00Z`,
      },
      {
        id: 'apt-4',
        branchId: branch1Id,
        clientId: 'cli-miguel',
        employeeId: 'emp-mateo',
        serviceId: 'ser-corte',
        date: todayStr,
        startTime: '15:30',
        endTime: '16:15',
        status: 'pending',
        price: 35,
        isWalkIn: false,
        createdAt: `${todayStr}T10:00:00Z`,
      },
      // Un no-show previo
      {
        id: 'apt-prev',
        branchId: branch1Id,
        clientId: 'cli-juan',
        employeeId: 'emp-mateo',
        serviceId: 'ser-barba',
        date: yesterdayStr,
        startTime: '11:00',
        endTime: '11:30',
        status: 'no-show',
        price: 20,
        isWalkIn: false,
        createdAt: `${yesterdayStr}T10:00:00Z`,
      },
    ];

    // --- 8. Queue Items (Walk-In Fila de Espera) ---
    this.queueItems = [
      {
        id: 'q-1',
        branchId: branch1Id,
        fullName: 'Roberto Mendoza',
        phone: '70432211',
        email: 'roberto@example.com',
        employeeId: 'emp-luis', // Esperando a Luis
        serviceId: 'ser-corte',
        status: 'waiting',
        joinedAt: new Date().toISOString(),
        estimatedWaitTime: 15,
        priority: 'normal',
      },
      {
        id: 'q-2',
        branchId: branch1Id,
        fullName: 'Alejandro Ruiz',
        phone: '70987766',
        employeeId: undefined, // Cualquiera disponible
        serviceId: 'ser-barba',
        status: 'waiting',
        joinedAt: new Date(Date.now() - 5 * 60000).toISOString(),
        estimatedWaitTime: 25,
        priority: 'normal',
      },
    ];

    // --- 9. Providers ---
    const provider1Id = 'prov-barbersupply';
    const provider2Id = 'prov-stylecosmetics';
    this.providers = [
      {
        id: provider1Id,
        tenantId,
        name: 'Distribuidora Barber-Supply La Paz',
        contactName: 'Ing. Eduardo Pérez',
        phone: '79501111',
        email: 'ventas@barbersupply.bo',
        address: 'Av. Franco Valle, El Alto, La Paz, Bolivia',
        createdAt: '2026-01-05',
      },
      {
        id: provider2Id,
        tenantId,
        name: 'Cosméticos BarberStyle Bolivia',
        contactName: 'Lic. Laura Juárez',
        phone: '78402222',
        email: 'pedidos@barberstyle.bo',
        address: 'Calle Sagárnaga 120, Zona Central, La Paz, Bolivia',
        createdAt: '2026-01-10',
      },
    ];

    // --- 10. Products (Inventario) ---
    this.products = [
      {
        id: 'prod-cera',
        branchId: branch1Id,
        name: 'Cera Barber Pomade Matte 100g',
        sku: 'BARB-POM-MAT-01',
        description: 'Cera base agua de fijación fuerte y acabado mate natural.',
        price: 180,
        cost: 95,
        stock: 24,
        minStock: 5,
        category: 'Estilizado',
        providerId: provider2Id,
        active: true,
        createdAt: '2026-01-15',
      },
      {
        id: 'prod-aceite',
        branchId: branch1Id,
        name: 'Aceite de Barba Premium Oud 30ml',
        sku: 'BARB-OIL-OUD-02',
        description: 'Nutre y suaviza la barba con una fragancia mística y sofisticada a madera de Oud.',
        price: 220,
        cost: 110,
        stock: 3, // Stock crítico! Alerta en dashboard
        minStock: 6,
        category: 'Cuidado Facial',
        providerId: provider1Id,
        active: true,
        createdAt: '2026-01-15',
      },
      {
        id: 'prod-shampoo',
        branchId: branch1Id,
        name: 'Shampoo Anticaída Tea Tree 250ml',
        sku: 'BARB-SHA-TTR-03',
        description: 'Shampoo tonificante con extracto de árbol de té que estimula el folículo.',
        price: 290,
        cost: 145,
        stock: 15,
        minStock: 4,
        category: 'Cuidado Capilar',
        providerId: provider2Id,
        active: true,
        createdAt: '2026-01-20',
      },
    ];

    // --- 11. Purchases ---
    this.purchases = [
      {
        id: 'pur-1',
        branchId: branch1Id,
        providerId: provider1Id,
        invoiceNumber: 'FAC-2026-904',
        status: 'completed',
        paymentMethod: 'transfer',
        notes: 'Abastecimiento mensual de productos de styling y cuidado.',
        total: 2600,
        date: '2026-06-15',
        items: [
          {
            id: 'pitem-1',
            purchaseId: 'pur-1',
            productId: 'prod-cera',
            quantity: 20,
            cost: 95,
            profitMargin: 89.47,
            salePrice: 180,
            updateSalePrice: true,
          },
          {
            id: 'pitem-2',
            purchaseId: 'pur-1',
            productId: 'prod-aceite',
            quantity: 10,
            cost: 110,
            profitMargin: 100,
            salePrice: 220,
            updateSalePrice: true,
          },
        ],
        createdAt: '2026-06-15T12:00:00Z',
      },
      {
        id: 'pur-2',
        branchId: branch1Id,
        providerId: provider2Id,
        invoiceNumber: 'FAC-2026-918',
        status: 'completed',
        paymentMethod: 'cash',
        notes: 'Pedido de shampoo profesional y tónicos capilares.',
        total: 1450,
        date: '2026-07-02',
        items: [
          {
            id: 'pitem-3',
            purchaseId: 'pur-2',
            productId: 'prod-shampoo',
            quantity: 10,
            cost: 145,
            profitMargin: 100,
            salePrice: 290,
            updateSalePrice: true,
          },
        ],
        createdAt: '2026-07-02T10:30:00Z',
      },
    ];

    // --- 12. Sales (Histórico) ---
    this.sales = [
      {
        id: 'sal-1',
        branchId: branch1Id,
        clientId: 'cli-juan',
        cashierId: 'emp-sofia',
        subtotal: 215,
        discount: 0,
        tax: 0,
        tip: 10,
        total: 225,
        paymentMethod: 'cash',
        date: `${todayStr}T10:30:00Z`,
        createdAt: `${todayStr}T10:30:00Z`,
      },
      {
        id: 'sal-2',
        branchId: branch1Id,
        clientId: 'cli-andres',
        cashierId: 'emp-sofia',
        subtotal: 180,
        discount: 0,
        tax: 0,
        tip: 15,
        total: 195,
        paymentMethod: 'transfer',
        date: `${yesterdayStr}T16:20:00Z`,
        createdAt: `${yesterdayStr}T16:20:00Z`,
      },
    ];

    this.saleItems = [
      {
        id: 'sitem-1',
        saleId: 'sal-1',
        type: 'service',
        itemId: 'ser-corte',
        quantity: 1,
        price: 35,
        employeeId: 'emp-luis',
        commissionAmount: 14,
      },
      {
        id: 'sitem-2',
        saleId: 'sal-1',
        type: 'product',
        itemId: 'prod-cera',
        quantity: 1,
        price: 180,
        employeeId: 'emp-luis',
        commissionAmount: 0,
      },
    ];

    // --- 13. Cash Session (Open session for today) ---
    this.cashSessions = [
      {
        id: 'sess-today',
        branchId: branch1Id,
        employeeId: 'emp-sofia',
        openedAt: `${todayStr}T08:30:00Z`,
        openingBalance: 200,
        status: 'open',
        createdAt: `${todayStr}T08:30:00Z`,
      },
    ];

    // --- 14. Cash Movements ---
    this.cashMovements = [
      {
        id: 'mov-1',
        sessionId: 'sess-today',
        type: 'income',
        amount: 225,
        reason: 'Ingreso por Venta POS #sal-1',
        date: `${todayStr}T10:30:00Z`,
      },
    ];

    this.save();
  }

  // --- QUERY APIS (Simulates PostgreSQL SELECTs & JOINs) ---

  public getTenants(): Tenant[] { return this.tenants; }
  public getBranches(): Branch[] { return this.branches; }
  public getUsers(): User[] { return this.users; }
  
  public getEmployees(branchId?: string): Employee[] {
    return branchId ? this.employees.filter(e => e.branchId === branchId) : this.employees;
  }
  
  public getServices(): Service[] {
    return this.services.filter(s => s.active);
  }

  public getClients(): Client[] { return this.clients; }

  public getAppointments(branchId?: string, date?: string): Appointment[] {
    let filtered = this.appointments;
    if (branchId) filtered = filtered.filter(a => a.branchId === branchId);
    if (date) filtered = filtered.filter(a => a.date === date);
    return filtered;
  }

  public getQueueItems(branchId?: string): QueueItem[] {
    let filtered = this.queueItems;
    if (branchId) filtered = filtered.filter(q => q.branchId === branchId);
    return filtered.filter(q => q.status === 'waiting' || q.status === 'serving');
  }

  public getProducts(branchId?: string): Product[] {
    return branchId ? this.products.filter(p => p.branchId === branchId && p.active) : this.products;
  }

  public getProviders(): Provider[] { return this.providers; }

  public getPurchases(branchId?: string): Purchase[] {
    return branchId ? this.purchases.filter(p => p.branchId === branchId) : this.purchases;
  }

  public getSales(branchId?: string): Sale[] {
    return branchId ? this.sales.filter(s => s.branchId === branchId) : this.sales;
  }

  public getSaleItems(saleId: string): SaleItem[] {
    return this.saleItems.filter(si => si.saleId === saleId);
  }

  public getActiveCashSession(branchId: string): CashSession | undefined {
    return this.cashSessions.find(s => s.branchId === branchId && s.status === 'open');
  }

  public getCashMovements(sessionId: string): CashMovement[] {
    return this.cashMovements.filter(m => m.sessionId === sessionId);
  }

  // --- MUTATION APIS (Simulates SQL INSERT/UPDATE/DELETE) ---

  // Auth/Users
  public createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.save();
    return newUser;
  }

  // Clients
  public createClient(client: Omit<Client, 'id' | 'createdAt'>): Client {
    // Evitar duplicados por email o teléfono
    const existing = this.clients.find(c => c.tenantId === client.tenantId && (c.email === client.email || c.phone === client.phone));
    if (existing) {
      return existing;
    }

    const newClient: Client = {
      ...client,
      id: `cli-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.clients.push(newClient);
    this.save();
    return newClient;
  }

  // Appointments
  public createAppointment(apt: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
    // Simple double-booking check
    const isDoubleBooked = this.appointments.some(
      a => a.employeeId === apt.employeeId &&
           a.date === apt.date &&
           a.status !== 'cancelled' &&
           ((apt.startTime >= a.startTime && apt.startTime < a.endTime) ||
            (apt.endTime > a.startTime && apt.endTime <= a.endTime))
    );

    if (isDoubleBooked) {
      throw new Error('Doble reserva detectada: El barbero seleccionado ya tiene una cita reservada en este bloque horario.');
    }

    const newApt: Appointment = {
      ...apt,
      id: `apt-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.appointments.push(newApt);
    this.save();
    return newApt;
  }

  public updateAppointmentStatus(id: string, status: AppointmentStatus): Appointment {
    const idx = this.appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Cita no encontrada');
    this.appointments[idx].status = status;
    this.save();
    return this.appointments[idx];
  }

  public updateAppointment(id: string, updates: Partial<Appointment>): Appointment {
    const idx = this.appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Cita no encontrada');
    this.appointments[idx] = { ...this.appointments[idx], ...updates } as Appointment;
    this.save();
    return this.appointments[idx];
  }

  // Queue (Walk-In)
  public addToQueue(item: Omit<QueueItem, 'id' | 'joinedAt' | 'status'>): QueueItem {
    const newItem: QueueItem = {
      ...item,
      id: `q-${Math.random().toString(36).substr(2, 9)}`,
      status: 'waiting',
      joinedAt: new Date().toISOString(),
    };
    this.queueItems.push(newItem);
    this.save();
    return newItem;
  }

  public updateQueueStatus(id: string, status: QueueStatus, employeeId?: string): QueueItem {
    const idx = this.queueItems.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Turno no encontrado');
    this.queueItems[idx].status = status;
    if (status === 'serving') {
      this.queueItems[idx].servedAt = new Date().toISOString();
      if (employeeId) this.queueItems[idx].employeeId = employeeId;
    }
    this.save();
    return this.queueItems[idx];
  }

  // Services
  public createService(ser: Omit<Service, 'id' | 'createdAt'>): Service {
    const generatedCode = ser.codigo || ser.code || `SRV-${String(this.services.length + 1).padStart(3, '0')}`;
    const newService: Service = {
      ...ser,
      codigo: generatedCode,
      code: generatedCode,
      id: `ser-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.services.push(newService);
    this.save();
    return newService;
  }

  public updateService(id: string, updates: Partial<Service>): Service {
    const idx = this.services.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Servicio no encontrado');
    const updatedCode = updates.codigo || updates.code || this.services[idx].codigo || this.services[idx].code;
    this.services[idx] = {
      ...this.services[idx],
      ...updates,
      codigo: updatedCode,
      code: updatedCode,
    } as Service;
    this.save();
    return this.services[idx];
  }

  // Inventory
  public createProduct(prod: Omit<Product, 'id' | 'createdAt'>): Product {
    const newProd: Product = {
      ...prod,
      id: `prod-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.products.push(newProd);
    this.save();
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const idx = this.products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Producto no encontrado');
    this.products[idx] = { ...this.products[idx], ...updates } as Product;
    this.save();
    return this.products[idx];
  }

  public deleteProduct(id: string): void {
    this.products = this.products.filter(p => p.id !== id);
    this.save();
  }

  public adjustStock(branchId: string, productId: string, qty: number, reason: string, employeeId: string) {
    const prodIdx = this.products.findIndex(p => p.id === productId);
    if (prodIdx === -1) throw new Error('Producto no encontrado');
    
    this.products[prodIdx].stock += qty;
    if (this.products[prodIdx].stock < 0) {
      this.products[prodIdx].stock = 0; // Guard clause for negative stock
    }

    const tx: InventoryTransaction = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      branchId,
      productId,
      type: qty > 0 ? 'in' : 'out',
      quantity: qty,
      reason,
      date: new Date().toISOString(),
      employeeId,
    };
    this.inventoryTransactions.push(tx);
    this.save();
  }

  // Providers & Purchases
  public createProvider(prov: Omit<Provider, 'id' | 'createdAt'>): Provider {
    const newProv: Provider = {
      ...prov,
      id: `prov-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.providers.push(newProv);
    this.save();
    return newProv;
  }

  public updateProvider(id: string, updates: Partial<Provider>): Provider {
    const idx = this.providers.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Proveedor no encontrado');
    this.providers[idx] = { ...this.providers[idx], ...updates } as Provider;
    this.save();
    return this.providers[idx];
  }

  public deleteProvider(id: string): void {
    this.providers = this.providers.filter(p => p.id !== id);
    this.save();
  }

  public createPurchase(
    pur: Omit<Purchase, 'id' | 'createdAt' | 'total'>,
    items: (Omit<PurchaseItem, 'id' | 'purchaseId'> & {
      profitMargin?: number;
      salePrice?: number;
      updateSalePrice?: boolean;
    })[]
  ): Purchase {
    const purchaseId = `pur-${Math.random().toString(36).substr(2, 9)}`;
    const computedTotal = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.cost || 0)), 0);
    
    const mappedItems: PurchaseItem[] = items.map(item => ({
      ...item,
      id: `pitem-${Math.random().toString(36).substr(2, 9)}`,
      purchaseId,
    }));

    const newPur: Purchase = {
      ...pur,
      id: purchaseId,
      total: computedTotal,
      items: mappedItems,
      createdAt: new Date().toISOString(),
    };

    this.purchases.unshift(newPur);

    // Si la compra se marca completada o por defecto, aumentar automáticamente el inventario y actualizar costo/precio si se solicita
    if (pur.status === 'completed' || !pur.status) {
      items.forEach(item => {
        const branchId = pur.branchId || 'branch-coyoacan';
        if (item.productId && item.quantity > 0) {
          // Aumentar existencia en el inventario
          this.adjustStock(
            branchId,
            item.productId,
            item.quantity,
            `Compra Factura/Recibo #${pur.invoiceNumber || purchaseId}`,
            'emp-carlos'
          );

          // Actualizar costo del producto y precio de venta de acuerdo al margen de utilidad
          const prodIdx = this.products.findIndex(p => p.id === item.productId);
          if (prodIdx !== -1) {
            if (item.cost && item.cost > 0) {
              this.products[prodIdx].cost = item.cost;
            }
            if (item.updateSalePrice && item.salePrice && item.salePrice > 0) {
              this.products[prodIdx].price = item.salePrice;
            }
            if (pur.providerId) {
              this.products[prodIdx].providerId = pur.providerId;
            }
          }
        }
      });
    }

    this.save();
    return newPur;
  }

  public deletePurchase(id: string): void {
    this.purchases = this.purchases.filter(p => p.id !== id);
    this.save();
  }

  // Sales (POS)
  public createSale(sale: Omit<Sale, 'id' | 'createdAt' | 'date'>, items: { type: 'service' | 'product'; itemId: string; quantity: number; price: number; employeeId?: string }[]): Sale {
    const saleId = `sal-${Math.random().toString(36).substr(2, 9)}`;
    const nowIso = new Date().toISOString();

    const activeSession = this.getActiveCashSession(sale.branchId);
    if (!activeSession) {
      throw new Error('No es posible realizar ventas: La caja de la sucursal está cerrada. Por favor abra caja primero.');
    }

    const mappedItems: SaleItem[] = items.map(item => {
      let commission = 0;
      if (item.type === 'service' && item.employeeId) {
        const emp = this.employees.find(e => e.id === item.employeeId);
        if (emp) {
          commission = item.price * item.quantity * emp.commissionRate;
        }
      }
      return {
        id: `sitem-${Math.random().toString(36).substr(2, 9)}`,
        saleId,
        type: item.type,
        itemId: item.itemId,
        quantity: item.quantity,
        price: item.price,
        employeeId: item.employeeId,
        commissionAmount: Number(commission.toFixed(2)),
      };
    });

    const newSale: Sale = {
      ...sale,
      id: saleId,
      date: nowIso,
      createdAt: nowIso,
    };

    this.sales.push(newSale);
    this.saleItems.push(...mappedItems);

    // Ajustar inventario si se vendieron productos
    mappedItems.forEach(item => {
      if (item.type === 'product') {
        this.adjustStock(sale.branchId, item.itemId, -item.quantity, `Venta POS #${saleId}`, sale.cashierId);
      }
    });

    // Registrar ingreso en sesión de caja activa
    const movement: CashMovement = {
      id: `mov-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: activeSession.id,
      type: 'income',
      amount: sale.total,
      reason: `Venta POS #${saleId}`,
      date: nowIso,
    };
    this.cashMovements.push(movement);

    this.save();
    return newSale;
  }

  // Cash Registers
  public openCashSession(session: Omit<CashSession, 'id' | 'status' | 'openedAt' | 'createdAt'>): CashSession {
    const active = this.getActiveCashSession(session.branchId);
    if (active) throw new Error('Ya existe una sesión de caja abierta en esta sucursal.');

    const newSession: CashSession = {
      ...session,
      id: `sess-${Math.random().toString(36).substr(2, 9)}`,
      status: 'open',
      openedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.cashSessions.push(newSession);
    this.save();
    return newSession;
  }

  public closeCashSession(sessionId: string, closingBalance: number, notes?: string): CashSession {
    const idx = this.cashSessions.findIndex(s => s.id === sessionId);
    if (idx === -1) throw new Error('Sesión de caja no encontrada');
    if (this.cashSessions[idx].status === 'closed') throw new Error('La sesión ya está cerrada');

    // Calcular balance esperado
    const session = this.cashSessions[idx];
    const movements = this.getCashMovements(sessionId);
    const income = movements.filter(m => m.type === 'income').reduce((acc, m) => acc + m.amount, 0);
    const expense = movements.filter(m => m.type === 'expense').reduce((acc, m) => acc + m.amount, 0);
    const expected = session.openingBalance + income - expense;

    this.cashSessions[idx].status = 'closed';
    this.cashSessions[idx].closedAt = new Date().toISOString();
    this.cashSessions[idx].closingBalance = closingBalance;
    this.cashSessions[idx].expectedBalance = expected;
    this.cashSessions[idx].notes = notes;

    this.save();
    return this.cashSessions[idx];
  }

  public createCashMovement(mov: Omit<CashMovement, 'id' | 'date'>): CashMovement {
    const session = this.cashSessions.find(s => s.id === mov.sessionId && s.status === 'open');
    if (!session) throw new Error('No se pueden registrar movimientos en una sesión de caja cerrada.');

    const newMov: CashMovement = {
      ...mov,
      id: `mov-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
    };
    this.cashMovements.push(newMov);
    this.save();
    return newMov;
  }

  // Employees
  public createEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Employee {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    this.employees.push(newEmp);
    this.save();
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Employee>): Employee {
    const idx = this.employees.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Empleado no encontrado');
    this.employees[idx] = { ...this.employees[idx], ...updates } as Employee;
    this.save();
    return this.employees[idx];
  }

  public deleteEmployee(id: string): void {
    this.employees = this.employees.filter(e => e.id !== id);
    this.save();
  }

  // Company / Institution Settings
  public getCompanyInfo(): CompanyInfo {
    return { ...this.companyInfo };
  }

  public updateCompanyInfo(updates: Partial<CompanyInfo>): CompanyInfo {
    this.companyInfo = { ...this.companyInfo, ...updates };
    // Synchronize tenant name
    if (updates.name && this.tenants.length > 0) {
      this.tenants[0].name = updates.name;
    }
    this.save();
    return { ...this.companyInfo };
  }
}

export const mockDb = new MockDatabase();
export default mockDb;
