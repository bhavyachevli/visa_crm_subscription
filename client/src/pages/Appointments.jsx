import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import { 
  Calendar, Clock, Plus, Search, Filter, X, Check, Edit, Trash2, 
  MapPin, Video, Phone, CheckCircle2, AlertTriangle, HelpCircle, 
  CalendarDays, List, ArrowLeft, ArrowRight, CalendarPlus, User, Link2, FileText, PlusCircle
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, isToday } from 'date-fns';

export default function Appointments() {
  const { user, isCEO } = useAuth();
  const isManager = ['CEO', 'DIRECTOR', 'HR', 'BRANCH_ADMIN', 'ADMIN'].includes(user?.role);


  // States
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' (week board) or 'list'
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // starts Monday
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    title: '',
    appointmentDate: '',
    appointmentTime: '',
    durationMins: 30,
    type: 'VIDEO_CALL',
    leadId: '',
    assigneeId: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoints = [
        axios.get('/api/appointments'),
        axios.get('/api/users'),
        axios.get('/api/leads')
      ];
      
      const [apptRes, usersRes, leadsRes] = await Promise.all(endpoints);
      
      setAppointments(apptRes.data);
      
      // Filter active users to assign appointments
      const activeUsers = usersRes.data.filter(u => u.isActive !== false);
      let filteredUsers = [];
      if (user?.role === 'CEO') {
        filteredUsers = activeUsers.filter(u => u.role === 'DIRECTOR' || u.role === 'HR' || u._id === user?._id);
      } else if (user?.role === 'DIRECTOR') {
        filteredUsers = activeUsers.filter(u => u.role === 'BRANCH_ADMIN' || u.role === 'ADMIN' || u.role === 'HR' || u._id === user?._id);
      } else if (user?.role === 'HR') {
        filteredUsers = activeUsers.filter(u => u.role === 'BRANCH_ADMIN' || u.role === 'ADMIN' || u._id === user?._id);
      } else {
        filteredUsers = activeUsers.filter(u => u._id === user?._id);
      }
      setUsers(filteredUsers);

      // Handle different formats of lead list response
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data?.leads || []);
    } catch (err) {
      console.error('Error fetching appointments data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = (defaultDate = '') => {
    setIsEditMode(false);
    setEditingId(null);
    setForm({
      title: '',
      appointmentDate: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      appointmentTime: '10:00',
      durationMins: 30,
      type: 'VIDEO_CALL',
      leadId: '',
      assigneeId: user?._id || '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (appt) => {
    setIsEditMode(true);
    setEditingId(appt._id);
    setForm({
      title: appt.title || '',
      appointmentDate: appt.appointmentDate || '',
      appointmentTime: appt.appointmentTime || '',
      durationMins: appt.durationMins || 30,
      type: appt.type || 'VIDEO_CALL',
      leadId: appt.leadId || '',
      assigneeId: appt.assigneeId || '',
      notes: appt.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditMode) {
        await axios.patch(`/api/appointments/${editingId}`, form);
      } else {
        await axios.post('/api/appointments', form);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error submitting appointment:', err);
      alert(err.response?.data?.detail || 'Failed to save appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      await axios.patch(`/api/appointments/${apptId}`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDelete = async (apptId) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await axios.delete(`/api/appointments/${apptId}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  // Scoped calculation for weekly header and dates
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const changeWeek = (amount) => {
    setCurrentWeekStart(prev => addDays(prev, amount * 7));
  };

  const setTodayWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Filtering Logic
  const filteredAppointments = appointments.filter(a => {
    const matchesSearch = 
      (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.leadName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.assigneeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Color mapper for appointments
  const getStatusColor = (status) => {
    switch (status) {
      case 'SCHEDULED': return { 
        bg: 'bg-white border-l-[4px] border-l-sky-500 border-slate-200 text-slate-800 shadow-sm hover:border-slate-300', 
        badge: 'bg-sky-50 text-sky-700 border border-sky-200/50',
        dot: 'bg-sky-500'
      };
      case 'COMPLETED': return { 
        bg: 'bg-white border-l-[4px] border-l-emerald-500 border-slate-200 text-slate-800 shadow-sm hover:border-slate-300', 
        badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
        dot: 'bg-emerald-500'
      };
      case 'CANCELLED': return { 
        bg: 'bg-slate-50 border-l-[4px] border-l-slate-400 border-slate-200 text-slate-500 opacity-75 hover:opacity-100', 
        badge: 'bg-slate-100 text-slate-600 border border-slate-200',
        dot: 'bg-slate-400'
      };
      case 'NO_SHOW': return { 
        bg: 'bg-white border-l-[4px] border-l-rose-500 border-slate-200 text-slate-800 shadow-sm hover:border-slate-300', 
        badge: 'bg-rose-50 text-rose-700 border border-rose-200/50',
        dot: 'bg-rose-500'
      };
      default: return { 
        bg: 'bg-white border-l-[4px] border-l-slate-500 border-slate-200 text-slate-800 shadow-sm', 
        badge: 'bg-slate-100 text-slate-700',
        dot: 'bg-slate-500'
      };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'VIDEO_CALL': return <Video className="w-4 h-4 text-indigo-500" />;
      case 'PHONE': return <Phone className="w-4 h-4 text-emerald-500" />;
      default: return <MapPin className="w-4 h-4 text-rose-500" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'VIDEO_CALL': return 'Video Call';
      case 'PHONE': return 'Phone Call';
      default: return 'In-Person';
    }
  };

  // Metrics Calculations
  const totalUpcoming = appointments.filter(a => a.status === 'SCHEDULED').length;
  const totalToday = appointments.filter(a => a.status === 'SCHEDULED' && a.appointmentDate === format(new Date(), 'yyyy-MM-dd')).length;
  const totalCompleted = appointments.filter(a => a.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Premium Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-500/10 text-sky-600 rounded-lg">
              <CalendarDays className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Appointments
            </h1>
          </div>
          <p className="text-sm text-slate-500">Plan consultations, track schedules, and launch client video calls.</p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {/* View Toggles */}
          <div className="bg-slate-200/60 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all duration-150 ${
                viewMode === 'calendar' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Week Rows
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all duration-150 ${
                viewMode === 'list' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List View
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-extrabold shadow-sm shadow-sky-500/10 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Modern Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div className="space-y-1">
            <div className="text-3xl font-black text-slate-900">{totalUpcoming}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Scheduled</div>
          </div>
          <div className="p-3 bg-sky-500/5 text-sky-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div className="space-y-1">
            <div className="text-3xl font-black text-slate-900">{totalToday}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Today's Meetings</div>
          </div>
          <div className="p-3 bg-amber-500/5 text-amber-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div className="space-y-1">
            <div className="text-3xl font-black text-slate-900">{totalCompleted}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed</div>
          </div>
          <div className="p-3 bg-emerald-500/5 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Styled Filters and Search Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search meetings, leads, hosts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-start md:justify-end">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Filters</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold px-3.5 py-2.5 text-slate-700 hover:bg-slate-100/50 transition-colors focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-Show</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold px-3.5 py-2.5 text-slate-700 hover:bg-slate-100/50 transition-colors focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="VIDEO_CALL">Video Call</option>
            <option value="PHONE">Phone Call</option>
            <option value="IN_PERSON">In-Person</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center bg-white border border-slate-100 rounded-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        </div>
      ) : viewMode === 'calendar' ? (
        
        /* ==================== ROW-BASED WEEK VIEW ==================== */
        <div className="space-y-4">
          
          {/* Week Navigator Card */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changeWeek(-1)}
                className="p-2 hover:bg-slate-100 active:bg-slate-200/70 rounded-xl text-slate-600 transition-colors"
                title="Previous Week"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <button 
                onClick={setTodayWeek}
                className="px-3.5 py-1.5 hover:bg-slate-100 active:bg-slate-200/70 rounded-xl text-xs font-black text-slate-700 transition-colors"
              >
                Today
              </button>
              
              <button 
                onClick={() => changeWeek(1)}
                className="p-2 hover:bg-slate-100 active:bg-slate-200/70 rounded-xl text-slate-600 transition-colors"
                title="Next Week"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <h2 className="text-sm sm:text-base font-black text-slate-800 text-center sm:text-left">
              {format(weekDays[0], 'MMMM d')} – {format(weekDays[6], 'MMMM d, yyyy')}
            </h2>
            
            <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full shrink-0">
              Weekly Flow
            </span>
          </div>

          {/* Vertical Day Rows Container */}
          <div className="space-y-4">
            {weekDays.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isDayToday = isToday(day);
              const dayAppts = filteredAppointments.filter(a => a.appointmentDate === dayStr);

              return (
                <div 
                  key={idx} 
                  className={`bg-white border rounded-2xl p-5 flex flex-col md:flex-row gap-5 items-start transition-all duration-200 ${
                    isDayToday 
                      ? 'border-sky-500 ring-2 ring-sky-500/10 shadow-sm bg-sky-50/5' 
                      : 'border-slate-200/60 shadow-sm hover:shadow-md'
                  }`}
                >
                  
                  {/* Left Column: Day Date Badge */}
                  <div className="w-full md:w-36 flex md:flex-col items-center justify-between md:justify-center p-3.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0 text-center">
                    <div className="flex md:flex-col items-center gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider ${
                        isDayToday ? 'text-sky-600' : 'text-slate-400'
                      }`}>
                        {format(day, 'EEEE')}
                      </span>
                      <span className={`text-2xl font-black rounded-full w-10 h-10 flex items-center justify-center transition-colors ${
                        isDayToday ? 'bg-sky-600 text-white' : 'text-slate-800'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleOpenCreateModal(dayStr)}
                      className="mt-0 md:mt-3 flex items-center gap-1 text-[10px] font-black text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100/70 border border-sky-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Appt
                    </button>
                  </div>

                  {/* Right Column: Appointments List (Stacked as rows) */}
                  <div className="flex-1 w-full flex flex-col gap-3">
                    {dayAppts.length === 0 ? (
                      <div className="py-4 text-left text-slate-400 flex items-center gap-2 text-xs font-semibold">
                        <CalendarPlus className="w-5 h-5 stroke-[1.5] text-slate-300" />
                        <span>No appointments scheduled for this day</span>
                      </div>
                    ) : (
                      dayAppts.map((appt) => {
                        const style = getStatusColor(appt.status);
                        return (
                          <div 
                            key={appt._id} 
                            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 ${style.bg}`}
                          >
                            
                            {/* Card Content (Left) */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                  {appt.title}
                                </h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase ${style.badge}`}>
                                  {appt.status === 'NO_SHOW' ? 'NO SHOW' : appt.status}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{appt.appointmentTime}</span>
                                  <span className="text-slate-400 font-normal">({appt.durationMins} mins)</span>
                                </div>

                                <div className="flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                  {getTypeIcon(appt.type)}
                                  <span>{getTypeLabel(appt.type)}</span>
                                </div>

                                {appt.assigneeName && (
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Host: <span className="font-bold">{appt.assigneeName}</span></span>
                                  </div>
                                )}
                              </div>

                              {appt.notes && (
                                <p className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-100 rounded-lg p-2 max-w-2xl">
                                  {appt.notes}
                                </p>
                              )}
                            </div>

                            {/* Client & Actions (Right) */}
                            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              
                              {/* Client Lead Name */}
                              {appt.leadName ? (
                                <div className="text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-100 px-3 py-1 rounded-full truncate max-w-[160px]">
                                  Lead: {appt.leadName}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">No Lead Linked</div>
                              )}

                              {/* Controls */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleUpdateStatus(appt._id, 'COMPLETED')}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                                  title="Mark Completed"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                {appt.status === 'SCHEDULED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(appt._id, 'NO_SHOW')}
                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-705 rounded-xl text-rose-700 transition-colors"
                                    title="Mark No Show"
                                  >
                                    <HelpCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenEditModal(appt)}
                                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors"
                                  title="Edit Details"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {isCEO && (
                                  <button
                                    onClick={() => handleDelete(appt._id)}
                                    className="p-2 bg-rose-50/50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}

                              </div>

                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      ) : (

        /* ==================== PREMIUM LIST VIEW ==================== */
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="py-4 px-5">Appointment Info</th>
                  <th className="py-4 px-5">Lead / Client</th>
                  <th className="py-4 px-5">Schedule Date & Time</th>
                  <th className="py-4 px-5">Channel</th>
                  <th className="py-4 px-5">Host User</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CalendarPlus className="w-9 h-9 stroke-[1.25] text-slate-300" />
                        <span>No matched appointments found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => {
                    const statusStyles = getStatusColor(appt.status);
                    return (
                      <tr key={appt._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-5 font-bold text-slate-900">
                          <div>
                            <div className="font-extrabold text-slate-800">{appt.title}</div>
                            {appt.notes && (
                              <p className="text-xs font-normal text-slate-400 max-w-xs mt-1 truncate flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                {appt.notes}
                              </p>
                            )}
                          </div>
                        </td>
                        
                        <td className="py-4 px-5 text-slate-600 font-bold">
                          {appt.leadName ? (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                              {appt.leadName}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>
                        
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-800">{appt.appointmentDate}</span>
                            <span className="text-xs text-slate-500 font-bold mt-0.5">{appt.appointmentTime} ({appt.durationMins}m)</span>
                          </div>
                        </td>
                        
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-full px-2.5 py-1 w-max border border-slate-200/40">
                            {getTypeIcon(appt.type)}
                            <span>{getTypeLabel(appt.type)}</span>
                          </div>
                        </td>
                        
                        <td className="py-4 px-5 text-slate-600 font-bold">
                          {appt.assigneeName || 'Unassigned'}
                        </td>
                        
                        <td className="py-4 px-5">
                          <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-black tracking-wide ${statusStyles.badge}`}>
                            {appt.status}
                          </span>
                        </td>
                        
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {appt.status === 'SCHEDULED' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(appt._id, 'COMPLETED')}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                                  title="Mark Completed"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => handleUpdateStatus(appt._id, 'NO_SHOW')}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                                  title="Mark No Show"
                                >
                                  <HelpCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(appt)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            {isCEO && (
                              <button
                                onClick={() => handleDelete(appt._id)}
                                className="p-2 bg-rose-50/50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Premium Creation/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-950 text-white py-4 px-6 flex justify-between items-center">
              <h3 className="text-base font-black flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-sky-400" />
                {isEditMode ? 'Edit Scheduled Session' : 'Schedule Consultation'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visa Eligibility Consultation"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={form.appointmentTime}
                    onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Duration</label>
                  <select
                    value={form.durationMins}
                    onChange={(e) => setForm({ ...form, durationMins: parseInt(e.target.value) })}
                    className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={90}>1.5 Hours</option>
                    <option value={120}>2 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                  >
                    <option value="VIDEO_CALL">Video Call</option>
                    <option value="PHONE">Phone Call</option>
                    <option value="IN_PERSON">In-Person</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5" />
                  Link Lead (Optional)
                </label>
                <select
                  value={form.leadId}
                  onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                  className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                >
                  <option value="">-- No linked lead --</option>
                  {leads.map((l) => (
                    <option key={l._id} value={l._id}>{l.fullName} ({l.country})</option>
                  ))}
                </select>
              </div>

              {isManager && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Host / Assigned Agent
                  </label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                  >
                    <option value="">-- Assign to Me --</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Internal Notes</label>
                <textarea
                  placeholder="Meeting agenda, access links, telephone numbers, etc..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows="3"
                  className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
                />
              </div>

              {/* Status control for Edit mode */}
              {isEditMode && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</label>
                  <select
                    value={form.status || 'SCHEDULED'}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none bg-slate-50 font-bold"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No-Show</option>
                  </select>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-transform"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-sm font-extrabold active:scale-[0.98] transition-all"
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Schedule Appointment'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
