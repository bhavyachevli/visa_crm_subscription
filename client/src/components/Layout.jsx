import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  LayoutDashboard, Users, FileText, Calendar, LogOut,
  UserPlus, Globe, Building2, Shield, Menu, ArrowRightLeft, User, Plane, FolderCheck,
  ClipboardList, HeartHandshake, CalendarClock, CreditCard, ChevronLeft, ChevronRight,
  Sun, Moon, Bell
} from 'lucide-react';
import axios from 'axios';
import './Layout.css';
import logo from "../../../public/logo/nexus_logo.png"

export default function Layout() {
  const { user, logout, isCEO, isDirector, canEditLeads } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.read).length);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000); // 12-second polling
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await axios.post('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    setShowNotifDropdown(false);
    if (!notif.read) {
      try {
        await axios.patch(`/api/notifications/${notif._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

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
      name: 'Leads',
      path: '/leads',
      icon: Users,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
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
      roles: ['BRANCH_ADMIN', 'ADMIN'],
    },
    {
      name: 'Staff Attendance',
      path: '/hr',
      icon: CalendarClock,
      roles: ['CEO', 'DIRECTOR', 'HR'],
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
    {
      name: 'Billing & Plans',
      path: '/billing',
      icon: CreditCard,
      roles: ['CEO'],
    },
    {
      name: 'My Profile',
      path: '/profile',
      icon: User,
      roles: ['CEO', 'DIRECTOR', 'BRANCH_ADMIN', 'ADMIN'],
    }
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
      <div className={`layout-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>

        {/* Logo */}
        <div className="layout-logo-section">
          <div className="layout-logo-icon">
            <img src={logo} alt="" />
          </div>
          <span className="layout-logo-text">
            NEXUS CRM
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
                <span>{item.name}</span>
                {/* Read-only badge for Branch Admin on Leads */}
                {item.path === '/leads' && !canEditLeads && !sidebarCollapsed && (
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
                <div className="layout-user-name hover:text-emerald-400 transition-colors">
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
            <span>Sign Out</span>
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
            <button
              className="layout-collapse-toggle hidden md:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <h2 className="layout-header-title">
              {location.pathname.split('/')[1]?.replace(/-/g, ' ') || 'Dashboard'}
            </h2>
          </div>
          <div className="layout-header-right">
            {/* Notification Bell */}
            <div className="relative" style={{ display: 'inline-block' }}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="layout-collapse-toggle flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                title="Notifications"
              >
                <Bell size={18} className="text-slate-600 dark:text-slate-350" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1 z-[100] animate-fade-in text-slate-800 dark:text-slate-100"
                  style={{ transformOrigin: 'top right' }}
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        All caught up! No notifications.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map(notif => (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col space-y-0.5 ${!notif.read ? 'bg-emerald-500/5 dark:bg-emerald-500/3 border-l-2 border-emerald-500' : ''
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-[11px] font-bold ${!notif.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-350'}`}>
                              {notif.title}
                            </span>
                            <span className="text-[8px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="layout-collapse-toggle flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>
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
