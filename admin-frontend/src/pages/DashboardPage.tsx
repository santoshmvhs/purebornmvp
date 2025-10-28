import React, { useState, useEffect } from 'react';

interface KPIData {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  monthlyRevenue: number;
  orderGrowth: number;
  revenueGrowth: number;
  avgOrderValue: number;
}

const DashboardPage: React.FC = () => {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    orderGrowth: 0,
    revenueGrowth: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call for KPI data
    const fetchKPIData = async () => {
      try {
        // Mock data - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setKpiData({
          totalSales: 2847500,
          totalOrders: 1247,
          totalProducts: 12,
          totalCustomers: 892,
          monthlyRevenue: 485600,
          orderGrowth: 23.5,
          revenueGrowth: 18.2,
          avgOrderValue: 2284
        });
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const KPICard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    trend?: number;
    color: string;
  }> = ({ title, value, subtitle, icon, trend, color }) => (
    <div className="glass-card" style={{
      padding: '25px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        {icon}
      </div>
      
      <h3 style={{
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </h3>
      
      <div style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: 'white',
        marginBottom: '5px'
      }}>
        {value}
      </div>
      
      {subtitle && (
        <div style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px'
        }}>
          {subtitle}
        </div>
      )}
      
      {trend && (
        <div style={{
          marginTop: '10px',
          padding: '4px 8px',
          background: trend > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: '6px',
          fontSize: '12px',
          color: trend > 0 ? '#22c55e' : '#ef4444',
          fontWeight: '600'
        }}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          Dashboard Overview
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Welcome to your premium business analytics center
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '25px',
        marginBottom: '40px'
      }}>
        <KPICard
          title="Total Sales"
          value={formatCurrency(kpiData.totalSales)}
          subtitle="All time revenue"
          icon="💰"
          trend={kpiData.revenueGrowth}
          color="#667eea"
        />
        
        <KPICard
          title="Total Orders"
          value={formatNumber(kpiData.totalOrders)}
          subtitle="Orders processed"
          icon="🛒"
          trend={kpiData.orderGrowth}
          color="#764ba2"
        />
        
        <KPICard
          title="Active Products"
          value={kpiData.totalProducts}
          subtitle="Products in catalog"
          icon="📦"
          color="#f093fb"
        />
        
        <KPICard
          title="Total Customers"
          value={formatNumber(kpiData.totalCustomers)}
          subtitle="Registered users"
          icon="👥"
          color="#4facfe"
        />
      </div>

      {/* Secondary Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
            📈 Monthly Revenue
          </h3>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {formatCurrency(kpiData.monthlyRevenue)}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Current month performance
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
            🎯 Average Order Value
          </h3>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {formatCurrency(kpiData.avgOrderValue)}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Per order average
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card" style={{ padding: '25px' }}>
        <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '20px' }}>
          ⚡ Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <button className="btn-primary" style={{ padding: '15px', fontSize: '14px' }}>
            📦 Add New Product
          </button>
          <button className="btn-secondary" style={{ padding: '15px', fontSize: '14px' }}>
            🏭 Start Production Batch
          </button>
          <button className="btn-secondary" style={{ padding: '15px', fontSize: '14px' }}>
            📊 View Analytics
          </button>
          <button className="btn-secondary" style={{ padding: '15px', fontSize: '14px' }}>
            🛒 Process Orders
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
