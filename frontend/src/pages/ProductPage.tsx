import React, { useState, useEffect } from 'react';
import './ProductPage.css';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  longDescription: string;
  category_name: string;
  variants: ProductVariant[];
  images: ProductImage[];
  specifications: ProductSpec[];
  certifications: Certification[];
  reviews: Review[];
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  volume: number;
  volume_unit: string;
  inventory_quantity: number;
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface ProductSpec {
  name: string;
  value: string;
  unit?: string;
}

interface Certification {
  name: string;
  description: string;
  icon: string;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

const ProductPage: React.FC = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');

  useEffect(() => {
    // Mock premium product data
    const mockProduct: Product = {
      id: '1',
      name: 'Virgin Coconut Oil',
      slug: 'virgin-coconut-oil',
      price: 299.00,
      description: 'Premium cold pressed virgin coconut oil',
      longDescription: 'Our Virgin Coconut Oil is extracted from the finest coconuts using traditional cold pressing methods. This premium oil maintains all its natural nutrients, antioxidants, and medium-chain fatty acids, making it perfect for both culinary and skincare applications.',
      category_name: 'Cold Pressed Oils',
      variants: [
        { id: '1', name: '250ml Bottle', price: 199.00, volume: 250, volume_unit: 'ml', inventory_quantity: 50 },
        { id: '2', name: '500ml Bottle', price: 299.00, volume: 500, volume_unit: 'ml', inventory_quantity: 100 },
        { id: '3', name: '1L Bottle', price: 499.00, volume: 1000, volume_unit: 'ml', inventory_quantity: 25 }
      ],
      images: [
        { id: '1', image_url: 'https://via.placeholder.com/600x600?text=Coconut+Oil+1', alt_text: 'Virgin Coconut Oil Front', is_primary: true },
        { id: '2', image_url: 'https://via.placeholder.com/600x600?text=Coconut+Oil+2', alt_text: 'Virgin Coconut Oil Side', is_primary: false },
        { id: '3', image_url: 'https://via.placeholder.com/600x600?text=Coconut+Oil+3', alt_text: 'Virgin Coconut Oil Back', is_primary: false }
      ],
      specifications: [
        { name: 'Extraction Method', value: 'Cold Pressed' },
        { name: 'Processing Temperature', value: 'Below 40°C' },
        { name: 'Shelf Life', value: '24', unit: 'months' },
        { name: 'Fatty Acid Content', value: '92%', unit: 'saturated' },
        { name: 'Moisture Content', value: '0.1%', unit: 'max' },
        { name: 'Free Fatty Acids', value: '0.2%', unit: 'max' }
      ],
      certifications: [
        { name: 'Organic Certified', description: 'Certified organic by USDA', icon: '🌿' },
        { name: 'ISO 22000', description: 'Food safety management certified', icon: '🏆' },
        { name: 'HACCP', description: 'Hazard analysis certified', icon: '🔬' },
        { name: 'GMP', description: 'Good manufacturing practices', icon: '✅' }
      ],
      reviews: [
        { id: '1', name: 'Priya Sharma', rating: 5, comment: 'Absolutely love this coconut oil! The quality is exceptional and it has a beautiful natural aroma.', date: '2024-01-15', verified: true },
        { id: '2', name: 'Rajesh Kumar', rating: 5, comment: 'Best coconut oil I\'ve ever used. Perfect for cooking and skincare. Highly recommended!', date: '2024-01-10', verified: true },
        { id: '3', name: 'Anita Patel', rating: 4, comment: 'Great quality oil with authentic taste. Packaging is also very premium.', date: '2024-01-08', verified: true }
      ]
    };

    setProduct(mockProduct);
    setSelectedVariant(mockProduct.variants[1]); // Default to 500ml
    setLoading(false);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < rating ? 'filled' : ''}`}>★</span>
    ));
  };

  if (loading) {
    return (
      <div className="product-page">
        <div className="loading-container">
          <div className="premium-spinner"></div>
          <p>Loading premium product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-page">
        <div className="error-container">
          <h2>Product not found</h2>
          <p>This product may have been removed or doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-page">
      <div className="container-premium">
        {/* Breadcrumb */}
        <div className="breadcrumb-premium">
          <span>Home</span>
          <span>→</span>
          <span>Products</span>
          <span>→</span>
          <span>{product.category_name}</span>
          <span>→</span>
          <span className="current">{product.name}</span>
        </div>

        <div className="product-layout">
          {/* Product Images */}
          <div className="product-images-premium">
            <div className="main-image-container">
              <div className="main-image">
                <img 
                  src={product.images[selectedImage]?.image_url || product.images[0].image_url} 
                  alt={product.images[selectedImage]?.alt_text || product.images[0].alt_text}
                />
                <div className="image-zoom-overlay">
                  <button className="zoom-btn">🔍</button>
                </div>
              </div>
            </div>
            
            <div className="thumbnail-images">
              {product.images.map((image, index) => (
                <div 
                  key={image.id}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={image.image_url} alt={image.alt_text} />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="product-info-premium">
            <div className="product-header">
              <div className="product-badges">
                <span className="badge-premium">Premium</span>
                <span className="badge-organic">Organic</span>
                <span className="badge-cold-pressed">Cold Pressed</span>
              </div>
              
              <h1 className="product-title-premium">{product.name}</h1>
              
              <div className="product-rating">
                <div className="stars">
                  {renderStars(5)}
                </div>
                <span className="rating-text">(4.8/5 from 127 reviews)</span>
              </div>
              
              <div className="product-price-premium">
                <span className="current-price">{formatPrice(selectedVariant?.price || product.price)}</span>
                <span className="price-unit">per {selectedVariant?.volume}{selectedVariant?.volume_unit}</span>
              </div>
            </div>

            {/* Variants */}
            <div className="product-variants-premium">
              <h3>Choose Size</h3>
              <div className="variant-options">
                {product.variants.map(variant => (
                  <div 
                    key={variant.id}
                    className={`variant-option ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(variant)}
                  >
                    <div className="variant-info">
                      <span className="variant-name">{variant.name}</span>
                      <span className="variant-price">{formatPrice(variant.price)}</span>
                    </div>
                    <div className="variant-stock">
                      {variant.inventory_quantity > 0 ? (
                        <span className="in-stock">✓ In Stock</span>
                      ) : (
                        <span className="out-of-stock">✗ Out of Stock</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="quantity-selector-premium">
              <h3>Quantity</h3>
              <div className="quantity-controls">
                <button 
                  className="quantity-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </button>
                <span className="quantity-display">{quantity}</span>
                <button 
                  className="quantity-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="product-actions-premium">
              <button className="btn-add-to-cart-premium">
                <span className="btn-icon">🛒</span>
                <span className="btn-text">Add to Cart</span>
              </button>
              <button className="btn-buy-now-premium">
                <span className="btn-text">Buy Now</span>
                <span className="btn-icon">→</span>
              </button>
            </div>

            {/* Certifications */}
            <div className="certifications-premium">
              <h3>Certifications & Quality</h3>
              <div className="certification-grid">
                {product.certifications.map((cert, index) => (
                  <div key={index} className="certification-item">
                    <div className="cert-icon">{cert.icon}</div>
                    <div className="cert-info">
                      <span className="cert-name">{cert.name}</span>
                      <span className="cert-desc">{cert.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Signals */}
            <div className="trust-signals-premium">
              <div className="trust-item">
                <span className="trust-icon">🚚</span>
                <span className="trust-text">Free shipping on orders above ₹1000</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🔄</span>
                <span className="trust-text">30-day return guarantee</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🔒</span>
                <span className="trust-text">Secure payment processing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="product-details-premium">
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button 
              className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('specifications')}
            >
              Specifications
            </button>
            <button 
              className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({product.reviews.length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'description' && (
              <div className="description-content">
                <p className="product-description-premium">{product.longDescription}</p>
                <div className="benefits-list">
                  <h4>Key Benefits:</h4>
                  <ul>
                    <li>100% pure and natural cold pressed extraction</li>
                    <li>Rich in medium-chain fatty acids for better absorption</li>
                    <li>High in antioxidants and vitamin E</li>
                    <li>Perfect for both cooking and skincare applications</li>
                    <li>No chemicals, preservatives, or artificial additives</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="specifications-content">
                <div className="specs-grid">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="spec-item">
                      <span className="spec-name">{spec.name}</span>
                      <span className="spec-value">{spec.value} {spec.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="reviews-content">
                <div className="reviews-summary">
                  <div className="average-rating">
                    <span className="rating-number">4.8</span>
                    <div className="rating-stars">{renderStars(5)}</div>
                    <span className="rating-count">Based on 127 reviews</span>
                  </div>
                </div>
                
                <div className="reviews-list">
                  {product.reviews.map(review => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <span className="reviewer-name">{review.name}</span>
                          {review.verified && <span className="verified-badge">✓ Verified Purchase</span>}
                        </div>
                        <div className="review-rating">{renderStars(review.rating)}</div>
                      </div>
                      <p className="review-comment">{review.comment}</p>
                      <span className="review-date">{review.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
