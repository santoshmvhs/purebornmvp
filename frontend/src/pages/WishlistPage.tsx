import React, { useState, useEffect } from 'react';
import api from '../lib/api';

interface WishlistItem {
  id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  product_description: string;
  product_image: string;
  variant_name: string;
  variant_price: number;
  variant_image: string;
  inventory_quantity: number;
  average_rating: number;
  review_count: number;
  created_at: string;
}

const WishlistPage: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get('/enhanced/wishlist');
      if (data.success) {
        setWishlist(data.wishlist);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      setRemoving(wishlistId);
      const { data } = await api.delete(`/enhanced/wishlist/${wishlistId}`);
      if (data.success) {
        setWishlist(wishlist.filter(item => item.id !== wishlistId));
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      alert('Failed to remove item from wishlist');
    } finally {
      setRemoving(null);
    }
  };

  const clearWishlist = async () => {
    const confirmed = window.confirm('Are you sure you want to clear your entire wishlist?');
    if (!confirmed) {
      return;
    }

    try {
      const { data } = await api.delete('/enhanced/wishlist');
      if (data.success) {
        setWishlist([]);
        alert('Wishlist cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      alert('Failed to clear wishlist');
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
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? '#fbbf24' : '#d1d5db' }}>
        ★
      </span>
    ));
  };

  const WishlistCard: React.FC<{ item: WishlistItem }> = ({ item }) => {
    return (
      <div className="glass-card" style={{
        padding: '20px',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
      }}>
        
        {/* Remove Button */}
        <button
          className="btn-secondary"
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            padding: '8px',
            borderRadius: '50%',
            fontSize: '16px',
            opacity: removing === item.id ? 0.6 : 1
          }}
          onClick={() => removeFromWishlist(item.id)}
          disabled={removing === item.id}
        >
          {removing === item.id ? '⏳' : '❌'}
        </button>

        {/* Product Image */}
        <div style={{
          width: '100%',
          height: '200px',
          backgroundImage: `url(${item.product_image || item.variant_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '12px',
          marginBottom: '15px'
        }} />

        {/* Product Info */}
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ color: 'white', marginBottom: '8px', fontSize: '1.2rem' }}>
            {item.product_name}
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '8px' }}>
            {item.variant_name}
          </p>
          
          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderStars(Math.round(item.average_rating))}
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
              ({item.review_count})
            </span>
          </div>

          {/* Price */}
          <div style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: '600' }}>
            {formatCurrency(item.variant_price)}
          </div>

          {/* Stock Status */}
          <div style={{
            color: item.inventory_quantity > 0 ? '#10b981' : '#ef4444',
            fontSize: '0.8rem',
            marginTop: '5px'
          }}>
            {item.inventory_quantity > 0 ? `✅ In Stock (${item.inventory_quantity})` : '❌ Out of Stock'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-primary"
            style={{ flex: 1, padding: '10px' }}
            onClick={() => {
              // Add to cart logic
              alert('Add to cart functionality will be implemented');
            }}
            disabled={item.inventory_quantity === 0}
          >
            🛒 Add to Cart
          </button>
          <button 
            className="btn-secondary"
            style={{ padding: '10px' }}
            onClick={() => {
              // View product logic
              (window as any).__setCurrentPage && (window as any).__setCurrentPage('product');
            }}
          >
            👁️ View
          </button>
        </div>

        {/* Added Date */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.7rem',
          marginTop: '10px',
          textAlign: 'center'
        }}>
          Added on {formatDate(item.created_at)}
        </div>
      </div>
    );
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
          ❤️ My Wishlist
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Save your favorite products for later
        </p>
      </div>

      {/* Wishlist Stats */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: 'white', marginBottom: '5px' }}>
              {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'} in Wishlist
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
              Total estimated value: {formatCurrency(wishlist.reduce((sum, item) => sum + item.variant_price, 0))}
            </p>
          </div>
          {wishlist.length > 0 && (
            <button 
              className="btn-secondary"
              onClick={clearWishlist}
              style={{ padding: '10px 20px' }}
            >
              🗑️ Clear All
            </button>
          )}
        </div>
      </div>

      {/* Wishlist Grid */}
      {wishlist.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '25px'
        }}>
          {wishlist.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❤️</div>
          <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
            Your Wishlist is Empty
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '30px' }}>
            Start adding products you love to your wishlist
          </p>
          <button 
            className="btn-primary"
            onClick={() => (window as any).__setCurrentPage && (window as any).__setCurrentPage('products')}
          >
            🛍️ Browse Products
          </button>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
