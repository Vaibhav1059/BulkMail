import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import {
  LayoutDashboard,
  MailPlus,
  UploadCloud,
  FileCode,
  Eye,
  Activity,
  BarChart3,
  FileText,
  Users,
  Settings as SettingsIcon,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout = ({ children }) => {
  const { users, settings } = useContext(AppContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Standard static profile details for the user
  const currentProfile = {
    name: 'Alexander Wright',
    email: 'alex@enterprise.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Create Campaign', path: '/campaigns/new', icon: MailPlus },
    { name: 'CSV Upload & Mapping', path: '/csv-upload', icon: UploadCloud },
    { name: 'Template Builder', path: '/template-builder', icon: FileCode },
    { name: 'Manage Templates', path: '/templates', icon: Layers },
    { name: 'Preview Campaign', path: '/preview', icon: Eye },
    { name: 'Sending Monitor', path: '/sending-monitor', icon: Activity },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Audit Logs', path: '/audit-logs', icon: FileText },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const getPageTitle = () => {
    const item = navItems.find(nav => nav.path === location.pathname);
    return item ? item.name : 'Bulk Mail Platform';
  };

  const mockNotifications = [
    { id: 1, text: 'Campaign "Q3 Newsletter" completed successfully.', time: '2 hrs ago', type: 'success' },
    { id: 2, text: 'SMTP server configuration validation passed.', time: '4 hrs ago', type: 'info' },
    { id: 3, text: 'Operator uploaded a new CSV file (320 entries).', time: '1 day ago', type: 'info' }
  ];

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 260 }}
        className="hidden md:flex flex-col h-full bg-slate-50 border-r border-slate-200/80 backdrop-blur-xl relative z-20"
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 h-16 border-b border-slate-200/80">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-glow-indigo">
                A
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800">
                AeroSend
              </span>
            </motion.div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white mx-auto shadow-glow-indigo">
              A
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors absolute -right-3 top-4 border border-slate-200 bg-white"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <div key={item.path} className="relative group">
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 text-sm ${
                    isActive
                      ? 'bg-indigo-50 border-l-2 border-indigo-600 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/30 border-l-2 border-transparent'
                  }`}
                >
                  <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer Display */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-100/50 text-center">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 text-left">
              <img
                src={currentProfile.avatar}
                alt={currentProfile.name}
                className="w-9 h-9 rounded-full border border-slate-200 object-cover"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 truncate">{currentProfile.name}</p>
                <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded">
                  Administrator
                </span>
              </div>
            </div>
          ) : (
            <img
              src={currentProfile.avatar}
              alt={currentProfile.name}
              className="w-8 h-8 rounded-full border border-slate-200 object-cover mx-auto"
            />
          )}
        </div>
      </motion.aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 hidden md:block">
              {getPageTitle()}
            </h2>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-250 px-2.5 py-1 rounded-full text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
              <CheckCircle2 size={12} className="inline mr-1 text-emerald-500" /> SMTP: Active
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-650 shadow-glow-indigo" />
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-45"
                    >
                      <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">Notifications</span>
                        <span className="text-[10px] text-indigo-600 cursor-pointer hover:underline">Mark read</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {mockNotifications.map(n => (
                          <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                            <p className="text-xs text-slate-650">{n.text}</p>
                            <span className="text-[9px] text-slate-400 mt-1 block">{n.time}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img
                src={currentProfile.avatar}
                alt={currentProfile.name}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
              />
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-xs font-semibold text-slate-700">{currentProfile.name}</p>
                <span className="text-[9px] text-slate-400">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="relative z-10"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
export default Layout;
