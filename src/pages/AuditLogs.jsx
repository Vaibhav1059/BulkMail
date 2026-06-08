import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  FileText,
  Search,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';

export const AuditLogs = () => {
  const { auditLogs } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Success' | 'Warning' | 'Failed'

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded text-[10px] uppercase">
            <CheckCircle size={10} className="text-emerald-500" /> Success
          </span>
        );
      case 'Warning':
        return (
          <span className="inline-flex items-center gap-1 text-amber-750 font-bold bg-amber-50 border border-amber-150 px-2 py-0.5 rounded text-[10px] uppercase">
            <AlertTriangle size={10} className="text-amber-500" /> Warning
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 text-rose-705 font-bold bg-rose-50 border border-rose-150 px-2 py-0.5 rounded text-[10px] uppercase">
            <XCircle size={10} className="text-rose-500" /> Failed
          </span>
        );
      default:
        return (
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase">
            {status}
          </span>
        );
    }
  };

  const handleExport = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `aerosend_audit_logs_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export logs: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Audit Logs</h1>
          <p className="text-sm text-slate-500">View chronological system activities and logs for compliance tracking.</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 py-2 px-3 bg-white border border-slate-205 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold shadow-sm transition-all duration-300"
        >
          <Download size={12} /> Export Logs (JSON)
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action or user..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
          />
        </div>

        {/* Status toggles */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {['All', 'Success', 'Warning', 'Failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all duration-300 ${
                statusFilter === status
                  ? 'bg-indigo-600 border-indigo-550 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-850 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="pb-3 px-3">Timestamp</th>
                <th className="pb-3 px-3">User Profile</th>
                <th className="pb-3 px-3">Action Description</th>
                <th className="pb-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-405 italic">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {log.user}
                    </td>
                    <td className="py-3 px-3">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {getStatusBadge(log.status)}
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
};
export default AuditLogs;
