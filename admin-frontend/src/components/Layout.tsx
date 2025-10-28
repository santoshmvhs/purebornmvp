import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Page = 'dashboard' | 'products' | 'orders' | 'manufacturing' | 'analytics' | 'subscriptions' | 'emails' | 'logistics' | 'marketing' | 'customers' | 'realtime' | 'advanced-analytics';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  setCurrentPage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, setCurrentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();

      const menuItems: { id: Page; label: string; icon: string }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'products', label: 'Products', icon: '📦' },
        { id: 'orders', label: 'Orders', icon: '🛒' },
        { id: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'subscriptions', label: 'Subscriptions', icon: '🔄' },
        { id: 'emails', label: 'Email Management', icon: '📧' },
        { id: 'logistics', label: 'Logistics & Delivery', icon: '🚚' },
    { id: 'marketing', label: 'Marketing Dashboard', icon: '📈' },
    { id: 'customers', label: 'Customer Management', icon: '👥' },
    { id: 'realtime', label: 'Real-time Dashboard', icon: '⚡' },
    { id: 'advanced-analytics', label: 'Advanced Analytics', icon: '📊' },
      ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '280px' : '80px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center'
        }}>
          {sidebarOpen && (
            <div>
              <h1 className="text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>
                PUREBORN
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
                Admin Dashboard
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                width: '100%',
                background: currentPage === item.id 
                  ? 'rgba(102, 126, 234, 0.2)' 
                  : 'transparent',
                border: 'none',
                color: 'white',
                padding: sidebarOpen ? '15px 20px' : '15px',
                textAlign: sidebarOpen ? 'left' : 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: sidebarOpen ? '12px' : '0',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {sidebarOpen ? (
            <div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '15px'
              }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0 0 5px 0', fontWeight: '600' }}>
                  Welcome back!
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '14px' }}>
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ width: '100%', fontSize: '14px' }}
              >
                🚪 Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                color: 'white',
                cursor: 'pointer',
                width: '100%'
              }}
              title="Sign Out"
            >
              🚪
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        padding: '30px',
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
