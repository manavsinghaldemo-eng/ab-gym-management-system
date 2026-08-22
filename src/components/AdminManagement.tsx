import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Clock,
  User,
  Shield,
  ShieldAlert,
  Crown,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Info,
  Lock,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { AdminUser, AdminRole } from '../types';
import { apiService } from '../lib/api';
import {
  getStoredAdminUsers,
  addAdminUserInStorage,
  updateAdminUserInStorage,
  deleteAdminUserInStorage,
} from '../lib/storage';

interface AdminManagementProps {
  currentAdminName?: string;
  adminToken?: string;
  onActivityLogged?: () => void;
}

const ROLE_CONFIG: Record<
  AdminRole,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: any;
    description: string;
    permissions: string[];
  }
> = {
  'Super Admin': {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: Crown,
    description: 'Full unrestricted access to all modules, financial audits, settings, and admin management.',
    permissions: ['All Permissions', 'Manage Admins', 'Google Sheets Config', 'Financial Audits', 'Approval & Deletion'],
  },
  'Admin': {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: ShieldCheck,
    description: 'Manage registrations, approve/reject members, process fee payments, and generate ID cards.',
    permissions: ['Registrations', 'Members', 'Fee Payments', 'ID Cards & Receipts', 'Payment Reminders'],
  },
  'Manager': {
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: Shield,
    description: 'Operational manager. View athlete profiles, record fee collections, and monitor attendance.',
    permissions: ['View Members', 'Fee Collections', 'QR Attendance', 'Activity Logs'],
  },
  'Staff': {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: User,
    description: 'Front-desk reception staff. QR code attendance scanner and member verification.',
    permissions: ['QR Attendance Scanner', 'Member Check-in', 'Basic Verification'],
  },
  'Receptionist': {
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    icon: User,
    description: 'Front-desk reception staff. QR code attendance scanner and member verification.',
    permissions: ['QR Attendance Scanner', 'Member Check-in', 'Basic Verification'],
  },
};

