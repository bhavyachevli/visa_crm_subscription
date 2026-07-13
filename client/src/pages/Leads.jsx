import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Trash2, MoreVertical, Users, User, Download, Phone, Mail, Calendar, ChevronLeft, ChevronRight, Edit, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../lib/AuthContext';
import FollowUpModal from '../components/FollowUpModal';

const getServiceDisplayName = (prod) => {
  const mapping = {
    CANADA: 'Application + Student Visa - (Canada)',
    USA: 'Application + Student Visa - (USA)',
    UK: 'Application + Student Visa - (UK)',
    EUROPE: 'Work Permit Europe',
    AUSTRALIA: 'Application + Student Visa - (Australia)',
    OTHER: 'Other Visa Service'
  };
  return mapping[prod] || prod || 'N/A';
};

const formatSource = (src) => {
  if (!src) return 'N/A';
  return src.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export default function Leads() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusParam || '');
  const [sourceFilter, setSourceFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const perPage = 25;
  const { user, isCEO } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (statusParam !== null) {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter('');
    }
    setCurrentPage(1);
  }, [statusParam]);

  useEffect(() => {
    fetchLeads(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchLeads = async (scope) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/leads?scope=${scope}`);
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await axios.patch(`/api/leads/${leadId}`, { leadStatus: newStatus });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, leadStatus: newStatus } : l));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/leads/${id}`);
      setOpenMenuId(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete lead');
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery ||
      lead.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);
    const matchesStatus = !statusFilter || lead.leadStatus === statusFilter;
    const matchesSource = !sourceFilter || lead.source === sourceFilter;
    const matchesService = !serviceFilter || lead.productLine === serviceFilter;
    return matchesSearch && matchesStatus && matchesSource && matchesService;
  });

  const totalPages = Math.ceil(filteredLeads.length / perPage) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * perPage, currentPage * perPage);

  const getStatusColor = (status) => {
    const colors = {
      NEW: 'bg-blue-100 text-blue-800 border-blue-200',
      CONTACTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      QUALIFIED: 'bg-green-100 text-green-800 border-green-200',
      LOST: 'bg-red-100 text-red-800 border-red-200',
      ON_HOLD: 'bg-orange-100 text-orange-800 border-orange-200',
      CONVERTED: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <span>🏠</span> / <span>Lead</span> / <span className="font-semibold text-slate-800">LEAD LIST</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`flex items-center space-x-2 pb-1 border-b-2 transition-colors ${activeTab === 'all' ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm font-semibold">All Leads</span>
          </button>
          <button
            onClick={() => { setActiveTab('my'); setCurrentPage(1); }}
            className={`flex items-center space-x-2 pb-1 border-b-2 transition-colors ${activeTab === 'my' ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-sm font-semibold">My Leads</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50" title="Export">
            <Download className="w-4 h-4" />
          </button>
          <Link to="/leads/new" className="flex items-center justify-center w-9 h-9 bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition-colors" title="Add New Lead">
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Status</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="w-full text-sm border border-slate-200 rounded-lg py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
              <option value="">View All Lead</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="LOST">Lost</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Source</label>
            <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setCurrentPage(1); }} className="w-full text-sm border border-slate-200 rounded-lg py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
              <option value="">View All Source</option>
              <option value="WEBSITE">Website</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="REFERRAL">Referral</option>
              <option value="PARTNER">Partner</option>
              <option value="SOCIAL">Social Media</option>
              <option value="EVENT">Event</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">All Services</label>
            <select value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setCurrentPage(1); }} className="w-full text-sm border border-slate-200 rounded-lg py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
              <option value="">All Services</option>
              <option value="CANADA">Canada Visa</option>
              <option value="USA">USA Visa</option>
              <option value="UK">UK Visa</option>
              <option value="EUROPE">Europe Visa</option>
              <option value="AUSTRALIA">Australia Visa</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by name, email or phone..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9 w-full text-sm border border-slate-200 rounded-lg py-2 pr-8 focus:ring-sky-500 focus:border-sky-500" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">×</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-sky-100">
        <div className="hidden md:grid grid-cols-12 bg-amber-50 border-b border-amber-200 px-4 py-3 rounded-t-xl">
          <div className="col-span-2 text-xs font-bold text-slate-700 uppercase tracking-wider">Lead</div>
          <div className="col-span-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Client</div>
          <div className="col-span-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Services</div>
          <div className="col-span-2 text-xs font-bold text-slate-700 uppercase tracking-wider">Status</div>
          <div className="col-span-2 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Follow-up</div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-3"></div>
              Loading leads...
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No leads found</p>
              <p className="text-sm mt-1">Try adjusting your filters or <Link to="/leads/new" className="text-sky-600 hover:underline">create a new lead</Link></p>
            </div>
          ) : (
            paginatedLeads.map((lead, idx) => (
              <div
                key={lead._id}
                onClick={() => navigate(`/leads/${lead._id}`)}
                className="grid grid-cols-1 md:grid-cols-12 px-4 py-4 hover:bg-sky-50/50 transition-colors items-start md:items-center gap-3 md:gap-0 cursor-pointer border-b border-slate-100"
                style={{ borderLeft: '3px solid #C084FC' }}
              >
                {/* LEAD */}
                <div className="col-span-2 space-y-1">
                  <div className="flex justify-between items-center md:block">
                    <Link 
                      to={`/leads/${lead._id}`} 
                      className="text-sm font-bold text-slate-800 hover:text-sky-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.leadCode || `LEAD-${String(lead.leadNo || 1).padStart(4, '0')}`}
                    </Link>
                    <span className="md:hidden text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-semibold">{formatSource(lead.source)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {format(new Date(lead.createdAt), 'dd-MM-yyyy HH:mm')}
                  </div>
                  <div className="hidden md:block text-[11px] text-slate-400 font-semibold">{formatSource(lead.source)}</div>
                </div>

                {/* CLIENT */}
                <div className="col-span-3 space-y-1">
                  <div className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Info</div>
                  <div className="flex items-center space-x-2">
                    {/* Star Badge */}
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-500 text-[18px]">★</span>
                      <span className="absolute text-[8px] font-black text-slate-800 mt-[2px]">
                        {lead.leadQuality || '1'}
                      </span>
                    </div>
                    <Link 
                      to={`/leads/${lead._id}`} 
                      className="text-sm font-bold text-slate-800 hover:text-sky-700 uppercase"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.fullName}
                    </Link>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <span>{lead.phone}</span>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1.5 text-emerald-500 hover:text-emerald-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.775-4.366 9.777-9.772.001-2.618-1.017-5.08-2.868-6.932C16.33 2.05 13.873 1.03 11.26 1.03c-5.409 0-9.809 4.397-9.813 9.805 0 1.547.411 3.056 1.192 4.404l-.999 3.651 3.737-.98c1.37.747 2.808 1.144 4.27 1.144zm10.285-7.393c-.279-.14-1.651-.814-1.906-.907-.255-.094-.441-.14-.627.14-.186.279-.718.907-.88 1.092-.163.186-.325.21-.604.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.932-.163-.279-.017-.43.122-.569.126-.125.279-.325.418-.487.14-.163.186-.279.279-.465.093-.186.047-.349-.023-.488-.07-.14-.627-1.511-.859-2.07-.226-.544-.455-.47-.627-.478-.162-.007-.348-.008-.534-.008-.186 0-.488.07-.743.349-.256.279-.976.953-.976 2.324 0 1.371.999 2.697 1.139 2.883.139.186 1.966 3.003 4.763 4.208.665.286 1.184.457 1.587.585.669.213 1.278.183 1.759.11.536-.081 1.651-.675 1.884-1.326.233-.651.233-1.21.163-1.325-.07-.11-.256-.15-.535-.29z" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <span className="truncate max-w-[160px]">{lead.email}</span>
                    </div>
                  )}
                  {lead.visaExpiryDate && (
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <span>{format(new Date(lead.visaExpiryDate), 'dd-MM-yyyy')}</span>
                    </div>
                  )}
                </div>

                {/* SERVICES */}
                <div className="col-span-3 space-y-1">
                  <div className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service</div>
                  <div className="text-sm text-slate-700 font-bold">
                    {getServiceDisplayName(lead.productLine)}
                  </div>
                </div>

                {/* STATUS */}
                <div className="col-span-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                  <div className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                  <div className="relative inline-block text-left">
                    <select
                      value={lead.leadStatus || 'NEW'}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      className="appearance-none bg-[#C084FC]/20 text-[#7E22CE] border border-[#C084FC]/30 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm min-w-[100px]"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Assigned</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="LOST">Lost</option>
                      <option value="CONVERTED">Converted</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#7E22CE]">
                      <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* FOLLOW-UP & ACTIONS */}
                <div className="col-span-2 flex items-center justify-between md:justify-end space-x-3 w-full relative" onClick={(e) => e.stopPropagation()}>
                  <div className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</div>
                  <div className="flex items-center space-x-3">
                    {/* + Add Button */}
                    <button
                      onClick={() => {
                        setSelectedLeadId(lead._id);
                        setFollowUpModalOpen(true);
                      }}
                      className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                    >
                      + Add
                    </button>

                    {/* Assignee Initials */}
                    {lead.ownerName && lead.ownerName !== 'Unassigned' ? (
                      <span
                        className="w-7 h-7 rounded-full bg-[#EEEBFF] text-[#6366F1] text-xs font-black flex items-center justify-center border border-indigo-100 shadow-inner flex-shrink-0"
                        title={`Assigned to: ${lead.ownerName}`}
                      >
                        {lead.ownerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <span
                        className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center border border-slate-200 shadow-inner flex-shrink-0"
                        title="Unassigned"
                      >
                        UA
                      </span>
                    )}

                    {/* Dot menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === lead._id ? null : lead._id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === lead._id && (
                        <div className="absolute right-0 bottom-full md:bottom-auto md:top-full mt-1 mb-1 md:mb-0 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                        <button onClick={() => { navigate(`/leads/${lead._id}/edit`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <Edit className="w-3.5 h-3.5 mr-2 text-sky-600" /> Edit Lead
                        </button>
                        <button onClick={() => { navigate(`/leads/${lead._id}`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-2 text-sky-600" /> View Details
                        </button>
                        <button onClick={() => { navigate(`/leads/${lead._id}`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-2 text-sky-600" /> Send Email
                        </button>
                        <button onClick={() => { setSelectedLeadId(lead._id); setFollowUpModalOpen(true); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-2 text-sky-600" /> Add Follow-up
                        </button>
                        {isCEO && (
                          <>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button onClick={() => handleDelete(lead._id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Lead
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 gap-3 rounded-b-xl">
            <span className="text-sm text-slate-600">
              Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredLeads.length)} of {filteredLeads.length} Entries
            </span>
            <div className="flex items-center space-x-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded text-sm font-medium ${currentPage === page ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-white'}`}>
                  {page}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <FollowUpModal
        isOpen={followUpModalOpen}
        onClose={() => { setFollowUpModalOpen(false); setSelectedLeadId(null); }}
        leadId={selectedLeadId}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
