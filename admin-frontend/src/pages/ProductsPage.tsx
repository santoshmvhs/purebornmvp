import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';
import ProductModal from '../components/ProductModal';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  category_id: string;
  total_stock: number;
  variant_count: number;
  is_active: boolean;
  created_at: string;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  inventory_quantity: number;
  volume: number;
  volume_unit: string;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const { data } = await adminApi.get(`/products?${params.toString()}`);
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
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

  const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
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
    onClick={() => setEditingProduct(product)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div>
          <h3 style={{ color: 'white', marginBottom: '5px', fontSize: '1.2rem' }}>
            {product.name}
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '10px' }}>
            SKU: {product.sku}
          </p>
        </div>
        <div style={{
          background: product.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: product.is_active ? '#22c55e' : '#ef4444',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {product.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.4' }}>
          {product.description?.substring(0, 100)}...
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '2px' }}>
            Price
          </div>
          <div style={{ color: 'white', fontWeight: '600' }}>
            {formatCurrency(product.price)}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '2px' }}>
            Stock
          </div>
          <div style={{ 
            color: product.total_stock > 10 ? '#22c55e' : product.total_stock > 0 ? '#f59e0b' : '#ef4444',
            fontWeight: '600'
          }}>
            {product.total_stock} units
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
          {product.variant_count} variants • Created {formatDate(product.created_at)}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingProduct(product);
            }}
          >
            Edit
          </button>
          <button 
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              // Handle stock update
            }}
          >
            Stock
          </button>
        </div>
      </div>
    </div>
  );

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
          📦 Product Management
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Manage your premium cold-pressed oil products and inventory
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <select
              className="input-field"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="coconut">Coconut Oil</option>
              <option value="sesame">Sesame Oil</option>
              <option value="olive">Olive Oil</option>
              <option value="almond">Almond Oil</option>
            </select>
          </div>
          <button 
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            ➕ Add Product
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '25px',
        marginBottom: '40px'
      }}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📦</div>
          <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
            No Products Found
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '30px' }}>
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search criteria' 
              : 'Start by adding your first premium product'
            }
          </p>
          <button 
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            ➕ Add Your First Product
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {products.length}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Total Products
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {products.reduce((sum, p) => sum + p.total_stock, 0)}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Total Stock
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {products.filter(p => p.is_active).length}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Active Products
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
            {products.filter(p => p.total_stock < 10).length}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            Low Stock
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={showAddModal || !!editingProduct}
        onClose={() => {
          setShowAddModal(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {
          fetchProducts();
          setShowAddModal(false);
          setEditingProduct(null);
        }}
        editingProduct={editingProduct}
      />
    </div>
  );
};

export default ProductsPage;
