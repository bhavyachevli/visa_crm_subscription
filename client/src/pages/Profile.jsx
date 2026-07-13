import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User, Mail, Shield, Building2, Globe, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { format } from 'date-fns';

export default function Profile() {
  const { user: authUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', oldPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [forgotPasswordState, setForgotPasswordState] = useState('none'); // 'none', 'email-sent', 'otp-verified'
  const [resetOtp, setResetOtp] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/users/me');
      setProfileData(res.data);
      setEditForm({ name: res.data.name, email: res.data.email, password: '', oldPassword: '' });
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleForgotPasswordClick = async () => {
    try {
      setSaving(true);
      await axios.post('/api/auth/forgot-password', { email: profileData.email });
      setMessage({ type: 'success', text: 'OTP sent to your email!' });
      setForgotPasswordState('email-sent');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to send OTP.' });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtpClick = async () => {
    try {
      setSaving(true);
      await axios.post('/api/auth/verify-reset-otp', { email: profileData.email, otp: resetOtp });
      setMessage({ type: 'success', text: 'OTP verified! You can now save your new password.' });
      setForgotPasswordState('otp-verified');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Invalid or expired OTP.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {};
      let nameUpdated = false;
      if (editForm.name.trim() && editForm.name !== profileData.name) {
        payload.name = editForm.name.trim();
        nameUpdated = true;
      }

      // Handle email update
      if (editForm.email.trim() && editForm.email !== profileData.email) {
        payload.email = editForm.email.trim();
        nameUpdated = true; // reuse flag to trigger patch
      }

      let pwdUpdated = false;
      if (editForm.password.trim()) {
        if (forgotPasswordState === 'otp-verified') {
          await axios.post('/api/auth/reset-password', {
            email: profileData.email,
            otp: resetOtp,
            newPassword: editForm.password.trim()
          });
          pwdUpdated = true;
        } else {
          if (!editForm.oldPassword.trim()) {
            setMessage({ type: 'error', text: 'Current password is required to change password.' });
            setSaving(false);
            return;
          }
          payload.password = editForm.password.trim();
          payload.oldPassword = editForm.oldPassword.trim();
          pwdUpdated = true;
        }
      }

      // Only patch /me if there's name changes, OR if there's pwd changes that are NOT via OTP.
      const needsPatchMe = nameUpdated || (pwdUpdated && forgotPasswordState !== 'otp-verified');
      if (needsPatchMe) {
        await axios.patch('/api/users/me', payload);
      }

      if (nameUpdated || pwdUpdated) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        await fetchProfile();
      }

      setIsEditing(false);
      setForgotPasswordState('none');
      setResetOtp('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return <div className="text-center text-slate-500 py-10">Failed to load profile.</div>;
  }

  const roleColor = {
    CEO: 'bg-slate-900 text-sky-200 border-slate-700',
    DIRECTOR: 'bg-sky-800 text-sky-100 border-sky-600',
    BRANCH_ADMIN: 'bg-cyan-700 text-cyan-100 border-cyan-500',
    ADMIN: 'bg-cyan-700 text-cyan-100 border-cyan-500',
  }[profileData.role] || 'bg-slate-500 text-white';

  const roleLabel = {
    CEO: 'Chief Executive Officer',
    DIRECTOR: 'Country Director',
    BRANCH_ADMIN: 'Branch Administrator',
    ADMIN: 'Administrator',
  }[profileData.role] || profileData.role;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <User className="w-6 h-6 mr-2 text-sky-600" />
            My Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account and view your details.</p>
        </div>
        {!isEditing && (
          <button onClick={() => { setIsEditing(true); setMessage({ type: '', text: '' }); }} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Edit Profile
          </button>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Column: Avatar & Basic Info */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-center flex flex-col items-center py-10 px-6 relative h-full">
            <div className={`absolute top-0 left-0 w-full h-24 ${roleColor} opacity-10`}></div>

            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-md z-10 ${roleColor}`}>
              {profileData.name?.charAt(0)?.toUpperCase()}
            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-5">{profileData.name}</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">{roleLabel}</p>

            <div className="mt-6 w-full flex flex-col space-y-3">
              <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm flex items-center">
                <Mail className="w-4 h-4 mr-3 text-slate-400" />
                <span className="text-slate-700 truncate">{profileData.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info or Edit Form */}
        <div className="col-span-1 md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 h-full">

            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Edit Profile</h3>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <input type="text" name="name" value={editForm.name} onChange={handleEditChange} required className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address <span className="text-xs text-slate-400 font-normal">(Login email)</span></label>
                  <input type="email" name="email" value={editForm.email} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">New Password <span className="text-xs text-slate-400 font-normal">(Leave blank to keep current)</span></label>
                  <input type="password" name="password" value={editForm.password} onChange={handleEditChange} placeholder="••••••••" className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500" />
                </div>

                {editForm.password && forgotPasswordState === 'none' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-semibold text-slate-700">Current Password *</label>
                      <button type="button" onClick={handleForgotPasswordClick} className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                    <input type="password" name="oldPassword" value={editForm.oldPassword} onChange={handleEditChange} required placeholder="••••••••" className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500" />
                  </div>
                )}

                {editForm.password && forgotPasswordState === 'email-sent' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Enter 6-Digit OTP *</label>
                    <div className="flex gap-2">
                      <input type="text" name="resetOtp" value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} required placeholder="123456" maxLength={6} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-sky-500 focus:border-sky-500 tracking-widest font-mono" />
                      <button type="button" onClick={handleVerifyOtpClick} disabled={saving || resetOtp.length !== 6} className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                        Verify
                      </button>
                    </div>
                  </div>
                )}

                {editForm.password && forgotPasswordState === 'otp-verified' && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-lg">
                    OTP Verified! You can now click Save Changes to set your new password.
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button type="button" onClick={() => { setIsEditing(false); setForgotPasswordState('none'); setResetOtp(''); }} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || (editForm.password && forgotPasswordState === 'email-sent')} className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-sky-500" />
                  Access & Territory
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100">
                    <div className="flex items-center mb-1">
                      <Shield className="w-4 h-4 mr-2 text-sky-600" />
                      <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Role</span>
                    </div>
                    <p className="text-slate-700 font-medium ml-6">{roleLabel}</p>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <div className="flex items-center mb-1">
                      <Globe className="w-4 h-4 mr-2 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Region</span>
                    </div>
                    <p className="text-slate-700 font-medium ml-6">
                      {profileData.role === 'CEO' ? 'Global Access' : (profileData.country || 'N/A')}
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center mb-1">
                      <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Branch</span>
                    </div>
                    <p className="text-slate-700 font-medium ml-6">
                      {['CEO', 'DIRECTOR'].includes(profileData.role) ? 'All Assigned Branches' : (profileData.branchName || 'Not Assigned')}
                    </p>
                  </div>

                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <div className="flex items-center mb-1">
                      <Clock className="w-4 h-4 mr-2 text-amber-600" />
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Status</span>
                    </div>
                    <p className="text-slate-700 font-medium ml-6">
                      {profileData.isActive === false ? (
                        <span className="text-red-600 font-semibold">Inactive</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Active</span>
                      )}
                    </p>
                  </div>
                </div>

                {profileData.createdAt && (
                  <div className="mt-8 text-xs text-slate-400 flex items-center justify-end">
                    <Calendar className="w-3 h-3 mr-1" />
                    Account created on {format(new Date(profileData.createdAt), 'dd MMM yyyy, HH:mm')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
