import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 999,
    yearlyPrice: 9999,
    tagline: 'Solo Counselor Workspace',
    color: '#10b981',
    features: [
      '1 Counselor Seat',
      'Up to 100 Student Profiles',
      'Lead & Pipeline Management',
      'Task & Appointment Tracking',
      'Basic Analytics Dashboard',
      'Email Support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 2499,
    yearlyPrice: 24999,
    tagline: 'Small Counseling Teams',
    color: '#6366f1',
    highlight: true,
    features: [
      'Up to 5 Team Seats',
      'Up to 500 Student Profiles',
      'Multi-Branch Support',
      'Role-Based Access Control',
      'Finance & Invoice Tracking',
      'WhatsApp Notifications',
      'Priority Support',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 4999,
    yearlyPrice: 49999,
    tagline: 'Scale Admissions Pipeline',
    color: '#f59e0b',
    features: [
      'Unlimited Counselor Seats',
      'Unlimited Student Profiles',
      'Advanced Analytics & Reports',
      'Agreement PDF Generator',
      'Immigration Pipeline Module',
      'Client Self-Service Portal',
      'HR & Attendance Management',
      'Dedicated Account Manager',
    ],
  },
];

const FEATURES = [
  {
    icon: '🏢',
    title: 'Multi-Tenant Architecture',
    desc: 'Every company gets its own fully isolated workspace — your data never mixes with others. Enterprise-grade security.',
  },
  {
    icon: '📊',
    title: 'Real-Time Analytics',
    desc: 'Live dashboard with conversion rates, counselor performance, branch-wise reporting, and financial tracking.',
  },
  {
    icon: '👥',
    title: 'Complete Team Management',
    desc: 'CEO → Directors → Branch Admins → Counselors → HR. Role-based access ensures everyone sees only what they should.',
  },
  {
    icon: '🎓',
    title: 'Built for Immigration',
    desc: 'Student lead pipeline, visa status tracking, document vault, agreement generation — everything consultancies need.',
  },
  {
    icon: '🔒',
    title: 'Enterprise Security',
    desc: 'Google OAuth, Two-Factor Authentication (2FA), session-based auth with HTTP-only cookies.',
  },
  {
    icon: '⚡',
    title: 'Instant Setup',
    desc: 'Register, pay, and get your workspace in under 5 minutes. No technical setup required.',
  },
];

