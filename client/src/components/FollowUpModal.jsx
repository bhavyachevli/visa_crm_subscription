import React, { useState } from 'react';
import { X, Phone, Calendar, Clock, Star } from 'lucide-react';
import axios from 'axios';

export default function FollowUpModal({ isOpen, onClose, leadId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'Call',
    subject: '',
    outcome: '',
    body: '', // Maps to Notes
    leadQuality: '',
    nextFollowUpDate: '',
    nextFollowUpTime: '',
    reminder: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.outcome || !formData.body) {
      setError('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await axios.post('/api/activities', {
        ...formData,
        leadId,
      });

      // If lead quality is updated, we also need to patch the lead
      if (formData.leadQuality) {
        await axios.patch(`/api/leads/${leadId}`, {
          leadQuality: formData.leadQuality
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to add follow up');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg border-slate-300 py-2 px-3 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white border mt-1";
  const labelClass = "block text-xs font-semibold text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-slate-50 h-full shadow-2xl flex flex-col transform transition-transform animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Add Follow-Up</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">{error}</div>}
          
          <form id="followup-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Communication Type */}
            <div className="flex space-x-2">
              {['Call', 'Meeting', 'SMS', 'Email', 'WhatsApp'].map(type => (
                <label key={type} className={`flex-1 py-2 text-center text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  formData.type === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                  <input type="radio" name="type" value={type} checked={formData.type === type} onChange={handleChange} className="hidden" />
                  {type}
                </label>
              ))}
            </div>

            <div>
              <label className={labelClass}>*Subject</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>*Outcome of Call</label>
              <select name="outcome" value={formData.outcome} onChange={handleChange} className={inputClass}>
                <option value="">Select Outcome</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Follow Up Later">Follow Up Later</option>
                <option value="No Answer">No Answer</option>
                <option value="Number Busy">Number Busy</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>*Notes</label>
              <textarea name="body" value={formData.body} onChange={handleChange} rows={4} className={inputClass}></textarea>
            </div>

            <div>
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-sm font-medium text-slate-700">Do you want to Update Lead Quality?</span>
                <select name="leadQuality" value={formData.leadQuality} onChange={handleChange} className="border border-slate-300 rounded px-2 py-1 text-sm bg-white">
                  <option value="">Keep current</option>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div>
                <label className={labelClass}>*Next Follow up Date</label>
                <div className="relative mt-1">
                  <input type="date" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>*Next Follow up Start Time</label>
                <div className="relative mt-1">
                  <input type="time" name="nextFollowUpTime" value={formData.nextFollowUpTime} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Set Reminder</label>
              <select name="reminder" value={formData.reminder} onChange={handleChange} className={inputClass}>
                <option value="">None</option>
                <option value="15 Minutes Before">15 Minutes Before</option>
                <option value="30 Minutes Before">30 Minutes Before</option>
                <option value="1 Hour Before">1 Hour Before</option>
              </select>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-200 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" form="followup-form" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Follow-Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
