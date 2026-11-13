/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, BaseAppComponent } from './context/AppContext';
import { Layout } from './components/shared/Layout';

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

interface WorkspaceSwitcherState {
  activeTab: string;
}

export class WorkspaceSwitcher extends BaseAppComponent<{}, WorkspaceSwitcherState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      activeTab: 'dashboard',
    };
  }

  private handleSetActiveTab = (tab: string): void => {
    this.setState({ activeTab: tab });
  };

  private renderActiveView(): React.ReactNode {
    const { activeTab } = this.state;
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
