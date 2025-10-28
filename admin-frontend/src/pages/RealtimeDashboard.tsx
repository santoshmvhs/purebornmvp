import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import './RealtimeDashboard.css';

interface LiveData {
  orders: {
    total_orders: number;
    recent_orders: number;
    total_revenue: number;
    avg_order_value: number;
  };
  customers: {
    new_customers: number;
    active_customers: number;
  };
  revenue: {
    total_revenue: number;
    order_count: number;
    avg_order_value: number;
  };
  manufacturing: {
    batches_created: number;
    total_produced: number;
    avg_quality_score: number;
  };
  subscriptions: {
    subscriptions_created: number;
    active_subscriptions: number;
  };
  marketing: {
    campaigns_sent: number;
    total_recipients: number;
    total_delivered: number;
  };
  recentActivities: Array<{
    type: string;
    title: string;
    description: string;
    timestamp: string;
    amount?: number;
  }>;
}

const RealtimeDashboard: React.FC = () => {
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('24');
  const { isConnected, recentActivity, unreadCount, notifications } = useWebSocket();

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchLiveData = async () => {
    try {
      const response = await adminApi.get(`/realtime/dashboard/live?period=${selectedPeriod}`);
      if (response.data.success) {
        setLiveData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return '🛒';
      case 'customer': return '👥';
      case 'manufacturing': return '🏭';
      case 'subscription': return '🔄';
      case 'marketing': return '📧';
      case 'logistics': return '🚚';
      case 'inventory': return '📦';
      case 'system': return '⚠️';
      default: return '📊';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'order': return '#4ade80';
      case 'customer': return '#3b82f6';
      case 'manufacturing': return '#f59e0b';
      case 'subscription': return '#8b5cf6';
      case 'marketing': return '#ec4899';
      case 'logistics': return '#06b6d4';
      case 'inventory': return '#ef4444';
      case 'system': return '#f97316';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="realtime-dashboard">
        <div className="loading-spinner">Loading real-time data...</div>
      </div>
    );
  }

  return (
    <div className="realtime-dashboard">
      <div className="page-header">
        <h1>⚡ Real-time Dashboard</h1>
        <p>Live updates and real-time monitoring</p>
        <div className="header-controls">
          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢' : '🔴'}
            </div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="1">Last Hour</option>
            <option value="24">Last 24 Hours</option>
            <option value="168">Last Week</option>
          </select>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Live Metrics */}
        <div className="metrics-section">
          <h2>📊 Live Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-card premium-card">
              <div className="metric-header">
                <h3>Orders</h3>
                <span className="metric-period">Last {selectedPeriod}h</span>
              </div>
              <div className="metric-value">{liveData?.orders.recent_orders || 0}</div>
              <div className="metric-subtitle">Recent Orders</div>
              <div className="metric-details">
                <div>Total Revenue: {formatCurrency(liveData?.revenue.total_revenue || 0)}</div>
                <div>Avg Order Value: {formatCurrency(liveData?.revenue.avg_order_value || 0)}</div>
              </div>
            </div>

            <div className="metric-card premium-card">
              <div className="metric-header">
                <h3>Customers</h3>
                <span className="metric-period">Last {selectedPeriod}h</span>
              </div>
              <div className="metric-value">{liveData?.customers.new_customers || 0}</div>
              <div className="metric-subtitle">New Customers</div>
              <div className="metric-details">
                <div>Active: {liveData?.customers.active_customers || 0}</div>
              </div>
            </div>

            <div className="metric-card premium-card">
              <div className="metric-header">
                <h3>Manufacturing</h3>
                <span className="metric-period">Last {selectedPeriod}h</span>
              </div>
              <div className="metric-value">{liveData?.manufacturing.batches_created || 0}</div>
              <div className="metric-subtitle">Batches Created</div>
              <div className="metric-details">
                <div>Total Produced: {liveData?.manufacturing.total_produced || 0}</div>
                <div>Avg Quality: {liveData?.manufacturing.avg_quality_score?.toFixed(1) || 0}/10</div>
              </div>
            </div>

            <div className="metric-card premium-card">
              <div className="metric-header">
                <h3>Subscriptions</h3>
                <span className="metric-period">Last {selectedPeriod}h</span>
              </div>
              <div className="metric-value">{liveData?.subscriptions.subscriptions_created || 0}</div>
              <div className="metric-subtitle">New Subscriptions</div>
              <div className="metric-details">
                <div>Active: {liveData?.subscriptions.active_subscriptions || 0}</div>
              </div>
            </div>

            <div className="metric-card premium-card">
              <div className="metric-header">
                <h3>Marketing</h3>
                <span className="metric-period">Last {selectedPeriod}h</span>
              </div>
              <div className="metric-value">{liveData?.marketing.campaigns_sent || 0}</div>
              <div className="metric-subtitle">Campaigns Sent</div>
              <div className="metric-details">
                <div>Recipients: {liveData?.marketing.total_recipients || 0}</div>
                <div>Delivered: {liveData?.marketing.total_delivered || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="activity-section">
          <h2>⚡ Live Activity Feed</h2>
          <div className="activity-feed">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon" style={{ color: getActivityColor(activity.type) }}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-description">{activity.description}</div>
                    <div className="activity-timestamp">{formatTime(activity.timestamp)}</div>
                  </div>
                  {activity.amount && (
                    <div className="activity-amount">{formatCurrency(activity.amount)}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-activity">
                <div className="no-activity-icon">📊</div>
                <div className="no-activity-text">No recent activity</div>
                <div className="no-activity-subtitle">Activity will appear here in real-time</div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="notifications-section">
          <h2>🔔 Notifications</h2>
          <div className="notifications-panel">
            <div className="notifications-header">
              <span>Recent Notifications</span>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </div>
            <div className="notifications-list">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className={`notification-item ${!notification.is_read ? 'unread' : ''}`}>
                    <div className="notification-icon">
                      {notification.type === 'order' ? '🛒' :
                       notification.type === 'customer' ? '👥' :
                       notification.type === 'system' ? '⚠️' : '📢'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatTime(notification.created_at)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-notifications">
                  <div className="no-notifications-icon">🔔</div>
                  <div className="no-notifications-text">No notifications</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboard;



