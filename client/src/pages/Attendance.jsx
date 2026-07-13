import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Calendar as CalendarIcon, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const [attendance, setAttendance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    fetchHRData();
  }, []);

  const fetchHRData = async () => {
    try {
      const [attRes, leaveRes] = await Promise.all([
        axios.get('/api/hr/attendance/me'),
        axios.get('/api/hr/leave/me')
      ]);
      setAttendance(attRes.data);
      setLeaves(leaveRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    await axios.post('/api/hr/attendance/clock-in');
    fetchHRData();
  };

  const handleClockOut = async () => {
    await axios.post('/api/hr/attendance/clock-out');
    fetchHRData();
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/hr/leave', leaveForm);
    setLeaveForm({ startDate: '', endDate: '', reason: '' });
    fetchHRData();
  };

  const calculateTotalTime = (inAt, outAt) => {
    if (!inAt || !outAt) return '';
    const diff = new Date(outAt) - new Date(inAt);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-pangaea-deep">Attendance Portal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <h3 className="text-lg font-bold text-pangaea-deep mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" /> Attendance Tracker
          </h3>
          <div className="bg-sky-50 rounded-lg p-6 text-center border border-sky-100">
            <p className="text-sm text-slate-500 mb-2">Today is {format(new Date(), 'EEEE, MMMM do')}</p>
            {!attendance ? (
              <button onClick={handleClockIn} className="w-full py-3 bg-sky-800 text-white rounded-lg font-bold text-lg hover:bg-sky-900 shadow-md transition-transform hover:scale-105">
                Clock In
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center text-green-600 font-medium">
                  <CheckCircle className="w-5 h-5 mr-2" /> Clocked In at {new Date(attendance.checkInAt).toLocaleTimeString()}
                </div>
                {!attendance.checkOutAt ? (
                  <button onClick={handleClockOut} className="w-full py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-700 shadow-md transition-transform hover:scale-105">
                    Clock Out
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 font-medium bg-slate-100 py-3 rounded-lg space-y-1">
                    <div className="flex items-center">
                      <XCircle className="w-5 h-5 mr-2 text-red-500" /> Clocked Out at {new Date(attendance.checkOutAt).toLocaleTimeString()}
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      Total Time: {calculateTotalTime(attendance.checkInAt, attendance.checkOutAt)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <h3 className="text-lg font-bold text-pangaea-deep mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" /> Leave Request
          </h3>
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Start Date</label>
                <input type="date" required value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="mt-1 w-full rounded border-slate-300 py-1.5 px-2 border text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">End Date</label>
                <input type="date" required value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="mt-1 w-full rounded border-slate-300 py-1.5 px-2 border text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Reason</label>
              <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="mt-1 w-full rounded border-slate-300 py-1.5 px-2 border text-sm" />
            </div>
            <button type="submit" className="w-full py-2 bg-sky-800 text-white rounded-lg text-sm font-medium hover:bg-sky-900">Submit Request</button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
        <h3 className="text-lg font-bold text-pangaea-deep mb-4">My Leave History</h3>
        {leaves.length === 0 ? (
          <p className="text-slate-500 text-sm">No leave requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-sky-100">
              <thead className="bg-sky-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-sky-900">Dates</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-sky-900">Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-sky-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {leaves.map(l => (
                  <tr key={l._id}>
                    <td className="px-4 py-2 text-sm">{l.startDate} to {l.endDate}</td>
                    <td className="px-4 py-2 text-sm text-slate-500">{l.reason}</td>
                    <td className="px-4 py-2 text-sm font-bold">
                      <span className={`px-2 py-0.5 rounded text-xs ${l.status === 'APPROVED' ? 'bg-green-100 text-green-800' : l.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
