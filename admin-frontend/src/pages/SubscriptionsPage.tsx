import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';

interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string;
  frequency: string;
  quantity: number;
  delivery_address: string;
  delivery_instructions: string;
  start_date: string;
  end_date: string;
  next_delivery_date: string;
  last_delivery_date: string;
  payment_method: string;
  discount_percentage: number;
  status: string;
  display_status: string;
  pause_reason: string;
  pause_until: string;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  product_name: string;
  variant_name: string;
  variant_price: number;
  days_until_delivery?: number;
}

interface SubscriptionAnalytics {
  metrics: {
    total_subscriptions: number;
    active_subscriptions: number;
    paused_subscriptions: number;
    cancelled_subscriptions: number;
    new_subscriptions: number;
    avg_quantity: number;
  };
  revenue: {
    total_revenue: number;
    total_deliveries: number;
    avg_delivery_value: number;
  };
  frequency: Array<{
    frequency: string;
    count: number;
    avg_quantity: number;
  }>;
  trends: Array<{
    month: string;
    new_subscriptions: number;
    active_subscriptions: number;
  }>;
}

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'analytics' | 'deliveries'>('subscriptions');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchAnalytics();
  }, [statusFilter, frequencyFilter, searchTerm]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (frequencyFilter) params.append('frequency', frequencyFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const { data } = await adminApi.get(`/subscriptions?${params.toString()}`);
      if (data.success) {
        setSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await adminApi.get('/subscriptions/analytics');
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: '#10b981',
      paused: '#f59e0b',
      cancelled: '#ef4444',
      due: '#8b5cf6'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      active: '✅',
      paused: '⏸️',
      cancelled: '❌',
      due: '🚚'
    };
    return icons[status] || '❓';
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly'
    };
    return labels[frequency] || frequency;
  };

  const handleStatusUpdate = async (subscriptionId: string, action: string, reason?: string) => {
    try {
      let endpoint = '';
      let payload: any = {};

      switch (action) {
        case 'pause':
          endpoint = `pause`;
          payload = { pause_reason: reason || 'Customer request' };
          break;
        case 'resume':
          endpoint = `resume`;
          break;
        case 'cancel':
          endpoint = `cancel`;
          payload = { cancellation_reason: reason || 'Customer request' };
          break;
      }

      const { data } = await adminApi.put(`/subscriptions/${subscriptionId}/${endpoint}`, payload);
      if (data.success) {
        fetchSubscriptions();
        alert(`Subscription ${action}d successfully`);
      }
    } catch (error) {
      console.error(`Error ${action}ing subscription:`, error);
      alert(`Failed to ${action} subscription`);
    }
  };

  const SubscriptionCard: React.FC<{ subscription: Subscription }> = ({ subscription }) => {
    const totalPrice = subscription.quantity * subscription.variant_price;
    const discountedPrice = totalPrice * (1 - (subscription.discount_percentage || 0) / 100);
    
    return (
      <div className="glass-card" style={{
        padding: '20px',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
      }}
      onClick={() => setSelectedSubscription(subscription)}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
            <h3 style={{ color: 'white', marginBottom: '5px', fontSize: '1.2rem' }}>
              {subscription.first_name} {subscription.last_name}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '5px' }}>
              {subscription.email}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              {subscription.product_name} • {subscription.variant_name}
            </p>
          </div>
          <div style={{
            background: `${getStatusColor(subscription.display_status)}20`,
            color: getStatusColor(subscription.display_status),
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span>{getStatusIcon(subscription.display_status)}</span>
            <span style={{ textTransform: 'capitalize' }}>{subscription.display_status}</span>
          </div>
        </div>

        {/* Subscription Details */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Frequency
            </span>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
              {getFrequencyLabel(subscription.frequency)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Quantity
            </span>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
              {subscription.quantity} units
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Next Delivery
            </span>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
              {formatDate(subscription.next_delivery_date)}
            </span>
          </div>
          {subscription.days_until_delivery !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                Days Until Delivery
              </span>
              <span style={{ 
                color: subscription.days_until_delivery <= 3 ? '#ef4444' : '#10b981', 
                fontSize: '14px', 
                fontWeight: '600' 
              }}>
                {subscription.days_until_delivery} days
              </span>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
              Unit Price
            </span>
            <span style={{ color: 'white', fontSize: '12px' }}>
              {formatCurrency(subscription.variant_price)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
              Total Price
            </span>
            <span style={{ color: 'white', fontSize: '12px' }}>
              {formatCurrency(totalPrice)}
            </span>
          </div>
          {subscription.discount_percentage > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: '#10b981', fontSize: '12px' }}>
                Discount ({subscription.discount_percentage}%)
              </span>
              <span style={{ color: '#10b981', fontSize: '12px' }}>
                -{formatCurrency(totalPrice - discountedPrice)}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '5px' }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
              Final Price
            </span>
            <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
              {formatCurrency(discountedPrice)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {subscription.status === 'active' && (
            <>
              <button 
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const reason = prompt('Reason for pausing:');
                  if (reason) handleStatusUpdate(subscription.id, 'pause', reason);
                }}
              >
                ⏸️ Pause
              </button>
              <button 
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const reason = prompt('Reason for cancellation:');
                  if (reason) handleStatusUpdate(subscription.id, 'cancel', reason);
                }}
              >
                ❌ Cancel
              </button>
            </>
          )}
          {subscription.status === 'paused' && (
            <button 
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusUpdate(subscription.id, 'resume');
              }}
            >
              ▶️ Resume
            </button>
          )}
          <button 
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubscription(subscription);
            }}
          >
            👁️ View
          </button>
        </div>
      </div>
    );
  };

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
          🔄 Subscription Management
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Manage recurring deliveries and subscription plans
        </p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'subscriptions', label: '📋 Subscriptions', icon: '📋' },
            { id: 'analytics', label: '📊 Analytics', icon: '📊' },
            { id: 'deliveries', label: '🚚 Deliveries', icon: '🚚' }
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

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Controls */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ minWidth: '200px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search customers or products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <select
                  className="input-field"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div style={{ minWidth: '150px' }}>
                <select
                  className="input-field"
                  value={frequencyFilter}
                  onChange={(e) => setFrequencyFilter(e.target.value)}
                >
                  <option value="">All Frequencies</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
                style={{ whiteSpace: 'nowrap' }}
              >
                ➕ New Subscription
              </button>
            </div>
          </div>

          {/* Subscriptions Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '25px',
            marginBottom: '40px'
          }}>
            {subscriptions.map((subscription) => (
              <SubscriptionCard key={subscription.id} subscription={subscription} />
            ))}
          </div>

          {/* Empty State */}
          {subscriptions.length === 0 && (
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔄</div>
              <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
                No Subscriptions Found
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '30px' }}>
                {searchTerm || statusFilter || frequencyFilter
                  ? 'Try adjusting your search criteria' 
                  : 'Start by creating your first subscription'
                }
              </p>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                ➕ Create First Subscription
              </button>
            </div>
          )}

          {/* Quick Stats */}
          {analytics && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔄</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                  {analytics.metrics.total_subscriptions}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  Total Subscriptions
                </div>
              </div>
              
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                  {analytics.metrics.active_subscriptions}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  Active Subscriptions
                </div>
              </div>
              
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>💰</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                  {formatCurrency(analytics.revenue.total_revenue)}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  Subscription Revenue
                </div>
              </div>
              
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                  {analytics.revenue.total_deliveries}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  Total Deliveries
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '25px'
        }}>
          <div className="glass-card" style={{ padding: '25px' }}>
            <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
              📊 Subscription Metrics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Active</span>
                <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                  {analytics.metrics.active_subscriptions}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Paused</span>
                <span style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
                  {analytics.metrics.paused_subscriptions}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Cancelled</span>
                <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>
                  {analytics.metrics.cancelled_subscriptions}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>New (30 days)</span>
                <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '600' }}>
                  {analytics.metrics.new_subscriptions}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '25px' }}>
            <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
              🔄 Frequency Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {analytics.frequency.map((freq, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                      {getFrequencyLabel(freq.frequency)}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      Avg: {freq.avg_quantity.toFixed(1)} units
                    </div>
                  </div>
                  <div style={{ color: '#667eea', fontSize: '16px', fontWeight: '700' }}>
                    {freq.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '20px' }}>
            🚚 Upcoming Deliveries
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem', marginBottom: '30px' }}>
            Manage scheduled deliveries and track delivery status
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '30px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>📅 Today's Deliveries</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Due today</p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>📦 This Week</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Next 7 days</p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>🚚 Delivery Tracking</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Track shipments</p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>📊 Delivery Analytics</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Performance metrics</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;








