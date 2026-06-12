import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppContext } from '../context/AppContext';
import {
  LayoutDashboard,
  MailPlus,
  UploadCloud,
  Activity,
  BarChart3,
  FileText,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  CheckCircle2,
  Layers,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout = ({ children }) => {
  const { currentUser, token, logout } = useContext(AppContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('notif_read_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const bellRef = useRef(null);
  const [bellPos, setBellPos] = useState({ top: 0, right: 0 });

  const [collapsedGroups, setCollapsedGroups] = useState({
    campaigns: false,
    audience: false,
    templates: false,
    system: false,
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Redirect to login if not authenticated and not on login page
  useEffect(() => {
    if (!token && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [token, location.pathname, navigate]);

  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  const profileName = currentUser?.name || 'Vaibhav Soni';
  const profileAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
  const profileRole = currentUser?.role || 'Administrator';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Send Campaign', path: '/campaigns/new', icon: MailPlus },
    { name: 'Templates Hub', path: '/templates', icon: Layers },
    { name: 'Activity Logs', path: '/audit-logs', icon: FileText },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const getPageTitle = () => {
    const item = navItems.find(nav => nav.path === location.pathname);
    return item ? item.name : 'Bulk Mail Platform';
  };

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const mockNotifications = [
    { id: 1, text: 'Campaign "Q3 Newsletter" completed successfully.', time: '2 hrs ago', type: 'success', path: '/sending-monitor' },
    { id: 2, text: 'SMTP server configuration validation passed.', time: '4 hrs ago', type: 'info', path: '/settings' },
    { id: 3, text: 'Operator uploaded a new CSV file (320 entries).', time: '1 day ago', type: 'info', path: '/csv-upload' }
  ];

  const visibleNotifications = mockNotifications.filter(n => !readIds.has(n.id));
  const unreadCount = visibleNotifications.length;

  const markAllRead = () => {
    const allIds = new Set(mockNotifications.map(n => n.id));
    setReadIds(allIds);
    localStorage.setItem('notif_read_ids', JSON.stringify([...allIds]));
    setShowNotifications(false);
  };

  const handleNotifClick = (n) => {
    setReadIds(prev => {
      const next = new Set([...prev, n.id]);
      localStorage.setItem('notif_read_ids', JSON.stringify([...next]));
      return next;
    });
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
        <div className="flex items-center justify-between py-3 px-3 h-16 border-b border-slate-200/80">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-glow-indigo">
                A
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800 truncate py-4">
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
        <nav className="flex-1 px-3 py-3 space-y-2.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <div key={item.path} className="relative group">
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-xs ${isActive
                    ? 'bg-indigo-50 border-l-2 border-indigo-600 text-indigo-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/30 border-l-2 border-transparent'
                    }`}
                >
                  <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate font-medium">{item.name}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer Display */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-100/50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-9 h-9 rounded-full border border-slate-200 object-cover flex-shrink-0"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-800 truncate">{profileName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <img
                src={profileAvatar}
                alt={profileName}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover mx-auto"
              />
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors"
                title="Sign Out"
              >
                <LogOut size={12} />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white md:bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only (hidden on md+ where sidebar is always visible) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
              title="Open Navigation"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm md:text-lg font-bold text-slate-800">
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
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                    onClick={() => setShowNotifications(false)}
                  />
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
                            <span className="text-xs font-semibold text-slate-707">Notifications</span>
                            {unreadCount > 0 && (
                              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-650 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                          </div>
                          <button
                            onClick={markAllRead}
                            className={`text-[10px] font-semibold cursor-pointer transition-colors ${unreadCount > 0
                              ? 'text-indigo-600 hover:underline'
                              : 'text-slate-305 cursor-not-allowed'
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
                                  <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-400'
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
                src={profileAvatar}
                alt={profileName}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
              />
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-xs font-semibold text-slate-700">{profileName}</p>
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

      {/* Mobile navigation menu drawer */}
      {createPortal(
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 md:hidden"
              />
              {/* Drawer Panel */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-slate-50 border-r border-slate-200 shadow-2xl z-50 flex flex-col md:hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-glow-indigo">
                      A
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-800 py-4">
                      AeroSend
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 bg-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-2.5 overflow-y-auto custom-scrollbar">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-xs ${isActive
                          ? 'bg-indigo-50 border-l-2 border-indigo-600 text-indigo-700 font-semibold shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/30'
                          }`}
                      >
                        <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
                {/* Profile Footer */}
                <div className="p-4 border-t border-slate-200/80 bg-slate-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={profileAvatar}
                      alt={profileName}
                      className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-800 truncate">{profileName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
export default Layout;
