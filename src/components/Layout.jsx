import React, { useState, useContext, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('notif_read_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const bellRef = useRef(null);
  const [bellPos, setBellPos] = useState({ top: 0, right: 0 });

  const location = useLocation();
  const navigate = useNavigate();

  // Standard static profile details for the user
  const currentProfile = {
    name: 'Vaibhav Soni',
    email: 'vaibhav@example.com',
    avatar: '/vaibhav_avatar.png'
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
    { id: 1, text: 'Campaign "Q3 Newsletter" completed successfully.', time: '2 hrs ago', type: 'success', path: '/sending-monitor' },
    { id: 2, text: 'SMTP server configuration validation passed.', time: '4 hrs ago', type: 'info', path: '/settings' },
    { id: 3, text: 'Operator uploaded a new CSV file (320 entries).', time: '1 day ago', type: 'info', path: '/csv-upload' }
  ];

  // Only show unread notifications in the panel
  const visibleNotifications = mockNotifications.filter(n => !readIds.has(n.id));

  const unreadCount = visibleNotifications.length;

  const markAllRead = () => {
    const allIds = new Set(mockNotifications.map(n => n.id));
    setReadIds(allIds);
    localStorage.setItem('notif_read_ids', JSON.stringify([...allIds]));
    setShowNotifications(false);
  };

  const handleNotifClick = (n) => {
    // Mark as read
    setReadIds(prev => {
      const next = new Set([...prev, n.id]);
      localStorage.setItem('notif_read_ids', JSON.stringify([...next]));
      return next;
    });
    // Navigate to relevant page
    setShowNotifications(false);
    navigate(n.path);
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-full bg-slate-50 border-r border-slate-200/80 backdrop-blur-xl flex-shrink-0 relative z-30 overflow-visible"
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between px-3 h-16 border-b border-slate-200/80">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-glow-indigo">
                A
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800 truncate">
                AeroSend
              </span>
            </motion.div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white mx-auto shadow-glow-indigo flex-shrink-0">
              A
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 ml-auto text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-all border border-slate-200 bg-white shadow-sm"
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 text-sm ${isActive
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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 min-w-0">
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
                ref={bellRef}
                onClick={() => {
                  if (!showNotifications && bellRef.current) {
                    const rect = bellRef.current.getBoundingClientRect();
                    setBellPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                  }
                  setShowNotifications(prev => !prev);
                }}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-sm animate-pulse" />
                )}
              </button>

              {showNotifications && createPortal(
                <>
                  {/* Backdrop */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                    onClick={() => setShowNotifications(false)}
                  />
                  {/* Dropdown */}
                  <div
                    style={{
                      position: 'fixed',
                      top: bellPos.top,
                      right: bellPos.right,
                      zIndex: 9999,
                      width: '320px',
                    }}
                  >
                    <AnimatePresence>
                      <motion.div
                        key="notif-panel"
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Bell size={13} className="text-indigo-500" />
                            <span className="text-xs font-semibold text-slate-700">Notifications</span>
                            {unreadCount > 0 && (
                              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                          </div>
                          <button
                            onClick={markAllRead}
                            className={`text-[10px] font-semibold cursor-pointer transition-colors ${
                              unreadCount > 0
                                ? 'text-indigo-600 hover:underline'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                            disabled={unreadCount === 0}
                          >
                            Mark all read
                          </button>
                        </div>
                        <div className="divide-y divide-slate-100 overflow-y-auto" style={{ maxHeight: '288px' }}>
                          {visibleNotifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <div className="text-2xl mb-2">✅</div>
                              <p className="text-xs font-semibold text-slate-500">All caught up!</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">No new notifications</p>
                            </div>
                          ) : (
                            visibleNotifications.map(n => (
                              <div
                                key={n.id}
                                onClick={() => handleNotifClick(n)}
                                className="px-4 py-3 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    n.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-400'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-700 leading-snug group-hover:text-indigo-700 transition-colors">{n.text}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[9px] text-slate-400">{n.time}</span>
                                      <span className="text-[9px] text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {visibleNotifications.length > 0 && (
                          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-center">
                            <span className="text-[10px] text-slate-400">{visibleNotifications.length} unread notification{visibleNotifications.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>,
                document.body
              )}
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
