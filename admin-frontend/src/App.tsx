import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import ManufacturingPage from './pages/ManufacturingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import EmailManagementPage from './pages/EmailManagementPage';
import LogisticsPage from './pages/LogisticsPage';
import MarketingDashboard from './pages/MarketingDashboard';
import CustomerManagement from './pages/CustomerManagement';
import RealtimeDashboard from './pages/RealtimeDashboard';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import Layout from './components/Layout';
import './App.css';

type Page = 'dashboard' | 'products' | 'orders' | 'manufacturing' | 'analytics' | 'subscriptions' | 'emails' | 'logistics' | 'marketing' | 'customers' | 'realtime' | 'advanced-analytics';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || user?.role !== 'admin') {
    return <LoginPage />;
  }

      const renderPage = () => {
        switch (currentPage) {
          case 'dashboard':
            return <DashboardPage />;
          case 'products':
            return <ProductsPage />;
          case 'orders':
            return <OrdersPage />;
          case 'manufacturing':
            return <ManufacturingPage />;
          case 'analytics':
            return <AnalyticsPage />;
          case 'subscriptions':
            return <SubscriptionsPage />;
          case 'emails':
            return <EmailManagementPage />;
          case 'logistics':
            return <LogisticsPage />;
          case 'marketing':
            return <MarketingDashboard />;
          case 'customers':
            return <CustomerManagement />;
          case 'realtime':
            return <RealtimeDashboard />;
          case 'advanced-analytics':
            return <AdvancedAnalytics />;
          default:
            return <DashboardPage />;
        }
      };

  return (
    <Layout currentPage={currentPage} setCurrentPage={(page: string) => setCurrentPage(page as Page)}>
      {renderPage()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;