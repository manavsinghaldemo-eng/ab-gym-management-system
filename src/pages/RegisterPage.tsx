import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  generateRollNumber,
  getStoredPlans,
  getStoredSettings,
} from '../lib/storage';
import { AB_FITNESS_UPI_ID } from '../data/initialData';
import { apiService, GOOGLE_APPS_SCRIPT_URL } from '../lib/api';
import { PaymentMethod, RegistrationRequest } from '../types';
import {
  UserPlus,
  CheckCircle2,
  QrCode,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  MapPin,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
  Dumbbell,
  AlertCircle,
  FileText,
  Loader2,
  Smartphone,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface RegisterPageProps {
  initialPlanId?: string;
  onNavigate: (path: string, params?: Record<string, string>) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ initialPlanId, onNavigate }) => {
  const plans = getStoredPlans();
  const settings = getStoredSettings();

  const initialPlanObj = plans.find((p) => p.id === (initialPlanId || plans[1]?.id || plans[0]?.id || 'plan-standard')) || plans[0] || { id: 'plan-standard', name: 'Standard Plan', price: 2499, durationMonths: 3, description: '' };
  const initialPlanNameStr = `${initialPlanObj.name} - ₹${initialPlanObj.price} (${initialPlanObj.durationMonths} ${initialPlanObj.durationMonths === 1 ? 'Month' : 'Months'})`;

  // Single source of truth for registration form state
  const [formData, setFormData] = useState({
    fullName: '',
    name: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '2000-01-01',
    dob: '2000-01-01',
    phone: '',
    phoneNumber: '',
    mobile: '',
    email: '',
    emailAddress: '',
    address: '',
    emergencyContactNumber: '',
    emergencyContact: '',
    selectedPlan: initialPlanNameStr,
    selectedPlanId: initialPlanObj.id,
    plan: initialPlanNameStr,
    membershipPlan: initialPlanNameStr,
    fitnessGoal: 'Muscle Building & Fitness',
    goal: 'Muscle Building & Fitness',
    joiningDate: new Date().toISOString().split('T')[0],
    registrationFee: settings.registrationFeeDefault || 100,
    amount: settings.registrationFeeDefault || 100,
    fee: settings.registrationFeeDefault || 100,
    paymentMethod: 'UPI' as PaymentMethod,
    paymentMode: 'UPI' as PaymentMethod,
    upiTransactionId: '',
    transactionId: '',
    paymentScreenshotUrl: '',
    paymentScreenshot: '',
    medicalCondition: '',
    remarks: '',
    termsAccepted: false,
  });

  // Processing & Response States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedRoll, setGeneratedRoll] = useState('ABG-26-XXXX');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiClicked, setUpiClicked] = useState(false);
  const [noUpiAppFound, setNoUpiAppFound] = useState(false);
  const [submittedReg, setSubmittedReg] = useState<RegistrationRequest | null>(null);
  const [formError, setFormError] = useState('');

  // Auto Roll Number update preview on phone typing
  useEffect(() => {
    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 4) {
      const roll = generateRollNumber(cleanPhone);
      setGeneratedRoll(roll);
    } else {
      setGeneratedRoll('ABG-26-XXXX');
    }
  }, [formData.phone]);

  const selectedPlan = plans.find((p) => p.id === formData.selectedPlanId) || plans.find((p) => formData.selectedPlan.includes(p.name)) || plans[0] || initialPlanObj;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(AB_FITNESS_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUpiDeepLinkClick = () => {
    setUpiClicked(true);
    setNoUpiAppFound(false);

    const feeRefNote = formData.fullName.trim() ? `REG-${formData.fullName.trim().toUpperCase()}` : 'AB Fitness Fee';
    const regFee = settings.registrationFeeDefault || 100;

    const upiDeepLink =
      `upi://pay?pa=${encodeURIComponent(AB_FITNESS_UPI_ID)}` +
      `&pn=${encodeURIComponent("AB Fitness")}` +
      `&am=${encodeURIComponent(Number(regFee).toFixed(2))}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(feeRefNote || "AB Fitness Fee")}`;

    const startTime = Date.now();

    try {
      window.location.href = upiDeepLink;
    } catch (err) {
      setNoUpiAppFound(true);
    }

    setTimeout(() => {
      if (!document.hidden && Date.now() - startTime < 3000) {
        setNoUpiAppFound(true);
      }
    }, 1800);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setFormData(prev => ({
          ...prev,
          paymentScreenshotUrl: res,
          paymentScreenshot: res
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = {
        action: "submitRegistration",

        fullName: String(
          formData.fullName ||
          formData.name ||
          ""
        ).trim(),

        gender: String(
          formData.gender || ""
        ).trim(),

        dateOfBirth: String(
          formData.dateOfBirth ||
          formData.dob ||
          ""
        ).trim(),

        phone: String(
          formData.phone ||
          formData.mobile ||
          formData.phoneNumber ||
          ""
        ).replace(/\D/g, "").slice(-10),

        email: String(
          formData.email ||
          formData.emailAddress ||
          ""
        ).trim().toLowerCase(),

        address: String(
          formData.address || ""
        ).trim(),

        emergencyContactNumber: String(
          formData.emergencyContactNumber ||
          formData.emergencyContact ||
          ""
        ).replace(/\D/g, "").slice(-10),

        selectedPlan: String(
          formData.selectedPlan ||
          formData.plan ||
          formData.membershipPlan ||
          ""
        ).trim(),

        fitnessGoal: String(
          formData.fitnessGoal ||
          formData.goal ||
          ""
        ).trim(),

        joiningDate: String(
          formData.joiningDate || ""
        ).trim(),

        registrationFee: Number(
          formData.registrationFee ||
          formData.amount ||
          formData.fee ||
          0
        ),

        paymentMethod: String(
          formData.paymentMethod ||
          formData.paymentMode ||
          ""
        ).trim(),

        upiTransactionId: String(
          formData.upiTransactionId ||
          formData.transactionId ||
          ""
        ).trim(),

        paymentScreenshot: String(
          formData.paymentScreenshotUrl ||
          formData.paymentScreenshot ||
          ""
        ).trim(),

        termsAccepted:
          formData.termsAccepted === true,

        entrySource: "AB Gym Website",

        // Additional aliases for robust backend compatibility
        name: String(formData.fullName || formData.name || "").trim(),
        phoneNumber: String(formData.phone || formData.mobile || formData.phoneNumber || "").replace(/\D/g, "").slice(-10),
        emailAddress: String(formData.email || formData.emailAddress || "").trim().toLowerCase(),
        planName: String(formData.selectedPlan || formData.plan || formData.membershipPlan || "").trim(),
        dob: String(formData.dateOfBirth || formData.dob || "").trim(),
        emergencyContact: String(formData.emergencyContactNumber || formData.emergencyContact || "").replace(/\D/g, "").slice(-10),
        upiTxnId: String(formData.upiTransactionId || formData.transactionId || "").trim(),
        upiScreenshotUrl: String(formData.paymentScreenshotUrl || formData.paymentScreenshot || "").trim(),
      };

      if (!payload.fullName) {
        throw new Error("Full name is missing.");
      }

      if (!payload.dateOfBirth) {
        throw new Error("Date of birth is required.");
      }

      if (payload.phone.length !== 10) {
        throw new Error("Enter a valid 10-digit phone number.");
      }

      if (!payload.email) {
        throw new Error("Email address is missing.");
      }

      if (!payload.selectedPlan) {
        throw new Error("Please select a membership plan.");
      }

      if (!payload.paymentMethod) {
        throw new Error("Please select a payment method.");
      }

      if (!payload.termsAccepted) {
        throw new Error("Please accept the terms and conditions.");
      }

      console.log(
        "FINAL REGISTRATION PAYLOAD:",
        payload
      );

      setIsSubmitting(true);

      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      console.log("AB GYM BACKEND:", result);
      console.log(
        "REGISTRATION BACKEND RESULT:",
        result
      );

      if (!result.success) {
        throw new Error(
          result.message ||
          "Registration submission failed."
        );
      }

      setIsSubmitting(false);

      const regRef = result.registrationReferenceNumber || result.registrationRef || result.data?.registrationRef || '';
      if (!regRef) {
        throw new Error("Registration reference number was not returned by the server.");
      }

      // Trigger Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Dispatch confirmation email trigger
      if (payload.email) {
        apiService.sendConfirmationEmail({
          type: 'registration',
          email: payload.email,
          fullName: payload.fullName,
          registrationRef: regRef,
          selectedPlan: payload.selectedPlan,
        }).catch(() => {});
      }

      // Navigate user to /registration-success page with details
      onNavigate('/registration-success', {
        registrationRef: regRef,
        fullName: formData.fullName,
        selectedPlan: formData.selectedPlan || 'Selected Membership Plan',
        status: 'Pending Verification',
      });
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Error connecting to live Google Sheets registration service.');
    }
  };



  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-[#f5f5f4] bg-[#050505]">
      {/* Page Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
        <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.35em] italic flex items-center justify-center gap-2">
          <UserPlus className="w-3.5 h-3.5" />
          ONLINE ATHLETE REGISTRATION
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white font-display uppercase tracking-tighter">
          JOIN <span className="text-[#2563EB]">AB GYM</span>
        </h1>
        <p className="text-xs text-white/50 uppercase tracking-wider">
          Enter your details below. Your official AB Gym Roll Number is generated instantly upon entering your mobile number.
        </p>
      </div>

      {/* Main Registration Card */}
      <form onSubmit={handleSubmit} className={`bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative ${isSubmitting ? 'pointer-events-none opacity-90' : ''}`}>

        {/* Visual Loading Indicator during API Submission */}
        {isSubmitting && (
          <div className="p-4 bg-gradient-to-r from-blue-950/90 via-zinc-900 to-blue-950/90 border border-blue-500/50 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 shadow-xl shadow-blue-500/20">
            <div className="flex items-center gap-3.5">
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin absolute" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <span>Submitting Registration...</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                </h4>
                <p className="text-xs text-zinc-300 font-sans mt-0.5">
                  Registering member details & connecting to database. Please wait.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-[11px] font-mono text-blue-400 font-bold uppercase">API Request Active</span>
            </div>
          </div>
        )}

        {formError && (
          <div className="p-4 bg-blue-950/80 border border-blue-600 text-blue-300 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Grid Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider border-b border-zinc-800 pb-2 text-blue-400">
              1. Personal Details
            </h3>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Full Name <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value, name: e.target.value }))}
                placeholder="e.g. Vikram Sharma"
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Date of Birth <span className="text-blue-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value, dob: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Mobile Phone (10-Digits) <span className="text-blue-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, phone: val, phoneNumber: val, mobile: val }));
                  }}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white pl-3.5 pr-10 py-2.5 rounded-xl text-sm font-mono outline-none focus:border-blue-500"
                  required
                />
                <Phone className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Email Address <span className="text-blue-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value, emailAddress: e.target.value }))}
                placeholder="name@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Residential Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                placeholder="House No, Street, Colony, City..."
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2 rounded-xl text-sm outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Emergency Contact (Name & Phone)</label>
              <input
                type="text"
                value={formData.emergencyContactNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactNumber: e.target.value, emergencyContact: e.target.value }))}
                placeholder="e.g. 9868400000 (Father)"
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Membership Plan & Fitness Goals */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider border-b border-zinc-800 pb-2 text-blue-400">
              2. Plan & Goals Selection
            </h3>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Select Membership Plan <span className="text-blue-500">*</span>
              </label>
              <select
                value={formData.selectedPlan}
                onChange={(e) => {
                  const val = e.target.value;
                  const foundPlan = plans.find((p) => val.includes(p.name)) || plans[0];
                  setFormData(prev => ({
                    ...prev,
                    selectedPlan: val,
                    plan: val,
                    membershipPlan: val,
                    selectedPlanId: foundPlan ? foundPlan.id : prev.selectedPlanId
                  }));
                }}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
              >
                {plans.map((p) => {
                  const planStr = `${p.name} - ₹${p.price} (${p.durationMonths} ${p.durationMonths === 1 ? 'Month' : 'Months'})`;
                  return (
                    <option key={p.id} value={planStr}>
                      {p.name} — ₹{p.price} ({p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <p className="font-bold text-white text-xs">{selectedPlan.name} Highlights:</p>
              <p>{selectedPlan.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Primary Fitness Goal</label>
              <select
                value={formData.fitnessGoal}
                onChange={(e) => setFormData(prev => ({ ...prev, fitnessGoal: e.target.value, goal: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
              >
                <option value="Muscle Building & Strength">Muscle Building & Strength</option>
                <option value="Fat Loss & Caloric Burn">Fat Loss & Caloric Burn</option>
                <option value="CrossFit & Athletic Power">CrossFit & Athletic Power</option>
                <option value="General Fitness & Flexibility">General Fitness & Flexibility</option>
                <option value="Competition / Bodybuilding Prep">Competition / Bodybuilding Prep</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Pre-existing Medical Conditions (if any)</label>
              <input
                type="text"
                value={formData.medicalCondition}
                onChange={(e) => setFormData(prev => ({ ...prev, medicalCondition: e.target.value }))}
                placeholder="e.g. Mild Asthma, High BP, Knee Sensitivity"
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Additional Remarks / Requests</label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="e.g. Prefers morning workout slots"
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Payment Method & UPI QR */}
        <div className="border-t border-zinc-800 pt-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider text-blue-400">
            3. Registration Fee Payment Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Payment Method</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['UPI'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: m, paymentMode: m }))}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        formData.paymentMethod === m
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      Online / UPI Payment
                    </button>
                  ))}
                </div>
              </div>

              {formData.paymentMethod === 'UPI' && (
                <div className="space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      UPI Transaction Reference ID <span className="text-blue-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.upiTransactionId}
                      onChange={(e) => setFormData(prev => ({ ...prev, upiTransactionId: e.target.value, transactionId: e.target.value }))}
                      placeholder="e.g. UPI/20260723/89213401"
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm font-mono outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Upload Payment Screenshot (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs px-3 py-2 rounded-xl"
                    />
                    {formData.paymentScreenshotUrl && (
                      <p className="text-[10px] text-emerald-400 mt-1 font-semibold">✓ Screenshot attached</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* UPI Deep Link & QR Code Payment Box */}
            {formData.paymentMethod === 'UPI' && (() => {
              const feeRefNote = formData.fullName.trim() ? `REG-${formData.fullName.trim().toUpperCase()}` : 'AB Fitness Fee';
              const regFee = settings.registrationFeeDefault || 100;
              const upiUri =
                `upi://pay?pa=${encodeURIComponent(AB_FITNESS_UPI_ID)}` +
                `&pn=${encodeURIComponent("AB Fitness")}` +
                `&am=${encodeURIComponent(Number(regFee).toFixed(2))}` +
                `&cu=INR` +
                `&tn=${encodeURIComponent(feeRefNote || "AB Fitness Fee")}`;
              const generatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(upiUri)}`;
              const displayQrUrl = settings.qrCodeUrl?.trim() ? settings.qrCodeUrl : generatedQrUrl;

              return (
                <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-center space-y-4 shadow-xl">
                  {/* Header */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Direct UPI App Payment</span>
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Pay registration fee (₹{regFee}) instantly via installed UPI app
                    </p>
                  </div>

                  {/* Premium Button */}
                  <button
                    type="button"
                    onClick={handleUpiDeepLinkClick}
                    className="w-full py-3.5 px-5 rounded-xl font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 border border-emerald-400/30 min-h-[48px]"
                  >
                    <span className="text-base">🚀</span>
                    <span>Pay with UPI App</span>
                  </button>

                  {/* Supported UPI App Icons */}
                  <div className="pt-1">
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-2">Supported Apps:</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] font-bold text-zinc-200">
                        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.24 10.285V13.4h6.887c-.28 1.83-2.073 5.37-6.887 5.37-4.143 0-7.522-3.435-7.522-7.67s3.379-7.67 7.522-7.67c2.357 0 3.935.998 4.838 1.858l2.42-2.33C17.935 1.55 15.342.5 12.24.5 5.823.5.6 5.65.6 12s5.223 11.5 11.64 11.5c6.702 0 11.15-4.71 11.15-11.35 0-.763-.082-1.344-.18-1.865H12.24z"/>
                        </svg>
                        <span>Google Pay</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-purple-900/50 text-[11px] font-bold text-purple-300">
                        <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-extrabold shrink-0">पे</span>
                        <span>PhonePe</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-sky-900/50 text-[11px] font-bold text-sky-300">
                        <span className="px-1 py-0.5 rounded bg-sky-600 text-white text-[8px] font-black leading-none shrink-0">PAYTM</span>
                        <span>Paytm</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-amber-900/50 text-[11px] font-bold text-amber-300">
                        <span className="px-1 py-0.5 rounded bg-gradient-to-r from-orange-500 to-green-600 text-white text-[8px] font-black leading-none shrink-0">BHIM</span>
                        <span>BHIM</span>
                      </div>
                    </div>
                  </div>

                  {/* Return to page instructions after clicking button */}
                  {upiClicked && (
                    <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in duration-200">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-200 font-mono leading-relaxed font-medium">
                        After completing payment, return to this page and submit your UPI Transaction ID and payment screenshot.
                      </p>
                    </div>
                  )}

                  {/* Error notice if no UPI app found */}
                  {noUpiAppFound && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in duration-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200 font-mono leading-relaxed font-semibold">
                        No UPI application found. Please scan the QR code.
                      </p>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="relative my-3 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                    <span className="relative bg-zinc-950 px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">OR SCAN QR CODE BELOW</span>
                  </div>

                  {/* Alternative QR Code payment method */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">Scan Gym QR Code for Payment (₹{regFee}):</p>
                    <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden border-2 border-emerald-500/30 relative group">
                      <img
                        src={displayQrUrl}
                        alt="UPI Payment QR Code"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2 bg-zinc-900/80 px-3 py-2 rounded-xl border border-zinc-800 text-xs">
                      <span className="font-mono font-bold text-emerald-400">{AB_FITNESS_UPI_ID}</span>
                      <button
                        type="button"
                        onClick={handleCopyUPI}
                        className="text-blue-400 hover:text-white transition-colors cursor-pointer p-1"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Mandatory Terms & Conditions Acceptance Section */}
        <div className="bg-black/80 border border-white/10 p-5 sm:p-6 rounded-2xl space-y-3 transition-all hover:border-[#EF1D26]/40 shadow-lg">
          <label className="group relative flex items-start gap-3.5 cursor-pointer select-none">
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }));
                  if (e.target.checked && formError === 'You must accept the Terms & Conditions before continuing.') {
                    setFormError('');
                  }
                }}
                className="sr-only peer"
                required
              />
              <div
                className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                  formData.termsAccepted
                    ? 'bg-[#EF1D26] border-[#EF1D26] shadow-md shadow-[#EF1D26]/40 scale-100'
                    : 'border-zinc-500 bg-zinc-950 group-hover:border-[#EF1D26] scale-95'
                }`}
              >
                <Check
                  className={`w-3.5 h-3.5 text-white stroke-[3] transition-all duration-200 ${
                    formData.termsAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                />
              </div>
            </div>

            <span className="text-[14px] sm:text-[15px] text-white leading-relaxed font-normal">
              I have read, understood and agree to the AB Gym{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#EF1D26] hover:text-red-400 font-semibold underline underline-offset-4 decoration-[#EF1D26]/60 hover:decoration-[#EF1D26] transition-colors"
              >
                Terms & Conditions
              </a>{' '}
              and{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#EF1D26] hover:text-red-400 font-semibold underline underline-offset-4 decoration-[#EF1D26]/60 hover:decoration-[#EF1D26] transition-colors"
              >
                Privacy Policy
              </a>
              . I confirm that all information provided is accurate. I understand that membership fees are non-refundable, membership is non-transferable, and my registration and payment are subject to verification by AB Gym.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <div
          onClick={() => {
            if (!formData.termsAccepted) {
              setFormError('You must accept the Terms & Conditions before continuing.');
            }
          }}
          className="w-full"
        >
          <button
            type="submit"
            disabled={!formData.termsAccepted || isSubmitting}
            className={`w-full py-4 rounded-xl font-black text-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
              !formData.termsAccepted || isSubmitting
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5 opacity-60 shadow-none'
                : 'bg-gradient-to-r from-red-600 via-red-500 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-xl shadow-red-600/30 transform hover:-translate-y-0.5 cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>SUBMITTING REGISTRATION...</span>
              </>
            ) : (
              <>
                <span>REGISTER NOW</span>
                <span className="text-lg">&rarr;</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Registration Confirmation Modal */}
      {submittedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0F0F12] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white font-mono uppercase tracking-tight">
                THANK YOU FOR SUBMITTING!
              </h2>
              <p className="text-sm text-emerald-400 font-semibold leading-relaxed">
                Thank you for submitting the registration form! Our team will review & approve your application. Please come to the AB Fitness Office.
              </p>
            </div>

            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-3 text-left">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2 text-xs">
                <span className="text-zinc-400 font-semibold">Registration Reference Number:</span>
                <span className="font-mono text-sm font-bold text-red-400">{submittedReg.registrationRef}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2 text-xs">
                <span className="text-zinc-400 font-semibold">Member Name:</span>
                <span className="font-semibold text-white">{submittedReg.fullName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2 text-xs">
                <span className="text-zinc-400 font-semibold">Plan Selected:</span>
                <span className="font-bold text-white">{submittedReg.planName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Registration Status:</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Pending Verification
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-left">
              <p className="text-[11px] text-zinc-300 leading-normal">
                <strong className="text-red-400">Important:</strong> Please save your Registration Reference Number (<span className="font-mono text-white">{submittedReg.registrationRef}</span>). You will need it to pay your membership fee and check your registration status.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={() => onNavigate('/pay-fee', { registrationRef: submittedReg.registrationRef })}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Pay Membership Fee</span>
                <span>&rarr;</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const refToPass = submittedReg.registrationRef;
                    setSubmittedReg(null);
                    onNavigate('/pay-fee', { registrationRef: refToPass });
                  }}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all"
                >
                  Check Registration Status
                </button>
                <button
                  onClick={() => {
                    setSubmittedReg(null);
                    onNavigate('/');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold transition-all border border-zinc-800"
                >
                  Return Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
