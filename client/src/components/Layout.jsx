import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  LayoutDashboard, Users, FileText, Calendar, LogOut,
  UserPlus, Globe, Building2, Shield, Menu, ArrowRightLeft, User, Plane, FolderCheck,
  ClipboardList, HeartHandshake, CalendarClock
} from 'lucide-react';
import './Layout.css';
import logo from "../../../public/logo/PP.png"

export default function Layout() {
  const { user, logout, isCEO, isDirector, canEditLeads } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Build nav items based on role
  const allNavItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'Immigration Pipeline',
      path: '/immigration',
      icon: Plane,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'Appointments',
      path: '/appointments',
      icon: CalendarClock,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN', 'HR'],
    },
    {
      name: 'Client Portal',
      path: '/client-portal',
      icon: FolderCheck,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'My Profile',
      path: '/profile',
      icon: User,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'Leads',
      path: '/leads',
      icon: Users,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'Lead Transfer',
      path: '/leads/transfer',
      icon: ArrowRightLeft,
      roles: ['CEO', 'DIRECTOR'],
    },
    {
      name: 'Finance',
      path: '/finance',
      icon: FileText,
      roles: ['CEO', 'DIRECTOR'],
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: Calendar,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'Tasks',
      path: '/tasks',
      icon: ClipboardList,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'Directors',
      path: '/directors',
      icon: Globe,
      roles: ['CEO'],
    },
    {
      name: 'Branches',
      path: '/branches',
      icon: Building2,
      roles: ['CEO', 'DIRECTOR'],
    },
    {
      name: 'Branch Admins',
      path: '/branch-admins',
      icon: Shield,
      roles: ['CEO', 'DIRECTOR'],
    },
    {
      name: 'Create Account',
      path: '/create-account',
      icon: UserPlus,
      roles: ['CEO', 'DIRECTOR'],
    },
    {
      name: 'HR Management',
      path: '/hr',
      icon: HeartHandshake,
      roles: ['CEO', 'DIRECTOR', 'HR'],
    },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

  // Role badge colour
  const roleBadge = {
    CEO: { bg: '#1e3a5f', color: '#bae6fd', label: 'C.E.O' },
    DIRECTOR: { bg: '#0369a1', color: '#e0f2fe', label: 'Director' },
    HR: { bg: '#be123c', color: '#ffe4e6', label: 'H.R. Manager' },
    BRANCH_ADMIN: { bg: '#0e7490', color: '#cffafe', label: 'Branch Admin' },
    ADMIN: { bg: '#0e7490', color: '#cffafe', label: 'Branch Admin' },
  }[user?.role] || { bg: '#475569', color: '#f1f5f9', label: user?.role };

  return (
    <div className="layout-container">

      {/* Mobile overlay */}
      <div
        className={`layout-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* ─── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className={`layout-sidebar ${sidebarOpen ? 'open' : ''}`}>

        {/* Logo */}
        <div className="layout-logo-section">
          <div className="layout-logo-icon">
            <img src={logo} alt="" />
          </div>
          <span className="layout-logo-text">
            PANGAEA PATHWAYS
          </span>
        </div>

        {/* Nav */}
        <nav className="layout-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`layout-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {item.name}
                {/* Read-only badge for Branch Admin on Leads */}
                {item.path === '/leads' && !canEditLeads && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 600,
                    background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                    padding: '1px 6px', borderRadius: '20px',
                  }}>
                    View Only
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="layout-user-section">
          <div className="layout-user-card">
            <Link to="/profile" className="layout-user-info cursor-pointer hover:bg-slate-800/30 p-2 rounded-lg transition-colors -mx-2" onClick={() => setSidebarOpen(false)}>
              <div className="layout-user-avatar">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="layout-user-details">
                <div className="layout-user-name hover:text-sky-400 transition-colors">
                  {user?.name}
                </div>
                <div className="layout-user-email">
                  {user?.email}
                </div>
              </div>
            </Link>
            {/* Role + Country badge */}
            <div className="layout-badges">
              <span className="layout-badge" style={{ background: roleBadge.bg, color: roleBadge.color }}>
                <Shield size={9} />
                {roleBadge.label}
              </span>
              {user?.country && (
                <span className="layout-badge-country">
                  🌍 {user.country}
                </span>
              )}
              {isCEO && (
                <span className="layout-badge-country">
                  🌐 Global
                </span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="layout-logout-btn"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {/* ─── Main Area ───────────────────────────────────────────────────────── */}
      <div className="layout-main-area">

        {/* Top bar */}
        <header className="layout-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="layout-mobile-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="layout-header-title">
              {location.pathname.split('/')[1]?.replace(/-/g, ' ') || 'Dashboard'}
            </h2>
          </div>
          <div className="layout-header-right">
            {/* Scope indicator */}
            <span className="layout-scope-indicator">
              {isCEO ? '🌐 Global Access' : `🌍 ${user?.country || 'Unknown Country'}`}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
