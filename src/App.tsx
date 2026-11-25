/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, AppContextProps, BaseAppComponent } from './context/AppContext';
import { Layout } from './components/shared/Layout';
import { auditService } from './services/auditService';

// Client-facing Views
import { ClientBooking } from './components/client/ClientBooking';
import { ClientHistory } from './components/client/ClientHistory';
import { BranchInfo } from './components/client/BranchInfo';

// Administrative Views
import { Dashboard } from './components/admin/Dashboard';
import { CalendarView } from './components/admin/CalendarView';
import { SalesPOS } from './components/admin/SalesPOS';
import { InventoryAdmin } from './components/admin/InventoryAdmin';
import { PurchasesAdmin } from './components/admin/PurchasesAdmin';
import { ProvidersAdmin } from './components/admin/ProvidersAdmin';
import { ServicesAdmin } from './components/admin/ServicesAdmin';
import { StaffAdmin } from './components/admin/StaffAdmin';
import { ClientsAdmin } from './components/admin/ClientsAdmin';
import { SettingsAdmin } from './components/admin/SettingsAdmin';
import { WhatsAppReminders } from './components/admin/WhatsAppReminders';
import { AuditLogsAdmin } from './components/admin/AuditLogsAdmin';

interface WorkspaceSwitcherState {
  activeTab: string;
}

export class WorkspaceSwitcher extends BaseAppComponent<{}, WorkspaceSwitcherState> {
  private static readonly TAB_LABELS: Record<string, string> = {
    booking: 'Reservar Cita',
    'client-history': 'Mis Reservas',
    'branch-info': 'Sucursales',
    dashboard: 'Dashboard',
    calendar: 'Agenda',
    purchases: 'Compras',
    inventory: 'Inventario',
    pos: 'Caja',
    providers: 'Proveedores',
    services: 'Servicios',
    staff: 'Barberos',
    clients: 'Clientes',
    reminders: 'Recordatorios WhatsApp',
    settings: 'Parametrización',
    audit: 'Auditoría y Logs',
  };

  constructor(props: {}, context: AppContextProps) {
    super(props, context);
    const isAdmin = Boolean(context?.isAdminAuthenticated && context?.currentRole === 'admin');
    this.state = {
      activeTab: isAdmin ? 'dashboard' : 'booking',
    };
  }

  private handleSetActiveTab = (tab: string): void => {
    if (tab !== this.state.activeTab) {
      const label = WorkspaceSwitcher.TAB_LABELS[tab] || tab;
      auditService.recordPageEvent({
        tipoEvento: 'PAGE_VIEW',
        modulo: 'Navegación',
        sucursalId: this.app.selectedBranchId,
        resumen: `Acceso a vista "${label}" (${tab}).`,
        detalles: { previousTab: this.state.activeTab, activeTab: tab, label },
        nivel: 'INFO',
      });
    }
    this.setState({ activeTab: tab });
  };

  private renderActiveView(): React.ReactNode {
    const { activeTab } = this.state;
    const { currentRole, isAdminAuthenticated } = this.app;

    if (!isAdminAuthenticated || currentRole === 'client') {
      switch (activeTab) {
        case 'client-history':
          return <ClientHistory />;
        case 'branch-info':
          return <BranchInfo />;
        case 'booking':
        default:
          return <ClientBooking />;
      }
    }

    switch (activeTab) {
      case 'booking':
        return <ClientBooking />;
      case 'client-history':
        return <ClientHistory />;
      case 'branch-info':
        return <BranchInfo />;

      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
      case 'queue':
        return <CalendarView />;
      case 'pos':
        return <SalesPOS />;
      case 'inventory':
        return <InventoryAdmin />;
      case 'purchases':
        return <PurchasesAdmin />;
      case 'providers':
        return <ProvidersAdmin />;
      case 'services':
        return <ServicesAdmin />;
      case 'staff':
        return <StaffAdmin />;
      case 'clients':
        return <ClientsAdmin />;
      case 'reminders':
        return <WhatsAppReminders />;
      case 'settings':
        return <SettingsAdmin />;
      case 'audit':
        return <AuditLogsAdmin />;

      default:
        return <Dashboard />;
    }
  }

  public render(): React.ReactNode {
    return (
      <Layout activeTab={this.state.activeTab} setActiveTab={this.handleSetActiveTab}>
        {this.renderActiveView()}
      </Layout>
    );
  }
}

export default class App extends React.Component {
  public render(): React.ReactNode {
    return (
      <AppProvider>
        <WorkspaceSwitcher />
      </AppProvider>
    );
  }
}
