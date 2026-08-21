import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Solo Counselor Workspace',
    monthlyPrice: 1,
    features: [
      '1 Counselor Seat',
      'Up to 100 Student Profiles',
      'Basic Inquiry Forms',
      'Email Notifications Only',
      'Basic Metrics Dashboard'
    ],
    buttonText: 'Subscribe Starter'
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Small Counseling Teams',
    monthlyPrice: 1,
    features: [
      'Up to 5 Team Seats',
      'Up to 500 Student Profiles',
      'Automated Follow-up Tasks',
      'Email + WhatsApp Alerts',
      'Document Vault & Verification',
      'CSV Reports & Exports'
    ],
    buttonText: 'Subscribe Growth',
    popular: true
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'Scale Admissions Pipeline',
    monthlyPrice: 1,
    features: [
      'Unlimited Counselor Seats',
      'Unlimited Student Profiles',
      'Custom Role Permissions',
      'Automated Workflows & Webhooks',
      'Custom Branding / White-labeling',
      'Priority Storage & Support'
    ],
    buttonText: 'Subscribe Agency'
  }
];

export default function BillingPortal() {
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  
  const location = useLocation();
  const navigate = useNavigate();

  // Parse query parameters for sandbox redirection
  const queryParams = new URLSearchParams(location.search);
  const mockCheckoutSuccess = queryParams.get('mock_checkout_success') === 'true';
  const tenantId = queryParams.get('tenant_id') || user?.tenantId;
  const urlPlanId = queryParams.get('plan_id');

  useEffect(() => {
    if (mockCheckoutSuccess && tenantId && urlPlanId) {
      // Auto-simulate webhook payment success when redirected from mock checkout and redirect to dashboard
      handleSimulatePayment('activate', urlPlanId, true);
    }
  }, [mockCheckoutSuccess, tenantId, urlPlanId]);

  const handleSimulatePayment = async (action, planId = 'growth', redirect = false) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/api/billing/mock-activate', {
        tenant_id: tenantId || user?.tenantId,
        action: action,
        plan_id: planId
      });
      if (res.data.success) {
        setSuccess(`Local simulation successful: subscription status updated to ${action === 'activate' ? `active (${planId.toUpperCase()})` : 'inactive'}.`);
        await checkAuth(); // Refresh session status
        if (redirect) {
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to simulate payment webhook.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/billing/checkout', {
        planId: planId,
        billingCycle: billingCycle
      }, { withCredentials: true });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create billing session.');
    } finally {
      setLoading(false);
    }
  };

  const handlePortalRedirect = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/billing/portal', {}, { withCredentials: true });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to open billing portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-8 flex flex-col justify-start space-y-12 animate-fade-in">
      
      {/* Upper Status Panel */}
      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-650 dark:text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                Billing Overview
              </span>
            </div>
            <div className="flex items-center space-x-3 mt-3">
              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Active Plan: <span className="text-emerald-500 uppercase">{user?.planId || 'starter'}</span>
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider border ${
                user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing'
                  ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-650 dark:text-rose-400 border-rose-500/25'
              }`}>
                {user?.subscriptionStatus || 'inactive'}
              </span>
            </div>
          </div>

          <div>
            {(user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing') && (
              <button 
                onClick={handlePortalRedirect}
                disabled={loading}
                className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {loading ? 'Redirecting...' : 'Open Stripe Customer Portal'}
              </button>
            )}
          </div>
        </div>

        {/* Message Banner */}
        {(error || success) && (
          <div className="mt-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-650 dark:text-red-400 p-4 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-650 dark:text-emerald-400 p-4 rounded-xl text-sm text-center">
                {success}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workspace Limits and Usage */}
      {user?.limits && (
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Counselors Usage */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Counselor Seats
              </h4>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {user?.limits?.seatsLimit >= 999999 ? 'Unlimited' : `${user?.usage?.seatsCount || 1} of ${user?.limits?.seatsLimit || 1} seats`}
              </span>
            </div>
            {user?.limits?.seatsLimit < 999999 ? (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, ((user?.usage?.seatsCount || 1) / (user?.limits?.seatsLimit || 1)) * 100)}%` }}
                />
              </div>
            ) : (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Unlimited team invitations enabled (Agency Plan)</div>
            )}
            <p className="text-xs text-slate-500 leading-relaxed">
              Counselors are administrator/staff seats created to manage pipelines and leads.
            </p>
          </div>

          {/* Student Profiles Usage */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Student Profiles (Leads)
              </h4>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {user?.limits?.profilesLimit >= 999999 ? 'Unlimited' : `${user?.usage?.profilesCount || 0} of ${user?.limits?.profilesLimit || 100} profiles`}
              </span>
            </div>
            {user?.limits?.profilesLimit < 999999 ? (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, ((user?.usage?.profilesCount || 0) / (user?.limits?.profilesLimit || 100)) * 100)}%` }}
                />
              </div>
            ) : (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Unlimited student profiles allowed (Agency Plan)</div>
            )}
            <p className="text-xs text-slate-500 leading-relaxed">
              Student profiles are leads registered in the international admissions funnel.
            </p>
          </div>
        </div>
      )}


      {/* Local Sandbox Console */}
      {(!user?.subscriptionStatus || user?.subscriptionStatus === 'inactive' || mockCheckoutSuccess) && (
        <div className="max-w-6xl mx-auto w-full">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 md:p-8 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h4 className="text-sm font-bold uppercase tracking-wider">
                Stripe Local Sandbox Console
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are running in <strong>Sandbox Mode</strong>. Click a plan shortcut below to simulate successful Stripe subscription webhook event updates for your organization:
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleSimulatePayment('activate', 'starter')}
                disabled={loading}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors"
              >
                Activate Starter
              </button>
              <button
                onClick={() => handleSimulatePayment('activate', 'growth')}
                disabled={loading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors"
              >
                Activate Growth
              </button>
              <button
                onClick={() => handleSimulatePayment('activate', 'agency')}
                disabled={loading}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors"
              >
                Activate Agency
              </button>
              <button
                onClick={() => handleSimulatePayment('deactivate')}
                disabled={loading}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors"
              >
                Deactivate/Cancel Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing cards grid */}
      <div className="max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Available Subscription Tiers
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
            Select a plan to configure counselor seats, student profile pipelines, automation webhooks, and billing cycles.
          </p>

          {/* Toggle Switch */}
          <div className="pt-2 flex items-center justify-center gap-4">
            <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Monthly Billing</span>
            <button 
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="w-12 h-7 bg-slate-200 dark:bg-slate-800 rounded-full p-1 relative flex items-center transition-colors focus:outline-none"
            >
              <div className={`w-5 h-5 bg-emerald-500 rounded-full shadow-md transform transition-transform ${billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${billingCycle === 'yearly' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>Annual Billing</span>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Save 16%</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const isCurrent = user?.planId === plan.id && (user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing');
            const annualPricePerMonth = Math.round(plan.monthlyPrice * 10 / 12);
            const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : annualPricePerMonth;
            const totalPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.monthlyPrice * 10;

            return (
              <div 
                key={plan.id}
                className={`bg-white dark:bg-slate-900/40 backdrop-blur-sm border rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                  isCurrent 
                    ? 'border-emerald-500 shadow-xl dark:shadow-emerald-500/5 ring-1 ring-emerald-500' 
                    : plan.popular 
                      ? 'border-emerald-500 dark:border-emerald-400 shadow-xl dark:shadow-emerald-500/5 ring-1 ring-emerald-400 dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3.5 right-6 bg-emerald-600 text-white text-[9px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest shadow-md">
                    Current Plan
                  </span>
                )}
                {!isCurrent && plan.popular && (
                  <span className="absolute -top-3.5 right-6 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">₹{displayPrice.toLocaleString('en-IN')}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">/ month</span>
                  </div>
                  
                  {billingCycle === 'yearly' && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block">
                      Billed annually at ₹{totalPrice.toLocaleString('en-IN')}
                    </span>
                  )}

                  <div className="border-t border-slate-200 dark:border-slate-800/80 my-4" />

                  <ul className="space-y-3.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-450 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button 
                      disabled
                      className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-center uppercase tracking-wider"
                    >
                      Active
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleCheckout(plan.id)}
                      disabled={loading}
                      className={`w-full py-3 rounded-xl font-bold text-xs transition-all focus:outline-none focus:ring-2 ${
                        plan.popular 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-lg dark:shadow-emerald-600/20' 
                          : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-slate-700'
                      }`}
                    >
                      {plan.buttonText}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
