import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  item_count: number;
  shipping_method?: string;
  tracking_number?: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  price: number;
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const { data } = await adminApi.get(`/orders?${params.toString()}`);
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#8b5cf6',
      shipped: '#06b6d4',
      delivered: '#10b981',
      cancelled: '#ef4444',
      refunded: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      pending: '⏳',
      confirmed: '✅',
      processing: '🔄',
      shipped: '🚚',
      delivered: '📦',
      cancelled: '❌',
      refunded: '💰'
    };
    return icons[status] || '❓';
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      await adminApi.patch('/orders/bulk', {
        order_ids: selectedOrders,
        action: 'update_status',
        value: status
      });
      
      setSelectedOrders([]);
      setShowBulkActions(false);
      fetchOrders();
    } catch (error) {
      console.error('Error updating orders:', error);
    }
  };

  const OrderCard: React.FC<{ order: Order }> = ({ order }) => (
    <div className="glass-card" style={{
      padding: '20px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      border: selectedOrders.includes(order.id) ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <input
            type="checkbox"
            checked={selectedOrders.includes(order.id)}
            onChange={() => handleOrderSelect(order.id)}
            style={{ transform: 'scale(1.2)' }}
          />
          <div>
            <h3 style={{ color: 'white', marginBottom: '5px', fontSize: '1.1rem' }}>
              #{order.order_number}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              {order.first_name} {order.last_name}
            </p>
          </div>
        </div>
        <div style={{
          background: `${getStatusColor(order.status)}20`,
          color: getStatusColor(order.status),
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <span>{getStatusIcon(order.status)}</span>
          <span style={{ textTransform: 'capitalize' }}>{order.status}</span>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', marginBottom: '5px' }}>
          📧 {order.email}
        </p>
        {order.phone && (
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', marginBottom: '5px' }}>
            📞 {order.phone}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '2px' }}>
            Total Amount
          </div>
          <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
            {formatCurrency(order.total_amount)}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '2px' }}>
            Items
          </div>
          <div style={{ color: 'white', fontWeight: '600' }}>
            {order.item_count} items
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '2px' }}>
            Order Date
          </div>
          <div style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
            {formatDate(order.created_at)}
          </div>
        </div>
      </div>

      {order.tracking_number && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px'
        }}>
          <div style={{ color: '#06b6d4', fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
            🚚 Tracking Number
          </div>
          <div style={{ color: 'white', fontSize: '14px', fontFamily: 'monospace' }}>
            {order.tracking_number}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
          {order.shipping_method && `Shipping: ${order.shipping_method}`}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              // Handle order details
            }}
          >
            View Details
          </button>
          <button 
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              // Handle status update
            }}
          >
            Update Status
          </button>
        </div>
      </div>
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
          🛒 Order Management
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Manage customer orders, track shipments, and process payments
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search orders, customers..."
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
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div style={{ minWidth: '150px' }}>
            <input
              type="date"
              className="input-field"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <input
              type="date"
              className="input-field"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '8px',
            padding: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ color: 'white', fontWeight: '600' }}>
              {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-secondary"
                onClick={() => handleBulkStatusUpdate('confirmed')}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                ✅ Confirm
              </button>
              <button 
                className="btn-secondary"
                onClick={() => handleBulkStatusUpdate('processing')}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                🔄 Process
              </button>
              <button 
                className="btn-secondary"
                onClick={() => handleBulkStatusUpdate('shipped')}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                🚚 Ship
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setSelectedOrders([])}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '25px',
        marginBottom: '40px'
      }}>
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🛒</div>
          <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
            No Orders Found
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '30px' }}>
            {searchTerm || statusFilter || dateFrom || dateTo
              ? 'Try adjusting your search criteria' 
              : 'Orders will appear here when customers place them'
            }
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🛒</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {orders.length}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Total Orders
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>💰</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0))}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Total Revenue
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {orders.filter(o => o.status === 'pending').length}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Pending Orders
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🚚</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {orders.filter(o => o.status === 'shipped').length}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Shipped Orders
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;