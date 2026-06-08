import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  Mail,
  Send,
  AlertOctagon,
  Calendar,
  Trash2,
  Play,
  TrendingUp,
  Plus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsData } from '../utils/mockData';

export const Dashboard = () => {
  const { campaigns, deleteCampaign, currentUserRole, settings } = useContext(AppContext);
  const navigate = useNavigate();

  // Compute Stats
  const totalCampaigns = campaigns.length;
  const totalEmailsSent = campaigns.reduce((acc, curr) => acc + curr.sentCount, 0);
  const failedEmails = campaigns.reduce((acc, curr) => acc + curr.failedCount, 0);
  const scheduledCampaigns = campaigns.filter(c => c.status === 'Scheduled').length;

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

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Welcome Back</h1>
          <p className="text-sm text-slate-500">Here is what is happening with your campaigns today.</p>
        </div>
        
        {/* Create campaign quick button - restricted to Admin & Manager */}
        <Protected allowedRoles={['Admin', 'Manager']} fallback="hide">
          <Link
            to="/campaigns/new"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-550 hover:to-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Plus size={16} /> Create Campaign
          </Link>
        </Protected>
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
              <TrendingUp size={10} /> Active templates
            </p>
          </div>
        </div>

        {/* Total Emails Sent */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-350 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/30 rounded-full blur-2xl group-hover:bg-emerald-55/40 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emails Sent</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <Send size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-850">{totalEmailsSent.toLocaleString()}</h3>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp size={10} /> 99.4% Delivery rate
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
            <h3 className="text-2xl font-bold text-slate-855">{failedEmails}</h3>
            <p className="text-[10px] text-rose-600 mt-1 font-medium">
              Requires validation checks
            </p>
          </div>
        </div>

        {/* Scheduled Campaigns */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-350 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/30 rounded-full blur-2xl group-hover:bg-amber-55/40 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-850">{scheduledCampaigns}</h3>
            <p className="text-[10px] text-amber-600 mt-1 font-medium">
              Automated triggers
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
                  {recentCampaigns.map((camp) => {
                    const progress = camp.recipientsCount > 0 
                      ? Math.min(100, Math.round(((camp.sentCount + camp.failedCount) / camp.recipientsCount) * 100))
                      : 0;

                    return (
                      <tr key={camp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-2 font-medium text-slate-800">
                          <div className="font-semibold text-slate-850">{camp.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]" title={camp.subject}>
                            {camp.subject}
                          </div>
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

                          <Protected allowedRoles={['Admin']} fallback="hide">
                            <button
                              onClick={() => deleteCampaign(camp.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded border border-rose-100 transition-all duration-300"
                              title="Delete Campaign"
                            >
                              <Trash2 size={12} />
                            </button>
                          </Protected>
                        </td>
                      </tr>
                    );
                  })}
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
            <span className="text-slate-500">SMTP Server</span>
            <span className="text-slate-700 font-mono text-[11px] font-semibold">{settings.smtp.host || 'Local Mock'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
