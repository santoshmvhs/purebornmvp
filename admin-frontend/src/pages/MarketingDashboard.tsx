import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';
import './MarketingDashboard.css';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  campaign_type: string;
  status: string;
  total_recipients: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  scheduled_at: string;
  sent_at: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  campaign_type: string;
  status: string;
  total_recipients: number;
  delivered_count: number;
  scheduled_at: string;
  sent_at: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface PromotionalCode {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number;
  usage_limit: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: any;
  customer_count: number;
  is_active: boolean;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  points_per_rupee: number;
  redemption_rate: number;
  min_redemption_points: number;
  max_redemption_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface MarketingAnalytics {
  email: {
    total_campaigns: number;
    sent_campaigns: number;
    total_recipients: number;
    total_delivered: number;
    total_opened: number;
    total_clicked: number;
    avg_delivery_rate: number;
    avg_open_rate: number;
    avg_click_rate: number;
  };
  sms: {
    total_campaigns: number;
    sent_campaigns: number;
    total_recipients: number;
    total_delivered: number;
    avg_delivery_rate: number;
  };
  promotional: {
    total_codes: number;
    active_codes: number;
    total_usage: number;
    total_discount_given: number;
  };
  segmentation: {
    total_segments: number;
    total_segmented_customers: number;
    avg_segment_size: number;
  };
  loyalty: {
    total_programs: number;
    total_points_earned: number;
    total_points_redeemed: number;
    total_points_balance: number;
    active_members: number;
  };
}

const MarketingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'email' | 'sms' | 'promo' | 'segments' | 'loyalty'>('overview');
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [smsCampaigns, setSMSCampaigns] = useState<SMSCampaign[]>([]);
  const [promotionalCodes, setPromotionalCodes] = useState<PromotionalCode[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
  const [analytics, setAnalytics] = useState<MarketingAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);

  // Form states
  const [emailForm, setEmailForm] = useState({
    name: '',
    subject: '',
    content: '',
    campaign_type: 'promotional',
    target_audience: { segment: 'all' },
    scheduled_at: ''
  });

  const [smsForm, setSMSForm] = useState({
    name: '',
    message: '',
    campaign_type: 'promotional',
    target_audience: { segment: 'all' },
    scheduled_at: ''
  });

  const [promoForm, setPromoForm] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '',
    max_discount_amount: '',
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    applicable_products: [] as string[],
    applicable_categories: [] as string[]
  });

  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    criteria: {
      min_orders: '',
      min_spent: '',
      last_order_days: '',
      registration_days: ''
    }
  });

  const [loyaltyForm, setLoyaltyForm] = useState({
    name: '',
    description: '',
    points_per_rupee: '1',
    redemption_rate: '0.01',
    min_redemption_points: '100',
    max_redemption_percentage: '50'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchEmailCampaigns(),
      fetchSMSCampaigns(),
      fetchPromotionalCodes(),
      fetchCustomerSegments(),
      fetchLoyaltyPrograms(),
      fetchAnalytics()
    ]);
  };

  const fetchEmailCampaigns = async () => {
    try {
      const response = await adminApi.get('/marketing/email-campaigns');
      if (response.data.success) {
        setEmailCampaigns(response.data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching email campaigns:', error);
    }
  };

  const fetchSMSCampaigns = async () => {
    try {
      const response = await adminApi.get('/marketing/sms-campaigns');
      if (response.data.success) {
        setSMSCampaigns(response.data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching SMS campaigns:', error);
    }
  };

  const fetchPromotionalCodes = async () => {
    try {
      const response = await adminApi.get('/marketing/promotional-codes');
      if (response.data.success) {
        setPromotionalCodes(response.data.promotionalCodes);
      }
    } catch (error) {
      console.error('Error fetching promotional codes:', error);
    }
  };

  const fetchCustomerSegments = async () => {
    try {
      const response = await adminApi.get('/marketing/customer-segments');
      if (response.data.success) {
        setCustomerSegments(response.data.segments);
      }
    } catch (error) {
      console.error('Error fetching customer segments:', error);
    }
  };

  const fetchLoyaltyPrograms = async () => {
    try {
      const response = await adminApi.get('/marketing/loyalty-programs');
      if (response.data.success) {
        setLoyaltyPrograms(response.data.loyaltyPrograms);
      }
    } catch (error) {
      console.error('Error fetching loyalty programs:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await adminApi.get('/marketing/analytics');
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createEmailCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/marketing/email-campaigns', emailForm);
      if (response.data.success) {
        alert('Email campaign created successfully!');
        setShowEmailModal(false);
        setEmailForm({
          name: '',
          subject: '',
          content: '',
          campaign_type: 'promotional',
          target_audience: { segment: 'all' },
          scheduled_at: ''
        });
        fetchEmailCampaigns();
      }
    } catch (error) {
      console.error('Error creating email campaign:', error);
      alert('Failed to create email campaign');
    } finally {
      setLoading(false);
    }
  };

  const createSMSCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/marketing/sms-campaigns', smsForm);
      if (response.data.success) {
        alert('SMS campaign created successfully!');
        setShowSMSModal(false);
        setSMSForm({
          name: '',
          message: '',
          campaign_type: 'promotional',
          target_audience: { segment: 'all' },
          scheduled_at: ''
        });
        fetchSMSCampaigns();
      }
    } catch (error) {
      console.error('Error creating SMS campaign:', error);
      alert('Failed to create SMS campaign');
    } finally {
      setLoading(false);
    }
  };

  const createPromotionalCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/marketing/promotional-codes', promoForm);
      if (response.data.success) {
        alert('Promotional code created successfully!');
        setShowPromoModal(false);
        setPromoForm({
          code: '',
          name: '',
          description: '',
          discount_type: 'percentage',
          discount_value: '',
          min_order_amount: '',
          max_discount_amount: '',
          usage_limit: '',
          valid_from: '',
          valid_until: '',
          applicable_products: [],
          applicable_categories: []
        });
        fetchPromotionalCodes();
      }
    } catch (error) {
      console.error('Error creating promotional code:', error);
      alert('Failed to create promotional code');
    } finally {
      setLoading(false);
    }
  };

  const createCustomerSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/marketing/customer-segments', segmentForm);
      if (response.data.success) {
        alert('Customer segment created successfully!');
        setShowSegmentModal(false);
        setSegmentForm({
          name: '',
          description: '',
          criteria: {
            min_orders: '',
            min_spent: '',
            last_order_days: '',
            registration_days: ''
          }
        });
        fetchCustomerSegments();
      }
    } catch (error) {
      console.error('Error creating customer segment:', error);
      alert('Failed to create customer segment');
    } finally {
      setLoading(false);
    }
  };

  const createLoyaltyProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await adminApi.post('/marketing/loyalty-programs', loyaltyForm);
      if (response.data.success) {
        alert('Loyalty program created successfully!');
        setShowLoyaltyModal(false);
        setLoyaltyForm({
          name: '',
          description: '',
          points_per_rupee: '1',
          redemption_rate: '0.01',
          min_redemption_points: '100',
          max_redemption_percentage: '50'
        });
        fetchLoyaltyPrograms();
      }
    } catch (error) {
      console.error('Error creating loyalty program:', error);
      alert('Failed to create loyalty program');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailCampaign = async (campaignId: string) => {
    try {
      const response = await adminApi.post(`/marketing/email-campaigns/${campaignId}/send`);
      if (response.data.success) {
        alert(`Email campaign sent to ${response.data.recipients} recipients!`);
        fetchEmailCampaigns();
      }
    } catch (error) {
      console.error('Error sending email campaign:', error);
      alert('Failed to send email campaign');
    }
  };

  const sendSMSCampaign = async (campaignId: string) => {
    try {
      const response = await adminApi.post(`/marketing/sms-campaigns/${campaignId}/send`);
      if (response.data.success) {
        alert(`SMS campaign sent to ${response.data.recipients} recipients!`);
        fetchSMSCampaigns();
      }
    } catch (error) {
      console.error('Error sending SMS campaign:', error);
      alert('Failed to send SMS campaign');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#4ade80';
      case 'scheduled': return '#3b82f6';
      case 'draft': return '#6b7280';
      case 'paused': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <div className="section-header">
        <h2>📊 Marketing Overview</h2>
        <p>Comprehensive marketing analytics and insights</p>
      </div>

      {analytics ? (
        <div className="analytics-content">
          <div className="stats-grid">
            <div className="stat-card premium-card">
              <h3>Email Campaigns</h3>
              <div className="stat-value">{analytics.email.total_campaigns}</div>
              <div className="stat-subtitle">Sent: {analytics.email.sent_campaigns}</div>
              <div className="stat-details">
                <div>Recipients: {analytics.email.total_recipients}</div>
                <div>Delivered: {analytics.email.total_delivered}</div>
                <div>Open Rate: {analytics.email.avg_open_rate}%</div>
                <div>Click Rate: {analytics.email.avg_click_rate}%</div>
              </div>
            </div>

            <div className="stat-card premium-card">
              <h3>SMS Campaigns</h3>
              <div className="stat-value">{analytics.sms.total_campaigns}</div>
              <div className="stat-subtitle">Sent: {analytics.sms.sent_campaigns}</div>
              <div className="stat-details">
                <div>Recipients: {analytics.sms.total_recipients}</div>
                <div>Delivered: {analytics.sms.total_delivered}</div>
                <div>Delivery Rate: {analytics.sms.avg_delivery_rate}%</div>
              </div>
            </div>

            <div className="stat-card premium-card">
              <h3>Promotional Codes</h3>
              <div className="stat-value">{analytics.promotional.total_codes}</div>
              <div className="stat-subtitle">Active: {analytics.promotional.active_codes}</div>
              <div className="stat-details">
                <div>Total Usage: {analytics.promotional.total_usage}</div>
                <div>Discount Given: {formatCurrency(analytics.promotional.total_discount_given)}</div>
              </div>
            </div>

            <div className="stat-card premium-card">
              <h3>Customer Segments</h3>
              <div className="stat-value">{analytics.segmentation.total_segments}</div>
              <div className="stat-subtitle">Customers: {analytics.segmentation.total_segmented_customers}</div>
              <div className="stat-details">
                <div>Avg Segment Size: {Math.round(analytics.segmentation.avg_segment_size)}</div>
              </div>
            </div>

            <div className="stat-card premium-card">
              <h3>Loyalty Program</h3>
              <div className="stat-value">{analytics.loyalty.active_members}</div>
              <div className="stat-subtitle">Active Members</div>
              <div className="stat-details">
                <div>Points Earned: {analytics.loyalty.total_points_earned}</div>
                <div>Points Redeemed: {analytics.loyalty.total_points_redeemed}</div>
                <div>Balance: {analytics.loyalty.total_points_balance}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="loading-spinner">Loading analytics...</div>
      )}
    </div>
  );

  const renderEmailCampaigns = () => (
    <div className="email-campaigns-section">
      <div className="section-header">
        <h2>📧 Email Campaigns</h2>
        <p>Create and manage email marketing campaigns</p>
        <button 
          className="premium-btn"
          onClick={() => setShowEmailModal(true)}
        >
          Create Campaign
        </button>
      </div>

      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create Email Campaign</h3>
              <button 
                className="close-btn"
                onClick={() => setShowEmailModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createEmailCampaign} className="campaign-form">
              <div className="form-group">
                <label>Campaign Name</label>
                <input
                  type="text"
                  required
                  value={emailForm.name}
                  onChange={(e) => setEmailForm({...emailForm, name: e.target.value})}
                  className="premium-input"
                  placeholder="Enter campaign name"
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                  className="premium-input"
                  placeholder="Enter email subject"
                />
              </div>
              <div className="form-group">
                <label>Campaign Type</label>
                <select
                  value={emailForm.campaign_type}
                  onChange={(e) => setEmailForm({...emailForm, campaign_type: e.target.value})}
                  className="premium-input"
                >
                  <option value="promotional">Promotional</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="abandoned_cart">Abandoned Cart</option>
                  <option value="welcome">Welcome</option>
                  <option value="birthday">Birthday</option>
                  <option value="anniversary">Anniversary</option>
                </select>
              </div>
              <div className="form-group">
                <label>Target Audience</label>
                <select
                  value={emailForm.target_audience.segment}
                  onChange={(e) => setEmailForm({
                    ...emailForm, 
                    target_audience: {...emailForm.target_audience, segment: e.target.value}
                  })}
                  className="premium-input"
                >
                  <option value="all">All Customers</option>
                  <option value="subscribers">Subscribers Only</option>
                  <option value="customers">Customers Only</option>
                </select>
              </div>
              <div className="form-group">
                <label>Email Content</label>
                <textarea
                  required
                  value={emailForm.content}
                  onChange={(e) => setEmailForm({...emailForm, content: e.target.value})}
                  className="premium-input"
                  rows={8}
                  placeholder="Enter HTML email content..."
                />
              </div>
              <div className="form-group">
                <label>Scheduled At (Optional)</label>
                <input
                  type="datetime-local"
                  value={emailForm.scheduled_at}
                  onChange={(e) => setEmailForm({...emailForm, scheduled_at: e.target.value})}
                  className="premium-input"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowEmailModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="campaigns-table">
        <div className="table-header">
          <div>Name</div>
          <div>Subject</div>
          <div>Type</div>
          <div>Status</div>
          <div>Recipients</div>
          <div>Open Rate</div>
          <div>Click Rate</div>
          <div>Created</div>
          <div>Actions</div>
        </div>
        {emailCampaigns.map((campaign) => (
          <div key={campaign.id} className="table-row">
            <div className="campaign-name">{campaign.name}</div>
            <div className="campaign-subject">{campaign.subject}</div>
            <div className="campaign-type">{campaign.campaign_type}</div>
            <div className="status-cell">
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(campaign.status) }}
              >
                {campaign.status.toUpperCase()}
              </span>
            </div>
            <div className="recipients">{campaign.total_recipients}</div>
            <div className="open-rate">
              {campaign.delivered_count > 0 ? 
                Math.round((campaign.opened_count / campaign.delivered_count) * 100) : 0}%
            </div>
            <div className="click-rate">
              {campaign.opened_count > 0 ? 
                Math.round((campaign.clicked_count / campaign.opened_count) * 100) : 0}%
            </div>
            <div className="created-date">{formatDate(campaign.created_at)}</div>
            <div className="actions">
              {campaign.status === 'draft' && (
                <button 
                  className="premium-btn small"
                  onClick={() => sendEmailCampaign(campaign.id)}
                >
                  Send
                </button>
              )}
              <button className="premium-btn small secondary">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSMSCampaigns = () => (
    <div className="sms-campaigns-section">
      <div className="section-header">
        <h2>📱 SMS Campaigns</h2>
        <p>Create and manage SMS marketing campaigns</p>
        <button 
          className="premium-btn"
          onClick={() => setShowSMSModal(true)}
        >
          Create Campaign
        </button>
      </div>

      {showSMSModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create SMS Campaign</h3>
              <button 
                className="close-btn"
                onClick={() => setShowSMSModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createSMSCampaign} className="campaign-form">
              <div className="form-group">
                <label>Campaign Name</label>
                <input
                  type="text"
                  required
                  value={smsForm.name}
                  onChange={(e) => setSMSForm({...smsForm, name: e.target.value})}
                  className="premium-input"
                  placeholder="Enter campaign name"
                />
              </div>
              <div className="form-group">
                <label>Campaign Type</label>
                <select
                  value={smsForm.campaign_type}
                  onChange={(e) => setSMSForm({...smsForm, campaign_type: e.target.value})}
                  className="premium-input"
                >
                  <option value="promotional">Promotional</option>
                  <option value="transactional">Transactional</option>
                  <option value="otp">OTP</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
              <div className="form-group">
                <label>Target Audience</label>
                <select
                  value={smsForm.target_audience.segment}
                  onChange={(e) => setSMSForm({
                    ...smsForm, 
                    target_audience: {...smsForm.target_audience, segment: e.target.value}
                  })}
                  className="premium-input"
                >
                  <option value="all">All Customers</option>
                  <option value="subscribers">Subscribers Only</option>
                  <option value="customers">Customers Only</option>
                </select>
              </div>
              <div className="form-group">
                <label>SMS Message</label>
                <textarea
                  required
                  value={smsForm.message}
                  onChange={(e) => setSMSForm({...smsForm, message: e.target.value})}
                  className="premium-input"
                  rows={4}
                  placeholder="Enter SMS message (160 characters max)"
                  maxLength={160}
                />
                <div className="char-count">{smsForm.message.length}/160</div>
              </div>
              <div className="form-group">
                <label>Scheduled At (Optional)</label>
                <input
                  type="datetime-local"
                  value={smsForm.scheduled_at}
                  onChange={(e) => setSMSForm({...smsForm, scheduled_at: e.target.value})}
                  className="premium-input"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowSMSModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="campaigns-table">
        <div className="table-header">
          <div>Name</div>
          <div>Message</div>
          <div>Type</div>
          <div>Status</div>
          <div>Recipients</div>
          <div>Delivered</div>
          <div>Created</div>
          <div>Actions</div>
        </div>
        {smsCampaigns.map((campaign) => (
          <div key={campaign.id} className="table-row">
            <div className="campaign-name">{campaign.name}</div>
            <div className="campaign-message">{campaign.message}</div>
            <div className="campaign-type">{campaign.campaign_type}</div>
            <div className="status-cell">
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(campaign.status) }}
              >
                {campaign.status.toUpperCase()}
              </span>
            </div>
            <div className="recipients">{campaign.total_recipients}</div>
            <div className="delivered">{campaign.delivered_count}</div>
            <div className="created-date">{formatDate(campaign.created_at)}</div>
            <div className="actions">
              {campaign.status === 'draft' && (
                <button 
                  className="premium-btn small"
                  onClick={() => sendSMSCampaign(campaign.id)}
                >
                  Send
                </button>
              )}
              <button className="premium-btn small secondary">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPromotionalCodes = () => (
    <div className="promotional-codes-section">
      <div className="section-header">
        <h2>🎟️ Promotional Codes</h2>
        <p>Create and manage discount codes</p>
        <button 
          className="premium-btn"
          onClick={() => setShowPromoModal(true)}
        >
          Create Code
        </button>
      </div>

      {showPromoModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create Promotional Code</h3>
              <button 
                className="close-btn"
                onClick={() => setShowPromoModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createPromotionalCode} className="promo-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Code</label>
                  <input
                    type="text"
                    required
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                    className="premium-input"
                    placeholder="SAVE20"
                  />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    required
                    value={promoForm.name}
                    onChange={(e) => setPromoForm({...promoForm, name: e.target.value})}
                    className="premium-input"
                    placeholder="Summer Sale"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({...promoForm, description: e.target.value})}
                  className="premium-input"
                  rows={2}
                  placeholder="Enter description..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Discount Type</label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) => setPromoForm({...promoForm, discount_type: e.target.value})}
                    className="premium-input"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value</label>
                  <input
                    type="number"
                    required
                    value={promoForm.discount_value}
                    onChange={(e) => setPromoForm({...promoForm, discount_value: e.target.value})}
                    className="premium-input"
                    placeholder="20"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Order Amount</label>
                  <input
                    type="number"
                    value={promoForm.min_order_amount}
                    onChange={(e) => setPromoForm({...promoForm, min_order_amount: e.target.value})}
                    className="premium-input"
                    placeholder="500"
                  />
                </div>
                <div className="form-group">
                  <label>Max Discount Amount</label>
                  <input
                    type="number"
                    value={promoForm.max_discount_amount}
                    onChange={(e) => setPromoForm({...promoForm, max_discount_amount: e.target.value})}
                    className="premium-input"
                    placeholder="1000"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Usage Limit</label>
                  <input
                    type="number"
                    value={promoForm.usage_limit}
                    onChange={(e) => setPromoForm({...promoForm, usage_limit: e.target.value})}
                    className="premium-input"
                    placeholder="100"
                  />
                </div>
                <div className="form-group">
                  <label>Valid From</label>
                  <input
                    type="datetime-local"
                    required
                    value={promoForm.valid_from}
                    onChange={(e) => setPromoForm({...promoForm, valid_from: e.target.value})}
                    className="premium-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Valid Until</label>
                <input
                  type="datetime-local"
                  required
                  value={promoForm.valid_until}
                  onChange={(e) => setPromoForm({...promoForm, valid_until: e.target.value})}
                  className="premium-input"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowPromoModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="promo-codes-grid">
        {promotionalCodes.map((code) => (
          <div key={code.id} className="promo-code-card premium-card">
            <div className="promo-code-header">
              <h3>{code.code}</h3>
              <span className={`status-badge ${code.is_active ? 'active' : 'inactive'}`}>
                {code.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="promo-code-details">
              <p><strong>Name:</strong> {code.name}</p>
              <p><strong>Description:</strong> {code.description}</p>
              <p><strong>Discount:</strong> {code.discount_type === 'percentage' ? `${code.discount_value}%` : formatCurrency(code.discount_value)}</p>
              <p><strong>Min Order:</strong> {code.min_order_amount ? formatCurrency(code.min_order_amount) : 'No minimum'}</p>
              <p><strong>Usage:</strong> {code.used_count}/{code.usage_limit || 'Unlimited'}</p>
              <p><strong>Valid:</strong> {formatDate(code.valid_from)} - {formatDate(code.valid_until)}</p>
            </div>
            <div className="promo-code-actions">
              <button className="premium-btn small">Edit</button>
              <button className="premium-btn small danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCustomerSegments = () => (
    <div className="customer-segments-section">
      <div className="section-header">
        <h2>👥 Customer Segments</h2>
        <p>Create and manage customer segments for targeted marketing</p>
        <button 
          className="premium-btn"
          onClick={() => setShowSegmentModal(true)}
        >
          Create Segment
        </button>
      </div>

      {showSegmentModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create Customer Segment</h3>
              <button 
                className="close-btn"
                onClick={() => setShowSegmentModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createCustomerSegment} className="segment-form">
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
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowSegmentModal(false)}>
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
        {customerSegments.map((segment) => (
          <div key={segment.id} className="segment-card premium-card">
            <div className="segment-header">
              <h3>{segment.name}</h3>
              <span className={`status-badge ${segment.is_active ? 'active' : 'inactive'}`}>
                {segment.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="segment-details">
              <p><strong>Description:</strong> {segment.description}</p>
              <p><strong>Customer Count:</strong> {segment.customer_count}</p>
              <p><strong>Created:</strong> {formatDate(segment.created_at)}</p>
            </div>
            <div className="segment-actions">
              <button className="premium-btn small">Edit</button>
              <button className="premium-btn small">View Customers</button>
              <button className="premium-btn small danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLoyaltyPrograms = () => (
    <div className="loyalty-programs-section">
      <div className="section-header">
        <h2>⭐ Loyalty Programs</h2>
        <p>Create and manage customer loyalty programs</p>
        <button 
          className="premium-btn"
          onClick={() => setShowLoyaltyModal(true)}
        >
          Create Program
        </button>
      </div>

      {showLoyaltyModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create Loyalty Program</h3>
              <button 
                className="close-btn"
                onClick={() => setShowLoyaltyModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createLoyaltyProgram} className="loyalty-form">
              <div className="form-group">
                <label>Program Name</label>
                <input
                  type="text"
                  required
                  value={loyaltyForm.name}
                  onChange={(e) => setLoyaltyForm({...loyaltyForm, name: e.target.value})}
                  className="premium-input"
                  placeholder="Pureborn Rewards"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={loyaltyForm.description}
                  onChange={(e) => setLoyaltyForm({...loyaltyForm, description: e.target.value})}
                  className="premium-input"
                  rows={2}
                  placeholder="Earn points on every purchase..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Points per Rupee</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={loyaltyForm.points_per_rupee}
                    onChange={(e) => setLoyaltyForm({...loyaltyForm, points_per_rupee: e.target.value})}
                    className="premium-input"
                    placeholder="1"
                  />
                </div>
                <div className="form-group">
                  <label>Redemption Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loyaltyForm.redemption_rate}
                    onChange={(e) => setLoyaltyForm({...loyaltyForm, redemption_rate: e.target.value})}
                    className="premium-input"
                    placeholder="0.01"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Redemption Points</label>
                  <input
                    type="number"
                    required
                    value={loyaltyForm.min_redemption_points}
                    onChange={(e) => setLoyaltyForm({...loyaltyForm, min_redemption_points: e.target.value})}
                    className="premium-input"
                    placeholder="100"
                  />
                </div>
                <div className="form-group">
                  <label>Max Redemption %</label>
                  <input
                    type="number"
                    required
                    value={loyaltyForm.max_redemption_percentage}
                    onChange={(e) => setLoyaltyForm({...loyaltyForm, max_redemption_percentage: e.target.value})}
                    className="premium-input"
                    placeholder="50"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowLoyaltyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="loyalty-programs-grid">
        {loyaltyPrograms.map((program) => (
          <div key={program.id} className="loyalty-program-card premium-card">
            <div className="program-header">
              <h3>{program.name}</h3>
              <span className={`status-badge ${program.is_active ? 'active' : 'inactive'}`}>
                {program.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="program-details">
              <p><strong>Description:</strong> {program.description}</p>
              <p><strong>Points per ₹:</strong> {program.points_per_rupee}</p>
              <p><strong>Redemption Rate:</strong> {program.redemption_rate}</p>
              <p><strong>Min Points:</strong> {program.min_redemption_points}</p>
              <p><strong>Max Redemption:</strong> {program.max_redemption_percentage}%</p>
            </div>
            <div className="program-actions">
              <button className="premium-btn small">Edit</button>
              <button className="premium-btn small">View Members</button>
              <button className="premium-btn small danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="marketing-dashboard">
      <div className="page-header">
        <h1>📈 Marketing Dashboard</h1>
        <p>Comprehensive marketing management and analytics</p>
      </div>

      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          📧 Email
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
          onClick={() => setActiveTab('sms')}
        >
          📱 SMS
        </button>
        <button 
          className={`tab-btn ${activeTab === 'promo' ? 'active' : ''}`}
          onClick={() => setActiveTab('promo')}
        >
          🎟️ Promo Codes
        </button>
        <button 
          className={`tab-btn ${activeTab === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveTab('segments')}
        >
          👥 Segments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'loyalty' ? 'active' : ''}`}
          onClick={() => setActiveTab('loyalty')}
        >
          ⭐ Loyalty
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'email' && renderEmailCampaigns()}
        {activeTab === 'sms' && renderSMSCampaigns()}
        {activeTab === 'promo' && renderPromotionalCodes()}
        {activeTab === 'segments' && renderCustomerSegments()}
        {activeTab === 'loyalty' && renderLoyaltyPrograms()}
      </div>
    </div>
  );
};

export default MarketingDashboard;

