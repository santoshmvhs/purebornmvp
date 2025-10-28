import React, { useState, useEffect } from 'react';
import { adminApi } from '../contexts/AuthContext';

interface ManufacturingBatch {
  id: string;
  batch_number: string;
  oil_type: string;
  extraction_date: string;
  expiry_date: string;
  quantity_produced: number;
  quantity_bottled: number;
  extraction_method: string;
  source_location: string;
  quality_check_passed: boolean;
  quality_check_date: string;
  bottling_date: string;
  status: string;
  product_name: string;
  variant_name: string;
}

interface QualityCheck {
  id: string;
  check_type: string;
  ph_level: number;
  acidity_level: number;
  color_grade: string;
  aroma_notes: string;
  taste_notes: string;
  viscosity: number;
  moisture_content: number;
  impurities_detected: boolean;
  overall_grade: string;
  passed: boolean;
  notes: string;
  checked_by: string;
  check_date: string;
}

const ManufacturingPage: React.FC = () => {
  const [batches, setBatches] = useState<ManufacturingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [oilTypeFilter, setOilTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ManufacturingBatch | null>(null);
  const [activeTab, setActiveTab] = useState<'batches' | 'analytics'>('batches');

  useEffect(() => {
    fetchBatches();
  }, [oilTypeFilter, statusFilter, dateFrom, dateTo]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (oilTypeFilter) params.append('oil_type', oilTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const { data } = await adminApi.get(`/manufacturing?${params.toString()}`);
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatVolume = (volume: number) => {
    return `${volume.toLocaleString()} ml`;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#f59e0b',
      ready: '#3b82f6',
      partial: '#8b5cf6',
      completed: '#10b981'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      pending: '⏳',
      ready: '✅',
      partial: '🔄',
      completed: '🎉'
    };
    return icons[status] || '❓';
  };

  const getProgressPercentage = (batch: ManufacturingBatch) => {
    if (batch.quantity_produced === 0) return 0;
    return Math.round((batch.quantity_bottled / batch.quantity_produced) * 100);
  };

  const BatchCard: React.FC<{ batch: ManufacturingBatch }> = ({ batch }) => {
    const progressPercentage = getProgressPercentage(batch);
    
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
      onClick={() => setSelectedBatch(batch)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
            <h3 style={{ color: 'white', marginBottom: '5px', fontSize: '1.2rem' }}>
              {batch.batch_number}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '10px' }}>
              {batch.oil_type} • {batch.extraction_method}
            </p>
          </div>
          <div style={{
            background: `${getStatusColor(batch.status)}20`,
            color: getStatusColor(batch.status),
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span>{getStatusIcon(batch.status)}</span>
            <span style={{ textTransform: 'capitalize' }}>{batch.status}</span>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', marginBottom: '5px' }}>
            📍 {batch.source_location}
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', marginBottom: '5px' }}>
            📅 Extracted: {formatDate(batch.extraction_date)}
          </p>
          {batch.expiry_date && (
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', marginBottom: '5px' }}>
              ⏰ Expires: {formatDate(batch.expiry_date)}
            </p>
          )}
        </div>

        {/* Production Progress */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
              Production Progress
            </span>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
              {progressPercentage}%
            </span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: `linear-gradient(90deg, ${getStatusColor(batch.status)}, ${getStatusColor(batch.status)}80)`,
              height: '100%',
              width: `${progressPercentage}%`,
              transition: 'width 0.3s ease',
              borderRadius: '10px'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
              Bottled: {formatVolume(batch.quantity_bottled)}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
              Total: {formatVolume(batch.quantity_produced)}
            </span>
          </div>
        </div>

        {/* Quality Status */}
        <div style={{
          background: batch.quality_check_passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${batch.quality_check_passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px'
        }}>
          <div style={{ 
            color: batch.quality_check_passed ? '#10b981' : '#ef4444', 
            fontSize: '12px', 
            fontWeight: '600', 
            marginBottom: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            {batch.quality_check_passed ? '✅' : '❌'} Quality Check
          </div>
          <div style={{ color: 'white', fontSize: '12px' }}>
            {batch.quality_check_passed ? 'Passed' : 'Pending'} 
            {batch.quality_check_date && ` • ${formatDate(batch.quality_check_date)}`}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
            {batch.product_name && `${batch.product_name} • `}
            {batch.variant_name}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBatch(batch);
              }}
            >
              View Details
            </button>
            <button 
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={(e) => {
                e.stopPropagation();
                // Handle bottling
              }}
            >
              Bottle
            </button>
          </div>
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
          🏭 Manufacturing Control
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
          Track oil extraction, bottling, and quality control processes
        </p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            className={activeTab === 'batches' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('batches')}
            style={{ padding: '12px 24px' }}
          >
            📦 Production Batches
          </button>
          <button
            className={activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('analytics')}
            style={{ padding: '12px 24px' }}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {activeTab === 'batches' && (
        <>
          {/* Controls */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ minWidth: '200px' }}>
                <select
                  className="input-field"
                  value={oilTypeFilter}
                  onChange={(e) => setOilTypeFilter(e.target.value)}
                >
                  <option value="">All Oil Types</option>
                  <option value="Virgin Coconut">Virgin Coconut</option>
                  <option value="Sesame">Sesame</option>
                  <option value="Extra Virgin Olive">Extra Virgin Olive</option>
                  <option value="Almond">Almond</option>
                </select>
              </div>
              <div style={{ minWidth: '150px' }}>
                <select
                  className="input-field"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="ready">Ready</option>
                  <option value="partial">Partial</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div style={{ minWidth: '150px' }}>
                <input
                  type="date"
                  className="input-field"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From Date"
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <input
                  type="date"
                  className="input-field"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To Date"
                />
              </div>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
                style={{ whiteSpace: 'nowrap' }}
              >
                ➕ New Batch
              </button>
            </div>
          </div>

          {/* Batches Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '25px',
            marginBottom: '40px'
          }}>
            {batches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>

          {/* Empty State */}
          {batches.length === 0 && (
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏭</div>
              <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px' }}>
                No Production Batches Found
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '30px' }}>
                {oilTypeFilter || statusFilter || dateFrom || dateTo
                  ? 'Try adjusting your search criteria' 
                  : 'Start by creating your first production batch'
                }
              </p>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                ➕ Create First Batch
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
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🏭</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                {batches.length}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                Total Batches
              </div>
            </div>
            
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🛢️</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                {formatVolume(batches.reduce((sum, b) => sum + b.quantity_produced, 0))}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                Oil Produced
              </div>
            </div>
            
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🍾</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                {formatVolume(batches.reduce((sum, b) => sum + b.quantity_bottled, 0))}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                Oil Bottled
              </div>
            </div>
            
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '5px' }}>
                {batches.filter(b => b.quality_check_passed).length}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                Quality Passed
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '20px' }}>
            📊 Manufacturing Analytics
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem', marginBottom: '30px' }}>
            Production efficiency, quality metrics, and batch analytics
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '30px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>📈 Production Trends</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Daily production charts</p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>🔬 Quality Metrics</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Quality check analytics</p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>⚡ Efficiency</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Production efficiency</p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '10px' }}>🏷️ Oil Types</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>Production by oil type</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturingPage;