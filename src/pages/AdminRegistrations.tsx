import React, { useState, useCallback } from 'react';
import { RegistrationRequest } from '../types';
import { apiService, getSavedAdminToken } from '../lib/api';
import { Check, CheckCircle2, Eye, Loader2, XCircle, Search, RefreshCw, X, Edit3 } from 'lucide-react';

export interface AdminRegistrationsProps {
  registrations: RegistrationRequest[];
  isLoading?: boolean;
  adminToken?: string;
  fetchRegistrations?: () => Promise<void>;
  fetchMembers?: () => Promise<void>;
  fetchDashboard?: () => Promise<void>;
  loadLiveData?: () => Promise<void>;
  onNavigate?: (path: string) => void;
  onViewDetails?: (reg: RegistrationRequest) => void;
  onViewScreenshot?: (url: string) => void;
  onReject?: (reg: RegistrationRequest) => void;
  onEdit?: (reg: RegistrationRequest) => void;
}

/**
 * Helper function to handle registration approval.
 * Calls updateRegistrationStatus API with registrationReferenceNumber,
 * parses response for rollNumber, and triggers state-based refreshes
 * ONLY after a successful backend operation (success === true).
 */
export const handleApprove = async (
  record: RegistrationRequest,
  token?: string,
  callbacks?: {
    fetchRegistrations?: () => Promise<any>;
    fetchMembers?: () => Promise<any>;
    fetchDashboard?: () => Promise<any>;
    loadLiveData?: () => Promise<any>;
  }
): Promise<{ success: boolean; rollNumber?: string; message?: string }> => {
  const authToken = token || getSavedAdminToken();

  const registrationReferenceNumber = (
    record?.registrationReferenceNumber ||
    record?.registrationRef ||
    record?.id ||
    ''
  ).trim().toUpperCase();

  if (!registrationReferenceNumber) {
    const errorMsg = 'Missing registrationReferenceNumber for the selected record.';
    alert(errorMsg);
    return { success: false, message: errorMsg };
  }

  try {
    const result = await apiService.updateRegistrationStatus(
      {
        registrationReferenceNumber,
        status: 'Approved',
      },
      authToken
    );

    console.log('updateRegistrationStatus API response:', result);

    const isSuccess =
      result?.success === true ||
      result?.status === 'Approved' ||
      result?.status === 'success' ||
      result?.result === 'success';

    if (isSuccess) {
      // Properly parse rollNumber from response (result.data.rollNumber or result.rollNumber)
      const rollNumber =
        (result?.data as any)?.rollNumber ||
        (result?.data as any)?.rollNo ||
        (result as any)?.rollNumber ||
        (result as any)?.rollNo ||
        '';

      // Trigger state-based refreshes ONLY after backend returns success: true
      const refreshPromises: Promise<any>[] = [];
      if (callbacks?.fetchRegistrations) refreshPromises.push(callbacks.fetchRegistrations());
      if (callbacks?.fetchMembers) refreshPromises.push(callbacks.fetchMembers());
      if (callbacks?.fetchDashboard) refreshPromises.push(callbacks.fetchDashboard());
      if (callbacks?.loadLiveData) refreshPromises.push(callbacks.loadLiveData());

      if (refreshPromises.length > 0) {
        await Promise.all(refreshPromises);
      }

      return {
        success: true,
        rollNumber,
        message: result.message || 'Registration approved successfully.',
      };
    } else {
      const errorMsg = result?.message || result?.error || 'Registration approval failed.';
      alert(`Approval Failed: ${errorMsg}`);
      return {
        success: false,
        message: errorMsg,
      };
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Network error occurred during registration approval.';
    alert(`Approval Error: ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
};

export const AdminRegistrations: React.FC<AdminRegistrationsProps> = ({
  registrations,
  isLoading = false,
  adminToken = '',
  fetchRegistrations,
  fetchMembers,
  fetchDashboard,
  loadLiveData,
  onViewDetails,
  onViewScreenshot,
  onReject,
  onEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const filteredRegistrations = registrations.filter((reg) => {
    const refNum = String(reg.registrationReferenceNumber || reg.registrationRef || '').toLowerCase();
    const name = String(reg.fullName || '').toLowerCase();
    const phone = String(reg.phoneNumber || reg.phone || '').toLowerCase();
    const matchesSearch =
      refNum.includes(searchTerm.toLowerCase()) ||
      name.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm.toLowerCase());

    const statusVal = reg.registrationStatus || reg.status || 'Pending Verification';
    const matchesStatus = statusFilter === 'All' || statusVal === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const onApproveClick = async (reg: RegistrationRequest) => {
    const refNum = (reg.registrationReferenceNumber || reg.registrationRef || reg.id || '').trim().toUpperCase();
    setProcessingId(refNum);
    setSuccessId(null);

    const res = await handleApprove(reg, adminToken, {
      fetchRegistrations,
      fetchMembers,
      fetchDashboard,
      loadLiveData,
    });

    setProcessingId(null);

    if (res.success) {
      setSuccessId(refNum);
      setTimeout(() => {
        setSuccessId(null);
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <form onSubmit={(e) => e.preventDefault()} className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Ref #, Name, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-8 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        <div className="flex items-center gap-2">
          {['All', 'Pending Verification', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Ref Number</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Member Info</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Fee / Payment</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                      <span>Loading registration records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 font-sans font-bold">
                    No registrations found
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => {
                  const refNum = reg.registrationReferenceNumber || reg.registrationRef || reg.id || '';
                  const statusVal = reg.registrationStatus || reg.status || 'Pending Verification';
                  const rollVal = reg.rollNumber;
                  const phoneVal = reg.phoneNumber || reg.phone;
                  const emailVal = reg.emailAddress || reg.email;
                  const planVal = reg.selectedPlan || reg.planName;
                  const screenshotVal = reg.paymentScreenshot || reg.upiScreenshotUrl;

                  const isProcessingThis = processingId === refNum.trim().toUpperCase();
                  const isSuccessThis = successId === refNum.trim().toUpperCase();

                  return (
                    <tr key={reg.id || refNum} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-red-400 whitespace-nowrap font-mono">
                        {refNum}
                        <div className="text-[10px] text-zinc-500 font-normal">
                          {reg.timestamp || (reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : 'Recent')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {rollVal && rollVal !== 'Unassigned' && rollVal !== 'Pending' ? (
                          <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-500/30 font-bold text-[11px] font-mono">
                            {rollVal}
                          </span>
                        ) : (
                          <span className="text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-sans font-semibold">
                            Pending Approval
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white text-sm">{reg.fullName}</div>
                        <div className="text-xs text-zinc-400 font-mono">
                          {phoneVal}{emailVal ? ` | ${emailVal}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-sans font-medium text-zinc-200">
                        {planVal || 'Standard Plan'}
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-emerald-400 font-mono">₹{reg.registrationFee}</div>
                        <div className="text-[10px] text-zinc-400 uppercase font-mono">
                          {reg.paymentMethod || 'UPI'} {reg.upiTransactionId || reg.upiTxnId ? `(${reg.upiTransactionId || reg.upiTxnId})` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {screenshotVal ? (
                          <button
                            onClick={() => onViewScreenshot && onViewScreenshot(screenshotVal)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Receipt</span>
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-[11px] font-sans">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                            statusVal === 'Approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : statusVal === 'Rejected'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {statusVal}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 font-sans">
                          {onViewDetails && (
                            <button
                              onClick={() => onViewDetails(reg)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          )}

                          {onEdit && (
                            <button
                              onClick={() => onEdit(reg)}
                              className="px-2.5 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit Registration & Restoration Options"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                              <span>Edit / Restore</span>
                            </button>
                          )}

                          {statusVal !== 'Approved' && (
                            <button
                              onClick={() => onApproveClick(reg)}
                              disabled={Boolean(processingId)}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isSuccessThis
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                              }`}
                            >
                              {isProcessingThis ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  <span>Approving...</span>
                                </>
                              ) : isSuccessThis ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white animate-bounce" />
                                  <span>Approved</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  <span>Approve</span>
                                </>
                              )}
                            </button>
                          )}

                          {statusVal !== 'Rejected' && onReject && (
                            <button
                              onClick={() => onReject(reg)}
                              disabled={Boolean(processingId)}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer bg-red-950/60 border border-red-600/40 hover:bg-red-900/60 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistrations;
