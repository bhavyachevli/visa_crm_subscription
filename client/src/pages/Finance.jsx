import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await axios.get('/api/finance/invoices');
        setInvoices(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-slate-100 text-slate-800';
      case 'VOID': return 'bg-red-100 text-red-800';
      default: return 'bg-sky-100 text-sky-800';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-pangaea-deep">Finance Hub</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-sky-100">
            <thead className="bg-sky-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-sky-900 uppercase tracking-wider">Invoice No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-sky-900 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-sky-900 uppercase tracking-wider">Gross Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-sky-900 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-sky-900 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-sky-900 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-sky-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-slate-500">Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-slate-500">No invoices found.</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-sky-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-sky-700">
                      <Link to={`/leads/${inv.leadId}`}>{inv.number}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {inv.currency} {inv.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {inv.currency} {(inv.paidAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <a href={`http://localhost:8000/api/finance/invoices/${inv._id}/pdf`} target="_blank" rel="noreferrer" className="text-sky-600 hover:text-sky-800 flex items-center">
                        <Download className="w-4 h-4 mr-1"/> PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
