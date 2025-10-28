import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

interface Product {
  id: string;
  name: string;
  description: string;
  image_url: string;
  average_rating: number;
  review_count: number;
  min_price: number;
  max_price: number;
  variant_count: number;
  view_count: number;
}

interface SearchFilters {
  category: string;
  minPrice: string;
  maxPrice: string;
  rating: string;
  sort: string;
}

const AdvancedSearchPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    sort: 'newest'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const fetchSuggestions = async () => {
    try {
      const { data } = await api.get('/enhanced/search/suggestions', {
        params: { q: searchTerm }
      });
      if (data.success) {
        setSuggestions(data.suggestions.map((s: any) => s.name));
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const searchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        q: searchTerm,
        page,
        limit: pagination.limit,
        ...filters
      };

      const { data } = await api.get('/enhanced/search', { params });
      if (data.success) {
        setProducts(data.products);
        setPagination(data.pagination);
        
        // Save search term to recent searches
        if (searchTerm && !recentSearches.includes(searchTerm)) {
          const newRecentSearches = [searchTerm, ...recentSearches.slice(0, 4)];
          setRecentSearches(newRecentSearches);
          localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
        }
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term?: string) => {
    const searchValue = term || searchTerm;
    if (searchValue.trim()) {
      setSearchTerm(searchValue);
      setShowSuggestions(false);
      searchProducts(1);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const confirmed = window.confirm('Are you sure you want to clear all filters?');
    if (!confirmed) {
      return;
    }
    
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      rating: '',
      sort: 'newest'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? '#fbbf24' : '#d1d5db' }}>
        ★
      </span>
    ));
  };

  const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    return (
      <div className="glass-card" style={{
        padding: '20px',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
      }}
      onClick={() => {
        // Track product view
        api.post(`/enhanced/products/${product.id}/view`);
        // Navigate to product page
        (window as any).__setCurrentPage && (window as any).__setCurrentPage('product');
      }}>
        
        {/* Product Image */}
        <div style={{
          width: '100%',
          height: '200px',
          backgroundImage: `url(${product.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '12px',
          marginBottom: '15px'
        }} />

        {/* Product Info */}
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ color: 'white', marginBottom: '8px', fontSize: '1.1rem' }}>
            {product.name}
          </h3>
          
          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderStars(Math.round(product.average_rating))}
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
              ({product.review_count})
            </span>
          </div>

          {/* Price Range */}
          <div style={{ color: '#10b981', fontSize: '1rem', fontWeight: '600' }}>
            {product.min_price === product.max_price 
              ? formatCurrency(product.min_price)
              : `${formatCurrency(product.min_price)} - ${formatCurrency(product.max_price)}`
            }
          </div>

          {/* Variants */}
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginTop: '5px' }}>
            {product.variant_count} {product.variant_count === 1 ? 'variant' : 'variants'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-primary"
            style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
            onClick={(e) => {
              e.stopPropagation();
              // Add to cart logic
              alert('Add to cart functionality will be implemented');
            }}
          >
            🛒 Add to Cart
          </button>
          <button 
            className="btn-secondary"
            style={{ padding: '8px', fontSize: '0.9rem' }}
            onClick={(e) => {
              e.stopPropagation();
              // Add to wishlist logic
              alert('Add to wishlist functionality will be implemented');
            }}
          >
            ❤️
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          🔍 Advanced Search
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Find the perfect products with our advanced search and filters
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: '25px', marginBottom: '30px' }}>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <input
            ref={searchInputRef}
            type="text"
            className="input-field"
            placeholder="Search for products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ paddingRight: '50px' }}
          />
          <button
            className="btn-primary"
            style={{
              position: 'absolute',
              right: '5px',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '8px 15px'
            }}
            onClick={() => handleSearch()}
          >
            🔍
          </button>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0 0 12px 12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderTop: 'none',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px 20px',
                    color: 'white',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => handleSearch(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', marginBottom: '10px' }}>
              Recent Searches:
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => handleSearch(search)}
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '25px', marginBottom: '30px' }}>
        <h3 style={{ color: 'white', marginBottom: '20px' }}>🔧 Filters</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Sort */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Sort By
            </label>
            <select
              className="input-field"
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popularity">Most Popular</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Min Price
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="Min price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Max Price
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="Max price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </div>

          {/* Rating */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Min Rating
            </label>
            <select
              className="input-field"
              value={filters.rating}
              onChange={(e) => handleFilterChange('rating', e.target.value)}
            >
              <option value="">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
              <option value="1">1+ Stars</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-primary"
            onClick={() => searchProducts(1)}
            disabled={loading}
          >
            {loading ? '⏳ Searching...' : '🔍 Apply Filters'}
          </button>
          <button 
            className="btn-secondary"
            onClick={clearFilters}
          >
            🗑️ Clear Filters
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh'
        }}>
          <div className="loading-spinner"></div>
        </div>
      ) : products.length > 0 ? (
        <>
          {/* Results Header */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'white', marginBottom: '10px' }}>
              Found {pagination.total} {pagination.total === 1 ? 'product' : 'products'}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </p>
          </div>

          {/* Products Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '25px',
            marginBottom: '40px'
          }}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '40px'
            }}>
              <button
                className="btn-secondary"
                onClick={() => searchProducts(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                ← Previous
              </button>
              
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={pagination.page === pageNum ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => searchProducts(pageNum)}
                    style={{ padding: '8px 12px' }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                className="btn-secondary"
                onClick={() => searchProducts(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : searchTerm && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔍</div>
          <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
            No Products Found
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '30px' }}>
            Try adjusting your search terms or filters
          </p>
          <button 
            className="btn-primary"
            onClick={clearFilters}
          >
            🗑️ Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchPage;
