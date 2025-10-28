import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';

interface BusinessAnalytics {
  sales: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    delivered_revenue: number;
    delivered_orders: number;
  };
  customers: {
    total_customers: number;
    new_customers_week: number;
    new_customers_month: number;
  };
  products: Array<{
    product_name: string;
    order_count: number;
    total_quantity_sold: number;
    total_revenue: number;
    average_price: number;
  }>;
  manufacturing: {
    total_batches: number;
    total_oil_produced: number;
    total_oil_bottled: number;
    avg_batch_size: number;
    quality_passed_batches: number;
    quality_pass_rate: number;
  };
  dailyTrend: Array<{
    date: string;
    orders: number;
    revenue: number;
    avg_order_value: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  oilTypes: Array<{
    oil_type: string;
    batch_count: number;
    total_produced: number;
    total_bottled: number;
    avg_production: number;
  }>;
  retention: {
    total_customers: number;
    repeat_customers: number;
    retention_rate: number;
  };
  inventory: Array<{
    product_name: string;
    total_stock: number;
    low_stock_variants: number;
    inventory_value: number;
  }>;
  growth: Array<{
    metric: string;
    current_period: number;
    previous_period: number;
  }>;
}

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'customers' | 'manufacturing' | 'inventory'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.get(`/analytics/business?period=${selectedPeriod}`);
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getGrowthColor = (rate: number) => {
    if (rate > 0) return '#10b981';
    if (rate < 0) return '#ef4444';
    return '#6b7280';
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    trend?: number;
    color?: string;
  }> = ({ title, value, subtitle, icon, trend, color = '#667eea' }) => (
    <div className="glass-card" style={{
      padding: '20px',
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
        opacity: 0.3
      }} />
      <div style={{ fontSize: '2.5rem', marginBottom: '10px', position: 'relative', zIndex: 1 }}>
        {icon}
      </div>
      <div style={{ 
        fontSize: '1.8rem', 
        fontWeight: '700', 
        color: 'white', 
        marginBottom: '5px',
        position: 'relative',
        zIndex: 1
      }}>
        {value}
      </div>
      <div style={{ 
        color: 'rgba(255, 255, 255, 0.8)', 
        fontSize: '14px',
        marginBottom: '5px',
        position: 'relative',
        zIndex: 1
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '12px',
          position: 'relative',
          zIndex: 1
        }}>
          {subtitle}
        </div>
      )}
      {trend !== undefined && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: `${getGrowthColor(trend)}20`,
          color: getGrowthColor(trend),
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );

  const ChartCard: React.FC<{
    title: string;
    children: React.ReactNode;
    subtitle?: string;
  }> = ({ title, children, subtitle }) => (
    <div className="glass-card" style={{ padding: '25px' }}>
      <h3 style={{ 
        color: 'white', 
        fontSize: '1.3rem', 
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '20px' }}>
          {subtitle}
        </p>
      )}
      {children}
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

  if (!analytics) {
    return (
      <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📊</div>
        <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
          No Analytics Data Available
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Analytics will appear here once you have orders and manufacturing data
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          📊 Business Analytics
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Advanced insights and KPIs for your cold-pressed oil business
        </p>
      </div>

      {/* Period Selector */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Time Period:</span>
          {['7', '30', '90', '365'].map((period) => (
            <button
              key={period}
              className={selectedPeriod === period ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setSelectedPeriod(period)}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {period === '365' ? '1 Year' : `${period} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'overview', label: '📈 Overview', icon: '📈' },
            { id: 'sales', label: '💰 Sales', icon: '💰' },
            { id: 'customers', label: '👥 Customers', icon: '👥' },
            { id: 'manufacturing', label: '🏭 Manufacturing', icon: '🏭' },
            { id: 'inventory', label: '📦 Inventory', icon: '📦' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '12px 20px', fontSize: '14px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(analytics.sales.total_revenue)}
              subtitle="All Time"
              icon="💰"
              color="#10b981"
            />
            <MetricCard
              title="Total Orders"
              value={formatNumber(analytics.sales.total_orders)}
              subtitle="Orders Placed"
              icon="🛒"
              color="#3b82f6"
            />
            <MetricCard
              title="Average Order Value"
              value={formatCurrency(analytics.sales.average_order_value)}
              subtitle="Per Order"
              icon="📊"
              color="#8b5cf6"
            />
            <MetricCard
              title="Total Customers"
              value={formatNumber(analytics.customers.total_customers)}
              subtitle="Registered Users"
              icon="👥"
              color="#f59e0b"
            />
          </div>

          {/* Secondary Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <MetricCard
              title="Oil Produced"
              value={`${formatNumber(analytics.manufacturing.total_oil_produced)} ml`}
              icon="🛢️"
              color="#06b6d4"
            />
            <MetricCard
              title="Oil Bottled"
              value={`${formatNumber(analytics.manufacturing.total_oil_bottled)} ml`}
              icon="🍾"
              color="#ec4899"
            />
            <MetricCard
              title="Quality Pass Rate"
              value={formatPercentage(analytics.manufacturing.quality_pass_rate)}
              icon="✅"
              color="#10b981"
            />
            <MetricCard
              title="Customer Retention"
              value={formatPercentage(analytics.retention.retention_rate)}
              icon="🔄"
              color="#6366f1"
            />
          </div>

          {/* Charts Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '25px',
            marginBottom: '30px'
          }}>
            <ChartCard title="📈 Daily Sales Trend" subtitle="Revenue and orders over time">
              <div style={{ height: '200px', display: 'flex', alignItems: 'end', gap: '4px', padding: '20px 0' }}>
                {analytics.dailyTrend.slice(-14).map((day, index) => {
                  const maxRevenue = Math.max(...analytics.dailyTrend.map(d => d.revenue));
                  const height = (day.revenue / maxRevenue) * 120;
                  return (
                    <div key={index} style={{
                      flex: 1,
                      height: `${height}px`,
                      background: 'linear-gradient(180deg, #667eea, #764ba2)',
                      borderRadius: '4px 4px 0 0',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scaleY(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scaleY(1)';
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '-25px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed'
                      }}>
                        {new Date(day.date).getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard title="🛒 Order Status Breakdown" subtitle="Distribution of order statuses">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics.statusBreakdown.map((status, index) => {
                  const total = analytics.statusBreakdown.reduce((sum, s) => sum + s.count, 0);
                  const percentage = (status.count / total) * 100;
                  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
                  
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        background: colors[index % colors.length],
                        borderRadius: '50%'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'white', fontSize: '14px', textTransform: 'capitalize' }}>
                            {status.status}
                          </span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                            {status.count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div style={{
                          height: '4px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '2px',
                          marginTop: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: colors[index % colors.length],
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </>
      )}

      {/* Sales Tab */}
      {activeTab === 'sales' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '25px'
        }}>
          <ChartCard title="🏆 Top Products" subtitle="Best performing products by revenue">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {analytics.products.slice(0, 5).map((product, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                      {product.product_name}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      {product.order_count} orders • {product.total_quantity_sold} units
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                      {formatCurrency(product.total_revenue)}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      {formatCurrency(product.average_price)} avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="📊 Sales Metrics" subtitle="Key sales performance indicators">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#10b981', fontWeight: '700' }}>
                  {formatCurrency(analytics.sales.delivered_revenue)}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                  Delivered Revenue
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#3b82f6', fontWeight: '700' }}>
                  {analytics.sales.delivered_orders}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                  Delivered Orders
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Manufacturing Tab */}
      {activeTab === 'manufacturing' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '25px'
        }}>
          <ChartCard title="🛢️ Oil Production by Type" subtitle="Production breakdown by oil type">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {analytics.oilTypes.map((oilType, index) => {
                const totalProduced = analytics.oilTypes.reduce((sum, ot) => sum + ot.total_produced, 0);
                const percentage = (oilType.total_produced / totalProduced) * 100;
                const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
                
                return (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div>
                      <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                        {oilType.oil_type}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                        {oilType.batch_count} batches
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#06b6d4', fontSize: '14px', fontWeight: '600' }}>
                        {formatNumber(oilType.total_produced)} ml
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="🏭 Manufacturing Metrics" subtitle="Production efficiency and quality">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#06b6d4', fontWeight: '700' }}>
                  {analytics.manufacturing.total_batches}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                  Total Batches
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#10b981', fontWeight: '700' }}>
                  {formatPercentage(analytics.manufacturing.quality_pass_rate)}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                  Quality Pass Rate
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#f59e0b', fontWeight: '700' }}>
                  {formatNumber(analytics.manufacturing.avg_batch_size)} ml
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                  Avg Batch Size
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '25px'
        }}>
          <ChartCard title="📦 Inventory Overview" subtitle="Current stock levels and values">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {analytics.inventory.slice(0, 5).map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                      {item.product_name}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      {item.total_stock} units in stock
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
                      {formatCurrency(item.inventory_value)}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      {item.low_stock_variants > 0 && '⚠️ Low Stock'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;