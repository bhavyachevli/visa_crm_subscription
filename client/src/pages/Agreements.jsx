import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Upload, FileText } from 'lucide-react';

export default function Agreements() {
  const [agreements, setAgreements] = useState([]);
  const [regionFilter, setRegionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadData, setUploadData] = useState({ region: 'Canada', kind: 'University' });

  useEffect(() => {
    fetchAgreements();
  }, [regionFilter]);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const url = regionFilter ? `/api/agreements?region=${regionFilter}` : '/api/agreements';
      const res = await axios.get(url);
      setAgreements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    if (!e.target.files[0]) return;
    const fd = new FormData();
    fd.append('file', e.target.files[0]);
    fd.append('region', uploadData.region);
    fd.append('kind', uploadData.kind);
    
    try {
      await axios.post('/api/agreements', fd);
      alert('Agreement Uploaded successfully');
      fetchAgreements();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-pangaea-deep">University Agreements Repository</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6 flex items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700">Region</label>
          <select value={uploadData.region} onChange={e => setUploadData({...uploadData, region: e.target.value})} className="mt-1 border-slate-300 rounded py-1.5 px-3 border text-sm">
            <option value="Canada">Canada</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="Europe">Europe</option>
            <option value="Australia">Australia</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Kind</label>
          <select value={uploadData.kind} onChange={e => setUploadData({...uploadData, kind: e.target.value})} className="mt-1 border-slate-300 rounded py-1.5 px-3 border text-sm">
            <option value="University">University</option>
            <option value="College">College</option>
            <option value="Partner">Partner</option>
          </select>
        </div>
        <div className="flex-1"></div>
        <label className="cursor-pointer bg-sky-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-900 flex items-center shadow-md">
          <Upload className="w-4 h-4 mr-2"/> Upload Agreement
          <input type="file" className="hidden" onChange={handleUpload} accept="application/pdf" />
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sky-100 overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-pangaea-deep">Agreements Database</h3>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="border-slate-300 rounded py-1 px-3 border text-sm">
            <option value="">All Regions</option>
            <option value="Canada">Canada</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="Europe">Europe</option>
          </select>
        </div>
        
        {loading ? (
          <p className="text-sm text-slate-500 py-4">Loading agreements...</p>
        ) : agreements.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No agreements found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agreements.map(a => (
              <div key={a._id} className="border border-sky-100 rounded-lg p-4 bg-slate-50 flex items-start space-x-3">
                <FileText className="w-8 h-8 text-sky-600 mt-1 flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-semibold text-slate-800 truncate" title={a.originalFileName}>{a.originalFileName}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-medium bg-sky-200 text-sky-800 px-2 py-0.5 rounded">{a.region}</span>
                    <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{a.kind}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Added: {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
