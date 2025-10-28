import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';
import './AdvancedAnalytics.css';

interface BusinessIntelligence {
  revenue: {
    revenue: number;
    orders: number;
    avg_order_value: number;
    unique_customers: number;
    prev_revenue: number;
    revenue_growth_percentage: number;
    orders_growth_percentage: number;
  };
  customers: {
    total_customers: number;
    new_customers: number;
    active_customers: number;
    purchasing_customers: number;
    avg_customer_value: number;
    high_value_customers: number;
    medium_value_customers: number;
    low_value_customers: number;
  };
  products: Array<{
    id: string;
    name: string;
    sku: string;
    total_orders: number;
    total_quantity_sold: number;
    total_revenue: number;
    avg_rating: number;
    review_count: number;
  }>;
  geographic: Array<{
    state: string;
    city: string;
    customer_count: number;
    order_count: number;
    total_revenue: number;
    avg_order_value: number;
  }>;
  timeSeries: Array<{
    date: string;
    orders: number;
    revenue: number;
    avg_order_value: number;
    unique_customers: number;
  }>;
  manufacturing: {
    total_batches: number;
    total_produced: number;
    avg_quality_score: number;
    completed_batches: number;
    high_quality_batches: number;
  };
  subscriptions: {
    total_subscriptions: number;
    active_subscriptions: number;
    paused_subscriptions: number;
    cancelled_subscriptions: number;
    monthly_recurring_revenue: number;
  };
}

interface KPIDashboard {
  kpis: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    unique_customers: number;
    total_customers: number;
    new_customers: number;
    active_customers: number;
    batches_produced: number;
    total_production: number;
    avg_quality: number;
    total_subscriptions: number;
    active_subscriptions: number;
    revenue_per_customer: number;
    orders_per_customer: number;
    customer_growth_rate: number;
    quality_performance_rate: number;
  };
  trends: Array<{
    period_type: string;
    data: Array<{
      date?: string;
      week?: string;
      orders: number;
      revenue: number;
      customers: number;
    }>;
  }>;
  benchmarks: Array<{
    metric: string;
    target: number;
    actual: number;
    achievement_percentage: number;
  }>;
}

interface PredictiveAnalytics {
  salesForecast: Array<{
    month: string;
    revenue: number;
    orders: number;
    customers: number;
    avg_revenue: number;
    revenue_stddev: number;
    revenue_z_score: number;
  }>;
  customerLTV: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    total_orders: number;
    total_spent: number;
    avg_order_value: number;
    customer_lifespan_days: number;
    monthly_value: number;
    predicted_annual_value: number;
    customer_segment: string;
  }>;
  inventoryDemand: Array<{
    id: string;
    name: string;
    sku: string;
    total_demand: number;
    demand_frequency: number;
    total_stock: number;
    stock_turnover_rate: number;
    days_of_inventory: number;
    inventory_status: string;
  }>;
  seasonalAnalysis: Array<{
    month: number;
    quarter: number;
    orders: number;
    revenue: number;
    avg_order_value: number;
    unique_customers: number;
  }>;
}

const AdvancedAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bi' | 'kpi' | 'predictive' | 'custom'>('bi');
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessIntelligence, setBusinessIntelligence] = useState<BusinessIntelligence | null>(null);
  const [kpiDashboard, setKpiDashboard] = useState<KPIDashboard | null>(null);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<PredictiveAnalytics | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedPeriod]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'bi':
          const biResponse = await adminApi.get(`/advanced-analytics/business-intelligence?period=${selectedPeriod}`);
          if (biResponse.data.success) {
            setBusinessIntelligence(biResponse.data.analytics);
          }
          break;
        case 'kpi':
          const kpiResponse = await adminApi.get(`/advanced-analytics/kpi-dashboard?period=${selectedPeriod}`);
          if (kpiResponse.data.success) {
            setKpiDashboard(kpiResponse.data);
          }
          break;
        case 'predictive':
          const predictiveResponse = await adminApi.get(`/advanced-analytics/predictive?period=${selectedPeriod}`);
          if (predictiveResponse.data.success) {
            setPredictiveAnalytics(predictiveResponse.data.analytics);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load analytics data.');
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

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return '#10b981';
    if (value < 0) return '#ef4444';
    return '#6b7280';
  };

  const renderBusinessIntelligence = () => {
    if (!businessIntelligence) return null;

    return (
      <div className="bi-content">
        {/* Revenue Overview */}
        <div className="analytics-section">
          <h3>💰 Revenue Analytics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <h4>Total Revenue</h4>
                <span className="growth-indicator" style={{ color: getGrowthColor(businessIntelligence.revenue.revenue_growth_percentage) }}>
                  {formatPercentage(businessIntelligence.revenue.revenue_growth_percentage)}
                </span>
              </div>
              <div className="metric-value">{formatCurrency(businessIntelligence.revenue.revenue)}</div>
              <div className="metric-subtitle">vs {formatCurrency(businessIntelligence.revenue.prev_revenue)} previous period</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h4>Total Orders</h4>
                <span className="growth-indicator" style={{ color: getGrowthColor(businessIntelligence.revenue.orders_growth_percentage) }}>
                  {formatPercentage(businessIntelligence.revenue.orders_growth_percentage)}
                </span>
              </div>
              <div className="metric-value">{businessIntelligence.revenue.orders}</div>
              <div className="metric-subtitle">Average: {formatCurrency(businessIntelligence.revenue.avg_order_value)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h4>Unique Customers</h4>
              </div>
              <div className="metric-value">{businessIntelligence.revenue.unique_customers}</div>
              <div className="metric-subtitle">Active purchasers</div>
            </div>
          </div>
        </div>

        {/* Customer Analytics */}
        <div className="analytics-section">
          <h3>👥 Customer Analytics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <h4>Total Customers</h4>
              </div>
              <div className="metric-value">{businessIntelligence.customers.total_customers}</div>
              <div className="metric-subtitle">Registered customers</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h4>New Customers</h4>
              </div>
              <div className="metric-value">{businessIntelligence.customers.new_customers}</div>
              <div className="metric-subtitle">Last {selectedPeriod} days</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h4>Active Customers</h4>
              </div>
              <div className="metric-value">{businessIntelligence.customers.active_customers}</div>
              <div className="metric-subtitle">Last 7 days</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h4>Avg Customer Value</h4>
              </div>
              <div className="metric-value">{formatCurrency(businessIntelligence.customers.avg_customer_value)}</div>
              <div className="metric-subtitle">Lifetime value</div>
            </div>
          </div>

          {/* Customer Segmentation */}
          <div className="segmentation-chart">
            <h4>Customer Value Segmentation</h4>
            <div className="segmentation-bars">
              <div className="segmentation-bar">
                <div className="bar-label">High Value</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill high-value" 
                    style={{ width: `${(businessIntelligence.customers.high_value_customers / businessIntelligence.customers.total_customers) * 100}%` }}
                  ></div>
                </div>
                <div className="bar-value">{businessIntelligence.customers.high_value_customers}</div>
              </div>
              <div className="segmentation-bar">
                <div className="bar-label">Medium Value</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill medium-value" 
                    style={{ width: `${(businessIntelligence.customers.medium_value_customers / businessIntelligence.customers.total_customers) * 100}%` }}
                  ></div>
                </div>
                <div className="bar-value">{businessIntelligence.customers.medium_value_customers}</div>
              </div>
              <div className="segmentation-bar">
                <div className="bar-label">Low Value</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill low-value" 
                    style={{ width: `${(businessIntelligence.customers.low_value_customers / businessIntelligence.customers.total_customers) * 100}%` }}
                  ></div>
                </div>
                <div className="bar-value">{businessIntelligence.customers.low_value_customers}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="analytics-section">
          <h3>🏆 Top Performing Products</h3>
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Orders</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {businessIntelligence.products.slice(0, 10).map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.total_orders}</td>
                    <td>{product.total_quantity_sold}</td>
                    <td>{formatCurrency(product.total_revenue)}</td>
                    <td>
                      <div className="rating-display">
                        <span className="rating-value">{product.avg_rating || 'N/A'}</span>
                        <span className="rating-count">({product.review_count} reviews)</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geographic Analytics */}
        <div className="analytics-section">
          <h3>🌍 Geographic Distribution</h3>
          <div className="geographic-grid">
            {businessIntelligence.geographic.slice(0, 8).map((location, index) => (
              <div key={index} className="location-card">
                <div className="location-header">
                  <h4>{location.city}, {location.state}</h4>
                </div>
                <div className="location-metrics">
                  <div className="location-metric">
                    <span className="metric-label">Customers:</span>
                    <span className="metric-value">{location.customer_count}</span>
                  </div>
                  <div className="location-metric">
                    <span className="metric-label">Orders:</span>
                    <span className="metric-value">{location.order_count}</span>
                  </div>
                  <div className="location-metric">
                    <span className="metric-label">Revenue:</span>
                    <span className="metric-value">{formatCurrency(location.total_revenue)}</span>
                  </div>
                  <div className="location-metric">
                    <span className="metric-label">Avg Order:</span>
                    <span className="metric-value">{formatCurrency(location.avg_order_value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderKPIDashboard = () => {
    if (!kpiDashboard) return null;

    return (
      <div className="kpi-content">
        {/* Key Performance Indicators */}
        <div className="analytics-section">
          <h3>📊 Key Performance Indicators</h3>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <h4>Revenue Performance</h4>
              </div>
              <div className="kpi-value">{formatCurrency(kpiDashboard.kpis.total_revenue)}</div>
              <div className="kpi-subtitle">Total Revenue</div>
              <div className="kpi-details">
                <div>Orders: {kpiDashboard.kpis.total_orders}</div>
                <div>Avg Order Value: {formatCurrency(kpiDashboard.kpis.avg_order_value)}</div>
                <div>Revenue per Customer: {formatCurrency(kpiDashboard.kpis.revenue_per_customer)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <h4>Customer Performance</h4>
              </div>
              <div className="kpi-value">{kpiDashboard.kpis.total_customers}</div>
              <div className="kpi-subtitle">Total Customers</div>
              <div className="kpi-details">
                <div>New: {kpiDashboard.kpis.new_customers}</div>
                <div>Active: {kpiDashboard.kpis.active_customers}</div>
                <div>Growth Rate: {formatPercentage(kpiDashboard.kpis.customer_growth_rate)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <h4>Manufacturing Performance</h4>
              </div>
              <div className="kpi-value">{kpiDashboard.kpis.batches_produced}</div>
              <div className="kpi-subtitle">Batches Produced</div>
              <div className="kpi-details">
                <div>Total Production: {kpiDashboard.kpis.total_production}</div>
                <div>Avg Quality: {kpiDashboard.kpis.avg_quality.toFixed(1)}/10</div>
                <div>Quality Rate: {formatPercentage(kpiDashboard.kpis.quality_performance_rate)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <h4>Subscription Performance</h4>
              </div>
              <div className="kpi-value">{kpiDashboard.kpis.total_subscriptions}</div>
              <div className="kpi-subtitle">Total Subscriptions</div>
              <div className="kpi-details">
                <div>Active: {kpiDashboard.kpis.active_subscriptions}</div>
                <div>MRR: {formatCurrency(kpiDashboard.kpis.active_subscriptions * 500)}</div>
                <div>Orders per Customer: {kpiDashboard.kpis.orders_per_customer.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Benchmarks */}
        <div className="analytics-section">
          <h3>🎯 Performance Benchmarks</h3>
          <div className="benchmarks-grid">
            {kpiDashboard.benchmarks.map((benchmark, index) => (
              <div key={index} className="benchmark-card">
                <div className="benchmark-header">
                  <h4>{benchmark.metric}</h4>
                  <span className={`achievement-badge ${benchmark.achievement_percentage >= 100 ? 'achieved' : 'pending'}`}>
                    {benchmark.achievement_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="benchmark-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(benchmark.achievement_percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="benchmark-details">
                  <div>Target: {benchmark.target}</div>
                  <div>Actual: {benchmark.actual}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPredictiveAnalytics = () => {
    if (!predictiveAnalytics) return null;

    return (
      <div className="predictive-content">
        {/* Customer Lifetime Value */}
        <div className="analytics-section">
          <h3>💎 Customer Lifetime Value Analysis</h3>
          <div className="ltv-table">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Total Spent</th>
                  <th>Orders</th>
                  <th>Monthly Value</th>
                  <th>Predicted Annual</th>
                  <th>Segment</th>
                </tr>
              </thead>
              <tbody>
                {predictiveAnalytics.customerLTV.slice(0, 15).map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">{customer.first_name} {customer.last_name}</div>
                        <div className="customer-email">{customer.email}</div>
                      </div>
                    </td>
                    <td>{formatCurrency(customer.total_spent)}</td>
                    <td>{customer.total_orders}</td>
                    <td>{formatCurrency(customer.monthly_value)}</td>
                    <td>{formatCurrency(customer.predicted_annual_value)}</td>
                    <td>
                      <span className={`segment-badge ${customer.customer_segment.toLowerCase().replace(' ', '-')}`}>
                        {customer.customer_segment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Demand Prediction */}
        <div className="analytics-section">
          <h3>📦 Inventory Demand Prediction</h3>
          <div className="inventory-grid">
            {predictiveAnalytics.inventoryDemand.slice(0, 12).map((product) => (
              <div key={product.id} className="inventory-card">
                <div className="inventory-header">
                  <h4>{product.name}</h4>
                  <span className={`status-badge ${product.inventory_status.toLowerCase().replace(' ', '-')}`}>
                    {product.inventory_status}
                  </span>
                </div>
                <div className="inventory-metrics">
                  <div className="inventory-metric">
                    <span className="metric-label">Demand:</span>
                    <span className="metric-value">{product.total_demand}</span>
                  </div>
                  <div className="inventory-metric">
                    <span className="metric-label">Stock:</span>
                    <span className="metric-value">{product.total_stock}</span>
                  </div>
                  <div className="inventory-metric">
                    <span className="metric-label">Turnover:</span>
                    <span className="metric-value">{product.stock_turnover_rate.toFixed(1)}%</span>
                  </div>
                  <div className="inventory-metric">
                    <span className="metric-label">Days Left:</span>
                    <span className="metric-value">{product.days_of_inventory}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seasonal Analysis */}
        <div className="analytics-section">
          <h3>📅 Seasonal Analysis</h3>
          <div className="seasonal-chart">
            <div className="seasonal-bars">
              {predictiveAnalytics.seasonalAnalysis.map((month) => (
                <div key={month.month} className="seasonal-bar">
                  <div className="bar-label">{new Date(2024, month.month - 1).toLocaleString('default', { month: 'short' })}</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill seasonal" 
                      style={{ height: `${(month.revenue / Math.max(...predictiveAnalytics.seasonalAnalysis.map(m => m.revenue))) * 100}%` }}
                    ></div>
                  </div>
                  <div className="bar-value">{formatCurrency(month.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomAnalytics = () => {
    return (
      <div className="custom-content">
        <div className="analytics-section">
          <h3>🔧 Custom Analytics Queries</h3>
          <div className="custom-queries">
            <div className="query-card">
              <h4>Cohort Analysis</h4>
              <p>Analyze customer retention and behavior patterns by registration cohorts.</p>
              <button className="query-button">Run Cohort Analysis</button>
            </div>
            <div className="query-card">
              <h4>Product Correlation</h4>
              <p>Find products that are frequently bought together.</p>
              <button className="query-button">Run Correlation Analysis</button>
            </div>
            <div className="query-card">
              <h4>Customer Retention</h4>
              <p>Analyze customer retention rates over time.</p>
              <button className="query-button">Run Retention Analysis</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="advanced-analytics">
        <div className="loading-spinner">Loading advanced analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="advanced-analytics">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="advanced-analytics">
      <div className="page-header">
        <h1>📊 Advanced Analytics</h1>
        <p>Business intelligence and predictive analytics</p>
        <div className="header-controls">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'bi' ? 'active' : ''}`}
            onClick={() => setActiveTab('bi')}
          >
            📈 Business Intelligence
          </button>
          <button 
            className={`tab ${activeTab === 'kpi' ? 'active' : ''}`}
            onClick={() => setActiveTab('kpi')}
          >
            🎯 KPI Dashboard
          </button>
          <button 
            className={`tab ${activeTab === 'predictive' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictive')}
          >
            🔮 Predictive Analytics
          </button>
          <button 
            className={`tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            🔧 Custom Queries
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'bi' && renderBusinessIntelligence()}
          {activeTab === 'kpi' && renderKPIDashboard()}
          {activeTab === 'predictive' && renderPredictiveAnalytics()}
          {activeTab === 'custom' && renderCustomAnalytics()}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;



