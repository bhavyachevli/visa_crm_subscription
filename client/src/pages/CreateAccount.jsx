import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { UserPlus, Mail, Lock, User, Globe, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import './CreateAccount.css';

const COUNTRIES = [
  'Australia', 'India', 'Canada', 'United Kingdom', 'United States',
  'New Zealand', 'Germany', 'France', 'UAE', 'Singapore', 'Other'
];

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

export default function CreateAccount() {
  const { user, isCEO, isDirector, createUserByAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [role, setRole] = useState(isCEO ? 'DIRECTOR' : 'BRANCH_ADMIN');
  const [mode, setMode] = useState('email'); // 'email' | 'google'
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    country: isCEO ? '' : (user?.country || ''),
    state: '',
    city: '',
    area: '',
    branchId: '',
  });

  useEffect(() => {
    if (isCEO || isDirector) {
      axios.get('/api/meta/branches', { withCredentials: true }).then(res => {
        setBranches(res.data);
      }).catch(console.error);

      axios.get('/api/meta/countries').then(res => {
        setCountriesList(res.data || []);
      }).catch(err => {
        console.error("Could not fetch countries", err);
      });
    }
  }, [isCEO, isDirector]);

  const handleLocationChange = async (field, value) => {
    if (field === 'country') {
      setForm(prev => ({
        ...prev,
        country: value,
        state: '',
        city: '',
        area: '',
        branchId: ''
      }));
      setStatesList([]);
      setCitiesList([]);

      if (value) {
        setLoadingStates(true);
        try {
          const res = await axios.post('/api/meta/states', { country: value });
          setStatesList(res.data.states || []);
        } catch (err) {
          console.error("Error fetching states", err);
        } finally {
          setLoadingStates(false);
        }
      }
    } else if (field === 'state') {
      setForm(prev => ({
        ...prev,
        state: value,
        city: '',
        area: '',
        branchId: ''
      }));
      setCitiesList([]);

      if (value && form.country) {
        setLoadingCities(true);
        try {
          const res = await axios.post('/api/meta/cities', {
            country: form.country,
            state: value
          });
          setCitiesList(res.data.cities || []);
        } catch (err) {
          console.error("Error fetching cities", err);
        } finally {
          setLoadingCities(false);
        }
      }
    } else if (field === 'city') {
      setForm(prev => ({
        ...prev,
        city: value,
        branchId: ''
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const isFormValidForSignup = () => {
    if (isCEO) {
      if (role === 'DIRECTOR') return !!form.branchId && !!form.country && !!form.state && !!form.city && !!form.area;
      return true;
    } else {
      if (role === 'HR') return true;
      return !!form.branchId;
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: role,
        branchId: (role === 'DIRECTOR' || role !== 'HR') && form.branchId ? form.branchId : undefined,
        country: role === 'DIRECTOR' 
          ? (form.country || branches.find(b => b._id === form.branchId)?.country) 
          : (isCEO ? (form.country || undefined) : user?.country),
        state: role === 'DIRECTOR' ? form.state : undefined,
        city: role === 'DIRECTOR' ? form.city : undefined,
        area: role === 'DIRECTOR' ? form.area : undefined,
      };
      await createUserByAdmin(payload);
      setSuccess(`✅ ${role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR Manager' : 'Branch Admin'} account created! They can now log in with email/password or Google.`);
      setForm({ name: '', email: '', password: '', country: isCEO ? '' : (user?.country || ''), state: '', city: '', area: '', branchId: '' });
    } catch (err) {
      setError(parseErrorDetail(err.response?.data?.detail) || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await axios.post('/api/auth/google/create-account', {
        credential: credentialResponse.credential,
        role: role,
        branchId: (role === 'DIRECTOR' || role !== 'HR') && form.branchId ? form.branchId : undefined,
        country: role === 'DIRECTOR'
          ? (form.country || branches.find(b => b._id === form.branchId)?.country)
          : (isCEO ? (form.country || undefined) : user?.country),
        state: role === 'DIRECTOR' ? form.state : undefined,
        city: role === 'DIRECTOR' ? form.city : undefined,
        area: role === 'DIRECTOR' ? form.area : undefined,
      }, { withCredentials: true });
      setSuccess(`✅ ${role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR Manager' : 'Branch Admin'} Google account linked and created!`);
    } catch (err) {
      setError(parseErrorDetail(err.response?.data?.detail) || 'Failed to create account via Google');
    } finally {
      setLoading(false);
    }
  };


  if (!isCEO && !isDirector) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
        <h2>Access Denied</h2>
        <p>You don't have permission to create accounts.</p>
      </div>
    );
  }

  return (
    <div className="create-account-container">
      <div className="create-account-header">
        <div className="create-account-title-wrapper">
          <div className="create-account-icon-wrapper">
            <UserPlus size={20} color="white" />
          </div>
          <h1 className="create-account-title">
            Create {role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR Manager' : 'Branch Admin'} Account
          </h1>
        </div>
        <p className="create-account-subtitle">
          {isCEO
            ? 'Create a new Director or HR Manager account and assign their scope.'
            : `Create a new Branch Admin, Admin or HR account for ${user?.country}.`}
        </p>
      </div>

      {success && (
        <div className="create-account-success">
          <CheckCircle size={18} />
          {success}
        </div>
      )}
      {error && (
        <div className="create-account-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="create-account-mode-toggle">
        {['email', 'google'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`create-account-mode-btn ${mode === m ? 'active' : 'inactive'}`}
          >
            {m === 'email' ? '📧 Email & Password' : '🔐 Google Account'}
          </button>
        ))}
      </div>

      <div className="create-account-card">

        {/* Role Selection */}
        <div className="create-account-field">
          <label className="create-account-label">
            <User size={14} /> Account Role
          </label>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setForm(prev => ({ ...prev, branchId: '', country: isCEO ? '' : (user?.country || '') }));
            }}
            className="create-account-input"
          >
            {isCEO ? (
              <>
                <option value="DIRECTOR">Director</option>
                <option value="HR">HR Manager</option>
              </>
            ) : (
              <>
                <option value="BRANCH_ADMIN">Branch Admin</option>
                <option value="ADMIN">Branch Admin (Alternate)</option>
                <option value="HR">HR Manager</option>
              </>
            )}
          </select>
        </div>

        {isCEO && role === 'DIRECTOR' && (
          <>
            {/* Country Selector */}
            <div className="create-account-field">
              <label className="create-account-label">
                <Globe size={14} /> Assign Country <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={form.country}
                onChange={(e) => handleLocationChange('country', e.target.value)}
                required
                className="create-account-input"
              >
                <option value="">— Select Country —</option>
                {countriesList.map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* State Selector */}
            <div className="create-account-field">
              <label className="create-account-label">
                <Globe size={14} /> Assign State <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={form.state}
                onChange={(e) => handleLocationChange('state', e.target.value)}
                disabled={!form.country || loadingStates}
                required
                className="create-account-input"
              >
                <option value="">{loadingStates ? 'Loading states...' : '— Select State —'}</option>
                {statesList.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* City Selector */}
            <div className="create-account-field">
              <label className="create-account-label">
                <Globe size={14} /> Assign City <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={form.city}
                onChange={(e) => handleLocationChange('city', e.target.value)}
                disabled={!form.state || loadingCities}
                required
                className="create-account-input"
              >
                <option value="">{loadingCities ? 'Loading cities...' : '— Select City —'}</option>
                {citiesList.map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>

            {/* Area Input */}
            <div className="create-account-field">
              <label className="create-account-label">
                <Building2 size={14} /> Assign Area <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ring Road, Mall Area"
                value={form.area}
                onChange={(e) => handleLocationChange('area', e.target.value)}
                required
                className="create-account-input"
              />
            </div>
          </>
        )}

        {isCEO && role !== 'DIRECTOR' && (
          <div className="create-account-field">
            <label className="create-account-label">
              <Globe size={14} /> Assign Country
            </label>
            <select name="country" value={form.country} onChange={handleChange} className="create-account-input">
              <option value="">— {role === 'HR' ? 'Global (No Country Scope)' : 'Select country'} —</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {isDirector && (
          <div className="create-account-field create-account-auto-assigned">
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Your Country (auto-assigned)</span>
            <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>🌍 {user?.country}</div>
          </div>
        )}

        {role !== 'HR' && (
          <div className="create-account-field">
            <label className="create-account-label">
              <Building2 size={14} /> Assign Branch <span style={{ color: 'red' }}>*</span>
            </label>
            <select name="branchId" value={form.branchId} onChange={handleChange} required className="create-account-input">
              <option value="">— Select branch —</option>
              {branches
                .filter(b => {
                  if (role === 'DIRECTOR') {
                    if (form.city) return b.city?.toLowerCase() === form.city.toLowerCase();
                    if (form.country) return b.country?.toLowerCase() === form.country.toLowerCase();
                    return true;
                  }
                  return !isCEO || !form.country || b.country === form.country;
                })
                .map(b => <option key={b._id} value={b._id}>{b.name} ({b.city})</option>)}
            </select>
          </div>
        )}

        {role === 'HR' && (
          <div className="create-account-field">
            <label className="create-account-label">
              <Building2 size={14} /> Assign Branch
            </label>
            <select name="branchId" value={form.branchId} onChange={handleChange} className="create-account-input">
              <option value="">— Country-wide (No Branch Scope) —</option>
              {branches
                .filter(b => !isCEO || !form.country || b.country === form.country)
                .map(b => <option key={b._id} value={b._id}>{b.name} ({b.city})</option>)}
            </select>
          </div>
        )}


        {mode === 'email' && (
          <form onSubmit={handleSubmit} className="create-account-form">
            <div>
              <label className="create-account-label"><User size={14} /> Full Name</label>
              <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="e.g. Sarah Johnson" className="create-account-input" />
            </div>
            <div>
              <label className="create-account-label"><Mail size={14} /> Email Address</label>
              <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="user@example.com" className="create-account-input" />
            </div>
            <div>
              <label className="create-account-label"><Lock size={14} /> Temporary Password</label>
              <input type="password" name="password" required value={form.password} onChange={handleChange} placeholder="Min 8 characters" className="create-account-input" />
              <p className="create-account-hint">
                Share this password with the new user. They can change it later.
              </p>
            </div>
            <button type="submit" disabled={loading} className="create-account-submit">
              {loading ? 'Creating...' : `Create ${role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR' : 'Branch Admin'} Account`}
            </button>
          </form>
        )}

        {mode === 'google' && (
          <div>
            <p className="create-account-google-hint">
              Ask the new user to open this page on their device and click the Google button below.
              They will use their Google account to register.
            </p>
            {isFormValidForSignup() ? (
              <div className="create-account-google-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed or was cancelled')}
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  width="340"
                  text="signup_with"
                />
              </div>
            ) : (
              <div className="create-account-google-warning">
                ⚠️ Please {isCEO ? 'select a country' : 'select a branch'} first.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
