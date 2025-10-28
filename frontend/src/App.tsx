import React, { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import CheckoutPage from './pages/CheckoutPage';
import CartPage from './pages/CartPage';
import SubscriptionPortal from './pages/SubscriptionPortal';
import WishlistPage from './pages/WishlistPage';
import AdvancedSearchPage from './pages/AdvancedSearchPage';
import AdditionalEcommerceFeatures from './pages/AdditionalEcommerceFeatures';
import EnhancedPaymentFeatures from './pages/EnhancedPaymentFeatures';
import Logo from './components/Logo';
import PremiumLoading from './components/PremiumLoading';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

type Page = 'home' | 'products' | 'product' | 'cart' | 'checkout' | 'subscriptions' | 'wishlist' | 'search' | 'login' | 'register' | 'additional-ecommerce' | 'enhanced-payment';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isLoading, setIsLoading] = useState(true);
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handlePageChange = (page: Page) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsLoading(false);
    }, 500);
  };

  // Expose setter for simple cross-component navigation without router
  (window as any).__setCurrentPage = handlePageChange;

  const handleLogout = () => {
    logout();
    handlePageChange('home');
  };

  const handleProtectedAction = (page: Page) => {
    if (page === 'cart' || page === 'checkout' || page === 'subscriptions' || page === 'wishlist' || page === 'additional-ecommerce' || page === 'enhanced-payment') {
      if (!isAuthenticated) {
        handlePageChange('login');
        return;
      }
    }
    handlePageChange(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'products':
        return <ProductsPage />;
      case 'product':
        return <ProductPage />;
      case 'cart':
        return <CartPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'subscriptions':
        return <SubscriptionPortal />;
      case 'wishlist':
        return <WishlistPage />;
      case 'search':
        return <AdvancedSearchPage />;
      case 'additional-ecommerce':
        return <AdditionalEcommerceFeatures />;
      case 'enhanced-payment':
        return <EnhancedPaymentFeatures />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="App">
      <PremiumLoading isLoading={isLoading} onComplete={() => setIsLoading(false)} />
      
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <Logo />
          </div>
          
          <div className="nav-links">
            <button 
              className={`nav-link premium-hover-effect ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => handlePageChange('home')}
            >
              Home
            </button>
            <button 
              className={`nav-link premium-hover-effect ${currentPage === 'products' ? 'active' : ''}`}
              onClick={() => handlePageChange('products')}
            >
              Products
            </button>
            <button 
              className={`nav-link premium-hover-effect ${currentPage === 'product' ? 'active' : ''}`}
              onClick={() => handlePageChange('product')}
            >
              Product Detail
            </button>
            <button 
              className={`nav-link premium-hover-effect ${currentPage === 'cart' ? 'active' : ''}`}
              onClick={() => handleProtectedAction('cart')}
            >
              Cart (2)
            </button>
            <button 
              className={`nav-link premium-hover-effect ${currentPage === 'checkout' ? 'active' : ''}`}
              onClick={() => handleProtectedAction('checkout')}
            >
              Checkout
            </button>
            {isAuthenticated && (
              <button 
                className={`nav-link premium-hover-effect ${currentPage === 'subscriptions' ? 'active' : ''}`}
                onClick={() => handlePageChange('subscriptions')}
              >
                🔄 Subscriptions
              </button>
            )}
            {isAuthenticated && (
              <button 
                className={`nav-link premium-hover-effect ${currentPage === 'wishlist' ? 'active' : ''}`}
                onClick={() => handlePageChange('wishlist')}
              >
                ❤️ Wishlist
              </button>
            )}
            <button 
              className={`nav-link premium-hover-effect ${currentPage === 'search' ? 'active' : ''}`}
              onClick={() => handlePageChange('search')}
            >
              🔍 Search
            </button>
            {isAuthenticated && (
              <button 
                className={`nav-link premium-hover-effect ${currentPage === 'additional-ecommerce' ? 'active' : ''}`}
                onClick={() => handlePageChange('additional-ecommerce')}
              >
                🚀 E-commerce
              </button>
            )}
            {isAuthenticated && (
              <button 
                className={`nav-link premium-hover-effect ${currentPage === 'enhanced-payment' ? 'active' : ''}`}
                onClick={() => handlePageChange('enhanced-payment')}
              >
                💳 Payments
              </button>
            )}
          </div>
          
          <div className="nav-actions">
            <button className="search-btn premium-hover-effect">🔍</button>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#059669', fontSize: '0.9rem' }}>
                  Welcome, {user?.firstName}
                </span>
                <button 
                  className="user-btn premium-hover-effect" 
                  onClick={handleLogout}
                  title="Logout"
                >
                  🚪
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="user-btn premium-hover-effect" 
                  onClick={() => handlePageChange('login')}
                  title="Login"
                >
                  👤
                </button>
                <button 
                  className="user-btn premium-hover-effect" 
                  onClick={() => handlePageChange('register')}
                  title="Register"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>Pureborn</h4>
            <p>Premium cold pressed oils for your health and wellness journey.</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><button className="premium-hover-effect" onClick={() => handlePageChange('home')}>Home</button></li>
              <li><button className="premium-hover-effect" onClick={() => handlePageChange('products')}>Products</button></li>
              <li><button className="premium-hover-effect" onClick={() => handlePageChange('cart')}>Cart</button></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Contact</h4>
            <p>📧 info@pureborn.com</p>
            <p>📞 +91 9876543210</p>
            <p>📍 Mumbai, India</p>
          </div>
          
          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="social-links">
              <button className="premium-hover-effect">📘</button>
              <button className="premium-hover-effect">📷</button>
              <button className="premium-hover-effect">🐦</button>
              <button className="premium-hover-effect">📺</button>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 Pureborn. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;