import React, { useState, useEffect } from 'react';
import './ProductsPage.css';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  category_name: string;
  variants: ProductVariant[];
  images: ProductImage[];
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

interface Category {
  id: string;
  name: string;
  slug: string;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory 
        ? `http://localhost:5000/api/products?category=${selectedCategory}`
        : 'http://localhost:5000/api/products';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products);
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      setError('Error connecting to server');
      // Fallback to mock data
      setProducts([
        {
          id: '1',
          name: 'Pure Coconut Oil',
          slug: 'pure-coconut-oil',
          price: 299.00,
          description: 'Premium cold pressed coconut oil',
          category_name: 'Coconut Oil',
          variants: [
            { id: '1', name: '500ml Bottle', price: 299.00, volume: 500, volume_unit: 'ml', inventory_quantity: 100 }
          ],
          images: []
        },
        {
          id: '2',
          name: 'Sesame Oil',
          slug: 'sesame-oil',
          price: 249.00,
          description: 'Traditional cold pressed sesame oil',
          category_name: 'Sesame Oil',
          variants: [
            { id: '2', name: '500ml Bottle', price: 249.00, volume: 500, volume_unit: 'ml', inventory_quantity: 50 }
          ],
          images: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      // Fallback to mock data
      setCategories([
        { id: '1', name: 'Cold Pressed Oils', slug: 'cold-pressed-oils' },
        { id: '2', name: 'Coconut Oil', slug: 'coconut-oil' },
        { id: '3', name: 'Sesame Oil', slug: 'sesame-oil' }
      ]);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const getProductImage = (product: Product) => {
    const primaryImage = product.images.find(img => img.is_primary);
    if (primaryImage) return primaryImage.image_url;
    return 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(product.name);
  };

  if (loading) {
    return (
      <div className="products-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <h1>Our Products</h1>
          <p>Premium cold pressed oils for your health and wellness</p>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          <button 
            className={`filter-btn ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All Products
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              className={`filter-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <p>Showing sample products instead.</p>
          </div>
        )}

        {/* Products Grid */}
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img 
                  src={getProductImage(product)} 
                  alt={product.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(product.name);
                  }}
                />
                <div className="product-badge">
                  {product.category_name}
                </div>
              </div>
              
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                
                <div className="product-variants">
                  {product.variants.map(variant => (
                    <div key={variant.id} className="variant">
                      <span className="variant-name">{variant.name}</span>
                      <span className="variant-price">{formatPrice(variant.price)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="product-actions">
                  <button className="btn-primary">Add to Cart</button>
                  <button className="btn-secondary">View Details</button>
                </div>
                
                <div className="product-stock">
                  {product.variants[0]?.inventory_quantity > 0 ? (
                    <span className="in-stock">✓ In Stock</span>
                  ) : (
                    <span className="out-of-stock">✗ Out of Stock</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {products.length === 0 && !loading && (
          <div className="empty-state">
            <h3>No products found</h3>
            <p>Try selecting a different category or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
