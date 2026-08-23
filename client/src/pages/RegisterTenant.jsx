import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';

const parseErrorDetail = (detail) => {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(d => {
      const field = d.loc ? d.loc[d.loc.length - 1] : '';
      return `${field ? field + ': ' : ''}${d.msg || JSON.stringify(d)}`;
    }).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.message || detail.msg || JSON.stringify(detail);
  }
  return String(detail);
};

export default function RegisterTenant() {
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    planId: 'starter'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Register organization tenant
      const regRes = await axios.post('/api/auth/register-tenant', formData);
      
      // 2. Perform login to establish session
      await login(formData.email, formData.password);

      // 3. Initiate Checkout session
      const checkRes = await axios.post('/api/billing/checkout', {}, { withCredentials: true });
      
      if (checkRes.data.url) {
        // Redirect to Stripe checkout (or mock success URL)
        window.location.href = checkRes.data.url;
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(parseErrorDetail(err.response?.data?.detail) || 'Registration failed. Verify password requirements (min 8 chars, 1 uppercase, 1 digit).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Start Your Nexus CRM Trial
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Create an isolated organization workspace for your business
          </p>
        </div>
        
        <form className="space-y-6 mt-8" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-950/55 text-red-400 border border-red-900/60 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Company Name</label>
              <input 
                type="text" 
                name="companyName" 
                required 
                placeholder="Acme Corporation"
                value={formData.companyName} 
                onChange={handleChange} 
                className="mt-1 block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg py-2.5 px-3 focus:border-indigo-500 focus:outline-none placeholder-slate-600" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Administrator Full Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                placeholder="Jane Doe"
                value={formData.name} 
                onChange={handleChange} 
                className="mt-1 block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg py-2.5 px-3 focus:border-indigo-500 focus:outline-none placeholder-slate-600" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email address</label>
              <input 
                type="email" 
                name="email" 
                required 
                placeholder="admin@company.com"
                value={formData.email} 
                onChange={handleChange} 
                className="mt-1 block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg py-2.5 px-3 focus:border-indigo-500 focus:outline-none placeholder-slate-600" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
              <input 
                type="password" 
                name="password" 
                required 
                placeholder="••••••••"
                value={formData.password} 
                onChange={handleChange} 
                className="mt-1 block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg py-2.5 px-3 focus:border-indigo-500 focus:outline-none placeholder-slate-600" 
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Min 8 characters, 1 uppercase letter, and 1 digit.</span>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up workspace...' : 'Register & Subscribe'}
            </button>
          </div>
          
          <div className="text-center text-sm pt-2">
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
