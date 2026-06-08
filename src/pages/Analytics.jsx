import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  TrendingUp,
  Percent,
  CheckCircle,
  Eye,
  MailWarning
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { analyticsData } from '../utils/mockData';

export const Analytics = () => {
  const { campaigns } = useContext(AppContext);

  const { summary, weeklyPerformance, bounceReasons, deviceDistribution } = analyticsData;

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];

  return (
    <Protected allowedRoles={['Admin', 'Manager']}>
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Performance Analytics</h1>
          <p className="text-sm text-slate-500">Review email performance KPIs and engagement metrics.</p>
        </div>

        {/* Analytics KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Delivery Rate */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Rate</span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-705 border border-emerald-100">
                <CheckCircle size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-slate-850">{summary.deliveryRate}%</h3>
              <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-0.5 font-medium">
                +0.2% improvement this week
              </p>
            </div>
          </div>

          {/* Open Rate */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg. Open Rate</span>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700 border border-indigo-100">
                <Eye size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-slate-850">{summary.openRate}%</h3>
              <p className="text-[10px] text-indigo-650 mt-1 flex items-center gap-0.5 font-medium">
                Benchmark: 55.4% average
              </p>
            </div>
          </div>

          {/* Click Rate */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg. Click Rate</span>
              <div className="p-2 bg-violet-50 rounded-lg text-violet-700 border border-violet-100">
                <Percent size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-slate-850">{summary.clickRate}%</h3>
              <p className="text-[10px] text-violet-600 mt-1 font-medium">
                Active redirects validated
              </p>
            </div>
          </div>

          {/* Bounce Rate */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bounce Rate</span>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-700 border border-rose-100">
                <MailWarning size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-slate-850">{summary.bounceRate}%</h3>
              <p className="text-[10px] text-rose-600 mt-1 font-medium">
                Within healthy SaaS limit (&lt;2%)
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Opens vs Clicks LineChart */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Weekly Engagement Outflow</h3>
            
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyPerformance} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    labelStyle={{ color: '#475569', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#0f172a', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="opened" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} name="Opens" />
                  <Line type="monotone" dataKey="clicked" stroke="#ec4899" strokeWidth={3} name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Client device Distribution PieChart */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recipient Client Software</h3>
            
            <div className="h-56 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {deviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    itemStyle={{ color: '#0f172a', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mt-2 border-t border-slate-100 pt-3">
              {deviceDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate">{entry.name} ({entry.value}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bounce Reasons BarChart */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
              Bounce Breakdown <span className="text-[10px] text-slate-500 font-normal lowercase">(based on past 100 bounces)</span>
            </h3>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bounceReasons} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    itemStyle={{ color: '#0f172a', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} name="Bounce Occurrences">
                    {bounceReasons.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#ec4899'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
};
export default Analytics;
