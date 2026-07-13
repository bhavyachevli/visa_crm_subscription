import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, ShieldCheck, Clock, Search, ArrowLeft } from 'lucide-react';

const ClientPortal = () => {
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axios.get(`/api/immigration/public/cases/${encodeURIComponent(searchId.trim())}`);
      setCaseDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch case details', error);
      if (error.response && error.response.status === 404) {
        setErrorMsg("No application found with that reference number. Please check your ID and try again.");
      } else {
        setErrorMsg("An error occurred while searching. Please try again later.");
      }
      setCaseDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentName, file) => {
    if (!file) return;
    setUploadingDoc(documentName);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`/api/immigration/public/cases/${caseDetails._id}/documents/${documentName}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.status === 200) {
        setCaseDetails(prev => ({
          ...prev,
          documents: prev.documents.map(doc => 
            doc.documentName === documentName 
              ? { ...doc, status: 'Pending Review', fileUrl: response.data.url }
              : doc
          )
        }));
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  return (
    <div>
      <div className="max-w-5xl mx-auto">
        
        {/* Track Application Hero (Shown when no case is loaded) */}
        {!caseDetails && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-100/60 relative p-10 sm:p-16 text-center max-w-2xl mx-auto mt-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
            
            <ShieldCheck className="w-20 h-20 text-indigo-500 mx-auto mb-6" />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight mb-4">Track Your Application</h1>
            <p className="text-slate-500 text-lg mb-8">Enter your Application Reference Number to securely access your document checklist and upload files.</p>
            
            <form onSubmit={handleSearch} className="relative max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-4 w-6 h-6 text-slate-400" />
                <input 
                  type="text" 
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="e.g. CASE-2026..."
                  className="w-full pl-14 pr-32 py-4 rounded-2xl border-2 border-indigo-100 bg-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-lg text-slate-800 shadow-sm"
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center shadow-md shadow-indigo-200"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : 'Track'}
                </button>
              </div>
              {errorMsg && (
                <p className="text-rose-500 text-sm font-bold mt-4 bg-rose-50 py-2 rounded-lg border border-rose-100 animate-pulse">{errorMsg}</p>
              )}
            </form>
          </div>
        )}

        {/* Dashboard View (Shown when case is loaded) */}
        {caseDetails && (
          <>
            <button 
              onClick={() => { setCaseDetails(null); setSearchId(''); }}
              className="mb-6 flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </button>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-100/60 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
              <div className="p-8 sm:p-10 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="text-indigo-600 w-8 h-8" />
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">Client Portal</h1>
                </div>
                <p className="text-slate-500 text-lg font-medium">Secure Document Upload Center</p>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
                      <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Application Reference</p>
                      <p className="text-lg font-bold text-slate-800 font-mono">{caseDetails.trackingId}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 shadow-inner">
                      <p className="text-xs uppercase font-bold text-indigo-400 tracking-wider mb-1">Current Stage</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <p className="text-lg font-bold text-indigo-900">{caseDetails.pipelineStage}</p>
                      </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Required Documents</h2>
              <span className="text-sm font-medium text-slate-500 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200">
                {caseDetails.documents?.filter(d => d.status === 'Approved').length || 0} of {caseDetails.documents?.length || 0} Approved
              </span>
            </div>

            <div className="space-y-5">
              {caseDetails.documents?.map((doc, index) => {
                const isApproved = doc.status === 'Approved';
                const isRejected = doc.status === 'Rejected';
                const isPendingUpload = doc.status === 'Pending Upload';
                
                return (
                <div key={index} className={`group bg-white rounded-3xl p-6 sm:p-8 border shadow-sm hover:shadow-xl transition-all duration-300 ease-out flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden ${
                  isApproved ? 'border-emerald-200 bg-emerald-50/20' : 
                  isRejected ? 'border-rose-200 bg-rose-50/20' : 
                  'border-slate-200'
                }`}>
                  
                  <div className={`absolute top-0 left-0 w-2 h-full transition-all duration-500 ${
                    isApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-amber-400'
                  }`}></div>

                  <div className="pl-3 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-800">{doc.documentName}</h3>
                      {doc.isMandatory ? (
                        <span className="px-3 py-1 text-[10px] uppercase font-extrabold tracking-widest text-rose-700 bg-rose-100 rounded-full">Required</span>
                      ) : (
                        <span className="px-3 py-1 text-[10px] uppercase font-extrabold tracking-widest text-slate-500 bg-slate-100 rounded-full border border-slate-200">Optional</span>
                      )}
                    </div>
                    
                    <div className="flex items-center mt-3">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isApproved ? 'text-emerald-700 bg-emerald-100' : 
                        isRejected ? 'text-rose-700 bg-rose-100' : 
                        isPendingUpload ? 'text-amber-700 bg-amber-100' : 'text-blue-700 bg-blue-100'
                      }`}>
                        {isApproved && <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                        {isRejected && <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />}
                        {(!isApproved && !isRejected) && <Clock className="w-3.5 h-3.5 mr-1.5" />}
                        {doc.status}
                      </div>
                    </div>
                    
                    {isRejected && doc.rejectionReason && (
                      <div className="mt-4 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-2xl flex items-start gap-3 shadow-inner">
                        <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold mb-0.5 text-rose-900">Agent Feedback</p>
                          <p className="text-rose-700 leading-relaxed">{doc.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    {(isPendingUpload || isRejected) ? (
                      <label className={`relative cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl shadow-sm text-sm font-bold transition-all duration-300 transform active:scale-95 ${
                        uploadingDoc === doc.documentName 
                          ? 'bg-indigo-300 text-white cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200/50 hover:shadow-lg text-white'
                      }`}>
                        {uploadingDoc === doc.documentName ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Uploading...
                          </span>
                        ) : (
                          <>
                            <UploadCloud className="w-5 h-5" />
                            Select File
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(doc.documentName, e.target.files[0])}
                          disabled={uploadingDoc === doc.documentName}
                        />
                      </label>
                    ) : (
                      <a href={doc.fileUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-2xl shadow-sm text-sm font-bold text-slate-700 transition-all duration-300">
                        <FileText className="w-5 h-5 text-slate-400" />
                        View Document
                      </a>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientPortal;
