import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';
import './CustomerManagement.css';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
  loyalty_points: number;
  total_points_earned: number;
  total_points_redeemed: number;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  first_order_date: string;
  total_subscriptions: number;
  wishlist_items: number;
  total_reviews: number;
  segment_count: number;
}

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: any;
  customer_count: number;
  is_active: boolean;
  auto_update: boolean;
  created_at: string;
  first_name: string;
  last_name: string;
  creator_email: string;
  member_count: number;
}

interface CustomerAnalytics {
  overview: {
    total_customers: number;
    active_customers: number;
    new_customers: number;
    customer_role_count: number;
    admin_role_count: number;
  };
  acquisition: Array<{
    date: string;
    new_customers: number;
  }>;
  valueSegments: Array<{
    value_segment: string;
    customer_count: number;
    avg_spent: number;
  }>;
  geographic: Array<{
    state: string;
    customer_count: number;
    avg_spent: number;
  }>;
  engagement: {
    total_customers: number;
    customers_with_orders: number;
    customers_with_subscriptions: number;
    customers_with_wishlist: number;
    customers_with_reviews: number;
  };
}

const CustomerManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'segments' | 'analytics'>('overview');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal states
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);

  // Form states
  const [customerForm, setCustomerForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    preferences: {},
    role: 'customer'
  });

  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    criteria: {
      min_orders: '',
      min_spent: '',
      last_order_days: '',
      registration_days: '',
      has_subscription: false,
      gender: '',
      city: '',
      state: ''
    },
    auto_update: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchCustomers(),
      fetchSegments(),
      fetchAnalytics()
    ]);
  };

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await adminApi.get(`/customers/customers?${params.toString()}`);
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSegments = async () => {
    try {
      const response = await adminApi.get('/customers/segments');
      if (response.data.success) {
        setSegments(response.data.segments);
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await adminApi.get('/customers/analytics');
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/customers/customers', customerForm);
      if (response.data.success) {
        alert('Customer created successfully!');
        setShowCreateCustomerModal(false);
        setCustomerForm({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          phone: '',
          date_of_birth: '',
          gender: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
          preferences: {},
          role: 'customer'
        });
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const createSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/customers/segments', segmentForm);
      if (response.data.success) {
        alert('Customer segment created successfully!');
        setShowCreateSegmentModal(false);
        setSegmentForm({
          name: '',
          description: '',
          criteria: {
            min_orders: '',
            min_spent: '',
            last_order_days: '',
            registration_days: '',
            has_subscription: false,
            gender: '',
            city: '',
            state: ''
          },
          auto_update: true
        });
        fetchSegments();
      }
    } catch (error) {
      console.error('Error creating segment:', error);
      alert('Failed to create segment');
    } finally {
      setLoading(false);
    }
  };

  const viewCustomerDetails = async (customerId: string) => {
    try {
      const response = await adminApi.get(`/customers/customers/${customerId}`);
      if (response.data.success) {
        setSelectedCustomer(response.data.customer);
        setShowCustomerDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      alert('Failed to fetch customer details');
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getValueTier = (totalSpent: number) => {
    if (totalSpent >= 50000) return { tier: 'VIP', color: '#ffd700' };
    if (totalSpent >= 25000) return { tier: 'Gold', color: '#ffd700' };
    if (totalSpent >= 10000) return { tier: 'Silver', color: '#c0c0c0' };
    if (totalSpent >= 5000) return { tier: 'Bronze', color: '#cd7f32' };
    if (totalSpent >= 1000) return { tier: 'Basic', color: '#3b82f6' };
    return { tier: 'New', color: '#6b7280' };
  };

  const renderOverview = () => (
    <div className="overview-section">
      <div className="section-header">
        <h2>👥 Customer Overview</h2>
        <p>Comprehensive customer management and analytics</p>
      </div>

      {analytics ? (
        <div className="analytics-content">
          <div className="stats-grid">
            <div className="stat-card premium-card">
              <h3>Total Customers</h3>
              <div className="stat-value">{analytics.overview.total_customers}</div>
              <div className="stat-subtitle">Active: {analytics.overview.active_customers}</div>
              <div className="stat-details">
                <div>New (30 days): {analytics.overview.new_customers}</div>
                <div>Customer Role: {analytics.overview.customer_role_count}</div>
                <div>Admin Role: {analytics.overview.admin_role_count}</div>
              </div>
            </div>

            <div className="stat-card premium-card">
              <h3>Customer Engagement</h3>
              <div className="stat-value">{analytics.engagement.customers_with_orders}</div>
              <div className="stat-subtitle">With Orders</div>
              <div className="stat-details">
                <div>Subscribers: {analytics.engagement.customers_with_subscriptions}</div>
                <div>Wishlist Users: {analytics.engagement.customers_with_wishlist}</div>
                <div>Reviewers: {analytics.engagement.customers_with_reviews}</div>
              </div>
            </div>

            <div className="stat-card premium-card">
              <h3>Value Segments</h3>
              <div className="stat-value">{analytics.valueSegments.length}</div>
              <div className="stat-subtitle">Segments</div>
              <div className="stat-details">
                {analytics.valueSegments.slice(0, 3).map((segment, index) => (
                  <div key={index}>
                    {segment.value_segment}: {segment.customer_count} customers
                  </div>
                ))}
              </div>
            </div>

            <div className="stat-card premium-card">
              <h3>Geographic Distribution</h3>
              <div className="stat-value">{analytics.geographic.length}</div>
              <div className="stat-subtitle">States</div>
              <div className="stat-details">
                {analytics.geographic.slice(0, 3).map((geo, index) => (
                  <div key={index}>
                    {geo.state}: {geo.customer_count} customers
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-card premium-card">
              <h3>Customer Acquisition Trend</h3>
              <div className="chart-placeholder">
                📈 Chart showing new customer registrations over time
              </div>
            </div>

            <div className="chart-card premium-card">
              <h3>Customer Value Distribution</h3>
              <div className="chart-placeholder">
                🥇 Chart showing customer value tiers distribution
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="loading-spinner">Loading analytics...</div>
      )}
    </div>
  );

  const renderCustomers = () => (
    <div className="customers-section">
      <div className="section-header">
        <h2>👥 Customer Management</h2>
        <p>Manage customer profiles and information</p>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input search-input"
          />
          <button 
            className="premium-btn"
            onClick={() => setShowCreateCustomerModal(true)}
          >
            Add Customer
          </button>
        </div>
      </div>

      {showCreateCustomerModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create New Customer</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateCustomerModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createCustomer} className="customer-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    required
                    value={customerForm.first_name}
                    onChange={(e) => setCustomerForm({...customerForm, first_name: e.target.value})}
                    className="premium-input"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    required
                    value={customerForm.last_name}
                    onChange={(e) => setCustomerForm({...customerForm, last_name: e.target.value})}
                    className="premium-input"
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                    className="premium-input"
                    placeholder="Enter email"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="premium-input"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={customerForm.date_of_birth}
                    onChange={(e) => setCustomerForm({...customerForm, date_of_birth: e.target.value})}
                    className="premium-input"
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={customerForm.gender}
                    onChange={(e) => setCustomerForm({...customerForm, gender: e.target.value})}
                    className="premium-input"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                  className="premium-input"
                  rows={2}
                  placeholder="Enter address"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({...customerForm, city: e.target.value})}
                    className="premium-input"
                    placeholder="Enter city"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm({...customerForm, state: e.target.value})}
                    className="premium-input"
                    placeholder="Enter state"
                  />
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    value={customerForm.pincode}
                    onChange={(e) => setCustomerForm({...customerForm, pincode: e.target.value})}
                    className="premium-input"
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={customerForm.password}
                  onChange={(e) => setCustomerForm({...customerForm, password: e.target.value})}
                  className="premium-input"
                  placeholder="Enter password"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowCreateCustomerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="customers-table">
        <div className="table-header">
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Value Tier</div>
          <div>Orders</div>
          <div>Total Spent</div>
          <div>Loyalty Points</div>
          <div>Status</div>
          <div>Joined</div>
          <div>Actions</div>
        </div>
        {customers.map((customer) => {
          const valueTier = getValueTier(customer.total_spent);
          return (
            <div key={customer.id} className="table-row">
              <div className="customer-name">
                {customer.first_name} {customer.last_name}
              </div>
              <div className="customer-email">{customer.email}</div>
              <div className="customer-phone">{customer.phone || 'N/A'}</div>
              <div className="value-tier">
                <span 
                  className="tier-badge"
                  style={{ backgroundColor: valueTier.color }}
                >
                  {valueTier.tier}
                </span>
              </div>
              <div className="orders-count">{customer.total_orders}</div>
              <div className="total-spent">{formatCurrency(customer.total_spent)}</div>
              <div className="loyalty-points">{customer.loyalty_points || 0}</div>
              <div className="status-cell">
                <span className={`status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="joined-date">{formatDate(customer.created_at)}</div>
              <div className="actions">
                <button 
                  className="premium-btn small"
                  onClick={() => viewCustomerDetails(customer.id)}
                >
                  View
                </button>
                <button className="premium-btn small secondary">Edit</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSegments = () => (
    <div className="segments-section">
      <div className="section-header">
        <h2>🎯 Customer Segments</h2>
        <p>Create and manage customer segments for targeted marketing</p>
        <button 
          className="premium-btn"
          onClick={() => setShowCreateSegmentModal(true)}
        >
          Create Segment
        </button>
      </div>

      {showCreateSegmentModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create Customer Segment</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateSegmentModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createSegment} className="segment-form">
              <div className="form-group">
                <label>Segment Name</label>
                <input
                  type="text"
                  required
                  value={segmentForm.name}
                  onChange={(e) => setSegmentForm({...segmentForm, name: e.target.value})}
                  className="premium-input"
                  placeholder="High Value Customers"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={segmentForm.description}
                  onChange={(e) => setSegmentForm({...segmentForm, description: e.target.value})}
                  className="premium-input"
                  rows={2}
                  placeholder="Customers who have made multiple purchases..."
                />
              </div>
              <div className="form-group">
                <label>Criteria</label>
                <div className="criteria-grid">
                  <div className="form-group">
                    <label>Minimum Orders</label>
                    <input
                      type="number"
                      value={segmentForm.criteria.min_orders}
                      onChange={(e) => setSegmentForm({
                        ...segmentForm, 
                        criteria: {...segmentForm.criteria, min_orders: e.target.value}
                      })}
                      className="premium-input"
                      placeholder="5"
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Spent (₹)</label>
                    <input
                      type="number"
                      value={segmentForm.criteria.min_spent}
                      onChange={(e) => setSegmentForm({
                        ...segmentForm, 
                        criteria: {...segmentForm.criteria, min_spent: e.target.value}
                      })}
                      className="premium-input"
                      placeholder="10000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Order (Days)</label>
                    <input
                      type="number"
                      value={segmentForm.criteria.last_order_days}
                      onChange={(e) => setSegmentForm({
                        ...segmentForm, 
                        criteria: {...segmentForm.criteria, last_order_days: e.target.value}
                      })}
                      className="premium-input"
                      placeholder="30"
                    />
                  </div>
                  <div className="form-group">
                    <label>Registration (Days)</label>
                    <input
                      type="number"
                      value={segmentForm.criteria.registration_days}
                      onChange={(e) => setSegmentForm({
                        ...segmentForm, 
                        criteria: {...segmentForm.criteria, registration_days: e.target.value}
                      })}
                      className="premium-input"
                      placeholder="90"
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={segmentForm.auto_update}
                    onChange={(e) => setSegmentForm({...segmentForm, auto_update: e.target.checked})}
                  />
                  Auto-update segment based on criteria
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowCreateSegmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Segment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="segments-grid">
        {segments.map((segment) => (
          <div key={segment.id} className="segment-card premium-card">
            <div className="segment-header">
              <h3>{segment.name}</h3>
              <span className={`status-badge ${segment.is_active ? 'active' : 'inactive'}`}>
                {segment.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="segment-details">
              <p><strong>Description:</strong> {segment.description}</p>
              <p><strong>Member Count:</strong> {segment.member_count}</p>
              <p><strong>Auto Update:</strong> {segment.auto_update ? 'Yes' : 'No'}</p>
              <p><strong>Created:</strong> {formatDate(segment.created_at)}</p>
            </div>
            <div className="segment-actions">
              <button className="premium-btn small">View Members</button>
              <button className="premium-btn small">Edit</button>
              <button className="premium-btn small">Update</button>
              <button className="premium-btn small danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="analytics-section">
      <div className="section-header">
        <h2>📊 Customer Analytics</h2>
        <p>Detailed customer analytics and insights</p>
      </div>

      {analytics ? (
        <div className="analytics-content">
          <div className="analytics-grid">
            <div className="analytics-card premium-card">
              <h3>Customer Overview</h3>
              <div className="metric-grid">
                <div className="metric">
                  <span className="metric-label">Total Customers</span>
                  <span className="metric-value">{analytics.overview.total_customers}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Active Customers</span>
                  <span className="metric-value">{analytics.overview.active_customers}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">New Customers (30d)</span>
                  <span className="metric-value">{analytics.overview.new_customers}</span>
                </div>
              </div>
            </div>

            <div className="analytics-card premium-card">
              <h3>Value Segments</h3>
              <div className="value-segments">
                {analytics.valueSegments.map((segment, index) => (
                  <div key={index} className="value-segment">
                    <span className="segment-name">{segment.value_segment}</span>
                    <span className="segment-count">{segment.customer_count}</span>
                    <span className="segment-avg">{formatCurrency(segment.avg_spent)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card premium-card">
              <h3>Geographic Distribution</h3>
              <div className="geo-distribution">
                {analytics.geographic.slice(0, 5).map((geo, index) => (
                  <div key={index} className="geo-item">
                    <span className="geo-state">{geo.state}</span>
                    <span className="geo-count">{geo.customer_count}</span>
                    <span className="geo-avg">{formatCurrency(geo.avg_spent)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card premium-card">
              <h3>Engagement Metrics</h3>
              <div className="engagement-metrics">
                <div className="engagement-item">
                  <span className="engagement-label">With Orders</span>
                  <span className="engagement-value">{analytics.engagement.customers_with_orders}</span>
                </div>
                <div className="engagement-item">
                  <span className="engagement-label">Subscribers</span>
                  <span className="engagement-value">{analytics.engagement.customers_with_subscriptions}</span>
                </div>
                <div className="engagement-item">
                  <span className="engagement-label">Wishlist Users</span>
                  <span className="engagement-value">{analytics.engagement.customers_with_wishlist}</span>
                </div>
                <div className="engagement-item">
                  <span className="engagement-label">Reviewers</span>
                  <span className="engagement-value">{analytics.engagement.customers_with_reviews}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="loading-spinner">Loading analytics...</div>
      )}
    </div>
  );

  return (
    <div className="customer-management">
      <div className="page-header">
        <h1>👥 Customer Management</h1>
        <p>Comprehensive customer management and analytics</p>
      </div>

      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          👥 Customers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveTab('segments')}
        >
          🎯 Segments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'segments' && renderSegments()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default CustomerManagement;




