import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';

interface EmailAnalytics {
  subscriptions: {
    total_subscriptions: number;
    active_subscriptions: number;
    upcoming_deliveries: number;
  };
  emailMetrics: {
    totalSent: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
}

interface BulkReminderResult {
  total: number;
  successful: number;
  failed: number;
  details: Array<{
    subscriptionId: string;
    customerEmail: string;
    success: boolean;
  }>;
}

const EmailManagementPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [bulkReminderResult, setBulkReminderResult] = useState<BulkReminderResult | null>(null);
  const [emailForm, setEmailForm] = useState({
    subscriptionId: '',
    email: '',
    trackingNumber: '',
    daysAhead: 3
  });

  useEffect(() => {
    fetchEmailAnalytics();
  }, []);

  const fetchEmailAnalytics = async () => {
    try {
      const { data } = await adminApi.get('/emails/analytics');
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching email analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendSubscriptionReminder = async () => {
    if (!emailForm.subscriptionId) {
      alert('Please enter a subscription ID');
      return;
    }

    try {
      setSendingEmail(true);
      const { data } = await adminApi.post(`/emails/subscription/${emailForm.subscriptionId}/reminder`, {
        email: emailForm.email
      });

      if (data.success) {
        alert('Subscription reminder sent successfully!');
      } else {
        alert('Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder');
    } finally {
      setSendingEmail(false);
    }
  };

  const sendSubscriptionConfirmation = async () => {
    if (!emailForm.subscriptionId) {
      alert('Please enter a subscription ID');
      return;
    }

    try {
      setSendingEmail(true);
      const { data } = await adminApi.post(`/emails/subscription/${emailForm.subscriptionId}/confirmation`);

      if (data.success) {
        alert('Subscription confirmation sent successfully!');
      } else {
        alert('Failed to send confirmation');
      }
    } catch (error) {
      console.error('Error sending confirmation:', error);
      alert('Failed to send confirmation');
    } finally {
      setSendingEmail(false);
    }
  };

  const sendDeliveryConfirmation = async () => {
    if (!emailForm.subscriptionId) {
      alert('Please enter a subscription ID');
      return;
    }

    try {
      setSendingEmail(true);
      const { data } = await adminApi.post(`/emails/subscription/${emailForm.subscriptionId}/delivery-confirmation`, {
        trackingNumber: emailForm.trackingNumber,
        email: emailForm.email
      });

      if (data.success) {
        alert('Delivery confirmation sent successfully!');
      } else {
        alert('Failed to send delivery confirmation');
      }
    } catch (error) {
      console.error('Error sending delivery confirmation:', error);
      alert('Failed to send delivery confirmation');
    } finally {
      setSendingEmail(false);
    }
  };

  const sendBulkReminders = async () => {
    try {
      setSendingEmail(true);
      const { data } = await adminApi.post('/emails/bulk-reminders', {
        daysAhead: emailForm.daysAhead
      });

      if (data.success) {
        setBulkReminderResult(data.results);
        alert(`Bulk reminders processed: ${data.results.successful} sent, ${data.results.failed} failed`);
      } else {
        alert('Failed to send bulk reminders');
      }
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      alert('Failed to send bulk reminders');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
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
          📧 Email Management
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Manage subscription notifications and email communications
        </p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '25px',
          marginBottom: '40px'
        }}>
          <div className="glass-card" style={{ padding: '25px' }}>
            <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
              📊 Subscription Analytics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Total Subscriptions</span>
                <span style={{ color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
                  {formatNumber(analytics.subscriptions.total_subscriptions)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Active Subscriptions</span>
                <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                  {formatNumber(analytics.subscriptions.active_subscriptions)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Upcoming Deliveries</span>
                <span style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
                  {formatNumber(analytics.subscriptions.upcoming_deliveries)}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '25px' }}>
            <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
              📈 Email Performance
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Total Sent</span>
                <span style={{ color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
                  {formatNumber(analytics.emailMetrics.totalSent)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Delivery Rate</span>
                <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                  {formatPercentage(analytics.emailMetrics.deliveryRate)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Open Rate</span>
                <span style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
                  {formatPercentage(analytics.emailMetrics.openRate)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Click Rate</span>
                <span style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: '600' }}>
                  {formatPercentage(analytics.emailMetrics.clickRate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '25px',
        marginBottom: '40px'
      }}>
        {/* Individual Email Actions */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
            📧 Send Individual Emails
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Subscription ID
            </label>
            <input
              type="text"
              className="input-field"
              value={emailForm.subscriptionId}
              onChange={(e) => setEmailForm({ ...emailForm, subscriptionId: e.target.value })}
              placeholder="Enter subscription ID"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Email Address (Optional)
            </label>
            <input
              type="email"
              className="input-field"
              value={emailForm.email}
              onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
              placeholder="Override customer email"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Tracking Number (For delivery confirmation)
            </label>
            <input
              type="text"
              className="input-field"
              value={emailForm.trackingNumber}
              onChange={(e) => setEmailForm({ ...emailForm, trackingNumber: e.target.value })}
              placeholder="Enter tracking number"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              className="btn-primary"
              onClick={sendSubscriptionReminder}
              disabled={sendingEmail || !emailForm.subscriptionId}
            >
              {sendingEmail ? 'Sending...' : '📅 Send Reminder'}
            </button>
            
            <button 
              className="btn-secondary"
              onClick={sendSubscriptionConfirmation}
              disabled={sendingEmail || !emailForm.subscriptionId}
            >
              {sendingEmail ? 'Sending...' : '✅ Send Confirmation'}
            </button>
            
            <button 
              className="btn-secondary"
              onClick={sendDeliveryConfirmation}
              disabled={sendingEmail || !emailForm.subscriptionId}
            >
              {sendingEmail ? 'Sending...' : '🚚 Send Delivery Confirmation'}
            </button>
          </div>
        </div>

        {/* Bulk Email Actions */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
            📬 Bulk Email Actions
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Days Ahead for Reminders
            </label>
            <input
              type="number"
              className="input-field"
              value={emailForm.daysAhead}
              onChange={(e) => setEmailForm({ ...emailForm, daysAhead: parseInt(e.target.value) || 3 })}
              min="1"
              max="30"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', lineHeight: '1.5' }}>
              Send reminder emails to all customers with deliveries scheduled within the specified number of days.
            </p>
          </div>

          <button 
            className="btn-primary"
            onClick={sendBulkReminders}
            disabled={sendingEmail}
            style={{ width: '100%' }}
          >
            {sendingEmail ? 'Processing...' : '📬 Send Bulk Reminders'}
          </button>
        </div>
      </div>

      {/* Bulk Reminder Results */}
      {bulkReminderResult && (
        <div className="glass-card" style={{ padding: '30px', marginBottom: '30px' }}>
          <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
            📊 Bulk Reminder Results
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', color: '#667eea', fontWeight: 'bold' }}>
                {bulkReminderResult.total}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Total Processed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', color: '#10b981', fontWeight: 'bold' }}>
                {bulkReminderResult.successful}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Successfully Sent</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', color: '#ef4444', fontWeight: 'bold' }}>
                {bulkReminderResult.failed}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Failed</div>
            </div>
          </div>

          {bulkReminderResult.details.length > 0 && (
            <div>
              <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '15px' }}>Details:</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {bulkReminderResult.details.map((detail, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                      {detail.subscriptionId} - {detail.customerEmail}
                    </span>
                    <span style={{
                      color: detail.success ? '#10b981' : '#ef4444',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {detail.success ? '✅ Sent' : '❌ Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Templates Preview */}
      <div className="glass-card" style={{ padding: '30px' }}>
        <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '20px' }}>
          📋 Email Templates
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{ color: '#10b981', fontSize: '1.1rem', marginBottom: '10px' }}>
              📅 Subscription Reminder
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
              Sent 3 days before delivery to remind customers about their upcoming order.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{ color: '#10b981', fontSize: '1.1rem', marginBottom: '10px' }}>
              ✅ Subscription Confirmation
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
              Sent when a new subscription is created to confirm the setup.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{ color: '#f59e0b', fontSize: '1.1rem', marginBottom: '10px' }}>
              ⏸️ Subscription Paused
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
              Sent when a customer pauses their subscription.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{ color: '#10b981', fontSize: '1.1rem', marginBottom: '10px' }}>
              ▶️ Subscription Resumed
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
              Sent when a customer resumes their paused subscription.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{ color: '#ef4444', fontSize: '1.1rem', marginBottom: '10px' }}>
              ❌ Subscription Cancelled
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
              Sent when a customer cancels their subscription.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{ color: '#10b981', fontSize: '1.1rem', marginBottom: '10px' }}>
              🚚 Delivery Confirmation
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
              Sent when an order has been successfully delivered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailManagementPage;








