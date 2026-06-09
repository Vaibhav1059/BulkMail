import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import {
  Mail,
  Send,
  AlertOctagon,
  Calendar,
  CalendarX,
  Trash2,
  Play,
  TrendingUp,
  Plus,
  CheckCircle,
  Activity,
  Edit2,
  X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsData } from '../utils/mockData';

export const Dashboard = () => {
  const { campaigns, deleteCampaign, cancelCampaignSchedule, updateCampaignSchedule, settings, auditLogs } = useContext(AppContext);
  const navigate = useNavigate();

  const [rescheduleCampaign, setRescheduleCampaign] = useState(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Compute live Stats
  const totalCampaigns = campaigns.length;
  const totalSuccess = campaigns.reduce((acc, curr) => acc + curr.sentCount, 0);
  const totalFailed = campaigns.reduce((acc, curr) => acc + curr.failedCount, 0);
  const totalEmailsSent = totalSuccess + totalFailed;
  const scheduledCampaigns = campaigns.filter(c => c.status === 'Scheduled').length;

  // Filter out soft-deleted logs and take the 5 most recent
  const activeLogs = auditLogs.filter(log => !log.deletedAt);
  const recentLogs = activeLogs.slice(0, 5);

  // Recent 5 campaigns
  const recentCampaigns = campaigns.slice(0, 5);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Sending':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse';
      case 'Scheduled':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const deliveryRate = totalEmailsSent > 0 
    ? Math.round((totalSuccess / totalEmailsSent) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Welcome Back</h1>
          <p className="text-sm text-slate-500">Here is what is happening with your campaigns today.</p>
        </div>
        
        {/* Create campaign quick button */}
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-550 hover:to-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <Plus size={16} /> Create Campaign
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Campaigns */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-350 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/30 rounded-full blur-2xl group-hover:bg-indigo-55/40 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Campaigns</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Mail size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-850">{totalCampaigns}</h3>
            <p className="text-[10px] text-indigo-600 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp size={10} /> Active platform campaigns
            </p>
          </div>
        </div>

        {/* Total Emails Sent */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-350 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/30 rounded-full blur-2xl group-hover:bg-indigo-55/40 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emails Attempted</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Send size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-850">{totalEmailsSent.toLocaleString()}</h3>
            <p className="text-[10px] text-indigo-650 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp size={10} /> Live dispatch volume
            </p>
          </div>
        </div>

        {/* Success Sends */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-350 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/30 rounded-full blur-2xl group-hover:bg-emerald-55/40 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Successful Sends</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-850">{totalSuccess.toLocaleString()}</h3>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp size={10} /> {deliveryRate}% Success rate
            </p>
          </div>
        </div>

        {/* Failed Emails */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-350 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/30 rounded-full blur-2xl group-hover:bg-rose-55/40 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed / Bounces</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
              <AlertOctagon size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-855">{totalFailed.toLocaleString()}</h3>
            <p className="text-[10px] text-rose-600 mt-1 font-medium">
              Requires validation checks
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Campaigns & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Recent Campaigns</h3>
              <Link to="/audit-logs" className="text-xs text-indigo-600 hover:underline font-medium">View activity logs</Link>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-205 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pr-2">Campaign</th>
                    <th className="pb-3 px-2">Recipients</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2">Delivery Progress</th>
                    <th className="pb-3 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">No campaigns found. Create one to get started!</td>
                    </tr>
                  ) : (
                    recentCampaigns.map((camp) => {
                      const progress = camp.recipientsCount > 0 
                        ? Math.min(100, Math.round(((camp.sentCount + camp.failedCount) / camp.recipientsCount) * 100))
                        : 0;

                      return (
                        <tr key={camp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-2 font-medium text-slate-800">
                            <div className="font-semibold text-slate-855">{camp.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]" title={camp.subject}>
                              {camp.subject}
                            </div>
                            {camp.status === 'Scheduled' && camp.scheduleDate && (
                              <div className="text-[9px] text-amber-600 font-semibold mt-1 flex items-center gap-1 bg-amber-50/50 border border-amber-200/40 px-1.5 py-0.5 rounded w-max">
                                <Calendar size={10} /> Send: {new Date(camp.scheduleDate).toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-600">
                            {camp.recipientsCount}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusStyle(camp.status)}`}>
                              {camp.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 w-[160px]">
                            <div className="flex items-center gap-2">
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                                  <div
                                    className={`h-full rounded-full ${
                                      camp.status === 'Completed'
                                        ? 'bg-emerald-500'
                                        : camp.status === 'Sending'
                                        ? 'bg-indigo-500'
                                        : camp.status === 'Scheduled'
                                        ? 'bg-amber-500'
                                        : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="font-mono text-slate-500 text-[10px]">{progress}%</span>
                            </div>
                          </td>
                          <td className="py-3 pl-2 text-right space-x-1">
                            {camp.status === 'Sending' && (
                              <button
                                onClick={() => navigate('/sending-monitor')}
                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded border border-indigo-100 transition-all duration-300"
                                title="Monitor Campaign"
                              >
                                <Play size={12} />
                              </button>
                            )}

                            {camp.status === 'Scheduled' && (
                              <button
                                onClick={() => {
                                  setRescheduleCampaign(camp);
                                  setNewScheduleDate(formatDateTimeLocal(camp.scheduleDate));
                                }}
                                className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-550 hover:text-white rounded border border-amber-100 transition-all duration-300"
                                title="Edit Schedule"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}

                            {camp.status === 'Scheduled' && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to cancel scheduling for campaign "${camp.name}"? This will return it to a Draft and release scheduled recipients.`)) {
                                    await cancelCampaignSchedule(camp.id);
                                  }
                                }}
                                className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded border border-amber-100 transition-all duration-300"
                                  title="Cancel Schedule"
                              >
                                <CalendarX size={12} />
                              </button>
                            )}

                            <button
                              onClick={() => deleteCampaign(camp.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded border border-rose-100 transition-all duration-300"
                              title="Delete Campaign"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mini Analytics Widget */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Email Outflow</h3>
              <Link to="/analytics" className="text-xs text-indigo-600 hover:underline font-medium">Full Analytics</Link>
            </div>
            <p className="text-xs text-slate-500 mb-4">Simulated sent and delivery trends for the past week.</p>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.weeklyPerformance} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    labelStyle={{ color: '#475569', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#0f172a', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" name="Sent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Active Gateway</span>
            <span className="text-slate-700 font-mono text-[11px] font-semibold">{settings.smtp.host || 'Local Mock'}</span>
          </div>
        </div>
      </div>

      {/* Upgraded Recent Audit Logs & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs (col-span-2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Recent Audit Activities</h3>
              <Link to="/audit-logs" className="text-xs text-indigo-650 hover:underline font-medium">Full Audit Logs</Link>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-205 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pr-2">Timestamp</th>
                    <th className="pb-3 px-2">User</th>
                    <th className="pb-3 px-2">Action</th>
                    <th className="pb-3 pl-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400 italic">No recent system activities logged.</td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-2 text-slate-500 font-mono">
                          {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-slate-700">
                          {log.user}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 truncate max-w-[280px]" title={log.action}>
                          {log.action}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            log.status === 'Success' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : log.status === 'Warning'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 mb-3">System Health & SMTP</h3>
            <p className="text-xs text-slate-500 mb-4">Real-time status of backend service APIs and connected email agents.</p>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Service API</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Optimal
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">SMTP Server</span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]" title={settings.smtp.host}>
                  {settings.smtp.host || 'Local Mock Service'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">SMTP Port</span>
                <span className="font-mono text-slate-700 font-semibold">{settings.smtp.port || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Encryption</span>
                <span className="font-semibold text-slate-705">{settings.smtp.encryption || 'TLS'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Delay Interval</span>
                <span className="font-mono text-indigo-650 font-bold">{settings.limits.delaySeconds}s / email</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <Link to="/settings" className="text-xs font-semibold text-indigo-600 hover:text-indigo-755 hover:underline">
              Manage Server Settings &rarr;
            </Link>
          </div>
        </div>
      </div>

      {rescheduleCampaign && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl relative text-left">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Reschedule Campaign</h3>
              <button
                type="button"
                onClick={() => setRescheduleCampaign(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Select a new date and time to send "<strong>{rescheduleCampaign.name}</strong>":
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">New Date & Time</label>
                <input
                  type="datetime-local"
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleCampaign(null)}
                  className="btn-secondary flex-1 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newScheduleDate) {
                      alert('Please select a valid date and time.');
                      return;
                    }
                    if (new Date(newScheduleDate) <= new Date()) {
                      alert('Please select a date and time in the future.');
                      return;
                    }
                    await updateCampaignSchedule(rescheduleCampaign.id, newScheduleDate);
                    setRescheduleCampaign(null);
                  }}
                  className="btn-primary flex-1 py-2 text-xs font-semibold"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