const FAQS = [
  {
    q: 'Can I try before I pay?',
    a: 'Yes! Every new account gets a 3-day free trial with full access to all features. No credit card required to start.',
  },
  {
    q: 'How many companies can use this?',
    a: 'Each company that registers gets their own isolated workspace. Your data is never shared with other companies.',
  },
  {
    q: 'Can I change my plan later?',
    a: 'Absolutely. You can upgrade or downgrade your plan at any time from the Billing section inside your dashboard.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept UPI, credit/debit cards, net banking, and wallets — all powered by Razorpay.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Each tenant database is completely isolated. We use HTTP-only cookies, encrypted passwords, and optional 2FA.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-root">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="landing-brand-dot" />
            <span className="landing-brand-name">Nexus CRM</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="landing-nav-actions">
            <Link to="/login" className="landing-btn-ghost">Sign In</Link>
            <Link to="/register" className="landing-btn-primary">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-glow landing-hero-glow-1" />
        <div className="landing-hero-glow landing-hero-glow-2" />
        <div className="landing-hero-inner">
          <div className="landing-badge">🚀 Built for Indian Visa Consultancies</div>
          <h1 className="landing-hero-title">
            The <span className="landing-gradient-text">All-in-One CRM</span><br />
            for Immigration Agencies
          </h1>
          <p className="landing-hero-subtitle">
            Manage leads, teams, branches, and billing — all in one powerful platform.
            Trusted by immigration consultancies across India.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate('/register')}>
              Start 3-Day Free Trial →
            </button>
            <a href="#pricing" className="landing-btn-ghost landing-btn-lg">
              View Pricing
            </a>
          </div>
          <p className="landing-hero-note">✅ No credit card required &nbsp;·&nbsp; ✅ Setup in 5 minutes &nbsp;·&nbsp; ✅ Cancel anytime</p>

          {/* Dashboard preview mockup */}
          <div className="landing-mockup">
            <div className="landing-mockup-bar">
              <span /><span /><span />
            </div>
            <div className="landing-mockup-body">
              <div className="landing-mockup-sidebar">
                {['Dashboard','Leads','Finance','Tasks','HR','Billing'].map(item => (
                  <div key={item} className={`landing-mockup-nav-item ${item === 'Dashboard' ? 'active' : ''}`}>
                    <span className="landing-mockup-dot" />{item}
                  </div>
                ))}
              </div>
              <div className="landing-mockup-content">
                <div className="landing-mockup-stats">
                  {[
                    { label: 'Total Leads', val: '1,284', color: '#10b981' },
                    { label: 'Active Students', val: '342', color: '#6366f1' },
                    { label: 'Revenue MTD', val: '₹4.2L', color: '#f59e0b' },
                    { label: 'Conversion', val: '68%', color: '#ec4899' },
                  ].map(s => (
                    <div key={s.label} className="landing-mockup-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
                      <div className="landing-mockup-stat-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="landing-mockup-stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="landing-mockup-table-header">Recent Leads</div>
                {['Aryan Mehta — Canada PR', 'Priya Sharma — UK Student Visa', 'Rohan Gupta — Australia PR'].map((l, i) => (
                  <div key={i} className="landing-mockup-row">
                    <div className="landing-mockup-avatar">{l[0]}</div>
                    <span>{l}</span>
                    <span className="landing-mockup-badge">In Progress</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="landing-section">
        <div className="landing-section-inner">
          <p className="landing-section-tag">Features</p>
          <h2 className="landing-section-title">Everything your team needs</h2>
          <p className="landing-section-sub">Purpose-built for visa & immigration consultancies. Not a generic CRM.</p>
          <div className="landing-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="landing-section landing-section-dark">
        <div className="landing-section-inner">
          <p className="landing-section-tag">Pricing</p>
          <h2 className="landing-section-title">Simple, transparent pricing</h2>
          <p className="landing-section-sub">Start free for 3 days. No credit card needed.</p>

          {/* Toggle */}
          <div className="landing-billing-toggle">
            <button
              className={billing === 'monthly' ? 'active' : ''}
              onClick={() => setBilling('monthly')}
            >Monthly</button>
            <button
              className={billing === 'yearly' ? 'active' : ''}
              onClick={() => setBilling('yearly')}
            >
              Yearly
              <span className="landing-save-badge">Save 17%</span>
            </button>
          </div>

          <div className="landing-plans-grid">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`landing-plan-card ${plan.highlight ? 'highlight' : ''}`}
                style={{ '--plan-color': plan.color }}
              >
                {plan.highlight && <div className="landing-plan-popular">Most Popular</div>}
                <h3 className="landing-plan-name">{plan.name}</h3>
                <p className="landing-plan-tagline">{plan.tagline}</p>
                <div className="landing-plan-price">
                  <span className="landing-plan-currency">₹</span>
                  <span className="landing-plan-amount">
                    {billing === 'monthly'
                      ? plan.price.toLocaleString('en-IN')
                      : plan.yearlyPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="landing-plan-period">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <ul className="landing-plan-features">
                  {plan.features.map(f => (
                    <li key={f}><span>✓</span>{f}</li>
                  ))}
                </ul>
                <button
                  className="landing-plan-cta"
                  style={{ background: plan.color }}
                  onClick={() => navigate('/register')}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ────────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <p className="landing-section-tag">Trusted By Teams</p>
          <h2 className="landing-section-title">Built for real consultancies</h2>
          <div className="landing-testimonials">
            {[
              {
                name: 'Ravi Kumar',
                role: 'CEO, GlobalVisa Consultancy',
                text: 'Nexus CRM replaced 3 separate tools we were using. Lead tracking, HR, and billing — all in one place. Our team is 40% more productive.',
                avatar: 'R',
                color: '#10b981',
              },
              {
                name: 'Anita Sharma',
                role: 'Director, StudyAbroad Pro',
                text: 'The multi-branch feature is incredible. We run 4 offices and each team sees only their own data. Role-based access works perfectly.',
                avatar: 'A',
                color: '#6366f1',
              },
              {
                name: 'Mohammed Irfan',
                role: 'CEO, Pinnacle Immigration',
                text: 'Setup took 5 minutes. The trial period let us try everything before committing. The immigration pipeline module is exactly what we needed.',
                avatar: 'M',
                color: '#f59e0b',
              },
            ].map(t => (
              <div key={t.name} className="landing-testimonial">
                <p className="landing-testimonial-text">"{t.text}"</p>
                <div className="landing-testimonial-author">
                  <div className="landing-testimonial-avatar" style={{ background: t.color }}>{t.avatar}</div>
                  <div>
                    <div className="landing-testimonial-name">{t.name}</div>
                    <div className="landing-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="landing-section landing-section-dark">
        <div className="landing-section-inner landing-faq-wrap">
          <p className="landing-section-tag">FAQ</p>
          <h2 className="landing-section-title">Frequently asked questions</h2>
          <div className="landing-faqs">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`landing-faq-item ${openFaq === i ? 'open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="landing-faq-q">
                  <span>{faq.q}</span>
                  <span className="landing-faq-arrow">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && <div className="landing-faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="landing-cta-section">
        <div className="landing-cta-glow" />
        <div className="landing-section-inner" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 className="landing-cta-title">Ready to grow your consultancy?</h2>
          <p className="landing-cta-sub">Start your 3-day free trial today. No credit card required.</p>
          <button className="landing-btn-primary landing-btn-xl" onClick={() => navigate('/register')}>
            Create Your Workspace →
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand">
            <span className="landing-brand-dot" />
            <span className="landing-brand-name">Nexus CRM</span>
          </div>
          <p className="landing-footer-copy">© 2025 Nexus CRM · Built for immigration & visa consultancies in India</p>
          <div className="landing-footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
