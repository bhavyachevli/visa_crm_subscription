import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Plus, Globe, MapPin, Trash2, AlertCircle, CheckCircle, X, Search } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import './ManageBranches.css';

const COUNTRIES_FALLBACK = [
  'Australia', 'India', 'Canada', 'United Kingdom', 'United States',
  'New Zealand', 'Germany', 'France', 'UAE', 'Singapore'
];

export default function ManageBranches() {
  const { isCEO, isDirector, user } = useAuth();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // branchId to confirm

  // Form state
  const [form, setForm] = useState({ name: '', country: '', state: '', city: '', area: '' });
  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/meta/branches', { withCredentials: true });
      setBranches(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    // Load countries list
    axios.get('/api/meta/countries').then(res => {
      setCountriesList(res.data || []);
    }).catch(() => {
      setCountriesList(COUNTRIES_FALLBACK.map(c => ({ name: c, code: c })));
    });
  }, []);

  useEffect(() => {
    if (showForm && isDirector && user?.country) {
      handleCountryChange(user.country);
    }
  }, [showForm, isDirector, user]);

  const handleCountryChange = async (value) => {
    setForm(prev => ({ ...prev, country: value, state: '', city: '', area: '' }));
    setStatesList([]);
    setCitiesList([]);
    if (!value) return;
    setLoadingStates(true);
    try {
      const res = await axios.post('/api/meta/states', { country: value });
      setStatesList(res.data.states || []);
    } catch (err) {
      console.error('Failed to fetch states', err);
    } finally {
      setLoadingStates(false);
    }
  };

  const handleStateChange = async (value) => {
    setForm(prev => ({ ...prev, state: value, city: '' }));
    setCitiesList([]);
    if (!value || !form.country) return;
    setLoadingCities(true);
    try {
      const res = await axios.post('/api/meta/cities', { country: form.country, state: value });
      setCitiesList(res.data.cities || []);
    } catch (err) {
      console.error('Failed to fetch cities', err);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.country || !form.city.trim()) {
      setActionMsg({ type: 'error', text: 'Branch name, country, and city are all required.' });
      return;
    }

    // Directors can only add branches in their own country
    if (isDirector && form.country !== user?.country) {
      setActionMsg({ type: 'error', text: `As a Director, you can only add branches in ${user?.country}.` });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/meta/branches', {
        name: form.name.trim(),
        country: form.country,
        city: form.city.trim(),
        area: form.area.trim() || undefined,
      }, { withCredentials: true });
      setActionMsg({ type: 'success', text: `✅ Branch "${form.name}" added successfully in ${form.city}, ${form.country}!` });
      setForm({ name: '', country: '', state: '', city: '', area: '' });
      setStatesList([]);
      setCitiesList([]);
      setShowForm(false);
      fetchBranches();
    } catch (err) {
      console.error('Branch creation failed:', err);
      setActionMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to add branch.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (branchId) => {
    try {
      await axios.delete(`/api/meta/branches/${branchId}`, { withCredentials: true });
      setActionMsg({ type: 'success', text: '✅ Branch deleted successfully.' });
      setDeleteConfirm(null);
      fetchBranches();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to delete branch.' });
      setDeleteConfirm(null);
    }
    setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
  };

  if (!isCEO && !isDirector) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
        <h2>Access Denied</h2>
        <p>Only CEOs and Directors can manage branches.</p>
      </div>
    );
  }

  const uniqueCountries = Array.from(new Set(branches.map(b => b.country).filter(Boolean))).sort();

  const filtered = branches.filter(b => {
    const matchesSearch = !searchTerm ||
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.country?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = countryFilter === 'all' || b.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-header">
        <div className="mb-header-left">
          <div className="mb-icon-wrapper">
            <Building2 size={20} color="white" />
          </div>
          <div>
            <h1 className="mb-title">Manage Branches</h1>
            <p className="mb-subtitle">
              {isCEO ? 'All branches globally' : `Branches in ${user?.country}`} — {branches.length} total
            </p>
          </div>
        </div>
        <button
          className="mb-add-btn"
          onClick={() => { setShowForm(s => !s); setActionMsg({ type: '', text: '' }); }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Branch'}
        </button>
      </div>

      {/* Alert */}
      {actionMsg.text && (
        <div className={`mb-alert ${actionMsg.type}`}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
            {actionMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {actionMsg.text}
          </span>
          <button
            onClick={() => setActionMsg({ type: '', text: '' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.25rem', color: 'inherit', fontSize: '1.1rem', lineHeight: 1 }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Branch Form */}
      {showForm && (
        <div className="mb-form-card">
          <h2 className="mb-form-title">
            <Plus size={16} /> New Branch
          </h2>
          <form onSubmit={handleSubmit} className="mb-form">
            {/* Branch Name */}
            <div className="mb-field">
              <label className="mb-label"><Building2 size={13} /> Branch Name <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                className="mb-input"
                placeholder="e.g. Surat Central, Melbourne East"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="mb-form-row">
              {/* Country */}
              <div className="mb-field">
                <label className="mb-label"><Globe size={13} /> Country <span style={{ color: 'red' }}>*</span></label>
                {isDirector ? (
                  <div className="mb-auto-field">🌍 {user?.country} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(auto-assigned)</span></div>
                ) : (
                  <select
                    className="mb-input"
                    value={form.country}
                    onChange={e => handleCountryChange(e.target.value)}
                    required
                  >
                    <option value="">— Select Country —</option>
                    {countriesList.map(c => (
                      <option key={c.code || c.name} value={c.name || c}>{c.name || c}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* State */}
              <div className="mb-field">
                <label className="mb-label"><MapPin size={13} /> State / Province</label>
                <select
                  className="mb-input"
                  value={form.state}
                  onChange={e => handleStateChange(e.target.value)}
                  disabled={!form.country && !isDirector || loadingStates}
                >
                  <option value="">{loadingStates ? 'Loading...' : '— Select State —'}</option>
                  {statesList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* City */}
              <div className="mb-field">
                <label className="mb-label"><MapPin size={13} /> City <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  className="mb-input"
                  placeholder={loadingCities ? 'Loading cities...' : 'Type or select a city'}
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  list="city-suggestions"
                  required
                />
                {citiesList.length > 0 && (
                  <datalist id="city-suggestions">
                    {citiesList.map(c => <option key={c} value={c} />)}
                  </datalist>
                )}
              </div>
            </div>

            {/* Area */}
            <div className="mb-field">
              <label className="mb-label"><MapPin size={13} /> Area / Locality <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                className="mb-input"
                placeholder="e.g. Ring Road, Mall Area, Andheri West"
                value={form.area}
                onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
              />
            </div>

            <button type="submit" className="mb-submit-btn" disabled={submitting}>
              {submitting ? 'Adding...' : '+ Add Branch'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      {!loading && branches.length > 0 && (
        <div className="mb-filters">
          <div className="mb-filter-group search-group">
            <Search size={15} className="mb-search-icon" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mb-search-input"
            />
          </div>
          {isCEO && uniqueCountries.length > 1 && (
            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              className="mb-filter-select"
            >
              <option value="all">All Countries</option>
              {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Branches list */}
      {loading ? (
        <div className="mb-loading">Loading branches...</div>
      ) : filtered.length === 0 ? (
        <div className="mb-empty">
          <Building2 size={40} className="mb-empty-icon" />
          <p>{branches.length === 0 ? 'No branches yet. Click "Add Branch" to create the first one.' : 'No branches match your search.'}</p>
        </div>
      ) : (
        <div className="mb-grid">
          {filtered.map(branch => (
            <div key={branch._id} className="mb-card">
              <div className="mb-card-left">
                <div className="mb-card-avatar">
                  {branch.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="mb-card-name">{branch.name}</div>
                  <div className="mb-card-badges">
                    {branch.city && (
                      <span className="mb-badge city">📍 {branch.city}</span>
                    )}
                    {branch.area && (
                      <span className="mb-badge area">🏘 {branch.area}</span>
                    )}
                    {branch.country && (
                      <span className="mb-badge country">🌍 {branch.country}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mb-card-right">
                {deleteConfirm === branch._id ? (
                  <div className="mb-delete-confirm">
                    <span>Delete?</span>
                    <button className="mb-confirm-yes" onClick={() => handleDelete(branch._id)}>Yes</button>
                    <button className="mb-confirm-no" onClick={() => setDeleteConfirm(null)}>No</button>
                  </div>
                ) : (
                  <button
                    className="mb-delete-btn"
                    title="Delete branch"
                    onClick={() => setDeleteConfirm(branch._id)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
