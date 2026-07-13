import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plane, Calendar, User, ChevronDown, CheckCircle, Clock, AlertCircle, Search, X, Check, XCircle, FileText, Trash2, Copy } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';



const KANBAN_STAGES = [
  'Intake', 'Document Collection', 'Review', 'Submitted', 'Biometrics', 'Approved', 'Rejected'
];

const AgentDashboard = () => {
  const { isCEO } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [activeTab, setActiveTab] = useState('pipeline');
  const [copiedText, setCopiedText] = useState(null);

  const handleCopy = (text, type, id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    const key = `${type}-${id}`;
    setCopiedText(key);
    setTimeout(() => {
      setCopiedText(null);
    }, 1500);
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await axios.get('/api/immigration/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (caseId, newStage, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.patch(`/api/immigration/cases/${caseId}/stage`, { stage: newStage });
      const approvedAtVal = newStage === 'Approved' ? new Date().toISOString() : null;
      setCases(prev => prev.map(c => c._id === caseId ? { ...c, pipelineStage: newStage, approvedAt: approvedAtVal } : c));
      if (selectedCase && selectedCase._id === caseId) {
        setSelectedCase(prev => ({ ...prev, pipelineStage: newStage, approvedAt: approvedAtVal }));
      }
    } catch (error) {
      console.error('Failed to change stage', error);
      alert('Failed to update stage');
    }
  };

  const handleVerifyDocument = async (caseId, documentName, status) => {
    try {
      const reason = status === 'Rejected' ? rejectionReasons[documentName] : null;
      if (status === 'Rejected' && !reason) {
        alert("Please provide a rejection reason.");
        return;
      }

      await axios.patch(`/api/immigration/cases/${caseId}/documents/${documentName}/verify`, { status, reason });
      
      // Update local state
      const updateDocs = (docs) => docs.map(d => d.documentName === documentName ? { ...d, status, rejectionReason: reason } : d);
      
      setCases(prev => prev.map(c => c._id === caseId ? { ...c, documents: updateDocs(c.documents) } : c));
      setSelectedCase(prev => ({ ...prev, documents: updateDocs(prev.documents) }));
      
      // Clear reason input
      setRejectionReasons(prev => ({ ...prev, [documentName]: '' }));
    } catch (err) {
      console.error(err);
      alert('Verification failed.');
    }
  };

  const handleDeleteCase = async (caseId, trackingId) => {
    if (!window.confirm(`Are you sure you want to delete case ${trackingId}? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`/api/immigration/cases/${caseId}`);
      setCases(prev => prev.filter(c => c._id !== caseId));
      if (selectedCase && selectedCase._id === caseId) {
        setSelectedCase(null);
      }
    } catch (error) {
      console.error('Failed to delete case', error);
      alert('Failed to delete case');
    }
  };

  const isApprovedOlderThan24Hours = (caseItem) => {
    if (caseItem.pipelineStage !== 'Approved') return false;
    const approvedAt = caseItem.approvedAt || caseItem.updatedAt || caseItem.createdAt;
    if (!approvedAt) return false;
    const timeDiff = new Date() - new Date(approvedAt);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return timeDiff > twentyFourHours;
  };

  const isApprovedRecentOrOther = (caseItem) => {
    if (caseItem.pipelineStage !== 'Approved') return true;
    const approvedAt = caseItem.approvedAt || caseItem.updatedAt || caseItem.createdAt;
    if (!approvedAt) return true;
    const timeDiff = new Date() - new Date(approvedAt);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return timeDiff <= twentyFourHours;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-pulse flex flex-col items-center">
        <Plane className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-400 tracking-widest uppercase">Loading Pipeline</h2>
      </div>
    </div>
  );

  return (
    <div className="font-sans relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 tracking-tight">
            Immigration Hub
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and track all active visa applications in real-time.</p>
        </div>
        
        {/* View Switcher and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="flex bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200/40 shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
                activeTab === 'pipeline'
                  ? 'bg-white text-blue-700 shadow-md transform scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pipeline Board
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
                activeTab === 'approved'
                  ? 'bg-white text-blue-700 shadow-md transform scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved Documents
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Tracking ID or Client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium text-slate-700 transition-all placeholder:font-normal"
            />
          </div>
        </div>
      </div>
      
      {activeTab === 'pipeline' ? (
        <div className="flex space-x-4 md:space-x-6 overflow-x-auto pb-8 snap-x snap-mandatory">
          {KANBAN_STAGES.map(stage => {
             // Filter by stage AND search term AND 24-hour approval logic
             const stageCases = cases.filter(c => {
               const matchesStage = c.pipelineStage === stage;
               const matchesSearch = c.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                     c.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     (c.clientName && c.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
               
               if (!matchesStage || !matchesSearch) return false;
               
               // Only keep Approved cases if they are approved <= 24 hours ago
               if (stage === 'Approved') {
                 return isApprovedRecentOrOther(c);
               }
               return true;
             });
             
             return (
            <div key={stage} className="snap-center snap-always min-w-[280px] sm:min-w-[340px] w-[280px] sm:w-[340px] flex flex-col h-[65vh] md:h-[75vh]">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5 flex flex-col h-full">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                  <h2 className="font-bold text-lg text-slate-700 tracking-wide">{stage}</h2>
                  <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-inner">
                    {stageCases.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {stageCases.map(caseItem => (
                    <div 
                      key={caseItem.trackingId} 
                      onClick={() => setSelectedCase(caseItem)}
                      className="group relative bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 ease-out cursor-pointer overflow-hidden"
                    >
                      {/* Decorative accent line */}
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex justify-between items-center mb-3 gap-2">
                        <p className="font-bold text-slate-800 text-sm tracking-wide truncate">{caseItem.trackingId}</p>
                        <button
                          onClick={(e) => handleCopy(caseItem.trackingId, 'case', caseItem._id, e)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Copy Tracking ID"
                        >
                          {copiedText === `case-${caseItem._id}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100 gap-2">
                        <div className="flex items-center min-w-0">
                          <User className="w-3.5 h-3.5 mr-2 text-indigo-400 shrink-0" />
                          <span className="truncate" title={caseItem.clientName ? `${caseItem.clientName}${caseItem.leadCode ? ` (${caseItem.leadCode})` : ''}` : caseItem.clientId}>
                            Client: {caseItem.clientName}{caseItem.leadCode ? ` (${caseItem.leadCode})` : ''}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleCopy(caseItem.clientName || caseItem.clientId, 'client', caseItem._id, e)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                          title="Copy Client Name"
                        >
                          {copiedText === `client-${caseItem._id}` ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      
                      <div className="relative">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 ml-1">Move to Stage</label>
                        <div className="relative">
                          <select 
                            value={caseItem.pipelineStage} 
                            onChange={(e) => handleStageChange(caseItem._id, e.target.value, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="appearance-none w-full text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all cursor-pointer"
                          >
                            {KANBAN_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-blue-500 pointer-events-none" />
                        </div>
                      </div>
  
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                         <div className="flex items-center text-[10px] text-slate-400 font-medium">
                           <Clock className="w-3 h-3 mr-1" />
                           {new Date(caseItem.updatedAt).toLocaleDateString()}
                         </div>
                      </div>
                    </div>
                  ))}
                  {stageCases.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-sm font-medium text-slate-400">Empty</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Title & Description of section */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Approved Cases Archive</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Cases are archived to this section after 24 hours of being approved.</p>
            </div>
            <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-100 flex items-center gap-1.5 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Total Archived: {cases.filter(isApprovedOlderThan24Hours).length}
            </div>
          </div>

          {/* Grid of cases */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases
              .filter(c => {
                const matchesArchive = isApprovedOlderThan24Hours(c);
                const matchesSearch = c.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                      c.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      (c.clientName && c.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
                return matchesArchive && matchesSearch;
              })
              .map(caseItem => {
                return (
                  <div 
                    key={caseItem.trackingId} 
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full"
                  >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-extrabold text-slate-800 text-sm tracking-wide bg-white px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-sm">
                            {caseItem.trackingId}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Approved
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm truncate flex items-center gap-1.5" title={caseItem.clientName ? `${caseItem.clientName}${caseItem.leadCode ? ` (${caseItem.leadCode})` : ''}` : caseItem.clientId}>
                          <User className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="truncate">{caseItem.clientName}{caseItem.leadCode ? ` (${caseItem.leadCode})` : ''}</span>
                        </h3>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleCopy(caseItem.trackingId, 'case-archived', caseItem._id, e)}
                          className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm flex items-center justify-center"
                          title="Copy Tracking ID"
                        >
                          {copiedText === `case-archived-${caseItem._id}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleCopy(caseItem.clientName || caseItem.clientId, 'client-archived', caseItem._id, e)}
                          className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm flex items-center justify-center"
                          title="Copy Client Name"
                        >
                          {copiedText === `client-archived-${caseItem._id}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                      {/* Case Details */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Visa Type</label>
                          <span className="text-xs font-bold text-slate-700">{caseItem.visaType || 'N/A'}</span>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Destination</label>
                          <span className="text-xs font-bold text-slate-700">{caseItem.targetCountry || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Approved On</label>
                          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {caseItem.approvedAt 
                              ? new Date(caseItem.approvedAt).toLocaleString() 
                              : new Date(caseItem.updatedAt).toLocaleString()
                            }
                          </span>
                        </div>
                      </div>

                      {/* Documents Checklist Summary */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Documents Summary</h4>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                          {caseItem.documents && caseItem.documents.length > 0 ? (
                            caseItem.documents.map((doc, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white border border-slate-100 rounded-xl">
                                <span className="font-medium text-slate-600 truncate max-w-[160px]">{doc.documentName}</span>
                                {doc.fileUrl ? (
                                  <a 
                                    href={doc.fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                                  >
                                    View
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No upload</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic ml-1">No documents listed</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        {/* Change Stage Dropdown */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Revert Stage</label>
                          <div className="relative">
                            <select 
                              value={caseItem.pipelineStage} 
                              onChange={(e) => handleStageChange(caseItem._id, e.target.value)}
                              className="appearance-none w-full text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all cursor-pointer"
                            >
                              {KANBAN_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-blue-500 pointer-events-none" />
                          </div>
                        </div>

                        {/* Open Review Modal & Delete Buttons */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedCase(caseItem)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            Manage Documents
                          </button>
                          
                          {isCEO && (
                            <button 
                              onClick={() => handleDeleteCase(caseItem._id, caseItem.trackingId)}
                              className="flex items-center justify-center p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors"
                              title="Delete Case"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            {cases.filter(c => {
              const matchesArchive = isApprovedOlderThan24Hours(c);
              const matchesSearch = c.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    c.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (c.clientName && c.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
              return matchesArchive && matchesSearch;
            }).length === 0 && (
              <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No Archived Cases Found</h3>
                <p className="text-sm text-slate-500 max-w-md">There are no approved cases older than 24 hours matching your search criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Verification Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">Case Review: {selectedCase.trackingId}</h2>
                  <button
                    onClick={(e) => handleCopy(selectedCase.trackingId, 'modal-case', selectedCase._id, e)}
                    className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm inline-flex items-center justify-center"
                    title="Copy Tracking ID"
                  >
                    {copiedText === `modal-case-${selectedCase._id}` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-slate-500 font-medium text-sm flex items-center gap-2 flex-wrap">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-slate-400" /> Client: {selectedCase.clientName}{selectedCase.leadCode ? ` (${selectedCase.leadCode})` : ''}
                  </span>
                  <button
                    onClick={(e) => handleCopy(selectedCase.clientName || selectedCase.clientId, 'modal-client', selectedCase._id, e)}
                    className="p-1 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm inline-flex items-center justify-center text-xs"
                    title="Copy Client Name"
                  >
                    {copiedText === `modal-client-${selectedCase._id}` ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCase(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                Document Verification
              </h3>

              <div className="space-y-4">
                {selectedCase.documents?.map((doc, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Document Info */}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-slate-800">{doc.documentName}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            doc.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                            doc.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                            doc.status === 'Pending Review' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium inline-flex items-center">
                            View Uploaded File
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400 italic">No file uploaded yet</span>
                        )}
                      </div>

                      {/* Verification Actions */}
                      {doc.status === 'Pending Review' && (
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                          <button 
                            onClick={() => handleVerifyDocument(selectedCase._id, doc.documentName, 'Approved')}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-200 transition-colors"
                          >
                            <Check className="w-4 h-4 mr-1.5" /> Approve
                          </button>
                          
                          <div className="flex-1 sm:flex-none flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Reason for rejection..."
                                className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300 flex-1 min-w-[200px]"
                                value={rejectionReasons[doc.documentName] || ''}
                                onChange={(e) => setRejectionReasons(prev => ({ ...prev, [doc.documentName]: e.target.value }))}
                              />
                              <button 
                                onClick={() => handleVerifyDocument(selectedCase._id, doc.documentName, 'Rejected')}
                                className="inline-flex items-center justify-center px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm rounded-xl border border-rose-200 transition-colors"
                              >
                                <XCircle className="w-4 h-4 mr-1.5" /> Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {doc.status === 'Rejected' && (
                        <div className="w-full md:w-auto p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm">
                          <strong className="text-rose-900 block mb-1">Reason:</strong>
                          <span className="text-rose-700">{doc.rejectionReason}</span>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;
