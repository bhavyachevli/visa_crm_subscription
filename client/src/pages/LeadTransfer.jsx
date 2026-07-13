import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import { ArrowRightLeft, Users, Building2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LeadTransfer() {
  const { isCEO, isDirector } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    sourceUserId: '',
    destinationUserId: '',
    destinationBranchId: '',
    limit: '',
    transferReason: ''
  });

  useEffect(() => {
    // Only fetch if CEO or Director
    if (isCEO || isDirector) {
      Promise.all([
        axios.get('/api/users').catch(err => {
          console.error("Could not fetch users", err);
          return { data: [] };
        }),
        axios.get('/api/meta/branches').catch(err => {
          console.error("Could not fetch branches", err);
          return { data: [] };
        })
      ]).then(([usersRes, branchesRes]) => {
        setUsers(usersRes.data || []);
        setBranches(branchesRes.data || []);
      }).catch(err => {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to load initial data.' });
      });
    }
  }, [isCEO, isDirector]);

  if (!isCEO && !isDirector) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="mt-2">Only CEO and Directors can access the Lead Transfer facility.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!formData.sourceUserId || !formData.destinationUserId || !formData.destinationBranchId || !formData.transferReason) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    if (formData.sourceUserId === formData.destinationUserId) {
      setMessage({ type: 'error', text: 'Source and Destination users cannot be the same.' });
      return;
    }

    if (!window.confirm('Are you sure you want to transfer leads? This action will bulk update records.')) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        sourceUserId: formData.sourceUserId,
        destinationUserId: formData.destinationUserId,
        destinationBranchId: formData.destinationBranchId,
        transferReason: formData.transferReason,
      };

      if (formData.limit) {
        payload.limit = parseInt(formData.limit, 10);
      }

      const res = await axios.post('/api/leads/transfer', payload);
      setMessage({ type: 'success', text: `${res.data.transferred_count} leads transferred successfully.` });
      setFormData({
        sourceUserId: '',
        destinationUserId: '',
        destinationBranchId: '',
        limit: '',
        transferReason: ''
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to transfer leads.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <ArrowRightLeft className="w-6 h-6 mr-2 text-sky-600" />
          Lead Transfer Facility
        </h1>
        <p className="text-sm text-slate-500 mt-1">Bulk transfer leads between staff members.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleTransfer} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* SOURCE */}
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center mb-4">
            <Users className="w-4 h-4 mr-2" /> Source
          </h2>
          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer FROM User *</label>
            <select name="sourceUserId" value={formData.sourceUserId} onChange={handleChange} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white">
              <option value="">-- Select Source User --</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>

        {/* DESTINATION */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center mb-4">
            <Building2 className="w-4 h-4 mr-2" /> Destination
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer TO Branch *</label>
              <select name="destinationBranchId" value={formData.destinationBranchId} onChange={handleChange} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white">
                <option value="">-- Select Destination Branch --</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer TO User *</label>
              <select name="destinationUserId" value={formData.destinationUserId} onChange={handleChange} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white">
                <option value="">-- Select Destination User --</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* OPTIONS & REASON */}
        <div className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center mb-4">
            Options & Audit
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Limit (Optional)</label>
              <input type="number" name="limit" value={formData.limit} onChange={handleChange} placeholder="e.g. 50 (leave blank for all)" className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white" />
              <p className="text-xs text-slate-400 mt-1">Number of leads to transfer. Leave empty to transfer ALL leads from the source user.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Reason *</label>
              <textarea name="transferReason" value={formData.transferReason} onChange={handleChange} rows="3" placeholder="Enter reason for audit logs (e.g. Employee resigned, territory re-assignment)" className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white"></textarea>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button type="button" onClick={() => navigate('/leads')} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center shadow-sm">
            {loading ? 'Transferring...' : 'Transfer Leads'}
          </button>
        </div>

      </form>
    </div>
  );
}
