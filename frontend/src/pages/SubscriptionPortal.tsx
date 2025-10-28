import React, { useState, useEffect } from 'react';
import api from '../lib/api';

interface Subscription {
  id: string;
  product_id: string;
  variant_id: string;
  frequency: string;
  quantity: number;
  next_delivery_date: string;
  status: string;
  display_status: string;
  pause_until: string;
  created_at: string;
  updated_at: string;
  product_name: string;
  product_description: string;
  product_image: string;
  variant_name: string;
  variant_price: number;
  variant_image: string;
  delivery_history?: Array<{
    id: string;
    delivery_date: string;
    tracking_number: string;
    delivery_notes: string;
    status: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  description: string;
  image_url: string;
  variant_count: number;
  min_price: number;
  max_price: number;
  variants: Array<{
    id: string;
    name: string;
    price: number;
    image_url: string;
    inventory_quantity: number;
  }>;
}

const SubscriptionPortal: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-subscriptions' | 'create-subscription' | 'analytics'>('my-subscriptions');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchProducts();
    fetchAnalytics();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data } = await api.get('/customer-subscriptions');
      if (data.success) {
        setSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/customer-subscriptions/products');
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/customer-subscriptions/analytics');
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

  const handleStatusUpdate = async (subscriptionId: string, action: string, pauseUntil?: string) => {
    try {
      let endpoint = '';
      let payload: any = {};

      switch (action) {
        case 'pause':
          endpoint = `pause`;
          payload = { pause_until: pauseUntil || '2025-12-31' };
          break;
        case 'resume':
          endpoint = `resume`;
          break;
        case 'cancel':
          endpoint = `cancel`;
          break;
      }

      const { data } = await api.put(`/customer-subscriptions/${subscriptionId}/${endpoint}`, payload);
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
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'white', marginBottom: '5px', fontSize: '1.2rem' }}>
              {subscription.product_name}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '5px' }}>
              {subscription.variant_name}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              {formatCurrency(subscription.variant_price)} per unit
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
              Total per Delivery
            </span>
            <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
              {formatCurrency(totalPrice)}
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
                  const pauseUntil = prompt('Pause until (YYYY-MM-DD):', '2025-12-31');
                  if (pauseUntil) handleStatusUpdate(subscription.id, 'pause', pauseUntil);
                }}
              >
                ⏸️ Pause
              </button>
              <button 
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to cancel this subscription?')) {
                    handleStatusUpdate(subscription.id, 'cancel');
                  }
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
            👁️ View Details
          </button>
        </div>
      </div>
    );
  };

  const CreateSubscriptionModal: React.FC = () => {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [frequency, setFrequency] = useState('monthly');
    const [quantity, setQuantity] = useState(1);
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
      if (!selectedProduct || !selectedVariant) {
        alert('Please select a product and variant');
        return;
      }

      try {
        setCreating(true);
        const { data } = await api.post('/customer-subscriptions', {
          product_id: selectedProduct.id,
          variant_id: selectedVariant.id,
          frequency,
          quantity
        });

        if (data.success) {
          setShowCreateModal(false);
          fetchSubscriptions();
          alert('Subscription created successfully!');
        }
      } catch (error) {
        console.error('Error creating subscription:', error);
        alert('Failed to create subscription');
      } finally {
        setCreating(false);
      }
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div className="glass-card" style={{
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>
            Create New Subscription
          </h2>

          {/* Product Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Select Product
            </label>
            <select
              className="input-field"
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setSelectedProduct(product || null);
                setSelectedVariant(null);
              }}
            >
              <option value="">Choose a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.min_price)} to {formatCurrency(product.max_price)}
                </option>
              ))}
            </select>
          </div>

          {/* Variant Selection */}
          {selectedProduct && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Select Variant
              </label>
              <select
                className="input-field"
                value={selectedVariant?.id || ''}
                onChange={(e) => {
                  const variant = selectedProduct.variants.find(v => v.id === e.target.value);
                  setSelectedVariant(variant || null);
                }}
              >
                <option value="">Choose a variant...</option>
                {selectedProduct.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} - {formatCurrency(variant.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Frequency */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Delivery Frequency
            </label>
            <select
              className="input-field"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Quantity per Delivery
            </label>
            <input
              type="number"
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              max="10"
            />
          </div>

          {/* Summary */}
          {selectedVariant && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: 'white', marginBottom: '10px' }}>Subscription Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Product:</span>
                <span style={{ color: 'white', fontSize: '14px' }}>{selectedProduct?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Variant:</span>
                <span style={{ color: 'white', fontSize: '14px' }}>{selectedVariant.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Frequency:</span>
                <span style={{ color: 'white', fontSize: '14px' }}>{getFrequencyLabel(frequency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Quantity:</span>
                <span style={{ color: 'white', fontSize: '14px' }}>{quantity} units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '5px' }}>
                <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>Total per Delivery:</span>
                <span style={{ color: '#10b981', fontSize: '16px', fontWeight: '600' }}>
                  {formatCurrency(selectedVariant.price * quantity)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              className="btn-secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button 
              className="btn-primary"
              onClick={handleCreate}
              disabled={creating || !selectedProduct || !selectedVariant}
            >
              {creating ? 'Creating...' : 'Create Subscription'}
            </button>
          </div>
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
          🔄 My Subscriptions
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Manage your recurring deliveries and subscription preferences
        </p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'my-subscriptions', label: '📋 My Subscriptions', icon: '📋' },
            { id: 'create-subscription', label: '➕ Create Subscription', icon: '➕' },
            { id: 'analytics', label: '📊 Analytics', icon: '📊' }
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

      {/* My Subscriptions Tab */}
      {activeTab === 'my-subscriptions' && (
        <>
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
                No Active Subscriptions
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '30px' }}>
                Start enjoying the convenience of regular deliveries
              </p>
              <button 
                className="btn-primary"
                onClick={() => setActiveTab('create-subscription')}
              >
                ➕ Create Your First Subscription
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Subscription Tab */}
      {activeTab === 'create-subscription' && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '20px' }}>
            ➕ Create New Subscription
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem', marginBottom: '30px' }}>
            Set up recurring deliveries for your favorite products
          </p>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '15px 30px', fontSize: '16px' }}
          >
            ➕ Start New Subscription
          </button>
        </div>
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
              📊 Subscription Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Total Subscriptions</span>
                <span style={{ color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
                  {analytics.metrics.total_subscriptions}
                </span>
              </div>
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
            </div>
          </div>

          <div className="glass-card" style={{ padding: '25px' }}>
            <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
              💰 Estimated Savings
            </h3>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', color: '#10b981', fontWeight: '700', marginBottom: '10px' }}>
                {formatCurrency(analytics.savings.estimated_savings)}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                From subscription discounts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && <CreateSubscriptionModal />}
    </div>
  );
};

export default SubscriptionPortal;
