import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import './AdditionalEcommerceFeatures.css';

interface RecentlyViewedItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  average_rating: number;
  review_count: number;
  min_price: number;
  max_price: number;
  viewed_at: string;
}

interface FrequentlyBoughtTogether {
  id: string;
  product_id: string;
  related_product_id: string;
  product_name: string;
  product_image: string;
  average_rating: number;
  review_count: number;
  min_price: number;
  max_price: number;
  confidence_score: number;
  frequency: number;
}

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  remaining_amount: number;
  recipient_email: string;
  recipient_name: string;
  message: string;
  expires_at: string;
  status: string;
}

const AdditionalEcommerceFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recently-viewed' | 'frequently-bought' | 'gift-cards'>('recently-viewed');
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<FrequentlyBoughtTogether[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [giftCardForm, setGiftCardForm] = useState({
    amount: '',
    recipient_email: '',
    recipient_name: '',
    message: '',
    expires_at: ''
  });

  useEffect(() => {
    fetchRecentlyViewed();
  }, []);

  const fetchRecentlyViewed = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comprehensive/recently-viewed');
      setRecentlyViewed(response.data.recentlyViewed);
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFrequentlyBoughtTogether = async (productId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/comprehensive/frequently-bought-together/${productId}`);
      setFrequentlyBought(response.data.frequentlyBoughtTogether);
    } catch (error) {
      console.error('Error fetching frequently bought together:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comprehensive/gift-cards');
      setGiftCards(response.data.giftCards);
    } catch (error) {
      console.error('Error fetching gift cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/comprehensive/gift-cards', giftCardForm);
      alert('Gift card created successfully!');
      setShowGiftCardModal(false);
      setGiftCardForm({
        amount: '',
        recipient_email: '',
        recipient_name: '',
        message: '',
        expires_at: ''
      });
      fetchGiftCards();
    } catch (error) {
      console.error('Error creating gift card:', error);
      alert('Failed to create gift card');
    } finally {
      setLoading(false);
    }
  };

  const addToRecentlyViewed = async (productId: string) => {
    try {
      await api.post(`/comprehensive/recently-viewed/${productId}`);
    } catch (error) {
      console.error('Error adding to recently viewed:', error);
    }
  };

  const renderRecentlyViewed = () => (
    <div className="recently-viewed-section">
      <div className="section-header">
        <h2>🌟 Recently Viewed Products</h2>
        <p>Continue exploring products you've shown interest in</p>
      </div>
      
      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : recentlyViewed.length > 0 ? (
        <div className="product-grid">
          {recentlyViewed.map((item) => (
            <div key={item.id} className="product-card premium-card">
              <div className="product-image">
                <img src={item.product_image || '/api/placeholder/200/200'} alt={item.product_name} />
                <div className="product-overlay">
                  <button 
                    className="premium-btn"
                    onClick={() => {
                      addToRecentlyViewed(item.product_id);
                      (window as any).__setCurrentPage('product');
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
              <div className="product-info">
                <h3 className="product-name">{item.product_name}</h3>
                <div className="product-rating">
                  <span className="stars">⭐</span>
                  <span>{item.average_rating?.toFixed(1) || 'N/A'}</span>
                  <span>({item.review_count || 0} reviews)</span>
                </div>
                <div className="product-price">
                  {item.min_price === item.max_price ? (
                    <span className="price">₹{item.min_price}</span>
                  ) : (
                    <span className="price">₹{item.min_price} - ₹{item.max_price}</span>
                  )}
                </div>
                <div className="viewed-time">
                  Viewed {new Date(item.viewed_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">👀</div>
          <h3>No Recently Viewed Products</h3>
          <p>Start browsing products to see them here</p>
          <button 
            className="premium-btn"
            onClick={() => (window as any).__setCurrentPage('products')}
          >
            Browse Products
          </button>
        </div>
      )}
    </div>
  );

  const renderFrequentlyBoughtTogether = () => (
    <div className="frequently-bought-section">
      <div className="section-header">
        <h2>🛒 Frequently Bought Together</h2>
        <p>Products that customers often purchase together</p>
      </div>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Enter product ID to see frequently bought together items"
          className="premium-input"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              fetchFrequentlyBoughtTogether((e.target as HTMLInputElement).value);
            }
          }}
        />
        <button 
          className="premium-btn"
          onClick={() => {
            const input = document.querySelector('.premium-input') as HTMLInputElement;
            if (input.value) {
              fetchFrequentlyBoughtTogether(input.value);
            }
          }}
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : frequentlyBought.length > 0 ? (
        <div className="product-grid">
          {frequentlyBought.map((item) => (
            <div key={item.id} className="product-card premium-card">
              <div className="product-image">
                <img src={item.product_image || '/api/placeholder/200/200'} alt={item.product_name} />
                <div className="confidence-badge">
                  {Math.round(item.confidence_score * 100)}% match
                </div>
              </div>
              <div className="product-info">
                <h3 className="product-name">{item.product_name}</h3>
                <div className="product-rating">
                  <span className="stars">⭐</span>
                  <span>{item.average_rating?.toFixed(1) || 'N/A'}</span>
                  <span>({item.review_count || 0} reviews)</span>
                </div>
                <div className="product-price">
                  {item.min_price === item.max_price ? (
                    <span className="price">₹{item.min_price}</span>
                  ) : (
                    <span className="price">₹{item.min_price} - ₹{item.max_price}</span>
                  )}
                </div>
                <div className="frequency-info">
                  Bought together {item.frequency} times
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Search for a Product</h3>
          <p>Enter a product ID above to see frequently bought together items</p>
        </div>
      )}
    </div>
  );

  const renderGiftCards = () => (
    <div className="gift-cards-section">
      <div className="section-header">
        <h2>🎁 Gift Cards</h2>
        <p>Perfect gifts for your loved ones</p>
        <button 
          className="premium-btn"
          onClick={() => setShowGiftCardModal(true)}
        >
          Create Gift Card
        </button>
      </div>

      {showGiftCardModal && (
        <div className="modal-overlay">
          <div className="modal premium-card">
            <div className="modal-header">
              <h3>Create Gift Card</h3>
              <button 
                className="close-btn"
                onClick={() => setShowGiftCardModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createGiftCard} className="gift-card-form">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  required
                  value={giftCardForm.amount}
                  onChange={(e) => setGiftCardForm({...giftCardForm, amount: e.target.value})}
                  className="premium-input"
                />
              </div>
              <div className="form-group">
                <label>Recipient Name</label>
                <input
                  type="text"
                  required
                  value={giftCardForm.recipient_name}
                  onChange={(e) => setGiftCardForm({...giftCardForm, recipient_name: e.target.value})}
                  className="premium-input"
                />
              </div>
              <div className="form-group">
                <label>Recipient Email</label>
                <input
                  type="email"
                  required
                  value={giftCardForm.recipient_email}
                  onChange={(e) => setGiftCardForm({...giftCardForm, recipient_email: e.target.value})}
                  className="premium-input"
                />
              </div>
              <div className="form-group">
                <label>Message (Optional)</label>
                <textarea
                  value={giftCardForm.message}
                  onChange={(e) => setGiftCardForm({...giftCardForm, message: e.target.value})}
                  className="premium-input"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Expires At</label>
                <input
                  type="date"
                  value={giftCardForm.expires_at}
                  onChange={(e) => setGiftCardForm({...giftCardForm, expires_at: e.target.value})}
                  className="premium-input"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="premium-btn secondary" onClick={() => setShowGiftCardModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="premium-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Gift Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="gift-card-info">
        <div className="info-card premium-card">
          <h3>🎁 Gift Card Benefits</h3>
          <ul>
            <li>✅ No expiration date (unless specified)</li>
            <li>✅ Can be used for any product</li>
            <li>✅ Perfect for gifting</li>
            <li>✅ Instant delivery via email</li>
            <li>✅ Secure and safe</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="additional-ecommerce-features">
      <div className="page-header">
        <h1>🚀 Additional E-commerce Features</h1>
        <p>Enhanced shopping experience with advanced features</p>
      </div>

      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'recently-viewed' ? 'active' : ''}`}
          onClick={() => setActiveTab('recently-viewed')}
        >
          👀 Recently Viewed
        </button>
        <button 
          className={`tab-btn ${activeTab === 'frequently-bought' ? 'active' : ''}`}
          onClick={() => setActiveTab('frequently-bought')}
        >
          🛒 Frequently Bought Together
        </button>
        <button 
          className={`tab-btn ${activeTab === 'gift-cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('gift-cards')}
        >
          🎁 Gift Cards
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'recently-viewed' && renderRecentlyViewed()}
        {activeTab === 'frequently-bought' && renderFrequentlyBoughtTogether()}
        {activeTab === 'gift-cards' && renderGiftCards()}
      </div>
    </div>
  );
};

export default AdditionalEcommerceFeatures;







