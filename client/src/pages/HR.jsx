import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import { 
  Users, CheckCircle, XCircle, Calendar, Clock, 
  Search, ShieldAlert, HeartHandshake, User, Check, X, FileText 
} from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';

export default function HR() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'leave'
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action Loading State per Item ID
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    fetchHRData();
  }, []);

  const fetchHRData = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes] = await Promise.all([
        axios.get('/api/hr/attendance'),
        axios.get('/api/hr/leave')
      ]);
      setAttendanceRecords(attRes.data);
      setLeaveRequests(leaveRes.data);
    } catch (err) {
      console.error('Failed to load HR data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId, newStatus) => {
    setActioningId(leaveId);
    try {
      await axios.patch(`/api/hr/leave/${leaveId}/status`, { status: newStatus });
      setLeaveRequests(prev => 
        prev.map(l => l._id === leaveId ? { ...l, status: newStatus } : l)
      );
    } catch (err) {
      console.error('Failed to update leave status:', err);
      alert('Failed to update leave request status');
    } finally {
      setActioningId(null);
    }
  };

  const handleUpdateAttendanceStatus = async (recordId, newStatus) => {
    setActioningId(recordId);
    try {
      await axios.patch(`/api/hr/attendance/${recordId}/status`, { status: newStatus });
      setAttendanceRecords(prev => 
        prev.map(r => r._id === recordId ? { ...r, approvalStatus: newStatus } : r)
      );
    } catch (err) {
      console.error('Failed to update attendance status:', err);
      alert('Failed to update attendance status');
    } finally {
      setActioningId(null);
    }
  };

  const calculateTotalTime = (inAt, outAt) => {
    if (!inAt || !outAt) return '—';
    try {
      const diffMins = differenceInMinutes(parseISO(outAt), parseISO(inAt));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    } catch (e) {
      return '—';
    }
  };

  // Metrics calculations
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const clockedInToday = attendanceRecords.filter(r => r.workDate === todayStr).length;
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'PENDING').length;
  const pendingAttendanceCount = attendanceRecords.filter(r => r.approvalStatus === 'PENDING').length;

  const filteredAttendance = attendanceRecords.filter(r => 
    r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.workDate?.includes(searchTerm)
  );

  const filteredLeaves = leaveRequests.filter(l => 
    l.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <span>🏠</span> / <span>HR</span> / <span className="font-semibold text-slate-800">HR PORTAL</span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <HeartHandshake className="w-7 h-7 text-rose-600" />
          HR Management
        </h2>
        <p className="text-sm text-slate-500">Overview employee attendance, leaves, approvals and logs.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Clocked In Today */}
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="bg-emerald-500 text-white p-3 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clocked In Today</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{clockedInToday}</h3>
          </div>
        </div>

        {/* Card 2: Pending Attendance Approvals */}
        <div className="bg-gradient-to-br from-sky-50 to-white border border-sky-100 rounded-xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="bg-sky-500 text-white p-3 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Attendances</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingAttendanceCount}</h3>
          </div>
        </div>

        {/* Card 3: Pending Leaves */}
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="bg-amber-500 text-white p-3 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingLeavesCount}</h3>
          </div>
        </div>
      </div>

      {/* Controls & Tables */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setActiveTab('attendance'); setSearchTerm(''); }}
              className={`py-1.5 px-4 rounded-md text-sm font-semibold transition-all ${activeTab === 'attendance' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Attendance Logs
            </button>
            <button
              onClick={() => { setActiveTab('leave'); setSearchTerm(''); }}
              className={`py-1.5 px-4 rounded-md text-sm font-semibold transition-all ${activeTab === 'leave' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Leave Requests
            </button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'attendance' ? 'Search employee, date...' : 'Search employee, reason...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50"
            />
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-800"></div>
            <span className="text-sm font-semibold text-slate-500">Loading HR records...</span>
          </div>
        ) : activeTab === 'attendance' ? (
          /* Attendance Section */
          filteredAttendance.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Employee Name</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Work Date</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Check-In</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Check-Out</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Approval Status</th>
                    <th className="px-6 py-3 text-center font-bold tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                  {filteredAttendance.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-2">
                        <div className="w-7 h-7 bg-sky-100 text-sky-800 rounded-full flex items-center justify-center text-xs font-bold uppercase">
                          {rec.userName?.charAt(0)}
                        </div>
                        {rec.userName}
                      </td>
                      <td className="px-6 py-4 font-medium">{rec.workDate}</td>
                      <td className="px-6 py-4">
                        {rec.checkInAt ? format(parseISO(rec.checkInAt), 'hh:mm a') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {rec.checkOutAt ? format(parseISO(rec.checkOutAt), 'hh:mm a') : '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {calculateTotalTime(rec.checkInAt, rec.checkOutAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          rec.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          rec.approvalStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                        }`}>
                          {rec.approvalStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {rec.approvalStatus === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={actioningId !== null}
                              onClick={() => handleUpdateAttendanceStatus(rec._id, 'APPROVED')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors border border-transparent hover:border-emerald-200"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              disabled={actioningId !== null}
                              onClick={() => handleUpdateAttendanceStatus(rec._id, 'REJECTED')}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-full transition-colors border border-transparent hover:border-rose-200"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Leave Section */
          filteredLeaves.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Employee Name</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Dates Requested</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Requested On</th>
                    <th className="px-6 py-3 text-left font-bold tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center font-bold tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-2">
                        <div className="w-7 h-7 bg-rose-100 text-rose-800 rounded-full flex items-center justify-center text-xs font-bold uppercase">
                          {leave.userName?.charAt(0)}
                        </div>
                        {leave.userName}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {leave.startDate} <span className="text-slate-400">to</span> {leave.endDate}
                      </td>
                      <td className="px-6 py-4 text-xs max-w-xs truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {leave.createdAt ? format(parseISO(leave.createdAt), 'PPp') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          leave.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {leave.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={actioningId !== null}
                              onClick={() => handleUpdateLeaveStatus(leave._id, 'APPROVED')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors border border-transparent hover:border-emerald-200"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              disabled={actioningId !== null}
                              onClick={() => handleUpdateLeaveStatus(leave._id, 'REJECTED')}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-full transition-colors border border-transparent hover:border-rose-200"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
