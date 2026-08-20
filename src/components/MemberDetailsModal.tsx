import React, { useState } from 'react';
import { Member, FeePaymentRecord, RegistrationRequest, GymSettings } from '../types';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Download,
  IndianRupee,
  Edit3,
  ShieldCheck,
  Clock,
  MapPin,
  HeartPulse,
  Target,
  FileText,
  AlertCircle,
  ExternalLink,
  Receipt,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronRight,
  Send,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseAmount, resolveFeePaymentFinancials } from '../lib/paymentUtils';
import { downloadMemberCardPDF, downloadMemberInvoicePDF } from '../lib/pdf';
import { getStoredSettings } from '../lib/storage';

interface MemberDetailsModalProps {
  member: Member | null;
  onClose: () => void;
  allPayments?: FeePaymentRecord[];
  allRegistrations?: RegistrationRequest[];
  onCollectFee?: (member: Member) => void;
  onEditMember?: (member: Member) => void;
  onDownloadIdCard?: (member: Member) => void;
  onResendIdCard?: (member: Member) => void;
  onViewIdCard?: (member: Member) => void;
  onSelectPaymentRecord?: (payment: FeePaymentRecord) => void;
  isResendingId?: boolean;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  member,
  onClose,
  allPayments = [],
  allRegistrations = [],
  onCollectFee,
  onEditMember,
  onDownloadIdCard,
  onResendIdCard,
  onViewIdCard,
  onSelectPaymentRecord,
  isResendingId = false,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!member) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const rollNumber = (member.rollNumber || member.rollNo || '').trim().toUpperCase();
  const regRef = (member.registrationRef || '').trim().toUpperCase();
  const phone = (member.phone || member.phoneNumber || '').trim();
  const email = (member.email || member.emailAddress || '').trim();
  const memberName = (member.fullName || member.name || 'Member').trim();

  // Filter all payment records linked to this member
  const memberPayments = allPayments.filter((p) => {
    const pRoll = (p.rollNumber || '').trim().toUpperCase();
    const pReg = (p.registrationReferenceNumber || p.registrationRef || '').trim().toUpperCase();
    const pPhone = (p.phoneNumber || p.memberPhone || p.phone || '').trim();

    if (rollNumber && pRoll === rollNumber) return true;
    if (regRef && pReg === regRef) return true;
    if (phone && pPhone && pPhone === phone) return true;
    return false;
  }).sort((a, b) => {
    const timeA = new Date(a.paymentDate || a.timestamp || 0).getTime();
    const timeB = new Date(b.paymentDate || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  // Find linked registration record
  const matchingRegistration = allRegistrations.find((r) => {
    const rRoll = (r.rollNumber || '').trim().toUpperCase();
    const rRef = (r.registrationRef || r.registrationReferenceNumber || r.referenceNumber || '').trim().toUpperCase();
    const rPhone = (r.phone || r.phoneNumber || '').trim();

    if (rollNumber && rRoll === rollNumber) return true;
    if (regRef && rRef === regRef) return true;
    if (phone && rPhone && rPhone === phone) return true;
    return false;
  });

  // Financial statistics calculation
  const totalPaid = memberPayments.reduce((acc, p) => {
    const fin = resolveFeePaymentFinancials(p);
    if (fin.isApproved) {
      return acc + fin.amountPaid;
    }
    return acc;
  }, 0);

  const regFeePaid = member.registrationFeePaid || (matchingRegistration ? Number(matchingRegistration.registrationFee || 0) : 0);
  const totalInvested = totalPaid + (regFeePaid > 0 ? regFeePaid : 0);

  const latestPaymentFin = memberPayments[0] ? resolveFeePaymentFinancials(memberPayments[0]) : null;
  const previousBalance = member.previousBalance !== undefined
    ? member.previousBalance
    : (latestPaymentFin?.remainingBalance ?? 0);

  // Expiry calculation
  const expiryDate = member.membershipExpiry || member.expiryDate || member.planExpiryDate;
  let expiryStatusLabel = 'No Expiry Set';
  let isExpired = false;
  let daysRemaining: number | null = null;

  if (expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      isExpired = true;
      expiryStatusLabel = `Expired (${Math.abs(daysRemaining)} days ago)`;
    } else if (daysRemaining === 0) {
      expiryStatusLabel = 'Expires Today';
    } else {
      expiryStatusLabel = `${daysRemaining} days remaining`;
    }
  }

  const memberStatus = member.status || member.membershipStatus || 'Active';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-5xl bg-[#0F0F13] border border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOP HEADER */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#14141A] via-[#111116] to-[#14141A] border-b border-zinc-800/80 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Profile Overview */}
              <div className="flex items-start sm:items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/40 flex items-center justify-center text-white font-black text-xl font-mono shadow-inner">
                    {memberName.slice(0, 2).toUpperCase() || 'AB'}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0F0F13] ${
                      memberStatus === 'Active'
                        ? 'bg-emerald-500'
                        : isExpired || memberStatus === 'Expired'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight uppercase">
                      {memberName}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                        memberStatus === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isExpired || memberStatus === 'Expired'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {memberStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => handleCopy(rollNumber, 'roll')}
                      className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-500/30 hover:bg-blue-900/60 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Click to copy Roll Number"
                    >
                      <span>ROLL: {rollNumber || 'Unassigned'}</span>
                      {copiedField === 'roll' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-blue-400/70" />}
                    </button>

                    {regRef && (
                      <button
                        type="button"
                        onClick={() => handleCopy(regRef, 'reg')}
                        className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-500/30 hover:bg-purple-900/60 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Click to copy Registration Reference"
                      >
                        <span>REG: {regRef}</span>
                        {copiedField === 'reg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-purple-400/70" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {onCollectFee && (
                  <button
                    type="button"
                    onClick={() => onCollectFee(member)}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>Collect Fee</span>
                  </button>
                )}

                {onEditMember && (
                  <button
                    type="button"
                    onClick={() => onEditMember(member)}
                    className="px-3 py-2 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Edit Member</span>
                  </button>
                )}

                {onViewIdCard && (
                  <button
                    type="button"
                    onClick={() => onViewIdCard(member)}
                    className="px-3 py-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-400 border border-blue-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View ID</span>
                  </button>
                )}

                {onDownloadIdCard ? (
                  <button
                    type="button"
                    onClick={() => onDownloadIdCard(member)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Download ID</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => downloadMemberCardPDF(member, getStoredSettings())}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Download ID</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => downloadMemberInvoicePDF(member, getStoredSettings(), memberPayments[0])}
                  className="px-3 py-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Invoice</span>
                </button>

                {onResendIdCard && (
                  <button
                    type="button"
                    onClick={() => onResendIdCard(member)}
                    disabled={isResendingId}
                    className="px-3 py-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isResendingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Resend ID</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700/60 ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* SCROLLABLE BODY CONTENT */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-zinc-300">
            {/* GRID SECTIONS: Personal Info + Membership & Validity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* SECTION 1: Personal & Contact Info */}
              <div className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    1. Athlete Personal & Contact Information
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">KYC / Profile</span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Phone Number</span>
                    <a
                      href={`tel:${phone}`}
                      className="font-mono font-bold text-white hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {phone || 'Not provided'}
                    </a>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Email Address</span>
                    <a
                      href={`mailto:${email}`}
                      className="font-mono text-zinc-200 hover:text-purple-400 truncate block transition-colors"
                    >
                      {email || 'Not provided'}
                    </a>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Gender</span>
                    <span className="text-white font-medium">{member.gender || 'Not specified'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Date of Birth</span>
                    <span className="font-mono text-zinc-200">{member.dob || member.dateOfBirth || 'Not provided'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Emergency Contact</span>
                    <span className="font-mono text-zinc-200">{member.emergencyContact || member.emergencyContactNumber || 'Not provided'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Fitness Goal</span>
                    <span className="text-emerald-400 font-medium">{member.fitnessGoal || 'General Fitness'}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Residential Address</span>
                    <span className="text-zinc-300 font-medium">{member.address || 'Address not on file'}</span>
                  </div>

                  {member.medicalCondition && (
                    <div className="col-span-2 p-2.5 bg-red-950/30 border border-red-500/30 rounded-xl">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-0.5">
                        Medical Condition / Health Alert
                      </span>
                      <span className="text-red-200">{member.medicalCondition}</span>
                    </div>
                  )}

                  {member.remarks && (
                    <div className="col-span-2 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                        Member Notes / Admin Remarks
                      </span>
                      <span className="text-zinc-300 italic">{member.remarks}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Membership Plan & Validity Context */}
              <div className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      2. Membership Subscription & Validity
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">Live Plan</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 mt-3.5">
                    <div className="col-span-2 sm:col-span-1 p-3 bg-gradient-to-br from-emerald-950/30 to-zinc-900 border border-emerald-500/20 rounded-xl">
                      <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider block mb-1">
                        Active Membership Plan
                      </span>
                      <div className="text-sm font-black text-white font-mono uppercase">
                        {member.planName || member.selectedPlan || 'Basic Plan'}
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 p-3 bg-gradient-to-br from-blue-950/30 to-zinc-900 border border-blue-500/20 rounded-xl">
                      <span className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider block mb-1">
                        Expiry Status
                      </span>
                      <div className={`text-xs font-bold font-mono ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                        {expiryStatusLabel}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Joining Date</span>
                      <span className="font-mono text-zinc-200 font-bold">
                        {member.joiningDate || member.joinDate || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Membership Expiry</span>
                      <span className={`font-mono font-bold ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                        {expiryDate || 'Open / Pending'}
                      </span>
                    </div>

                    {member.lastPaymentDate && (
                      <div>
                        <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Last Fee Payment Date</span>
                        <span className="font-mono text-zinc-200">{member.lastPaymentDate}</span>
                      </div>
                    )}

                    {member.lastPaymentAmount !== undefined && (
                      <div>
                        <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-0.5">Last Payment Amount</span>
                        <span className="font-mono font-bold text-emerald-400">₹{member.lastPaymentAmount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance Status Banner */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                      Outstanding Previous Balance
                    </span>
                    <span className={`text-base font-black font-mono ${Number(previousBalance || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ₹{Number(previousBalance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {Number(previousBalance || 0) > 0 ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      Payment Due
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      Dues Cleared
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Registration Breakdown & Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#141419] border border-zinc-800/90 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                  Total Fee Collected
                </span>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Across {memberPayments.length} fee transaction{memberPayments.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className="bg-[#141419] border border-zinc-800/90 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-purple-400" />
                  Registration Fee
                </span>
                <div className="text-lg font-black text-purple-400 font-mono">
                  ₹{regFeePaid.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Initial enrollment & ID badge
                </div>
              </div>

              <div className="bg-[#141419] border border-zinc-800/90 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Total Member Investment
                </span>
                <div className="text-lg font-black text-blue-400 font-mono">
                  ₹{totalInvested.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Reg fee + membership fees
                </div>
              </div>

              <div className="bg-[#141419] border border-zinc-800/90 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  Pending / Due Balance
                </span>
                <div className={`text-lg font-black font-mono ${Number(previousBalance || 0) > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                  ₹{Number(previousBalance || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {Number(previousBalance || 0) > 0 ? 'Action required' : 'All clear'}
                </div>
              </div>
            </div>

            {/* SECTION 4: Connected Registration Request Information (If exists) */}
            {matchingRegistration && (
              <div className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    3. Onboarding & Registration Form Record
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                    Status: {matchingRegistration.status || matchingRegistration.registrationStatus || 'Approved'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Registration Ref</span>
                    <span className="font-mono font-bold text-purple-400">
                      {matchingRegistration.registrationRef || matchingRegistration.registrationReferenceNumber || regRef}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Registration Date</span>
                    <span className="font-mono text-zinc-200">
                      {matchingRegistration.timestamp || matchingRegistration.createdAt || 'Standard Onboarding'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Reg Payment Mode</span>
                    <span className="font-mono text-zinc-200">{matchingRegistration.paymentMethod || 'Cash / UPI'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Approved By</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {matchingRegistration.approvedBy || 'Admin'} {matchingRegistration.approvedDate ? `(${matchingRegistration.approvedDate})` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: Connected Payment History Table */}
            <div className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    4. Complete Fee & Transaction History ({memberPayments.length})
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Click any fee transaction row to open the full payment verification and breakdown.
                  </p>
                </div>

                {onCollectFee && (
                  <button
                    type="button"
                    onClick={() => onCollectFee(member)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <IndianRupee className="w-3 h-3" />
                    <span>+ New Fee Payment</span>
                  </button>
                )}
              </div>

              {memberPayments.length === 0 ? (
                <div className="py-8 text-center bg-zinc-950/60 rounded-xl border border-zinc-800/60 space-y-2">
                  <Receipt className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">No separate fee transactions recorded yet for this athlete.</p>
                  {onCollectFee && (
                    <button
                      type="button"
                      onClick={() => onCollectFee(member)}
                      className="px-3 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-lg hover:bg-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Record First Fee Payment</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Fee Ref #</th>
                        <th className="py-2.5 px-3">Payment Date</th>
                        <th className="py-2.5 px-3">Plan / Fee Type</th>
                        <th className="py-2.5 px-3">Amount Paid</th>
                        <th className="py-2.5 px-3">Remaining Due</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {memberPayments.map((p) => {
                        const feeRef = p.feeReferenceNumber || p.id;
                        const fin = resolveFeePaymentFinancials(p);
                        const amtPaid = fin.amountPaid;
                        const remBal = fin.remainingBalance;
                        const status = fin.status;
                        const isApproved = fin.isApproved;

                        return (
                          <tr
                            key={p.id || feeRef}
                            onClick={() => onSelectPaymentRecord && onSelectPaymentRecord(p)}
                            className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-3 font-bold text-emerald-400 group-hover:text-emerald-300">
                              {feeRef}
                            </td>
                            <td className="py-3 px-3 text-zinc-300">
                              {p.paymentDate || p.timestamp || 'Recent'}
                            </td>
                            <td className="py-3 px-3 font-sans font-medium text-zinc-200">
                              <div>{fin.planName || p.planName || p.selectedPlan || 'Membership Fee'}</div>
                              {p.feeDuration && <span className="text-[10px] text-zinc-500 font-mono">{p.feeDuration}</span>}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-400">
                              ₹{amtPaid.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3">
                              {remBal > 0 ? (
                                <span className="text-amber-400 font-bold">₹{remBal.toLocaleString('en-IN')}</span>
                              ) : (
                                <span className="text-zinc-500">₹0 (Paid)</span>
                              )}
                            </td>
                            <td className="py-3 px-3 uppercase text-zinc-400">
                              {p.paymentMethod || 'UPI'} {p.upiTransactionId ? `(${p.upiTransactionId})` : ''}
                            </td>
                            <td className="py-3 px-3 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                  isApproved
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : status.toLowerCase().includes('pending')
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectPaymentRecord) onSelectPaymentRecord(p);
                                }}
                                className="px-2.5 py-1 bg-zinc-800 group-hover:bg-emerald-600/20 group-hover:text-emerald-400 text-zinc-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>Details</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-4 px-6 bg-[#141419] border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 shrink-0 font-mono">
            <div>AB GYM Member Record • Ref: {rollNumber || regRef}</div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
