import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';
import './LogisticsPage.css';

interface ShippingProvider {
  id: string;
  name: string;
  code: string;
  api_endpoint: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  cities: string[];
  pincodes: string[];
  is_active: boolean;
  created_at: string;
}

interface Shipment {
  id: string;
  order_id: string;
  order_number: string;
  tracking_number: string;
  awb_number: string;
  status: string;
  pickup_date: string;
  delivery_date: string;
  estimated_delivery_date: string;
  weight: number;
  shipping_cost: number;
  provider_name: string;
  provider_code: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

interface LogisticsAnalytics {
  shipmentStats: {
    total_shipments: number;
    delivered_shipments: number;
    in_transit_shipments: number;
    failed_shipments: number;
    avg_delivery_days: number;
  };
  providerPerformance: Array<{
    provider_name: string;
    total_shipments: number;
    delivered_count: number;
    success_rate: number;
    avg_cost: number;
  }>;
  dailyTrends: Array<{
    date: string;
    shipments_count: number;
    delivered_count: number;
  }>;
}

const LogisticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shipments' | 'providers' | 'zones' | 'analytics'>('shipments');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [analytics, setAnalytics] = useState<LogisticsAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateProviderModal, setShowCreateProviderModal] = useState(false);
  const [showCreateZoneModal, setShowCreateZoneModal] = useState(false);
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);

  const [providerForm, setProviderForm] = useState({
    name: '',
    code: '',
    api_endpoint: '',
    api_key: '',
    priority: 0
  });

  const [zoneForm, setZoneForm] = useState({
    name: '',
    countries: [] as string[],
    states: [] as string[],
    cities: [] as string[],
    pincodes: [] as string[]
  });

  const [shipmentForm, setShipmentForm] = useState({
    order_id: '',
    shipping_provider_id: '',
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    special_instructions: ''
  });

  useEffect(() => {
    fetchShipments();
    fetchProviders();
    fetchZones();
    fetchAnalytics();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/logistics/shipments');
      if (response.data.success) {
        setShipments(response.data.shipments);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await adminApi.get('/logistics/providers');
      if (response.data.success) {
        setProviders(response.data.providers);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await adminApi.get('/logistics/zones');
      if (response.data.success) {
        setZones(response.data.zones);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await adminApi.get('/logistics/analytics');
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/logistics/providers', providerForm);
      if (response.data.success) {
        alert('Shipping provider created successfully!');
        setShowCreateProviderModal(false);
        setProviderForm({
          name: '',
          code: '',
          api_endpoint: '',
          api_key: '',
          priority: 0
        });
        fetchProviders();
      }
    } catch (error) {
      console.error('Error creating provider:', error);
      alert('Failed to create shipping provider');
    } finally {
      setLoading(false);
    }
  };

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/logistics/zones', zoneForm);
      if (response.data.success) {
        alert('Shipping zone created successfully!');
        setShowCreateZoneModal(false);
        setZoneForm({
          name: '',
          countries: [],
          states: [],
          cities: [],
          pincodes: []
        });
        fetchZones();
      }
    } catch (error) {
      console.error('Error creating zone:', error);
      alert('Failed to create shipping zone');
    } finally {
      setLoading(false);
    }
  };

  const createShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/logistics/shipments', shipmentForm);
      if (response.data.success) {
        alert('Shipment created successfully!');
        setShowCreateShipmentModal(false);
        setShipmentForm({
          order_id: '',
          shipping_provider_id: '',
          weight: '',
          dimensions: {
            length: '',
            width: '',
            height: ''
          },
          special_instructions: ''
        });
        fetchShipments();
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      alert('Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (trackingNumber: string) => {
    try {
      const response = await adminApi.get(`/logistics/shipments/track/${trackingNumber}`);
      if (response.data.success) {
        setSelectedShipment(response.data.shipment);
        setTrackingData(response.data);
      }
    } catch (error) {
      console.error('Error tracking shipment:', error);
      alert('Failed to track shipment');
    }
  };

  const updateShipmentStatus = async (shipmentId: string, status: string) => {
    try {
      const response = await adminApi.put(`/logistics/shipments/${shipmentId}/status`, {
        status,
        location: 'Updated by admin',
        description: `Status updated to ${status}`
      });
      if (response.data.success) {
        alert('Shipment status updated successfully!');
        fetchShipments();
      }
    } catch (error) {
      console.error('Error updating shipment status:', error);
      alert('Failed to update shipment status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#4ade80';
      case 'in_transit': return '#3b82f6';
      case 'out_for_delivery': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'returned': return '#8b5cf6';
      default: return '#6b7280';
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

  const renderShipments = () => (
    <div className="shipments-section">
      <div className="section-header">
        <h2>📦 Shipment Management</h2>
        <p>Track and manage all shipments</p>
        <button 
          className="premium-btn"
          onClick={() => setShowCreateShipmentModal(true)}
        >
          Create Shipment
        </button>
      </div>

      {showCreateShipmentModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create Shipment</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateShipmentModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createShipment} className="shipment-form">
              <div className="form-group">
                <label>Order ID</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.order_id}
                  onChange={(e) => setShipmentForm({...shipmentForm, order_id: e.target.value})}
                  className="premium-input"
                  placeholder="Enter order ID"
                />
              </div>
              <div className="form-group">
                <label>Shipping Provider</label>
                <select
                  required
                  value={shipmentForm.shipping_provider_id}
                  onChange={(e) => setShipmentForm({...shipmentForm, shipping_provider_id: e.target.value})}
                  className="premium-input"
                >
                  <option value="">Select Provider</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  value={shipmentForm.weight}
                  onChange={(e) => setShipmentForm({...shipmentForm, weight: e.target.value})}
                  className="premium-input"
                  placeholder="Enter weight"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Length (cm)</label>
                  <input
                    type="number"
                    value={shipmentForm.dimensions.length}
                    onChange={(e) => setShipmentForm({
                      ...shipmentForm, 
                      dimensions: {...shipmentForm.dimensions, length: e.target.value}
                    })}
                    className="premium-input"
                    placeholder="Length"
                  />
                </div>
                <div className="form-group">
                  <label>Width (cm)</label>
                  <input
                    type="number"
                    value={shipmentForm.dimensions.width}
                    onChange={(e) => setShipmentForm({
                      ...shipmentForm, 
                      dimensions: {...shipmentForm.dimensions, width: e.target.value}
                    })}
                    className="premium-input"
                    placeholder="Width"
                  />
                </div>
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    value={shipmentForm.dimensions.height}
                    onChange={(e) => setShipmentForm({
                      ...shipmentForm, 
                      dimensions: {...shipmentForm.dimensions, height: e.target.value}
                    })}
                    className="premium-input"
                    placeholder="Height"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Special Instructions</label>
                <textarea
                  value={shipmentForm.special_instructions}
                  onChange={(e) => setShipmentForm({...shipmentForm, special_instructions: e.target.value})}
                  className="premium-input"
                  rows={3}
                  placeholder="Any special instructions..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowCreateShipmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading shipments...</div>
      ) : shipments.length > 0 ? (
        <div className="shipments-table">
          <div className="table-header">
            <div>Order</div>
            <div>Tracking</div>
            <div>Status</div>
            <div>Provider</div>
            <div>Customer</div>
            <div>Weight</div>
            <div>Cost</div>
            <div>Created</div>
            <div>Actions</div>
          </div>
          {shipments.map((shipment) => (
            <div key={shipment.id} className="table-row">
              <div className="order-info">
                <div className="order-number">{shipment.order_number}</div>
                <div className="order-id">{shipment.order_id.slice(0, 8)}...</div>
              </div>
              <div className="tracking-info">
                <div className="tracking-number">{shipment.tracking_number}</div>
                {shipment.awb_number && (
                  <div className="awb-number">AWB: {shipment.awb_number}</div>
                )}
              </div>
              <div className="status-cell">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(shipment.status) }}
                >
                  {shipment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="provider-info">
                <div className="provider-name">{shipment.provider_name}</div>
                <div className="provider-code">{shipment.provider_code}</div>
              </div>
              <div className="customer-info">
                <div className="customer-name">{shipment.first_name} {shipment.last_name}</div>
                <div className="customer-email">{shipment.email}</div>
              </div>
              <div className="weight">{shipment.weight} kg</div>
              <div className="cost">{formatCurrency(shipment.shipping_cost)}</div>
              <div className="date">{formatDate(shipment.created_at)}</div>
              <div className="actions">
                <button 
                  className="premium-btn small"
                  onClick={() => trackShipment(shipment.tracking_number)}
                >
                  Track
                </button>
                <select 
                  className="status-select"
                  value={shipment.status}
                  onChange={(e) => updateShipmentStatus(shipment.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Shipments Found</h3>
          <p>Create your first shipment to get started</p>
        </div>
      )}

      {selectedShipment && trackingData && (
        <div className="tracking-modal">
          <div className="tracking-content">
            <div className="tracking-header">
              <h3>Tracking Details - {selectedShipment.tracking_number}</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setSelectedShipment(null);
                  setTrackingData(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="tracking-info">
              <div className="shipment-details">
                <h4>Shipment Details</h4>
                <p><strong>Order:</strong> {selectedShipment.order_number}</p>
                <p><strong>Status:</strong> {selectedShipment.status}</p>
                <p><strong>Provider:</strong> {selectedShipment.provider_name}</p>
                <p><strong>Weight:</strong> {selectedShipment.weight} kg</p>
                <p><strong>Cost:</strong> {formatCurrency(selectedShipment.shipping_cost)}</p>
              </div>
              <div className="tracking-history">
                <h4>Tracking History</h4>
                {trackingData.tracking.map((entry: any, index: number) => (
                  <div key={index} className="tracking-entry">
                    <div className="tracking-time">{formatDate(entry.timestamp)}</div>
                    <div className="tracking-status">{entry.status}</div>
                    <div className="tracking-location">{entry.location}</div>
                    <div className="tracking-description">{entry.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderProviders = () => (
    <div className="providers-section">
      <div className="section-header">
        <h2>🚚 Shipping Providers</h2>
        <p>Manage shipping service providers</p>
        <button 
          className="premium-btn"
          onClick={() => setShowCreateProviderModal(true)}
        >
          Add Provider
        </button>
      </div>

      {showCreateProviderModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Add Shipping Provider</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateProviderModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createProvider} className="provider-form">
              <div className="form-group">
                <label>Provider Name</label>
                <input
                  type="text"
                  required
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({...providerForm, name: e.target.value})}
                  className="premium-input"
                  placeholder="e.g., Shiprocket, Blue Dart"
                />
              </div>
              <div className="form-group">
                <label>Provider Code</label>
                <input
                  type="text"
                  required
                  value={providerForm.code}
                  onChange={(e) => setProviderForm({...providerForm, code: e.target.value})}
                  className="premium-input"
                  placeholder="e.g., SHIPROCKET, BLUEDART"
                />
              </div>
              <div className="form-group">
                <label>API Endpoint</label>
                <input
                  type="url"
                  value={providerForm.api_endpoint}
                  onChange={(e) => setProviderForm({...providerForm, api_endpoint: e.target.value})}
                  className="premium-input"
                  placeholder="https://api.provider.com"
                />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={providerForm.api_key}
                  onChange={(e) => setProviderForm({...providerForm, api_key: e.target.value})}
                  className="premium-input"
                  placeholder="API Key"
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <input
                  type="number"
                  value={providerForm.priority}
                  onChange={(e) => setProviderForm({...providerForm, priority: parseInt(e.target.value)})}
                  className="premium-input"
                  placeholder="Priority (lower = higher priority)"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowCreateProviderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="providers-grid">
        {providers.map((provider) => (
          <div key={provider.id} className="provider-card premium-card">
            <div className="provider-header">
              <h3>{provider.name}</h3>
              <span className="provider-code">{provider.code}</span>
            </div>
            <div className="provider-details">
              <p><strong>Priority:</strong> {provider.priority}</p>
              <p><strong>Status:</strong> {provider.is_active ? 'Active' : 'Inactive'}</p>
              <p><strong>API Endpoint:</strong> {provider.api_endpoint || 'Not configured'}</p>
            </div>
            <div className="provider-actions">
              <button className="premium-btn small">Edit</button>
              <button className="premium-btn small danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderZones = () => (
    <div className="zones-section">
      <div className="section-header">
        <h2>🌍 Shipping Zones</h2>
        <p>Define shipping zones and rates</p>
        <button 
          className="premium-btn"
          onClick={() => setShowCreateZoneModal(true)}
        >
          Add Zone
        </button>
      </div>

      {showCreateZoneModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Add Shipping Zone</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateZoneModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createZone} className="zone-form">
              <div className="form-group">
                <label>Zone Name</label>
                <input
                  type="text"
                  required
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({...zoneForm, name: e.target.value})}
                  className="premium-input"
                  placeholder="e.g., North India, South India"
                />
              </div>
              <div className="form-group">
                <label>Countries (comma-separated)</label>
                <input
                  type="text"
                  value={zoneForm.countries.join(', ')}
                  onChange={(e) => setZoneForm({...zoneForm, countries: e.target.value.split(',').map(s => s.trim())})}
                  className="premium-input"
                  placeholder="India, USA, UK"
                />
              </div>
              <div className="form-group">
                <label>States (comma-separated)</label>
                <input
                  type="text"
                  value={zoneForm.states.join(', ')}
                  onChange={(e) => setZoneForm({...zoneForm, states: e.target.value.split(',').map(s => s.trim())})}
                  className="premium-input"
                  placeholder="Maharashtra, Karnataka, Tamil Nadu"
                />
              </div>
              <div className="form-group">
                <label>Cities (comma-separated)</label>
                <input
                  type="text"
                  value={zoneForm.cities.join(', ')}
                  onChange={(e) => setZoneForm({...zoneForm, cities: e.target.value.split(',').map(s => s.trim())})}
                  className="premium-input"
                  placeholder="Mumbai, Bangalore, Chennai"
                />
              </div>
              <div className="form-group">
                <label>Pincodes (comma-separated)</label>
                <input
                  type="text"
                  value={zoneForm.pincodes.join(', ')}
                  onChange={(e) => setZoneForm({...zoneForm, pincodes: e.target.value.split(',').map(s => s.trim())})}
                  className="premium-input"
                  placeholder="400001, 560001, 600001"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowCreateZoneModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="zones-grid">
        {zones.map((zone) => (
          <div key={zone.id} className="zone-card premium-card">
            <div className="zone-header">
              <h3>{zone.name}</h3>
              <span className="zone-status">{zone.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="zone-details">
              <p><strong>Countries:</strong> {zone.countries.join(', ') || 'All'}</p>
              <p><strong>States:</strong> {zone.states.join(', ') || 'All'}</p>
              <p><strong>Cities:</strong> {zone.cities.join(', ') || 'All'}</p>
              <p><strong>Pincodes:</strong> {zone.pincodes.length} pincodes</p>
            </div>
            <div className="zone-actions">
              <button className="premium-btn small">Edit</button>
              <button className="premium-btn small">Rates</button>
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
        <h2>📊 Logistics Analytics</h2>
        <p>Performance metrics and insights</p>
      </div>

      {analytics ? (
        <div className="analytics-content">
          <div className="stats-grid">
            <div className="stat-card premium-card">
              <h3>Total Shipments</h3>
              <div className="stat-value">{analytics.shipmentStats.total_shipments}</div>
            </div>
            <div className="stat-card premium-card">
              <h3>Delivered</h3>
              <div className="stat-value">{analytics.shipmentStats.delivered_shipments}</div>
            </div>
            <div className="stat-card premium-card">
              <h3>In Transit</h3>
              <div className="stat-value">{analytics.shipmentStats.in_transit_shipments}</div>
            </div>
            <div className="stat-card premium-card">
              <h3>Failed</h3>
              <div className="stat-value">{analytics.shipmentStats.failed_shipments}</div>
            </div>
            <div className="stat-card premium-card">
              <h3>Avg Delivery Days</h3>
              <div className="stat-value">{analytics.shipmentStats.avg_delivery_days?.toFixed(1) || 'N/A'}</div>
            </div>
          </div>

          <div className="provider-performance">
            <h3>Provider Performance</h3>
            <div className="performance-table">
              <div className="table-header">
                <div>Provider</div>
                <div>Total Shipments</div>
                <div>Delivered</div>
                <div>Success Rate</div>
                <div>Avg Cost</div>
              </div>
              {analytics.providerPerformance.map((provider, index) => (
                <div key={index} className="table-row">
                  <div className="provider-name">{provider.provider_name}</div>
                  <div className="total-shipments">{provider.total_shipments}</div>
                  <div className="delivered-count">{provider.delivered_count}</div>
                  <div className="success-rate">{provider.success_rate}%</div>
                  <div className="avg-cost">{formatCurrency(provider.avg_cost)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="loading-spinner">Loading analytics...</div>
      )}
    </div>
  );

  return (
    <div className="logistics-page">
      <div className="page-header">
        <h1>🚚 Logistics & Delivery Management</h1>
        <p>Comprehensive shipping and delivery management system</p>
      </div>

      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'shipments' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipments')}
        >
          📦 Shipments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
        >
          🚚 Providers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          🌍 Zones
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'shipments' && renderShipments()}
        {activeTab === 'providers' && renderProviders()}
        {activeTab === 'zones' && renderZones()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default LogisticsPage;



