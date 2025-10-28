import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await register({ firstName, lastName, email, phone, password });
    if (success) {
      // Navigate to home page after successful registration
      (window as any).__setCurrentPage && (window as any).__setCurrentPage('home');
    } else {
      setError('Registration failed. Email might already exist.');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <form onSubmit={onSubmit} className="auth-form">
          <div className="grid-2">
            <div>
              <label>First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div className="auth-error">{error}</div>}
          <button className="btn-secondary" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#64748b' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => (window as any).__setCurrentPage && (window as any).__setCurrentPage('login')}
            style={{ color: '#059669', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;


