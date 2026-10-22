import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, UserPlus, Users, Trash2, CheckCircle2, AlertCircle, 
  ShieldCheck, Compass, Phone, Mail, Key, User, Loader2,
  Pencil, Check, Briefcase, Layers, Building
} from 'lucide-react';

export const normalizeUserRole = (rawRole) => {
  if (!rawRole) return 'fa';
  const r = String(rawRole).trim().toLowerCase();
  if (r === 'admin' || r.includes('admin')) return 'admin';
  if (r === 'bh' || r === 'business_head' || r === 'businesshead' || r.includes('business')) return 'bh';
  if (r === 'la' || r === 'lead_architect' || r === 'leadarchitect' || r.includes('lead')) return 'la';
  return 'fa';
};

export default function UserManagementModal({ isOpen, onClose, activeUser, onUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [allBhList, setAllBhList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const userRole = normalizeUserRole(activeUser?.role);
  const isAdmin = userRole === 'admin';
  const isBH = userRole === 'bh';

  // New User Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    contactNumber: '',
    email: '',
    role: 'fa',
    bhId: ''
  });

  // Edit User State
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    username: '',
    password: '',
    contactNumber: '',
    email: '',
    role: 'fa',
    bhId: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('all');
      fetchUsers();
      setError(null);
      setSuccessMsg(null);
      setEditingUserId(null);

      // Pre-set BH if the logged-in user is a Business Head
      if (isBH) {
        setFormData(prev => ({
          ...prev,
          role: 'fa',
          bhId: activeUser.id
        }));
      }
    }
  }, [isOpen, activeUser]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch scoped users for display
      const params = activeUser ? { userId: activeUser.id, role: activeUser.role } : {};
      const res = await axios.get('/api/users', { params });
      if (res.data && res.data.data) {
        setUsers(res.data.data);
      }

      // 2. Fetch list of Business Heads for assignment dropdown (if admin or needed)
      if (isAdmin) {
        // Admin gets all users, so extract BHs directly using normalized role
        const bList = (res.data.data || []).filter(u => normalizeUserRole(u.role) === 'bh');
        setAllBhList(bList);
        if (bList.length > 0 && !formData.bhId) {
          setFormData(prev => ({ ...prev, bhId: bList[0].id }));
        }
      } else if (isBH) {
        setAllBhList([{ id: activeUser.id, name: activeUser.name, username: activeUser.username }]);
        setFormData(prev => ({ ...prev, bhId: activeUser.id }));
      }
    } catch (err) {
      setError('Failed to fetch user accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole) => {
    const isArchitectRole = newRole === 'fa' || newRole === 'la';
    let defaultBhId = formData.bhId;
    if (isBH) {
      defaultBhId = activeUser.id;
    } else if (isArchitectRole && !defaultBhId && allBhList.length > 0) {
      defaultBhId = allBhList[0].id;
    }

    setFormData({
      ...formData,
      role: newRole,
      bhId: isArchitectRole ? defaultBhId : ''
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.username.trim() || !formData.password.trim() || !formData.name.trim()) {
      setError('Please provide Full Name, Username, and Password.');
      return;
    }

    const isArchitectRole = formData.role === 'fa' || formData.role === 'la';
    let assignedBhId = formData.bhId;
    let assignedBhName = null;

    if (isBH) {
      assignedBhId = activeUser.id;
      assignedBhName = activeUser.name || activeUser.username;
    } else if (isArchitectRole) {
      if (!assignedBhId && allBhList.length > 0) {
        assignedBhId = allBhList[0].id;
      }
      const selectedBh = allBhList.find(b => b.id === assignedBhId);
      assignedBhName = selectedBh?.name || selectedBh?.username || null;
    }

    setActionLoading(true);
    try {
      const res = await axios.post('/api/users', {
        ...formData,
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim(),
        bhId: assignedBhId || null,
        bhName: assignedBhName || null
      });

      if (res.data && res.data.success) {
        const createdUser = res.data.data;
        const roleLabel = getRoleBadge(createdUser.role).label;
        setSuccessMsg(`${roleLabel} "${createdUser.name}" created successfully! They can now log in.`);
        
        setFormData({
          name: '',
          username: '',
          password: '',
          contactNumber: '',
          email: '',
          role: isBH ? 'fa' : 'fa',
          bhId: isBH ? activeUser.id : (allBhList[0]?.id || '')
        });
        await fetchUsers();
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

  const handleStartEdit = (user) => {
    setEditingUserId(user.id);
    setEditFormData({
      name: user.name || '',
      username: user.username || '',
      password: '',
      contactNumber: user.contactNumber === 'N/A' ? '' : (user.contactNumber || ''),
      email: user.email || '',
      role: user.role || 'fa',
      bhId: user.bhId || (allBhList[0]?.id || '')
    });
    setError(null);
    setSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditFormData({
      name: '',
      username: '',
      password: '',
      contactNumber: '',
      email: '',
      role: 'fa',
      bhId: ''
    });
  };

  const handleSaveEdit = async (userId) => {
    setError(null);
    setSuccessMsg(null);

    const trimmedName = editFormData.name.trim();
    const trimmedUsername = editFormData.username.trim().toLowerCase();

    if (!trimmedName || !trimmedUsername) {
      setError('Full Name and Username cannot be empty.');
      return;
    }

    const isArchitectRole = editFormData.role === 'fa' || editFormData.role === 'la';
    let assignedBhId = editFormData.bhId;
    let assignedBhName = null;

    if (isBH) {
      assignedBhId = activeUser.id;
      assignedBhName = activeUser.name;
    } else if (isArchitectRole && assignedBhId) {
      const selectedBh = allBhList.find(b => b.id === assignedBhId);
      assignedBhName = selectedBh?.name || selectedBh?.username || null;
    }

    setEditLoading(true);
    try {
      const payload = {
        name: trimmedName,
        username: trimmedUsername,
        contactNumber: editFormData.contactNumber.trim(),
        email: editFormData.email.trim(),
        role: editFormData.role,
        bhId: isArchitectRole ? assignedBhId : null,
        bhName: isArchitectRole ? assignedBhName : null
      };

      if (editFormData.password && editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await axios.put(`/api/users/${userId}`, payload);

      if (res.data && res.data.success) {
        const updated = res.data.data;
        setSuccessMsg(`User "${trimmedName}" updated successfully!`);
        setEditingUserId(null);
        await fetchUsers();
        if (onUserUpdated) {
          onUserUpdated(updated);
        }
      } else {
        throw new Error(res.data?.error || 'Failed to update user.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error updating user.';
      setError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username, userRole) => {
    const roleLabel = getRoleBadge(userRole).label;
    if (!window.confirm(`Are you sure you want to remove ${roleLabel} "${username}"?`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/users/${userId}`);
      if (res.data && res.data.success) {
        setSuccessMsg(`Account "${username}" removed.`);
        fetchUsers();
      }
    } catch (err) {
      setError('Failed to remove account: ' + (err.response?.data?.error || err.message));
    }
  };

  const getRoleBadge = (rawRole) => {
    const role = normalizeUserRole(rawRole);
    switch (role) {
      case 'admin':
        return {
          label: 'System Administrator',
          short: 'Admin',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <ShieldCheck className="w-4 h-4 text-amber-700" />,
          avatarClass: 'bg-amber-600 text-white'
        };
      case 'bh':
        return {
          label: 'Business Head',
          short: 'BH',
          badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          icon: <Briefcase className="w-4 h-4 text-indigo-700" />,
          avatarClass: 'bg-indigo-600 text-white'
        };
      case 'la':
        return {
          label: 'Lead Architect',
          short: 'LA',
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: <Layers className="w-4 h-4 text-emerald-700" />,
          avatarClass: 'bg-emerald-600 text-white'
        };
      case 'fa':
      default:
        return {
          label: 'Feasibility Architect',
          short: 'FA',
          badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
          icon: <Compass className="w-4 h-4 text-sky-700" />,
          avatarClass: 'bg-sky-600 text-white'
        };
    }
  };

  if (!isOpen) return null;

  // Filter users strictly by normalized role
  const filteredUsers = users.filter(u => {
    const r = normalizeUserRole(u.role);
    if (activeTab === 'all') return true;
    if (activeTab === 'bh') return r === 'bh';
    if (activeTab === 'fa') return r === 'fa';
    if (activeTab === 'la') return r === 'la';
    if (activeTab === 'admin') return r === 'admin';
    return false;
  });

  const bhCount = users.filter(u => normalizeUserRole(u.role) === 'bh').length;
  const faCount = users.filter(u => normalizeUserRole(u.role) === 'fa').length;
  const laCount = users.filter(u => normalizeUserRole(u.role) === 'la').length;
  const adminCount = users.filter(u => normalizeUserRole(u.role) === 'admin').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0 ${
              isAdmin ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 shadow-indigo-600/20'
            }`}>
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-xl font-bold text-slate-900 font-['Outfit'] truncate">
                  {isAdmin ? 'User & Team Governance' : 'My Team Architecture & Roster'}
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isAdmin 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                }`}>
                  {isAdmin ? 'Admin Console' : `Business Head: ${activeUser?.name || 'BH'}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {isAdmin 
                  ? 'Manage system credentials, assign Feasibility & Lead Architects under Business Heads, and configure roles.'
                  : 'Manage Feasibility Architects and Lead Architects reporting under your leadership.'}
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
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-700 text-xs animate-fadeIn">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="font-bold underline ml-2 cursor-pointer">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-xs animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="font-bold underline ml-2 cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Content Body: Split into Create Form & User List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Create New User Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>
                {isAdmin ? 'Provision New User / Architect' : 'Add Architect to My Team'}
              </span>
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
                    placeholder="e.g. pass123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input text-xs py-2"
                  />
                </div>

                {/* Contact Phone */}
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

                {/* Role Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="form-input text-xs py-2 font-semibold"
                  >
                    <option value="fa">Feasibility Architect (FA)</option>
                    <option value="la">Lead Architect (LA)</option>
                    {isAdmin && <option value="bh">Business Head (BH)</option>}
                    {isAdmin && <option value="admin">System Administrator</option>}
                  </select>
                </div>

                {/* Assigned Business Head (Mandatory for FA and LA) */}
                {(formData.role === 'fa' || formData.role === 'la') && (
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Assigned Under Business Head (BH) *</span>
                    </label>

                    {isBH ? (
                      <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-900 flex items-center justify-between">
                        <span>Reporting to: <strong>{activeUser?.name || activeUser?.username}</strong> (You)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-200 text-indigo-800">Auto-Linked</span>
                      </div>
                    ) : allBhList.length > 0 ? (
                      <select
                        value={formData.bhId}
                        required
                        onChange={(e) => setFormData({ ...formData, bhId: e.target.value })}
                        className="form-input text-xs py-2 bg-indigo-50/50 border-indigo-200 font-semibold text-indigo-950"
                      >
                        {allBhList.map((bh) => (
                          <option key={bh.id} value={bh.id}>
                            {bh.name} (@{bh.username})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                        ⚠️ No Business Heads registered yet. Create a Business Head account first, or select one once available.
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <div className={`flex items-end ${(formData.role === 'fa' || formData.role === 'la') ? 'lg:col-span-1' : 'sm:col-span-2 lg:col-span-3'}`}>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-gold w-full py-2.5 text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create {getRoleBadge(formData.role).short} Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* User List Header & Role Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {isAdmin ? `All Team Members & Users (${users.length})` : `My Assigned Team (${users.length})`}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {bhCount} Business Heads • {faCount} Feasibility Architects • {laCount} Lead Architects • {adminCount} Admin
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All ({users.length})
                </button>
                {bhCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('bh')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activeTab === 'bh'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
                    }`}
                  >
                    BH ({bhCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('fa')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'fa'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-sky-700 hover:bg-sky-50 border border-sky-200'
                  }`}
                >
                  FA ({faCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('la')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'la'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  LA ({laCount})
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                    }`}
                  >
                    Admin ({adminCount})
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading user accounts...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                No users found under the "{activeTab.toUpperCase()}" filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUsers.map((user) => {
                  const badge = getRoleBadge(user.role);
                  const isUserAdmin = user.role === 'admin';
                  const isEditingThisUser = editingUserId === user.id;

                  if (isEditingThisUser) {
                    const isEditArchitect = editFormData.role === 'fa' || editFormData.role === 'la';

                    return (
                      <div
                        key={user.id}
                        className="col-span-1 md:col-span-2 p-5 rounded-xl bg-amber-50/50 border-2 border-amber-400 shadow-md space-y-4 animate-fadeIn"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                          <div className="flex items-center space-x-2">
                            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                              <Pencil className="w-4 h-4" />
                            </span>
                            <span className="text-sm font-bold text-slate-900 font-['Outfit']">
                              Edit User Details: <span className="text-amber-800">{user.name}</span>
                            </span>
                          </div>
                          <span className="text-xs text-amber-800 font-medium">
                            Username: <span className="font-mono font-bold">{user.username}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Full Name */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={editFormData.name}
                              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                              className="form-input text-xs py-2"
                              placeholder="e.g. Arun Kumar"
                            />
                          </div>

                          {/* Username */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Login Username *
                            </label>
                            <input
                              type="text"
                              required
                              disabled={user.username === 'admin'}
                              value={editFormData.username}
                              onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                              className="form-input text-xs py-2 disabled:bg-slate-100 disabled:text-slate-400"
                              placeholder="e.g. arun_arch"
                            />
                          </div>

                          {/* New Password */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Password <span className="text-slate-400 font-normal lowercase">(leave empty to keep unchanged)</span>
                            </label>
                            <input
                              type="text"
                              value={editFormData.password}
                              onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                              className="form-input text-xs py-2"
                              placeholder="Enter new password to update"
                            />
                          </div>

                          {/* Contact Phone */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Contact Phone
                            </label>
                            <input
                              type="text"
                              value={editFormData.contactNumber}
                              onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                              className="form-input text-xs py-2"
                              placeholder="e.g. 98765 43210"
                            />
                          </div>

                          {/* Email Address */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={editFormData.email}
                              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                              className="form-input text-xs py-2"
                              placeholder="e.g. arun@cookscape.in"
                            />
                          </div>

                          {/* Role Selector */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              Account Role
                            </label>
                            <select
                              value={editFormData.role}
                              disabled={user.username === 'admin' || (!isAdmin && user.id === activeUser.id)}
                              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                              className="form-input text-xs py-2 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="fa">Feasibility Architect (FA)</option>
                              <option value="la">Lead Architect (LA)</option>
                              {isAdmin && <option value="bh">Business Head (BH)</option>}
                              {isAdmin && <option value="admin">System Administrator</option>}
                            </select>
                          </div>

                          {/* Assigned Business Head (for FA / LA) */}
                          {isEditArchitect && (
                            <div className="sm:col-span-2 lg:col-span-3">
                              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                <Building className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Assigned Under Business Head (BH)</span>
                              </label>

                              {isBH ? (
                                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-900">
                                  Reporting to: {activeUser.name} (You)
                                </div>
                              ) : allBhList.length > 0 ? (
                                <select
                                  value={editFormData.bhId || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, bhId: e.target.value })}
                                  className="form-input text-xs py-2 bg-indigo-50/50 border-indigo-200 font-semibold"
                                >
                                  <option value="">-- Unassigned --</option>
                                  {allBhList.map((bh) => (
                                    <option key={bh.id} value={bh.id}>
                                      {bh.name} (@{bh.username})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-slate-500">No Business Heads available</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Save & Cancel Buttons */}
                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-amber-200">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={editLoading}
                            className="btn-secondary py-1.5 px-4 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(user.id)}
                            disabled={editLoading}
                            className="btn-gold py-1.5 px-5 text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                          >
                            {editLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={user.id}
                      className="p-4 rounded-xl bg-white border border-slate-200 flex items-start justify-between shadow-2xs hover:border-amber-300 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`p-1.5 rounded-lg ${badge.badgeClass}`}>
                            {badge.icon}
                          </span>
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {user.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Reporting Line (strictly for FA and LA) */}
                        {(normalizeUserRole(user.role) === 'fa' || normalizeUserRole(user.role) === 'la') && user.bhName && (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              <Building className="w-3 h-3 text-indigo-600" />
                              <span>Reports to: <strong className="text-indigo-900">{user.bhName}</strong></span>
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-slate-500 pt-1">
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Username:</span>
                            <span className="font-mono font-medium text-slate-800">@{user.username}</span>
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

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                          title={`Edit ${user.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete Button (non-root admin) */}
                        {user.username !== 'admin' && (isAdmin || (isBH && user.id !== activeUser.id)) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.name, user.role)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={`Remove ${user.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            {isAdmin 
              ? 'Admins can view and govern all studio data. FAs and LAs view their quotes only.' 
              : 'Business Heads can view and track quotes generated by their assigned team and themselves.'}
          </span>
          <button
            onClick={onClose}
            className="btn-secondary py-1.5 px-4 text-xs font-semibold cursor-pointer shrink-0"
          >
            Close Management
          </button>
        </div>

      </div>
    </div>
  );
}
