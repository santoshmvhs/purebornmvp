import React, { useState } from 'react';
import { adminApi } from '../contexts/AuthContext';

interface ProductFormData {
  name: string;
  description: string;
  short_description: string;
  sku: string;
  price: number;
  compare_price: number;
  cost_price: number;
  weight: number;
  weight_unit: string;
  volume: number;
  volume_unit: string;
  oil_type: string;
  extraction_method: string;
  shelf_life_months: number;
  storage_instructions: string;
  ingredients: string[];
  allergens: string[];
  certifications: string[];
  variants: ProductVariant[];
  images: ProductImage[];
}

interface ProductVariant {
  name: string;
  sku: string;
  price: number;
  compare_price: number;
  cost_price: number;
  weight: number;
  volume: number;
  volume_unit: string;
  inventory_quantity: number;
  low_stock_threshold: number;
  sort_order: number;
}

interface ProductImage {
  url: string;
  alt_text: string;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct?: any;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSuccess, editingProduct }) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    short_description: '',
    sku: '',
    price: 0,
    compare_price: 0,
    cost_price: 0,
    weight: 0,
    weight_unit: 'g',
    volume: 0,
    volume_unit: 'ml',
    oil_type: '',
    extraction_method: 'Cold Pressed',
    shelf_life_months: 24,
    storage_instructions: '',
    ingredients: [''],
    allergens: [],
    certifications: [],
    variants: [],
    images: []
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        short_description: editingProduct.short_description || '',
        sku: editingProduct.sku || '',
        price: editingProduct.price || 0,
        compare_price: editingProduct.compare_price || 0,
        cost_price: editingProduct.cost_price || 0,
        weight: editingProduct.weight || 0,
        weight_unit: editingProduct.weight_unit || 'g',
        volume: editingProduct.volume || 0,
        volume_unit: editingProduct.volume_unit || 'ml',
        oil_type: editingProduct.oil_type || '',
        extraction_method: editingProduct.extraction_method || 'Cold Pressed',
        shelf_life_months: editingProduct.shelf_life_months || 24,
        storage_instructions: editingProduct.storage_instructions || '',
        ingredients: editingProduct.ingredients || [''],
        allergens: editingProduct.allergens || [],
        certifications: editingProduct.certifications || [],
        variants: editingProduct.variants || [],
        images: editingProduct.images || []
      });
    }
  }, [editingProduct]);

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          name: '',
          sku: '',
          price: 0,
          compare_price: 0,
          cost_price: 0,
          weight: 0,
          volume: 0,
          volume_unit: 'ml',
          inventory_quantity: 0,
          low_stock_threshold: 10,
          sort_order: prev.variants.length + 1
        }
      ]
    }));
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  const addImage = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { url: '', alt_text: '' }]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const updateImage = (index: number, field: keyof ProductImage, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((image, i) => 
        i === index ? { ...image, [field]: value } : image
      )
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        ingredients: formData.ingredients.filter(ing => ing.trim() !== ''),
        variants: formData.variants.filter(v => v.name.trim() !== ''),
        images: formData.images.filter(img => img.url.trim() !== '')
      };

      if (editingProduct) {
        await adminApi.put(`/products/${editingProduct.id}`, payload);
      } else {
        await adminApi.post('/products', payload);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setError(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '25px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '1.8rem',
            fontWeight: '700',
            background: 'linear-gradient(45deg, #a1c4fd, #c2e9fb)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '8px',
              transition: 'background 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{
          padding: '20px 25px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {[1, 2, 3, 4].map((step) => (
              <div key={step} style={{
                flex: 1,
                height: '4px',
                background: step <= currentStep 
                  ? 'linear-gradient(45deg, #667eea, #764ba2)' 
                  : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                transition: 'all 0.3s ease'
              }} />
            ))}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '10px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            <span>Basic Info</span>
            <span>Variants</span>
            <span>Images</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '25px'
        }}>
          {currentStep === 1 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Premium Virgin Coconut Oil"
                  />
                </div>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    SKU *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="e.g., COCO-001"
                  />
                </div>
              </div>

              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Short Description
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  placeholder="Brief product description"
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Full Description *
                </label>
                <textarea
                  className="input-field"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detailed product description"
                  rows={4}
                  style={{ resize: 'vertical', minHeight: '100px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    placeholder="450"
                  />
                </div>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    Compare Price (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.compare_price}
                    onChange={(e) => handleInputChange('compare_price', parseFloat(e.target.value) || 0)}
                    placeholder="550"
                  />
                </div>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.cost_price}
                    onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)}
                    placeholder="300"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    Oil Type *
                  </label>
                  <select
                    className="input-field"
                    value={formData.oil_type}
                    onChange={(e) => handleInputChange('oil_type', e.target.value)}
                  >
                    <option value="">Select Oil Type</option>
                    <option value="Virgin Coconut">Virgin Coconut</option>
                    <option value="Sesame">Sesame</option>
                    <option value="Extra Virgin Olive">Extra Virgin Olive</option>
                    <option value="Almond">Almond</option>
                    <option value="Mustard">Mustard</option>
                    <option value="Sunflower">Sunflower</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                    Extraction Method
                  </label>
                  <select
                    className="input-field"
                    value={formData.extraction_method}
                    onChange={(e) => handleInputChange('extraction_method', e.target.value)}
                  >
                    <option value="Cold Pressed">Cold Pressed</option>
                    <option value="Cold Extraction">Cold Extraction</option>
                    <option value="Traditional">Traditional</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: 'white', fontSize: '1.2rem' }}>Product Variants</h3>
                <button className="btn-primary" onClick={addVariant}>
                  ➕ Add Variant
                </button>
              </div>

              {formData.variants.map((variant, index) => (
                <div key={index} className="glass-card" style={{ padding: '20px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ color: 'white', fontSize: '1rem' }}>Variant {index + 1}</h4>
                    <button
                      className="btn-secondary"
                      onClick={() => removeVariant(index)}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                        Variant Name *
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        placeholder="e.g., 500ml"
                      />
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                        Variant SKU *
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        placeholder="e.g., COCO-001-500"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                        Volume (ml) *
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={variant.volume}
                        onChange={(e) => updateVariant(index, 'volume', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={variant.inventory_quantity}
                        onChange={(e) => updateVariant(index, 'inventory_quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.variants.length === 0 && (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📦</div>
                  <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '10px' }}>
                    No Variants Added
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
                    Add different bottle sizes and variants for your product
                  </p>
                  <button className="btn-primary" onClick={addVariant}>
                    ➕ Add First Variant
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: 'white', fontSize: '1.2rem' }}>Product Images</h3>
                <button className="btn-primary" onClick={addImage}>
                  ➕ Add Image
                </button>
              </div>

              {formData.images.map((image, index) => (
                <div key={index} className="glass-card" style={{ padding: '20px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ color: 'white', fontSize: '1rem' }}>Image {index + 1}</h4>
                    <button
                      className="btn-secondary"
                      onClick={() => removeImage(index)}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                        Image URL *
                      </label>
                      <input
                        type="url"
                        className="input-field"
                        value={image.url}
                        onChange={(e) => updateImage(index, 'url', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                        Alt Text
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={image.alt_text}
                        onChange={(e) => updateImage(index, 'alt_text', e.target.value)}
                        placeholder="Description of the image"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.images.length === 0 && (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🖼️</div>
                  <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '10px' }}>
                    No Images Added
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
                    Add product images to showcase your premium oil
                  </p>
                  <button className="btn-primary" onClick={addImage}>
                    ➕ Add First Image
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '20px' }}>Review & Save</h3>
              
              <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <h4 style={{ color: 'white', marginBottom: '15px' }}>Product Summary</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div><strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Name:</strong> <span style={{ color: 'white' }}>{formData.name}</span></div>
                  <div><strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>SKU:</strong> <span style={{ color: 'white' }}>{formData.sku}</span></div>
                  <div><strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Price:</strong> <span style={{ color: 'white' }}>₹{formData.price}</span></div>
                  <div><strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Oil Type:</strong> <span style={{ color: 'white' }}>{formData.oil_type}</span></div>
                  <div><strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Variants:</strong> <span style={{ color: 'white' }}>{formData.variants.length}</span></div>
                  <div><strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Images:</strong> <span style={{ color: 'white' }}>{formData.images.length}</span></div>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px',
                  color: '#ef4444'
                }}>
                  ❌ {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '25px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {currentStep > 1 && (
              <button
                className="btn-secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                ← Previous
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            {currentStep < 4 ? (
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next →
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;


