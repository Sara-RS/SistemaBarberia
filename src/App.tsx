/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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
import { ServicesAdmin } from './components/admin/ServicesAdmin';
import { StaffAdmin } from './components/admin/StaffAdmin';
import { ClientsAdmin } from './components/admin/ClientsAdmin';

const WorkspaceSwitcher: React.FC = () => {
  // Por default iniciamos en el Dashboard administrativo (el rol inicial es 'admin')
  const [activeTab, setActiveTab] = useState('dashboard');
  const { currentRole } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      // Client Views
      case 'booking':
        return <ClientBooking />;
      case 'client-history':
        return <ClientHistory />;
      case 'branch-info':
        return <BranchInfo />;

      // Admin Panel Views
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
      case 'queue':
        return <CalendarView />;
      case 'pos':
        return <SalesPOS />;
      case 'inventory':
        return <InventoryAdmin />;
      case 'services':
        return <ServicesAdmin />;
      case 'staff':
        return <StaffAdmin />;
      case 'clients':
        return <ClientsAdmin />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveView()}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <WorkspaceSwitcher />
    </AppProvider>
  );
}
