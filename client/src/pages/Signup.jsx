import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DIRECTOR',
    signupSecret: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/signup', formData);
      navigate('/login');
    } catch (err) {
      setError(parseErrorDetail(err.response?.data?.detail) || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pangaea-sand/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-sky-100 p-8 space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-pangaea-deep">
            Create Account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full border-slate-300 rounded-lg py-2 px-3 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full border-slate-300 rounded-lg py-2 px-3 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input type="password" name="password" required value={formData.password} onChange={handleChange} className="mt-1 block w-full border-slate-300 rounded-lg py-2 px-3 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full border-slate-300 rounded-lg py-2 px-3 border">
                <option value="DIRECTOR">Director</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Signup Secret</label>
              <input type="password" name="signupSecret" required value={formData.signupSecret} onChange={handleChange} className="mt-1 block w-full border-slate-300 rounded-lg py-2 px-3 border" />
            </div>
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-800 hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
          
          <div className="text-center text-sm">
            <Link to="/login" className="text-sky-600 hover:text-sky-800">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
