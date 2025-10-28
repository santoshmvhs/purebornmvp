import React, { useState, useEffect } from 'react';
import './CartPage.css';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  price: number;
  quantity: number;
  image: string;
  volume: number;
  volumeUnit: string;
  category: string;
  description: string;
  isPremium?: boolean;
}

interface Recommendation {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  discount?: number;
}

const CartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      productId: '1',
      productName: 'Virgin Coconut Oil',
      variantId: '1',
      variantName: '500ml Premium Bottle',
      price: 299.00,
      quantity: 2,
      image: 'https://via.placeholder.com/200x200?text=Coconut+Oil',
      volume: 500,
      volumeUnit: 'ml',
      category: 'Cold Pressed Oils',
      description: 'Premium cold pressed virgin coconut oil',
      isPremium: true
    },
    {
      id: '2',
      productId: '2',
      productName: 'Sesame Gold Oil',
      variantId: '2',
      variantName: '500ml Heritage Bottle',
      price: 249.00,
      quantity: 1,
      image: 'https://via.placeholder.com/200x200?text=Sesame+Oil',
      volume: 500,
      volumeUnit: 'ml',
      category: 'Cold Pressed Oils',
      description: 'Traditional cold pressed sesame oil',
      isPremium: true
    },
    {
      id: '3',
      productId: '3',
      productName: 'Sunflower Pure Oil',
      variantId: '3',
      variantName: '250ml Pure Bottle',
      price: 199.00,
      quantity: 1,
      image: 'https://via.placeholder.com/200x200?text=Sunflower+Oil',
      volume: 250,
      volumeUnit: 'ml',
      category: 'Cold Pressed Oils',
      description: 'Light and versatile sunflower oil',
      isPremium: false
    }
  ]);

  const [recommendations] = useState<Recommendation[]>([
    {
      id: '4',
      name: 'Olive Oil Extra Virgin',
      price: 399.00,
      image: 'https://via.placeholder.com/150x150?text=Olive+Oil',
      category: 'Cold Pressed Oils',
      discount: 15
    },
    {
      id: '5',
      name: 'Mustard Oil Premium',
      price: 179.00,
      image: 'https://via.placeholder.com/150x150?text=Mustard+Oil',
      category: 'Cold Pressed Oils',
      discount: 10
    },
    {
      id: '6',
      name: 'Ghee Pure Desi',
      price: 499.00,
      image: 'https://via.placeholder.com/150x150?text=Ghee',
      category: 'Dairy Products',
      discount: 20
    }
  ]);

  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [showRecommendations, setShowRecommendations] = useState(true);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    // Add animation
    setAnimatingItems(prev => new Set(prev).add(itemId));
    
    setCartItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );

    // Remove animation after delay
    setTimeout(() => {
      setAnimatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, 300);
  };

  const removeItem = (itemId: string) => {
    // Add removal animation
    setAnimatingItems(prev => new Set(prev).add(itemId));
    
    setTimeout(() => {
      setCartItems(items => items.filter(item => item.id !== itemId));
      setAnimatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, 500);
  };

  const addRecommendation = (recommendation: Recommendation) => {
    const newItem: CartItem = {
      id: Date.now().toString(),
      productId: recommendation.id,
      productName: recommendation.name,
      variantId: recommendation.id,
      variantName: 'Standard Bottle',
      price: recommendation.price,
      quantity: 1,
      image: recommendation.image,
      volume: 500,
      volumeUnit: 'ml',
      category: recommendation.category,
      description: `Premium ${recommendation.name.toLowerCase()}`,
      isPremium: true
    };

    setCartItems(prev => [...prev, newItem]);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal > 1000 ? 0 : 50;
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (subtotal > 2000) return subtotal * 0.1; // 10% discount over ₹2000
    if (subtotal > 1000) return subtotal * 0.05; // 5% discount over ₹1000
    return 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() - calculateDiscount();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const getFreeShippingProgress = () => {
    const subtotal = calculateSubtotal();
    const target = 1000;
    return Math.min((subtotal / target) * 100, 100);
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page-premium">
        <div className="container-premium">
          <div className="empty-cart-premium">
            <div className="empty-cart-animation">
              <div className="empty-cart-icon">🛒</div>
              <div className="floating-drops">
                <div className="drop drop-1">💧</div>
                <div className="drop drop-2">💧</div>
                <div className="drop drop-3">💧</div>
              </div>
            </div>
            <h2 className="empty-title">Your cart is empty</h2>
            <p className="empty-description">
              Discover our premium collection of cold pressed oils and add some luxury to your cart.
            </p>
            <button className="btn-premium-primary-large">
              <span className="btn-text">Explore Premium Collection</span>
              <span className="btn-icon">→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-premium">
      <div className="container-premium">
        {/* Premium Header */}
        <div className="cart-header-premium">
          <div className="header-content">
            <h1 className="cart-title-premium">Shopping Cart</h1>
            <p className="cart-subtitle-premium">
              {cartItems.length} premium item{cartItems.length !== 1 ? 's' : ''} in your cart
            </p>
          </div>
          <div className="cart-stats">
            <div className="stat-item">
              <span className="stat-number">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
              <span className="stat-label">Items</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{formatPrice(calculateSubtotal())}</span>
              <span className="stat-label">Subtotal</span>
            </div>
          </div>
        </div>

        <div className="cart-layout-premium">
          {/* Cart Items */}
          <div className="cart-items-premium">
            <div className="items-header">
              <h2>Your Premium Selection</h2>
              <button 
                className="clear-cart-btn"
                onClick={() => setCartItems([])}
              >
                Clear All
              </button>
            </div>

            <div className="items-list">
              {cartItems.map(item => (
                <div 
                  key={item.id} 
                  className={`cart-item-premium ${animatingItems.has(item.id) ? 'animating' : ''}`}
                >
                  <div className="item-image-premium">
                    <img src={item.image} alt={item.productName} />
                    {item.isPremium && <div className="premium-badge">Premium</div>}
                    <div className="item-category">{item.category}</div>
                  </div>
                  
                  <div className="item-details-premium">
                    <div className="item-header">
                      <h3 className="item-name-premium">{item.productName}</h3>
                      <button 
                        className="remove-btn-premium"
                        onClick={() => removeItem(item.id)}
                      >
                        <span className="remove-icon">✕</span>
                      </button>
                    </div>
                    
                    <p className="item-variant-premium">{item.variantName}</p>
                    <p className="item-description-premium">{item.description}</p>
                    
                    <div className="item-specs">
                      <span className="spec-item">Volume: {item.volume}{item.volumeUnit}</span>
                      <span className="spec-item">Category: {item.category}</span>
                    </div>
                  </div>
                  
                  <div className="item-quantity-premium">
                    <div className="quantity-label">Quantity</div>
                    <div className="quantity-controls-premium">
                      <button 
                        className="quantity-btn-premium"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <div className="quantity-display-premium">
                        <span className="quantity-number">{item.quantity}</span>
                      </div>
                      <button 
                        className="quantity-btn-premium"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="item-price-premium">
                    <div className="price-breakdown">
                      <span className="unit-price-premium">{formatPrice(item.price)}</span>
                      <span className="price-per-unit">per {item.volume}{item.volumeUnit}</span>
                    </div>
                    <div className="total-price-premium">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Free Shipping Progress */}
            <div className="shipping-progress-premium">
              <div className="progress-header">
                <h3>Free Shipping Progress</h3>
                <span className="progress-text">
                  {getFreeShippingProgress() < 100 
                    ? `${formatPrice(1000 - calculateSubtotal())} more for free shipping`
                    : '🎉 You qualify for free shipping!'
                  }
                </span>
              </div>
              <div className="progress-bar-premium">
                <div 
                  className="progress-fill-premium"
                  style={{ width: `${getFreeShippingProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-summary-premium">
            <div className="summary-header">
              <h2>Order Summary</h2>
              <div className="summary-badge">Premium Order</div>
            </div>
            
            <div className="summary-breakdown">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(calculateSubtotal())}</span>
              </div>
              
              {calculateDiscount() > 0 && (
                <div className="summary-row discount">
                  <span>Discount ({calculateSubtotal() > 2000 ? '10%' : '5%'})</span>
                  <span>-{formatPrice(calculateDiscount())}</span>
                </div>
              )}
              
              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {calculateShipping() === 0 ? (
                    <span className="free-shipping">Free</span>
                  ) : (
                    formatPrice(calculateShipping())
                  )}
                </span>
              </div>
              
              <div className="summary-divider"></div>
              
              <div className="summary-row total-premium">
                <span>Total</span>
                <span>{formatPrice(calculateTotal())}</span>
              </div>
            </div>
            
            <div className="checkout-actions-premium">
              <button className="btn-checkout-premium" onClick={() => (window as any).__setCurrentPage && (window as any).__setCurrentPage('checkout')}>
                <span className="btn-icon">🛒</span>
                <span className="btn-text">Proceed to Checkout</span>
                <span className="btn-arrow">→</span>
              </button>
              
              <button className="btn-continue-premium">
                <span className="btn-text">Continue Shopping</span>
                <span className="btn-icon">←</span>
              </button>
            </div>
            
            <div className="payment-methods-premium">
              <h4>Secure Payment</h4>
              <div className="payment-icons-premium">
                <div className="payment-icon">💳</div>
                <div className="payment-icon">🏦</div>
                <div className="payment-icon">📱</div>
                <div className="payment-icon">💰</div>
              </div>
              <p className="payment-text">We accept all major payment methods</p>
            </div>

            <div className="trust-signals-premium">
              <div className="trust-item">
                <span className="trust-icon">🔒</span>
                <span className="trust-text">256-bit SSL encryption</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🔄</span>
                <span className="trust-text">30-day return guarantee</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🚚</span>
                <span className="trust-text">Free shipping over ₹1000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Recommendations */}
        {showRecommendations && (
          <div className="recommendations-premium">
            <div className="recommendations-header">
              <h2>You Might Also Like</h2>
              <button 
                className="hide-recommendations-btn"
                onClick={() => setShowRecommendations(false)}
              >
                Hide
              </button>
            </div>
            
            <div className="recommendations-grid">
              {recommendations.map(rec => (
                <div key={rec.id} className="recommendation-item-premium">
                  <div className="rec-image">
                    <img src={rec.image} alt={rec.name} />
                    {rec.discount && (
                      <div className="discount-badge">{rec.discount}% OFF</div>
                    )}
                  </div>
                  
                  <div className="rec-content">
                    <h4 className="rec-name">{rec.name}</h4>
                    <p className="rec-category">{rec.category}</p>
                    <div className="rec-price">
                      <span className="current-price">{formatPrice(rec.price)}</span>
                      {rec.discount && (
                        <span className="original-price">
                          {formatPrice(rec.price / (1 - rec.discount / 100))}
                        </span>
                      )}
                    </div>
                    
                    <button 
                      className="btn-add-recommendation"
                      onClick={() => addRecommendation(rec)}
                    >
                      <span className="btn-text">Add to Cart</span>
                      <span className="btn-icon">+</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
