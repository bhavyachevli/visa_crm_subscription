import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import { 
  CheckSquare, Plus, Search, Calendar, AlertCircle, 
  Filter, User, Clock, Link2, X, CheckCircle, ClipboardList 
} from 'lucide-react';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';

export default function Tasks() {
  const { user } = useAuth();
  const isManager = ['CEO', 'DIRECTOR', 'HR', 'BRANCH_ADMIN', 'ADMIN'].includes(user?.role);
  
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'all'
  const [myTasks, setMyTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [cases, setCases] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'HIGH', 'MEDIUM', 'LOW'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    assigneeId: '',
    priority: 'MEDIUM',
    leadId: '',
    caseId: ''
  });

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const promises = [
        axios.get('/api/tasks/me'),
        axios.get('/api/users'),
        axios.get('/api/leads'),
        axios.get('/api/immigration/cases').catch(() => ({ data: [] })) // Fallback if no cases
      ];

      if (isManager) {
        promises.push(axios.get('/api/tasks'));
      }

      const [myTasksRes, usersRes, leadsRes, casesRes, allTasksRes] = await Promise.all(promises);
      
      setMyTasks(myTasksRes.data);
      
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
      setCases(casesRes.data);
      
      if (allTasksRes) {
        setAllTasks(allTasksRes.data);
      }
    } catch (err) {
      console.error('Error fetching task initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const res = await axios.patch(`/api/tasks/${taskId}/toggle`);
      const isCompleted = res.data.completed;
      const completedTime = isCompleted ? new Date().toISOString() : null;

      // Update both local states
      const updateList = (list) => 
        list.map(t => t._id === taskId ? { ...t, completedAt: completedTime } : t);
      
      setMyTasks(prev => updateList(prev));
      setAllTasks(prev => updateList(prev));
    } catch (err) {
      console.error('Failed to toggle task:', err);
      alert('Failed to update task status');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.dueDate || !taskForm.assigneeId) {
      alert('Please fill out all required fields.');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        title: taskForm.title,
        dueDate: taskForm.dueDate,
        assigneeId: taskForm.assigneeId,
        priority: taskForm.priority,
        description: taskForm.description || undefined,
        leadId: taskForm.leadId || undefined,
        caseId: taskForm.caseId || undefined
      };

      await axios.post('/api/tasks', payload);
      setIsModalOpen(false);
      // Reset form
      setTaskForm({
        title: '',
        description: '',
        dueDate: '',
        assigneeId: '',
        priority: 'MEDIUM',
        leadId: '',
        caseId: ''
      });
      // Refresh tasks
      await fetchInitialData();
    } catch (err) {
      console.error('Failed to create task:', err);
      alert(err.response?.data?.detail || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and Search Logic
  const getFilteredTasks = () => {
    const tasks = activeTab === 'my' ? myTasks : allTasks;
    return tasks.filter(task => {
      const matchesSearch = 
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isCompleted = task.completedAt !== null;
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'completed' && isCompleted) || 
        (statusFilter === 'pending' && !isCompleted);

      const matchesPriority = 
        priorityFilter === 'all' || 
        task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'LOW':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  const isOverdue = (task) => {
    if (task.completedAt) return false;
    const today = startOfDay(new Date());
    const due = startOfDay(parseISO(task.dueDate));
    return isBefore(due, today);
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <span>🏠</span> / <span>Tasks</span> / <span className="font-semibold text-slate-800">TASK MANAGER</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-sky-700" />
            Task Hub
          </h2>
          <p className="text-sm text-slate-500">Manage and track action items, follow-ups, and daily workflows.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 py-2.5 px-4 bg-sky-800 text-white rounded-lg text-sm font-semibold hover:bg-sky-950 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Create Task
        </button>
      </div>

      {/* Tab Switcher & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          {isManager ? (
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('my')}
                className={`py-1.5 px-4 rounded-md text-sm font-semibold transition-all ${activeTab === 'my' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                My Tasks ({myTasks.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-1.5 px-4 rounded-md text-sm font-semibold transition-all ${activeTab === 'all' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All Scope Tasks ({allTasks.length})
              </button>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-700 bg-sky-50 py-1.5 px-3 rounded-lg border border-sky-100">
              Assigned Tasks
            </span>
          )}

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50"
            />
          </div>
        </div>

        {/* Filter Selects */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-xs font-medium py-1.5 px-3 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-xs font-medium py-1.5 px-3 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-800"></div>
          <span className="text-sm font-semibold text-slate-500">Loading tasks...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-16 px-4 text-center">
          <div className="bg-sky-50 p-4 rounded-full w-fit mx-auto mb-4 border border-sky-100">
            <CheckSquare className="w-8 h-8 text-sky-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No Tasks Found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">There are no tasks matching the selected filters, or no tasks have been assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            const completed = task.completedAt !== null;
            const overdue = isOverdue(task);
            
            return (
              <div 
                key={task._id} 
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all hover:shadow-md hover:border-sky-200 relative overflow-hidden flex flex-col justify-between ${completed ? 'bg-slate-50/50 border-slate-200' : 'border-slate-100'}`}
              >
                {/* Completion Check Overlay style at side */}
                <div className={`absolute top-0 right-0 w-1.5 h-full ${completed ? 'bg-emerald-500' : overdue ? 'bg-rose-500' : 'bg-transparent'}`}></div>
                
                <div>
                  {/* Top: Checkbox toggle & Title */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleTask(task._id)}
                      className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border transition-all flex items-center justify-center ${completed ? 'bg-emerald-500 border-emerald-500 text-white' : overdue ? 'border-rose-400 hover:bg-rose-50/30' : 'border-slate-300 hover:bg-sky-50/50'}`}
                    >
                      {completed && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-base font-bold text-slate-700 break-words ${completed ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className={`text-xs text-slate-500 mt-1 line-clamp-3 ${completed ? 'text-slate-400' : ''}`}>
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {/* Priority Badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-full border ${getPriorityStyles(task.priority)}`}>
                      {task.priority}
                    </span>

                    {/* Date */}
                    <span className={`text-xs font-semibold py-0.5 px-2 rounded-md flex items-center gap-1.5 ${completed ? 'bg-slate-100 text-slate-400' : overdue ? 'bg-rose-50 text-rose-700 font-bold border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                      <Calendar className="w-3 h-3" />
                      {overdue && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>}
                      {task.dueDate}
                      {overdue && <span className="text-[10px] text-rose-500 ml-1">(Overdue)</span>}
                    </span>
                  </div>
                </div>

                {/* Footer: Metadata details */}
                <div className="mt-5 pt-3 border-t border-slate-50 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-500">Assignee:</span>
                    <span className="text-slate-600 font-bold">{task.assigneeName}</span>
                  </div>

                  {task.leadName && (
                    <div className="flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-500">Lead:</span>
                      <span className="text-slate-600 font-bold hover:text-sky-700 transition-colors">
                        {task.leadName}
                      </span>
                    </div>
                  )}

                  {task.caseTrackingId && (
                    <div className="flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-500">Case ID:</span>
                      <span className="text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                        {task.caseTrackingId}
                      </span>
                    </div>
                  )}

                  {task.completedAt && (
                    <div className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Completed at {format(new Date(task.completedAt), 'PPp')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden animate-slide-in-right">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white py-4 px-6 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-sky-400" />
                Create New Task
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Task Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on documents"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="mt-1.5 w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Description</label>
                <textarea
                  placeholder="Details of what needs to be done..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows="3"
                  className="mt-1.5 w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Due Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Assignee <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={taskForm.assigneeId}
                  onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                  className="mt-1.5 w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                >
                  <option value="">Select Employee...</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Associate Lead (Optional)</label>
                  <select
                    value={taskForm.leadId}
                    onChange={(e) => setTaskForm({ ...taskForm, leadId: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                  >
                    <option value="">None</option>
                    {leads.map(l => (
                      <option key={l._id} value={l._id}>{l.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Associate Case (Optional)</label>
                  <select
                    value={taskForm.caseId}
                    onChange={(e) => setTaskForm({ ...taskForm, caseId: e.target.value })}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                  >
                    <option value="">None</option>
                    {cases.map(c => (
                      <option key={c._id} value={c._id}>{c.trackingId} ({c.fullName || 'Client'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-sky-800 text-white rounded-lg text-sm font-semibold hover:bg-sky-950 shadow-md flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
