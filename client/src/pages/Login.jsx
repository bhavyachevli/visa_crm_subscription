import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Lock, Mail, Shield, AlertCircle, KeyRound, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import logo from "../../../public/logo/PP.png";
import axios from 'axios';
import './Login.css';

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

export default function Login() {
    // view can be: 'login', 'mfa', 'forgot-email', 'forgot-otp', 'forgot-reset'
    const [view, setView] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState(''); // MFA or OTP code
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const { login, googleLogin, verifyMfa } = useAuth();
    const navigate = useNavigate();

    // Standard email/password login
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email, password);
            if (res?.needsMfa) {
                setView('mfa');
                setCode('');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(parseErrorDetail(err.response?.data?.detail) || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyMfa = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifyMfa(email, code);
            navigate('/dashboard');
        } catch (err) {
            setError(parseErrorDetail(err.response?.data?.detail) || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    }

    // Google OAuth sign-in
    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setLoading(true);
        try {
            await googleLogin(credentialResponse.credential);
            navigate('/dashboard');
        } catch (err) {
            setError(parseErrorDetail(err.response?.data?.detail) || 'Google sign-in failed. Make sure your account exists in the system.');
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Flow
    const handleForgotEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/forgot-password', { email });
            setSuccessMsg(res.data.message || 'OTP sent successfully!');
            setView('forgot-otp');
            setCode('');
        } catch (err) {
            setError(parseErrorDetail(err.response?.data?.detail) || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            await axios.post('/api/auth/verify-reset-otp', { email, otp: code });
            setSuccessMsg('OTP verified! Please enter your new password.');
            setView('forgot-reset');
        } catch (err) {
            setError(parseErrorDetail(err.response?.data?.detail) || 'Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotResetSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/reset-password', { email, otp: code, newPassword });
            setSuccessMsg(res.data.message || 'Password reset successfully!');
            setTimeout(() => {
                setView('login');
                setPassword('');
                setSuccessMsg('');
            }, 2000);
        } catch (err) {
            setError(parseErrorDetail(err.response?.data?.detail) || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setView('login');
        setError('');
        setSuccessMsg('');
        setPassword('');
        setCode('');
        setNewPassword('');
        setShowPassword(false);
        setShowNewPassword(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">

                {/* Logo */}
                <div className="login-logo-container">
                    <div className="login-logo-wrapper">
                        <img src={logo} alt="" className="login-logo-img" />
                    </div>
                    <h1 className="login-title">
                        Pangaea Pathways
                    </h1>
                    <p className="login-subtitle">
                        {view === 'login' && 'Sign in to your CRM account'}
                        {view === 'mfa' && 'Two-Factor Authentication'}
                        {view.startsWith('forgot') && 'Reset Password'}
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div className="login-error">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="p-3 mb-4 rounded-lg flex items-center gap-2 text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle size={16} />
                        {successMsg}
                    </div>
                )}

                {/* VIEW: LOGIN */}
                {view === 'login' && (
                    <>
                        <div className="login-google-section">
                            <p className="login-google-text">Verified Google Sign-In</p>
                            <div className="login-google-btn-wrapper">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google sign-in was cancelled or failed.')}
                                    className="google-Auth"
                                />
                            </div>
                        </div>

                        <div className="login-divider">
                            <div className="login-divider-line" />
                            <span className="login-divider-text">or sign in with email</span>
                            <div className="login-divider-line" />
                        </div>

                        <form onSubmit={handleLogin} className="login-form">
                            <div>
                                <label className="login-label">Email address</label>
                                <div className="login-input-wrapper">
                                    <Mail size={16} className="login-input-icon" />
                                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="login-input" placeholder="you@pangaea.com" />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center">
                                    <label className="login-label mb-0">Password</label>
                                    <button type="button" onClick={() => setView('forgot-email')} className="text-xs text-sky-100 hover:text-sky-100 transition-colors">
                                        Forgot Password?
                                    </button>
                                </div>
                                <div className="login-input-wrapper mt-1">
                                    <Lock size={16} className="login-input-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="login-input login-input-password"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className={`login-input-password-toggle ${showPassword ? 'active' : ''}`}
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="login-btn-primary">
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <p className="login-footer-text mt-6">
                            Don't have an account? <a href="#" className="login-footer-link">Contact your Director or CEO.</a>
                        </p>
                    </>
                )}

                {/* VIEW: MFA */}
                {view === 'mfa' && (
                    <form onSubmit={handleVerifyMfa} className="login-form">
                        <div className="login-mfa-icon-wrapper">
                            <Shield size={32} className="login-mfa-icon" />
                            <p className="login-mfa-text">
                                Enter your 6-digit authenticator code
                            </p>
                        </div>
                        <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" maxLength={6} className="login-input login-mfa-input text-center text-lg tracking-widest font-mono" />
                        <button type="submit" disabled={loading} className="login-btn-primary">
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button type="button" onClick={resetFlow} className="login-btn-secondary">
                            ← Back to Login
                        </button>
                    </form>
                )}

                {/* VIEW: FORGOT EMAIL */}
                {view === 'forgot-email' && (
                    <form onSubmit={handleForgotEmailSubmit} className="login-form">
                        <p className="text-sm text-slate-600 mb-4 text-center">
                            Enter your email address and we'll send you a 6-digit OTP to reset your password.
                        </p>
                        <div>
                            <label className="login-label">Email address</label>
                            <div className="login-input-wrapper">
                                <Mail size={16} className="login-input-icon" />
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="login-input" placeholder="you@pangaea.com" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="login-btn-primary mt-2">
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                        <button type="button" onClick={resetFlow} className="login-btn-secondary mt-2 flex items-center justify-center">
                            <ArrowLeft size={16} className="mr-1" /> Back to Login
                        </button>
                    </form>
                )}

                {/* VIEW: FORGOT OTP */}
                {view === 'forgot-otp' && (
                    <form onSubmit={handleForgotOtpSubmit} className="login-form">
                        <p className="text-sm text-slate-600 mb-4 text-center">
                            We've sent an OTP to <span className="font-semibold text-slate-800">{email}</span>
                        </p>
                        <div>
                            <label className="login-label">6-Digit OTP</label>
                            <div className="login-input-wrapper">
                                <KeyRound size={16} className="login-input-icon" />
                                <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} className="login-input text-center tracking-widest font-mono" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="login-btn-primary mt-2">
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button type="button" onClick={() => { setView('forgot-email'); setCode(''); setSuccessMsg(''); setError(''); }} className="login-btn-secondary mt-2 flex items-center justify-center">
                            <ArrowLeft size={16} className="mr-1" /> Change Email
                        </button>
                    </form>
                )}

                {/* VIEW: FORGOT RESET */}
                {view === 'forgot-reset' && (
                    <form onSubmit={handleForgotResetSubmit} className="login-form">
                        <p className="text-sm text-slate-600 mb-4 text-center">
                            Set your new password below.
                        </p>
                        <div>
                            <label className="login-label">New Password</label>
                            <div className="login-input-wrapper">
                                <Lock size={16} className="login-input-icon" />
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                    className="login-input login-input-password"
                                />
                                <button
                                    type="button"
                                    className={`login-input-password-toggle ${showNewPassword ? 'active' : ''}`}
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="login-btn-primary mt-2">
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
