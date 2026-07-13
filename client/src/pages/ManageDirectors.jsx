import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Users, UserCheck, UserX, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import './ManageDirectors.css';

export default function ManageDirectors() {
  const { isCEO } = useAuth();
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // userId pending delete

  const fetchDirectors = async () => {
    try {
      const res = await axios.get('/api/users/directors', { withCredentials: true });
      setDirectors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDirectors(); }, []);

  const toggleActive = async (userId, isActive) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await axios.patch(`/api/users/${userId}/${endpoint}`, {}, { withCredentials: true });
      setActionMsg({ type: 'success', text: `User ${isActive ? 'deactivated' : 'activated'} successfully` });
      fetchDirectors();
      setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.detail || 'Action failed' });
    }
  };

  const deleteDirector = async (userId) => {
    try {
      await axios.delete(`/api/users/${userId}`, { withCredentials: true });
      setActionMsg({ type: 'success', text: '✅ Director deleted permanently.' });
      setDeleteConfirm(null);
      fetchDirectors();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to delete director.' });
      setDeleteConfirm(null);
    }
    setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
  };

  if (!isCEO) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
        <h2>CEO Access Required</h2>
      </div>
    );
  }

  // Extract unique countries
  const countries = Array.from(new Set(directors.map(d => d.country).filter(Boolean))).sort();

  // Filter directors
  const filteredDirectors = directors.filter(d => {
    const matchesSearch = !searchTerm || 
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && d.isActive !== false) || 
      (statusFilter === 'inactive' && d.isActive === false);
      
    const matchesCountry = countryFilter === 'all' || d.country === countryFilter;
    
    return matchesSearch && matchesStatus && matchesCountry;
  });

  // Group by country
  const byCountry = filteredDirectors.reduce((acc, d) => {
    const c = d.country || 'Unassigned';
    if (!acc[c]) acc[c] = [];
    acc[c].push(d);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="manage-directors-header">
        <div className="manage-directors-icon-wrapper">
          <Globe size={20} color="white" />
        </div>
        <div>
          <h1 className="manage-directors-title">Directors</h1>
          <p className="manage-directors-subtitle">All directors across countries — {directors.length} total</p>
        </div>
      </div>

      {actionMsg.text && (
        <div className={`manage-directors-action-msg ${actionMsg.type}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Filters Bar */}
      {!loading && directors.length > 0 && (
        <div className="filters-container">
          <div className="filter-group search-group">
            <label className="filter-label">Search Director</label>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Country</label>
            <select 
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="manage-directors-loading">Loading...</div>
      ) : directors.length === 0 ? (
        <div className="manage-directors-empty">
          <Users size={40} className="manage-directors-empty-icon" />
          <p>No directors yet. Use "Create Account" to add the first director.</p>
        </div>
      ) : filteredDirectors.length === 0 ? (
        <div className="manage-directors-empty">
          <Users size={40} className="manage-directors-empty-icon" />
          <p>No directors match your filters.</p>
        </div>
      ) : (
        Object.entries(byCountry).map(([country, dirs]) => (
          <div key={country} className="manage-directors-country-group">
            <div className="manage-directors-country-header">
              <span className="manage-directors-country-emoji">🌍</span>
              <h2 className="manage-directors-country-name">{country}</h2>
              <span className="manage-directors-country-count">
                {dirs.length} director{dirs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="manage-directors-grid">
              {dirs.map(d => (
                <div key={d._id} className={`manage-directors-card ${d.isActive === false ? 'inactive' : ''}`}>
                  <div className="manage-directors-card-left">
                    <div className="manage-directors-avatar">
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="manage-directors-info-name">{d.name}</div>
                      <div className="manage-directors-info-email">{d.email}</div>
                      {d.branchName && (
                        <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, marginTop: '0.2rem' }}>
                          🏢 {d.branchName}
                        </div>
                      )}
                      {d.googleId && <div className="manage-directors-info-google">🔐 Google linked</div>}
                    </div>
                  </div>
                  <div className="manage-directors-card-right">
                    <span className={`manage-directors-status-badge ${d.isActive !== false ? 'active' : 'inactive'}`}>
                      {d.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleActive(d._id, d.isActive !== false)}
                      title={d.isActive !== false ? 'Deactivate' : 'Activate'}
                      className="manage-directors-action-btn"
                    >
                      {d.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    {deleteConfirm === d._id ? (
                      <div className="manage-directors-delete-confirm">
                        <span>Delete?</span>
                        <button className="manage-directors-confirm-yes" onClick={() => deleteDirector(d._id)}>Yes</button>
                        <button className="manage-directors-confirm-no" onClick={() => setDeleteConfirm(null)}>No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(d._id)}
                        title="Delete director permanently"
                        className="manage-directors-action-btn delete-btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
