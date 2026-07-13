import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Users, UserCheck, UserX, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import './ManageBranchAdmins.css';

export default function ManageBranchAdmins() {
  const { isCEO, isDirector, user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // userId pending delete

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('/api/users/branch-admins', { withCredentials: true });
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const toggleActive = async (userId, isActive) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await axios.patch(`/api/users/${userId}/${endpoint}`, {}, { withCredentials: true });
      setActionMsg({ type: 'success', text: `User ${isActive ? 'deactivated' : 'activated'} successfully` });
      fetchAdmins();
      setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.detail || 'Action failed' });
    }
  };

  const deleteBranchAdmin = async (userId) => {
    try {
      await axios.delete(`/api/users/${userId}`, { withCredentials: true });
      setActionMsg({ type: 'success', text: '✅ Branch admin deleted permanently.' });
      setDeleteConfirm(null);
      fetchAdmins();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to delete branch admin.' });
      setDeleteConfirm(null);
    }
    setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
  };

  if (!isCEO && !isDirector) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
        <h2>Access Denied</h2>
      </div>
    );
  }

  // Extract unique branches and countries
  const uniqueBranches = Array.from(new Set(admins.map(a => a.branchName).filter(Boolean))).sort();
  const uniqueCountries = Array.from(new Set(admins.map(a => a.country).filter(Boolean))).sort();

  // Filter admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = !searchTerm || 
      admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && admin.isActive !== false) || 
      (statusFilter === 'inactive' && admin.isActive === false);
      
    const matchesBranch = branchFilter === 'all' || admin.branchName === branchFilter;
    const matchesCountry = countryFilter === 'all' || admin.country === countryFilter;
    
    return matchesSearch && matchesStatus && matchesBranch && matchesCountry;
  });

  return (
    <div>
      {/* Header */}
      <div className="manage-admins-header">
        <div className="manage-admins-icon-wrapper">
          <Building2 size={20} color="white" />
        </div>
        <div>
          <h1 className="manage-admins-title">Branch Admins</h1>
          <p className="manage-admins-subtitle">
            {isDirector ? `Branch admins in ${user?.country}` : 'All branch admins globally'} — {admins.length} total
          </p>
        </div>
      </div>

      {actionMsg.text && (
        <div className={`manage-admins-action-msg ${actionMsg.type}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Filters Bar */}
      {!loading && admins.length > 0 && (
        <div className="filters-container">
          <div className="filter-group search-group">
            <label className="filter-label">Search Admin</label>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          {isCEO && uniqueCountries.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Country</label>
              <select 
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Countries</option>
                {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="filter-group">
            <label className="filter-label">Branch</label>
            <select 
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Branches</option>
              {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
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
        <div className="manage-admins-loading">Loading...</div>
      ) : admins.length === 0 ? (
        <div className="manage-admins-empty">
          <Users size={40} className="manage-admins-empty-icon" />
          <p>No branch admins yet. Use "Create Account" to add one.</p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="manage-admins-empty">
          <Users size={40} className="manage-admins-empty-icon" />
          <p>No branch admins match your filters.</p>
        </div>
      ) : (
        <div className="manage-admins-grid">
          {filteredAdmins.map(admin => (
            <div key={admin._id} className={`manage-admins-card ${admin.isActive === false ? 'inactive' : ''}`}>
              <div className="manage-admins-card-left">
                <div className="manage-admins-avatar">
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="manage-admins-info-name">{admin.name}</div>
                  <div className="manage-admins-info-email">{admin.email}</div>
                  <div className="manage-admins-info-badges">
                    {admin.branchName && (
                      <span className="manage-admins-badge-branch">
                        🏢 {admin.branchName}
                      </span>
                    )}
                    {admin.country && (
                      <span className="manage-admins-badge-country">
                        🌍 {admin.country}
                      </span>
                    )}
                    {admin.googleId && (
                      <span className="manage-admins-info-google">🔐 Google</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="manage-admins-card-right">
                <span className={`manage-admins-status-badge ${admin.isActive !== false ? 'active' : 'inactive'}`}>
                  {admin.isActive !== false ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggleActive(admin._id, admin.isActive !== false)}
                  title={admin.isActive !== false ? 'Deactivate' : 'Activate'}
                  className="manage-admins-action-btn"
                >
                  {admin.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
                {deleteConfirm === admin._id ? (
                  <div className="manage-admins-delete-confirm">
                    <span>Delete?</span>
                    <button className="manage-admins-confirm-yes" onClick={() => deleteBranchAdmin(admin._id)}>Yes</button>
                    <button className="manage-admins-confirm-no" onClick={() => setDeleteConfirm(null)}>No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(admin._id)}
                    title="Delete branch admin permanently"
                    className="manage-admins-action-btn delete-btn"
                  >
                    <Trash2 size={16} />
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
