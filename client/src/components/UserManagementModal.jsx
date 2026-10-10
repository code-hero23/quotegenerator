import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, UserPlus, Users, Trash2, CheckCircle2, AlertCircle, 
  ShieldCheck, Compass, Phone, Mail, Key, User, Loader2 
} from 'lucide-react';

export default function UserManagementModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New User Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    contactNumber: '',
    email: '',
    role: 'architect'
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      if (res.data && res.data.data) {
        setUsers(res.data.data);
      }
    } catch (err) {
      setError('Failed to fetch user accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.username.trim() || !formData.password.trim() || !formData.name.trim()) {
      setError('Please provide Full Name, Username, and Password.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await axios.post('/api/users', {
        ...formData,
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim(),
        role: 'architect'
      });

      if (res.data && res.data.success) {
        setSuccessMsg(`Feasibility Architect "${formData.name}" created successfully! They can now log in.`);
        setFormData({
          name: '',
          username: '',
          password: '',
          contactNumber: '',
          email: '',
          role: 'architect'
        });
        fetchUsers();
      } else {
        throw new Error(res.data.error || 'Failed to create user');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error creating user.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to remove architect account "${username}"?`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/users/${userId}`);
      if (res.data && res.data.success) {
        setSuccessMsg(`Architect account "${username}" removed.`);
        fetchUsers();
      }
    } catch (err) {
      setError('Failed to remove account: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!isOpen) return null;

  const architects = users.filter(u => u.role === 'architect');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-sm shadow-amber-500/20 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-xl font-bold text-slate-900 font-['Outfit'] truncate">
                  User & Architect Management
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Provision login credentials for Feasibility Architects and govern system access.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-700 text-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="font-bold underline ml-2">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="font-bold underline ml-2">Dismiss</button>
          </div>
        )}

        {/* Content Body: Split into Create Form & User List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Create New Architect Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>Register New Feasibility Architect</span>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Full Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arun Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input text-xs pl-8 py-2"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Login Username *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. arun_arch"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="form-input text-xs pl-8 py-2"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. arch123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input text-xs py-2"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 98765 43210"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      className="form-input text-xs pl-8 py-2"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="e.g. arun@cookscape.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input text-xs pl-8 py-2"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-gold w-full py-2.5 text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create Architect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Existing Users List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active System Users ({users.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                {architects.length} Feasibility Architects • {admins.length} Admin
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading user accounts...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {users.map((user) => {
                  const isAdmin = user.role === 'admin';
                  return (
                    <div
                      key={user.id}
                      className="p-4 rounded-xl bg-white border border-slate-200 flex items-start justify-between shadow-2xs hover:border-amber-300 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`p-1.5 rounded-lg ${isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
                            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
                          </span>
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {user.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isAdmin 
                              ? 'bg-amber-50 text-amber-800 border-amber-200' 
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}>
                            {isAdmin ? 'Administrator' : 'Feasibility Architect'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-slate-500 pt-1">
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Username:</span>
                            <span className="font-mono font-medium text-slate-800">{user.username}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Contact:</span>
                            <span className="font-medium text-slate-800 truncate block">{user.contactNumber || 'N/A'}</span>
                          </div>
                          {user.email && (
                            <div className="col-span-2 pt-0.5">
                              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Email:</span>
                              <span className="font-medium text-slate-800 truncate block">{user.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-2 shrink-0"
                          title="Remove Architect Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Feasibility Architects can only view quotations generated by their account.</span>
          <button
            onClick={onClose}
            className="btn-secondary py-1.5 px-4 text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
