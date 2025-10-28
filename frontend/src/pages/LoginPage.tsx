import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await login(email, password);
    if (success) {
      // Navigate to home page after successful login
      (window as any).__setCurrentPage && (window as any).__setCurrentPage('home');
    } else {
      setError('Invalid email or password');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Login</h1>
        <form onSubmit={onSubmit} className="auth-form">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div className="auth-error">{error}</div>}
          <button className="btn-secondary" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#64748b' }}>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => (window as any).__setCurrentPage && (window as any).__setCurrentPage('register')}
            style={{ color: '#059669', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;