export const AdminManagement: React.FC<AdminManagementProps> = ({
  currentAdminName = 'Super Admin',
  adminToken,
  onActivityLogged,
}) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formRole, setFormRole] = useState<AdminRole>('Admin');
  const [formPasscode, setFormPasscode] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formNotes, setFormNotes] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Toast / Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAdminUsers(adminToken);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAdmins(res.data);
      } else {
        setAdmins(getStoredAdminUsers());
      }
    } catch (e) {
      console.warn('Failed to load remote admins, loaded from local storage:', e);
      setAdmins(getStoredAdminUsers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, [adminToken]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('Admin');
    setFormPasscode('');
    setFormStatus('Active');
    setFormNotes('');
    setFormError('');
    setShowPasscode(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormName(admin.name || admin.fullName || '');
    setFormEmail(admin.email || '');
    setFormPhone(admin.phone || admin.phoneNumber || '');
    setFormRole(admin.role || 'Admin');
    setFormPasscode(''); // Leave blank to keep existing
    setFormStatus(admin.status || 'Active');
    setFormNotes(admin.notes || '');
    setFormError('');
    setShowPasscode(false);
  };

  const handleSaveAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter the full name of the administrator.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!formPasscode.trim() || formPasscode.length < 4) {
      setFormError('Security passcode/password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAdminData = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        role: formRole,
        passcode: formPasscode.trim(),
        status: formStatus,
        notes: formNotes.trim(),
        addedBy: currentAdminName,
      };

      const res = await apiService.addAdminUser(newAdminData, adminToken);
      if (res && res.success) {
        showToast('success', `Admin account created for ${formName.trim()} (${formRole})`);
        setIsAddModalOpen(false);
        await loadAdmins();
        if (onActivityLogged) onActivityLogged();
      } else {
        setFormError(res.message || 'Failed to create admin user.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while adding the admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter the full name.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<AdminUser> & { currentAdminName?: string } = {
        name: formName.trim(),
        fullName: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        phoneNumber: formPhone.trim(),
        role: formRole,
        status: formStatus,
        notes: formNotes.trim(),
        currentAdminName,
      };

      if (formPasscode.trim()) {
        updates.passcode = formPasscode.trim();
      }

      const res = await apiService.updateAdminUser(editingAdmin.id, updates, adminToken);
      if (res && res.success) {
        showToast('success', `Admin account updated for ${formName.trim()}`);
        setEditingAdmin(null);
        await loadAdmins();
        if (onActivityLogged) onActivityLogged();
      } else {
        setFormError(res.message || 'Failed to update admin account.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while updating the admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAdmin) return;
    setIsSubmitting(true);
    try {
      const res = await apiService.deleteAdminUser(deletingAdmin.id, currentAdminName, adminToken);
      if (res && res.success) {
        showToast('success', `Admin account for ${deletingAdmin.name} removed successfully.`);
        setDeletingAdmin(null);
        await loadAdmins();
        if (onActivityLogged) onActivityLogged();
      } else {
        showToast('error', res.message || 'Failed to delete admin user.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error occurred during admin removal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    const newStatus = admin.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await apiService.updateAdminUser(
        admin.id,
        { status: newStatus, currentAdminName },
        adminToken
      );
      if (res && res.success) {
        showToast('success', `Status changed to ${newStatus} for ${admin.name}`);
        await loadAdmins();
        if (onActivityLogged) onActivityLogged();
      } else {
        showToast('error', res.message || 'Failed to change status.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Error updating status.');
    }
  };

  // Filtered list
  const filteredAdmins = admins.filter((admin) => {
    const nameMatch = (admin.name || admin.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (admin.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = (admin.phone || admin.phoneNumber || '').includes(searchQuery);
    const matchesSearch = nameMatch || emailMatch || phoneMatch;

    const matchesRole = roleFilter === 'All' || admin.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || admin.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const superAdminCount = admins.filter((a) => a.role === 'Super Admin').length;
  const activeCount = admins.filter((a) => a.status === 'Active').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
                : 'bg-red-950/90 text-red-200 border-red-500/50 shadow-red-950/50'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950/90 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Admin & Staff Access Management
              </h2>
            </div>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Add multiple gym administrators, front-desk staff, and managers. Assign tailored role permissions and secure login passcodes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={loadAdmins}
              className="p-3 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl border border-zinc-700/60 transition-all active:scale-95 flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="Refresh Admin List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenAddModal}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-lg shadow-emerald-950/50 border border-emerald-400/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Admin</span>
            </motion.button>
          </div>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-zinc-800/80">
          <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Total Administrators</span>
            <span className="text-2xl font-black text-white mt-1 block font-mono">{admins.length}</span>
          </div>

          <div className="bg-zinc-950/60 border border-amber-500/20 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider block flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Super Admins
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block font-mono">{superAdminCount}</span>
          </div>

          <div className="bg-zinc-950/60 border border-emerald-500/20 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Active Accounts
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">{activeCount}</span>
          </div>

          <div className="bg-zinc-950/60 border border-cyan-500/20 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-wider block">Current Session</span>
            <span className="text-sm font-bold text-cyan-300 mt-2 block truncate font-mono">{currentAdminName}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search admins by name, email, phone..."
            className="w-full bg-zinc-950/70 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Role Filter */}
          <div className="relative shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by Role"
              className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer appearance-none pr-8"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Staff">Staff</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer appearance-none pr-8"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Admins Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Loading administrator accounts...</p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl space-y-3 text-center px-4">
          <ShieldAlert className="w-10 h-10 text-zinc-600" />
          <h3 className="text-base font-bold text-zinc-300">No Administrators Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            {searchQuery || roleFilter !== 'All' || statusFilter !== 'All'
              ? 'No admin users matched your filter criteria. Try adjusting the search query.'
              : 'No admin users exist yet. Click below to add your first administrator.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            + Add Admin User
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmins.map((admin) => {
            const roleCfg = ROLE_CONFIG[admin.role || 'Admin'] || ROLE_CONFIG['Admin'];
            const RoleIcon = roleCfg.icon;
            const isPrimarySuper = admin.email === 'manavsinghal.demo@gmail.com' || (admin.name && admin.name.toLowerCase().includes('manav'));

            return (
              <motion.div
                key={admin.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-zinc-900/80 border rounded-3xl p-5 flex flex-col justify-between transition-all hover:shadow-xl relative overflow-hidden group ${
                  admin.status === 'Inactive'
                    ? 'border-zinc-800/40 opacity-75'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Role indicator stripe */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    admin.role === 'Super Admin'
                      ? 'from-amber-500 to-amber-300'
                      : admin.role === 'Admin'
                      ? 'from-emerald-500 to-teal-400'
                      : admin.role === 'Manager'
                      ? 'from-cyan-500 to-blue-400'
                      : 'from-purple-500 to-pink-400'
                  }`}
                />

                <div className="space-y-4">
                  {/* Header: Avatar, Name, Role Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm uppercase shrink-0 border ${
                          admin.role === 'Super Admin'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : admin.role === 'Admin'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : admin.role === 'Manager'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {(admin.name || admin.fullName || 'A').slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                          <span>{admin.name || admin.fullName}</span>
                          {admin.role === 'Super Admin' && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleCfg.bgColor} ${roleCfg.color} ${roleCfg.borderColor}`}
                          >
                            <RoleIcon className="w-2.5 h-2.5" />
                            <span>{admin.role}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill with Toggle */}
                    <button
                      onClick={() => handleToggleStatus(admin)}
                      title={`Click to switch to ${admin.status === 'Active' ? 'Inactive' : 'Active'}`}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                        admin.status === 'Active'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          admin.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                        }`}
                      />
                      <span>{admin.status}</span>
                    </button>
                  </div>

                  {/* Contact Details */}
                  <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 text-zinc-300">
                      <span className="flex items-center gap-1.5 text-zinc-400 truncate">
                        <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{admin.email}</span>
                      </span>
                      <button
                        onClick={() => handleCopyEmail(admin.email)}
                        className="text-zinc-500 hover:text-emerald-400 p-1 shrink-0 transition"
                        title="Copy email"
                      >
                        {copiedEmail === admin.email ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {admin.phone && (
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="font-mono text-[11px] text-zinc-300">{admin.phone}</span>
                      </div>
                    )}

                    {admin.notes && (
                      <div className="text-[11px] text-zinc-400 italic bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/40">
                        "{admin.notes}"
                      </div>
                    )}
                  </div>

                  {/* Role Permissions summary */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Access Permissions</span>
                    <div className="flex flex-wrap gap-1">
                      {roleCfg.permissions.slice(0, 3).map((perm, pIdx) => (
                        <span
                          key={pIdx}
                          className="px-2 py-0.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-[10px] text-zinc-300 font-medium"
                        >
                          ✓ {perm}
                        </span>
                      ))}
                      {roleCfg.permissions.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-zinc-800/30 text-zinc-500 text-[10px] rounded-lg">
                          +{roleCfg.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta / History */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                    <span className="truncate">Added by: <strong className="text-zinc-400">{admin.addedBy || 'Super Admin'}</strong></span>
                    {admin.lastLoginAt ? (
                      <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600">Pending login</span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/60">
                  <button
                    onClick={() => handleOpenEditModal(admin)}
                    className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Edit User</span>
                  </button>

                  {!isPrimarySuper && (
                    <button
                      onClick={() => setDeletingAdmin(admin)}
                      className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl transition active:scale-95 cursor-pointer"
                      title="Delete Admin Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Role Hierarchy & Permission Reference */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Role & Access Level Guidelines</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {Object.entries(ROLE_CONFIG).map(([roleName, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={roleName} className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${cfg.bgColor} ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white">{roleName}</span>
                </div>
                <p className="text-zinc-400 leading-relaxed text-[11px]">{cfg.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD ADMIN MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-8 relative"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Create New Administrator</h3>
                    <p className="text-xs text-zinc-400">Grant admin privileges and set login credentials.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAddAdmin} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. rahul@abgym.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Phone Number</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Role & Access Level <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Super Admin', 'Admin', 'Manager', 'Staff'] as AdminRole[]).map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      const isSelected = formRole === r;
                      const Icon = cfg.icon;
                      return (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setFormRole(r)}
                          className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${cfg.bgColor} ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{r}</span>
                            <span className="text-[10px] text-zinc-500 block leading-tight">
                              {r === 'Super Admin'
                                ? 'Full Control'
                                : r === 'Admin'
                                ? 'Ops & Payments'
                                : r === 'Manager'
                                ? 'Gym Floor'
                                : 'Front Desk'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Passcode / Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Login Passcode / Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      required
                      value={formPasscode}
                      onChange={(e) => setFormPasscode(e.target.value)}
                      placeholder="Minimum 4 characters (e.g. ABGym@2026)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                    >
                      {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    This password will allow the user to authenticate into the AB Gym Admin panel.
                  </span>
                </div>

                {/* Status & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Account Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      aria-label="Account Status"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Notes / Shift Details</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="e.g. Evening Shift Front Desk, Head Coach"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Create Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT ADMIN MODAL */}
      <AnimatePresence>
        {editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-8 relative"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Administrator Account</h3>
                    <p className="text-xs text-zinc-400">Update role, permissions, or security passcode.</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditAdmin} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Phone Number</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Role & Access Level <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Super Admin', 'Admin', 'Manager', 'Staff'] as AdminRole[]).map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      const isSelected = formRole === r;
                      const Icon = cfg.icon;
                      return (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setFormRole(r)}
                          className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${cfg.bgColor} ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{r}</span>
                            <span className="text-[10px] text-zinc-500 block leading-tight">
                              {r === 'Super Admin'
                                ? 'Full Control'
                                : r === 'Admin'
                                ? 'Ops & Payments'
                                : r === 'Manager'
                                ? 'Gym Floor'
                                : 'Front Desk'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Passcode Update */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    New Passcode / Password <span className="text-zinc-500">(Leave blank to keep existing)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      value={formPasscode}
                      onChange={(e) => setFormPasscode(e.target.value)}
                      placeholder="Enter new password (optional)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                    >
                      {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Status & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Account Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      aria-label="Account Status"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Notes</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Notes or shift details"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(null)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-red-500/30 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Remove Admin Account?</h3>
                  <p className="text-xs text-zinc-400">This action will permanently revoke access.</p>
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1 text-xs">
                <div className="text-white font-bold">{deletingAdmin.name}</div>
                <div className="text-zinc-400">{deletingAdmin.email}</div>
                <div className="text-amber-400 font-semibold">{deletingAdmin.role}</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingAdmin(null)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-red-950/50 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Confirm Remove'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
