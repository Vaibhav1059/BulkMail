import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ShieldAlert } from 'lucide-react';

export const Protected = ({ allowedRoles, children, fallback = 'page' }) => {
  const { currentUserRole, setCurrentUserRole } = useContext(AppContext);

  const hasAccess = allowedRoles.includes(currentUserRole);

  if (hasAccess) {
    return children;
  }

  // Fallback behavior
  if (fallback === 'hide') {
    return null;
  }

  if (fallback === 'disable') {
    return (
      <div className="relative cursor-not-allowed group">
        <div className="absolute inset-0 bg-slate-950/10 backdrop-blur-[1px] rounded-lg z-10" />
        <div className="pointer-events-none opacity-40">
          {children}
        </div>
      </div>
    );
  }

  // Page level access denied screen
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-rose-50 border border-rose-100 text-rose-500 mb-6">
        <ShieldAlert size={40} />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Access Restricted</h1>
      <p className="text-slate-500 max-w-md mt-2 text-sm">
        Your current role (<span className="text-indigo-650 font-semibold">{currentUserRole}</span>) does not have permission to view this panel. Please contact your system administrator or toggle roles.
      </p>

      {/* Role Toggle panel inside access denied screen for quick testing */}
      <div className="mt-8 p-6 bg-white border border-slate-200 rounded-xl max-w-sm w-full shadow-sm">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Demo Role Switcher</p>
        <div className="grid grid-cols-3 gap-2">
          {['Admin', 'Manager', 'Operator'].map((role) => (
            <button
              key={role}
              onClick={() => setCurrentUserRole(role)}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all duration-300 ${
                currentUserRole === role
                  ? 'bg-indigo-600 border-indigo-550 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-850 hover:bg-slate-50'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Protected;
