import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import './EnhancedPaymentFeatures.css';

interface PaymentMethod {
  id: string;
  method_type: string;
  provider: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface PaymentTransaction {
  id: string;
  order_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  processed_at: string;
  created_at: string;
}

interface Refund {
  id: string;
  order_id: string;
  amount: number;
  reason: string;
  status: string;
  processed_at: string;
  created_at: string;
}

interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  pdf_url: string;
  created_at: string;
}

const EnhancedPaymentFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payment-methods' | 'transactions' | 'refunds' | 'invoices'>('payment-methods');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    method_type: 'card',
    provider: '',
    token: '',
    last_four: '',
    expiry_month: '',
    expiry_year: '',
    is_default: false
  });
  const [refundForm, setRefundForm] = useState({
    order_id: '',
    amount: '',
    reason: ''
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comprehensive/payment-methods');
      setPaymentMethods(response.data.paymentMethods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comprehensive/transactions');
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comprehensive/refunds');
      setRefunds(response.data.refunds);
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comprehensive/invoices');
      setInvoices(response.data.invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/comprehensive/payment-methods', paymentForm);
      alert('Payment method added successfully!');
      setShowAddPaymentModal(false);
      setPaymentForm({
        method_type: 'card',
        provider: '',
        token: '',
        last_four: '',
        expiry_month: '',
        expiry_year: '',
        is_default: false
      });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const createRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/comprehensive/refunds', refundForm);
      alert('Refund request submitted successfully!');
      setShowRefundModal(false);
      setRefundForm({
        order_id: '',
        amount: '',
        reason: ''
      });
      fetchRefunds();
    } catch (error) {
      console.error('Error creating refund:', error);
      alert('Failed to create refund request');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/comprehensive/invoices/${orderId}`);
      alert('Invoice generated successfully!');
      fetchInvoices();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethods = () => (
    <div className="payment-methods-section">
      <div className="section-header">
        <h2>💳 Payment Methods</h2>
        <p>Manage your saved payment methods</p>
        <button 
          className="premium-btn"
          onClick={() => setShowAddPaymentModal(true)}
        >
          Add Payment Method
        </button>
      </div>

      {showAddPaymentModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Add Payment Method</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddPaymentModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={addPaymentMethod} className="payment-form">
              <div className="form-group">
                <label>Payment Type</label>
                <select
                  value={paymentForm.method_type}
                  onChange={(e) => setPaymentForm({...paymentForm, method_type: e.target.value})}
                  className="premium-input"
                >
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="wallet">Digital Wallet</option>
                  <option value="emi">EMI</option>
                </select>
              </div>
              <div className="form-group">
                <label>Provider</label>
                <input
                  type="text"
                  required
                  value={paymentForm.provider}
                  onChange={(e) => setPaymentForm({...paymentForm, provider: e.target.value})}
                  className="premium-input"
                  placeholder="e.g., Visa, Mastercard, Razorpay"
                />
              </div>
              <div className="form-group">
                <label>Last Four Digits</label>
                <input
                  type="text"
                  maxLength={4}
                  value={paymentForm.last_four}
                  onChange={(e) => setPaymentForm({...paymentForm, last_four: e.target.value})}
                  className="premium-input"
                  placeholder="1234"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Month</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={paymentForm.expiry_month}
                    onChange={(e) => setPaymentForm({...paymentForm, expiry_month: e.target.value})}
                    className="premium-input"
                    placeholder="MM"
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Year</label>
                  <input
                    type="number"
                    min={new Date().getFullYear()}
                    value={paymentForm.expiry_year}
                    onChange={(e) => setPaymentForm({...paymentForm, expiry_year: e.target.value})}
                    className="premium-input"
                    placeholder="YYYY"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={paymentForm.is_default}
                    onChange={(e) => setPaymentForm({...paymentForm, is_default: e.target.checked})}
                  />
                  Set as default payment method
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowAddPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Payment Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : paymentMethods.length > 0 ? (
        <div className="payment-methods-grid">
          {paymentMethods.map((method) => (
            <div key={method.id} className="payment-method-card premium-card">
              <div className="payment-method-header">
                <div className="payment-method-icon">
                  {method.method_type === 'card' && '💳'}
                  {method.method_type === 'upi' && '📱'}
                  {method.method_type === 'netbanking' && '🏦'}
                  {method.method_type === 'wallet' && '👛'}
                  {method.method_type === 'emi' && '📅'}
                </div>
                <div className="payment-method-info">
                  <h3>{method.provider}</h3>
                  <p>**** **** **** {method.last_four}</p>
                  {method.expiry_month && method.expiry_year && (
                    <p>Expires: {method.expiry_month}/{method.expiry_year}</p>
                  )}
                </div>
                {method.is_default && (
                  <div className="default-badge">Default</div>
                )}
              </div>
              <div className="payment-method-actions">
                <button className="premium-btn secondary">Edit</button>
                <button className="premium-btn danger">Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <h3>No Payment Methods</h3>
          <p>Add a payment method to make checkout faster</p>
        </div>
      )}
    </div>
  );

  const renderTransactions = () => (
    <div className="transactions-section">
      <div className="section-header">
        <h2>📊 Payment Transactions</h2>
        <p>View your payment history</p>
        <button 
          className="premium-btn"
          onClick={fetchTransactions}
        >
          Refresh Transactions
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : transactions.length > 0 ? (
        <div className="transactions-table">
          <div className="table-header">
            <div>Transaction ID</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Gateway</div>
            <div>Date</div>
            <div>Actions</div>
          </div>
          {transactions.map((transaction) => (
            <div key={transaction.id} className="table-row">
              <div className="transaction-id">{transaction.transaction_id}</div>
              <div className="amount">₹{transaction.amount}</div>
              <div className={`status ${transaction.status}`}>
                {transaction.status}
              </div>
              <div className="gateway">{transaction.gateway}</div>
              <div className="date">
                {new Date(transaction.created_at).toLocaleDateString()}
              </div>
              <div className="actions">
                <button className="premium-btn small">View Details</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Transactions Found</h3>
          <p>Your payment transactions will appear here</p>
        </div>
      )}
    </div>
  );

  const renderRefunds = () => (
    <div className="refunds-section">
      <div className="section-header">
        <h2>💰 Refunds</h2>
        <p>Request and track refunds</p>
        <button 
          className="premium-btn"
          onClick={() => setShowRefundModal(true)}
        >
          Request Refund
        </button>
      </div>

      {showRefundModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Request Refund</h3>
              <button 
                className="close-btn"
                onClick={() => setShowRefundModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createRefund} className="refund-form">
              <div className="form-group">
                <label>Order ID</label>
                <input
                  type="text"
                  required
                  value={refundForm.order_id}
                  onChange={(e) => setRefundForm({...refundForm, order_id: e.target.value})}
                  className="premium-input"
                  placeholder="Enter order ID"
                />
              </div>
              <div className="form-group">
                <label>Refund Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({...refundForm, amount: e.target.value})}
                  className="premium-input"
                  placeholder="Enter refund amount"
                />
              </div>
              <div className="form-group">
                <label>Reason for Refund</label>
                <textarea
                  required
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({...refundForm, reason: e.target.value})}
                  className="premium-input"
                  rows={4}
                  placeholder="Please explain why you need a refund..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowRefundModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Refund Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : refunds.length > 0 ? (
        <div className="refunds-table">
          <div className="table-header">
            <div>Refund ID</div>
            <div>Order ID</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Reason</div>
            <div>Date</div>
          </div>
          {refunds.map((refund) => (
            <div key={refund.id} className="table-row">
              <div className="refund-id">{refund.id.slice(0, 8)}...</div>
              <div className="order-id">{refund.order_id.slice(0, 8)}...</div>
              <div className="amount">₹{refund.amount}</div>
              <div className={`status ${refund.status}`}>
                {refund.status}
              </div>
              <div className="reason">{refund.reason}</div>
              <div className="date">
                {new Date(refund.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h3>No Refunds</h3>
          <p>Your refund requests will appear here</p>
        </div>
      )}
    </div>
  );

  const renderInvoices = () => (
    <div className="invoices-section">
      <div className="section-header">
        <h2>📄 Invoices</h2>
        <p>Generate and download invoices</p>
      </div>

      <div className="invoice-generator">
        <h3>Generate Invoice</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder="Enter Order ID"
            className="premium-input"
            id="invoice-order-id"
          />
          <button 
            className="premium-btn"
            onClick={() => {
              const orderId = (document.getElementById('invoice-order-id') as HTMLInputElement).value;
              if (orderId) {
                generateInvoice(orderId);
              } else {
                alert('Please enter an order ID');
              }
            }}
          >
            Generate Invoice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : invoices.length > 0 ? (
        <div className="invoices-table">
          <div className="table-header">
            <div>Invoice Number</div>
            <div>Order ID</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
            <div>Actions</div>
          </div>
          {invoices.map((invoice) => (
            <div key={invoice.id} className="table-row">
              <div className="invoice-number">{invoice.invoice_number}</div>
              <div className="order-id">{invoice.order_id.slice(0, 8)}...</div>
              <div className="amount">₹{invoice.total_amount}</div>
              <div className={`status ${invoice.status}`}>
                {invoice.status}
              </div>
              <div className="date">
                {new Date(invoice.created_at).toLocaleDateString()}
              </div>
              <div className="actions">
                {invoice.pdf_url ? (
                  <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="premium-btn small">
                    Download PDF
                  </a>
                ) : (
                  <button className="premium-btn small disabled" disabled>
                    Generating...
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No Invoices</h3>
          <p>Generated invoices will appear here</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="enhanced-payment-features">
      <div className="page-header">
        <h1>💳 Enhanced Payment & Financial Features</h1>
        <p>Comprehensive payment management and financial tools</p>
      </div>

      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'payment-methods' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment-methods')}
        >
          💳 Payment Methods
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          📊 Transactions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'refunds' ? 'active' : ''}`}
          onClick={() => setActiveTab('refunds')}
        >
          💰 Refunds
        </button>
        <button 
          className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          📄 Invoices
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'payment-methods' && renderPaymentMethods()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'refunds' && renderRefunds()}
        {activeTab === 'invoices' && renderInvoices()}
      </div>
    </div>
  );
};

export default EnhancedPaymentFeatures;







