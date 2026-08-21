import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Users, Building2 } from 'lucide-react';
import axios from 'axios';

export default function TransferModal({ isOpen, onClose, leadId, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    destinationUserId: '',
    destinationBranchId: '',
    transferReason: ''
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError('');
      setFormData({
        destinationUserId: '',
        destinationBranchId: '',
        transferReason: ''
      });
      
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
        setError('Failed to load users or branches.');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.destinationUserId || !formData.destinationBranchId || !formData.transferReason.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!window.confirm('Are you sure you want to transfer this lead?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await axios.post(`/api/leads/${leadId}/transfer`, {
        destinationUserId: formData.destinationUserId,
        destinationBranchId: formData.destinationBranchId,
        transferReason: formData.transferReason.trim()
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to transfer lead.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-350 dark:border-slate-800 py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 mt-1 text-slate-800 dark:text-slate-100";
  const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col transform transition-transform animate-slide-in-right border-l border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-emerald-600">
            <ArrowRightLeft className="w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Transfer Lead</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              <p className="text-xs text-slate-400">Loading counselors and branches...</p>
            </div>
          ) : (
            <form id="transfer-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Destination Branch */}
              <div>
                <label className={labelClass}>
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>*Destination Branch</span>
                  </div>
                </label>
                <select 
                  name="destinationBranchId" 
                  value={formData.destinationBranchId} 
                  onChange={handleChange} 
                  className={inputClass}
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              {/* Destination User */}
              <div>
                <label className={labelClass}>
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>*New Assignee / Counselor</span>
                  </div>
                </label>
                <select 
                  name="destinationUserId" 
                  value={formData.destinationUserId} 
                  onChange={handleChange} 
                  className={inputClass}
                  required
                >
                  <option value="">Select Counselor</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role} - {u.country || 'Global'})</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className={labelClass}>*Reason for Transfer</label>
                <textarea 
                  name="transferReason" 
                  value={formData.transferReason} 
                  onChange={handleChange} 
                  rows="4" 
                  placeholder="Enter reason for audit logs (e.g. Employee resigned, territory re-assignment)" 
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={saving}
              className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="transfer-form"
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-50"
            >
              {saving ? 'Transferring...' : 'Transfer Lead'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
