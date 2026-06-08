import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  Users,
  UserPlus,
  UserCheck,
  Shield,
  ToggleLeft,
  ToggleRight,
  X,
  Mail,
  Trash2
} from 'lucide-react';

export const UserManagement = () => {
  const { users, addUser, updateUser, updateUserRole, toggleUserStatus, deleteUser } = useContext(AppContext);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // Current user being edited
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Operator' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) {
      alert('Please fill out all required fields.');
      return;
    }
    addUser(newUser.name, newUser.email, newUser.role);
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: 'Operator' });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingUser.name.trim() || !editingUser.email.trim()) {
      alert('Name and Email are required.');
      return;
    }
    updateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role
    });
    setEditingUser(null);
  };

  return (
    <Protected allowedRoles={['Admin']}>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">User Console Access</h1>
            <p className="text-sm text-slate-500">Configure roles, permissions, and status controls for team accounts.</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-2 px-3 text-xs"
          >
            <UserPlus size={14} /> Add User
          </button>
        </div>

        {/* User Card List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className={`bg-white border rounded-xl p-5 flex items-center justify-between transition-all duration-300 hover:border-slate-350 shadow-sm ${
                user.status === 'Inactive' ? 'opacity-60 border-slate-200' : 'border-slate-200'
              }`}
            >
              {/* Profile info */}
              <div className="flex items-center gap-4">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    {user.name}
                    {user.role === 'Admin' && (
                      <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-bold uppercase tracking-wider">
                        Superuser
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={10} className="text-slate-400" /> {user.email}</p>
                  
                  {/* Edit role switcher & Details edit */}
                  <div className="mt-3 flex items-center gap-3.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-450 font-bold uppercase">Role:</span>
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        disabled={user.id === '1'} // Admin account cannot change its own role for this demo
                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:border-indigo-650"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Operator">Operator</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      Edit Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Status toggle controls */}
              <div className="text-right flex flex-col items-end justify-between h-full space-y-4">
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                  user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {user.status}
                </span>

                <div className="flex gap-2">
                  <button
                    disabled={user.id === '1'} // Safeguard main admin
                    onClick={() => toggleUserStatus(user.id)}
                    className={`p-1.5 rounded-lg border transition-all duration-300 ${
                      user.status === 'Active'
                        ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-emerald-50/20'
                        : 'text-slate-400 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                  >
                    {user.status === 'Active' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>

                  <button
                    disabled={user.id === '1'} // Safeguard main admin
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete user ${user.name}?`)) {
                        deleteUser(user.id);
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition-all duration-300 ${
                      user.id === '1'
                        ? 'text-slate-200 border-slate-100 cursor-not-allowed bg-slate-50/50'
                        : 'text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white bg-rose-50/20'
                    }`}
                    title="Delete User"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ADD USER MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl relative">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X size={16} />
              </button>

              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <UserPlus size={16} className="text-indigo-650" /> Add Console User
              </h3>

              <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={newUser.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    placeholder="e.g. john@enterprise.com"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    required
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1">Assign Console Role</label>
                  <select
                    name="role"
                    value={newUser.role}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  >
                    <option value="Admin">Admin (Full privileges)</option>
                    <option value="Manager">Manager (Campaigns, Analytics, Logs)</option>
                    <option value="Operator">Operator (Sends campaigns & uploads CSV)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-primary w-full py-2 text-xs"
                  >
                    Add User Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl relative">
              <button
                onClick={() => setEditingUser(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X size={16} />
              </button>

              <h3 className="text-sm font-bold text-slate-805 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <UserCheck size={16} className="text-indigo-650" /> Edit User Profile
              </h3>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. john@enterprise.com"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    required
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Console Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                    disabled={editingUser.id === '1'} // Safeguard main Admin account
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  >
                    <option value="Admin">Admin (Full privileges)</option>
                    <option value="Manager">Manager (Campaigns, Analytics, Logs)</option>
                    <option value="Operator">Operator (Sends campaigns & uploads CSV)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-primary w-full py-2 text-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
};
export default UserManagement;
