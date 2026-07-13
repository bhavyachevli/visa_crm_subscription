import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  CheckCircle, Circle, Users, Plane, TrendingUp, Clock,
  ArrowUpRight, ArrowRight, Activity
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({
    newEnquiries: 0,
    activeCases: 0,
    conversionPct: 0,
    onHold: 0,
    totalLeads: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [tasksRes, metricsRes] = await Promise.all([
          axios.get('/api/tasks/me'),
          axios.get('/api/dashboard/metrics')
        ]);
        setTasks(tasksRes.data);
        setMetrics(metricsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboardData();
  }, []);

  const toggleTask = async (id) => {
    try {
      await axios.patch(`/api/tasks/${id}/toggle`);
      setTasks(tasks.map(t => t._id === id ? { ...t, completedAt: t.completedAt ? null : new Date() } : t));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Redesigned Welcomer Card */}
      <div className="dashboard-welcome-card">
        {/* Decorative background glow circles */}
        <div className="dashboard-welcome-bg-glow-1"></div>
        <div className="dashboard-welcome-bg-glow-2"></div>

        <div className="dashboard-welcome-content">
          <div className="dashboard-welcome-text-section">
            <div className="dashboard-welcome-session-badge">
              <span className="dashboard-welcome-session-dot"></span>
              Workspace Session Active
            </div>
            <h2 className="dashboard-welcome-title">Welcome back, {user?.name}</h2>
            <p className="dashboard-welcome-subtitle">
              Manage leads, track visa applications, and monitor team performance metrics on your dashboard.
            </p>
          </div>

          <div className="dashboard-welcome-stats-section">
            <div className="dashboard-welcome-stat-pill">
              <span className="dashboard-welcome-stat-pill-label">Role</span>
              <span className="dashboard-welcome-stat-pill-val">{user?.role}</span>
            </div>
            <div className="dashboard-welcome-stat-pill">
              <span className="dashboard-welcome-stat-pill-label">Access Level</span>
              <span className="dashboard-welcome-stat-pill-val">
                {user?.role === 'CEO' ? 'Global Access' : `Scope: ${user?.country || 'Local'}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Stat Cards Grid */}
      <div className="dashboard-stats-grid">

        {/* Card 1: New Enquiries */}
        <div
          onClick={() => navigate('/leads?status=NEW')}
          className="dashboard-stat-card new-enquiries"
        >
          <div className="dashboard-stat-card-content">
            <div>
              <h3 className="dashboard-stat-card-title">New Enquiries</h3>
              <p className="dashboard-stat-card-val">{metrics.newEnquiries}</p>
            </div>
            <div className="dashboard-stat-card-icon-container">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="dashboard-stat-card-link">
            View New Leads <ArrowUpRight className="dashboard-stat-card-arrow" />
          </div>
        </div>

        {/* Card 2: Active Cases */}
        <div
          onClick={() => navigate('/immigration')}
          className="dashboard-stat-card active-cases"
        >
          <div className="dashboard-stat-card-content">
            <div>
              <h3 className="dashboard-stat-card-title">Active Cases</h3>
              <p className="dashboard-stat-card-val">{metrics.activeCases}</p>
            </div>
            <div className="dashboard-stat-card-icon-container">
              <Plane className="w-5 h-5" />
            </div>
          </div>
          <div className="dashboard-stat-card-link">
            Go to Kanban Pipeline <ArrowUpRight className="dashboard-stat-card-arrow" />
          </div>
        </div>

        {/* Card 3: Conversion % */}
        <div
          onClick={() => navigate('/leads?status=QUALIFIED')}
          className="dashboard-stat-card conversion"
        >
          <div className="dashboard-stat-card-content">
            <div>
              <h3 className="dashboard-stat-card-title">Conversion %</h3>
              <p className="dashboard-stat-card-val">{metrics.conversionPct}%</p>
            </div>
            <div className="dashboard-stat-card-icon-container">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="dashboard-stat-card-link">
            View Qualified Leads <ArrowUpRight className="dashboard-stat-card-arrow" />
          </div>
        </div>

        {/* Card 4: On Hold */}
        <div
          onClick={() => navigate('/leads?status=ON_HOLD')}
          className="dashboard-stat-card on-hold"
        >
          <div className="dashboard-stat-card-content">
            <div>
              <h3 className="dashboard-stat-card-title">On Hold</h3>
              <p className="dashboard-stat-card-val">{metrics.onHold}</p>
            </div>
            <div className="dashboard-stat-card-icon-container">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="dashboard-stat-card-link">
            View On-Hold Leads <ArrowUpRight className="dashboard-stat-card-arrow" />
          </div>
        </div>

      </div>

      {/* Split Grid for Tasks & Action Sidebar */}
      <div className="dashboard-split-grid">

        {/* Left Column (Span 2): My Tasks */}
        <div className="dashboard-tasks-container">
          <div>
            <div className="dashboard-tasks-header">
              <div>
                <h2 className="dashboard-tasks-header-title">My Task Center</h2>
                <p className="dashboard-tasks-header-subtitle">Keep track of your client onboarding items and process checkpoints.</p>
              </div>
              <button
                onClick={() => navigate('/tasks')}
                className="dashboard-tasks-header-btn"
              >
                Go to Tasks Center →
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="dashboard-tasks-empty-card">
                <CheckCircle className="dashboard-tasks-empty-icon" />
                <p className="dashboard-tasks-empty-title">You're all caught up!</p>
                <p className="dashboard-tasks-empty-subtitle">No pending tasks assigned to you today.</p>
              </div>
            ) : (
              <ul className="dashboard-tasks-list">
                {tasks.slice(0, 5).map(t => (
                  <li
                    key={t._id}
                    className={`dashboard-tasks-item ${t.completedAt ? 'completed' : 'pending'}`}
                  >
                    <button onClick={() => toggleTask(t._id)} className="dashboard-tasks-item-btn">
                      {t.completedAt ? (
                        <CheckCircle className="text-emerald-500 w-5 h-5" />
                      ) : (
                        <Circle className="text-slate-300 w-5 h-5 hover:text-sky-500 transition-colors" />
                      )}
                    </button>
                    <span className={`dashboard-tasks-item-title ${t.completedAt ? 'completed' : 'pending'}`}>
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {tasks.length > 5 && (
            <div className="dashboard-tasks-footer">
              <button
                onClick={() => navigate('/tasks')}
                className="dashboard-tasks-footer-btn"
              >
                And {tasks.length - 5} more task{tasks.length - 5 > 1 ? 's' : ''}...
              </button>
            </div>
          )}
        </div>

        {/* Right Column (Span 1): Shortcuts & Context Summary */}
        <div className="dashboard-sidebar">

          {/* Quick Shortcuts Card */}
          <div className="dashboard-shortcuts-card">
            <h2 className="dashboard-shortcuts-title">Quick Actions</h2>
            <div className="dashboard-shortcuts-list">
              <button
                onClick={() => navigate('/leads/new')}
                className="dashboard-shortcut-btn new-lead"
              >
                <div className="dashboard-shortcut-left">
                  <span className="dashboard-shortcut-plus">+</span>
                  <span className="dashboard-shortcut-label new-lead">Add New Lead</span>
                </div>
                <ArrowRight className="dashboard-shortcut-arrow new-lead" />
              </button>

              <button
                onClick={() => navigate('/leads')}
                className="dashboard-shortcut-btn leads-dir"
              >
                <div className="dashboard-shortcut-left">
                  <Users className="dashboard-shortcut-icon leads-dir" />
                  <span className="dashboard-shortcut-label leads-dir">Leads Directory</span>
                </div>
                <ArrowRight className="dashboard-shortcut-arrow leads-dir" />
              </button>

              <button
                onClick={() => navigate('/immigration')}
                className="dashboard-shortcut-btn immigration"
              >
                <div className="dashboard-shortcut-left">
                  <Plane className="dashboard-shortcut-icon immigration" />
                  <span className="dashboard-shortcut-label immigration">Immigration Board</span>
                </div>
                <ArrowRight className="dashboard-shortcut-arrow immigration" />
              </button>
            </div>
          </div>

          {/* System Context Card */}
          <div className="dashboard-status-card">
            <div className="dashboard-status-header">
              <Activity className="dashboard-status-icon" />
              <h2 className="dashboard-status-title">System Status</h2>
            </div>

            <div className="dashboard-status-list">
              <div className="dashboard-status-item border-b">
                <span>Total Managed Leads</span>
                <span className="dashboard-status-val">{metrics.totalLeads ?? '0'}</span>
              </div>
              <div className="dashboard-status-item border-b">
                <span>Current Role</span>
                <span className="dashboard-status-role-badge">{user?.role}</span>
              </div>
              <div className="dashboard-status-item">
                <span>Scope Region</span>
                <span className="dashboard-status-scope">
                  {user?.role === 'CEO' ? 'Global Portal' : (user?.country || 'Local Branch')}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
