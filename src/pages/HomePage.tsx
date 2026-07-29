import React, { useState } from 'react';
import {
  Dumbbell,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Trophy,
  Flame,
  CreditCard,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Activity,
  Award,
  Clock,
  Check,
} from 'lucide-react';
import { getStoredPlans, getStoredTrainers, getStoredGallery, getStoredSettings } from '../lib/storage';
import { RevealOnScroll } from '../components/RevealOnScroll';

interface HomePageProps {
  onNavigate: (path: string, params?: Record<string, string>) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const plans = getStoredPlans();
  const trainers = getStoredTrainers();
  const gallery = getStoredGallery();
  const settings = getStoredSettings();

  // Quick Roll Number Fee Lookup Widget State
  const [quickRollInput, setQuickRollInput] = useState('');
  const [lookupError, setLookupError] = useState('');

  // BMI Calculator State
  const [weightKg, setWeightKg] = useState<number | ''>(70);
  const [heightCm, setHeightCm] = useState<number | ''>(175);
  const [bmiResult, setBmiResult] = useState<{ bmi: number; category: string; color: string } | null>(null);

  const handleQuickLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRollInput.trim()) {
      setLookupError('Please enter a Roll Number or Mobile Number.');
      return;
    }
    onNavigate('/pay-fee', { roll: quickRollInput.trim().toUpperCase() });
  };

  const calculateBMI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg || !heightCm) return;
    const heightM = heightCm / 100;
    const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

    let category = 'Normal weight';
    let color = 'text-emerald-400';
    if (bmi < 18.5) {
      category = 'Underweight';
      color = 'text-amber-400';
    } else if (bmi >= 25 && bmi < 29.9) {
      category = 'Overweight';
      color = 'text-amber-400';
    } else if (bmi >= 30) {
      category = 'Obese';
      color = 'text-red-500';
    }

    setBmiResult({ bmi, category, color });
  };

  return (
    <div className="space-y-24 pb-20 text-[#f5f5f4] bg-[#050505]">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden pt-12 pb-20 border-b border-white/10 w-full">
        {/* Dark Gradient Overlay behind hero text */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent pointer-events-none z-0" />

        <div className="hero-content-wrapper relative z-10 w-full">
          {/* DESKTOP VIEW (>= 768px) - Untouched Layout */}
          <div className="hidden md:block w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Main Hero Headline */}
              <div className="lg:col-span-8 flex flex-col justify-center space-y-6">
                <div className="hero-label text-[#2563EB] italic flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                  <span>HIGH PERFORMANCE FITNESS / 2026</span>
                </div>

                <h1 className="hero-heading select-none">
                  <span className="text-white block">TRANSFORM</span>
                  <span className="text-white block">YOUR BODY</span>
                  <span className="text-[#2563EB] block">
                    <span className="block md:inline">FORGE </span>
                    <span className="block md:inline">LEGACY</span>
                  </span>
                </h1>

                <p className="hero-paragraph">
                  A high-performance arena at the intersection of raw strength and physical precision. High-tech cardio, heavy powerlifting, and elite certified coaches.
                </p>

                {/* CTA Buttons Desktop */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                  <button
                    onClick={() => onNavigate('/register')}
                    className="btn-hero px-8 py-4 rounded-full bg-[#2563EB] hover:bg-white text-white hover:text-black transition-all shadow-xl shadow-[#2563EB]/25 flex items-center justify-center gap-3"
                  >
                    <span>BECOME A MEMBER</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => onNavigate('/pay-fee')}
                    className="btn-hero px-7 py-4 rounded-full bg-black hover:bg-white/10 text-white border border-white/20 transition-all flex items-center justify-center gap-2.5"
                  >
                    <CreditCard className="w-5 h-5 text-[#2563EB]" />
                    <span>PAY FEE ONLINE</span>
                  </button>
                </div>
              </div>

              {/* Sidebar / Quick Lookup Widget Desktop */}
              <div className="lg:col-span-4 border border-white/10 bg-[#0A0A0A] p-6 sm:p-8 rounded-3xl space-y-6">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#2563EB] font-bold italic">
                    Instant Access
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono uppercase tracking-tight">
                    QUICK FEE LOOKUP
                  </h3>
                  <p className="text-xs text-white/40">
                    Enter your Member Roll Number or Mobile to process fee payments instantly.
                  </p>
                </div>

                <form onSubmit={handleQuickLookup} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`e.g. ABG-26-2431 or ${settings.phone}`}
                      value={quickRollInput}
                      onChange={(e) => {
                        setQuickRollInput(e.target.value);
                        setLookupError('');
                      }}
                      className="w-full bg-black border border-white/20 focus:border-[#2563EB] text-white px-4 py-3 rounded-xl text-xs font-mono placeholder:text-white/20 outline-none transition-colors"
                    />
                    <Search className="w-4 h-4 text-white/40 absolute right-3.5 top-3.5" />
                  </div>

                  {lookupError && <p className="text-xs text-[#2563EB] font-bold">{lookupError}</p>}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-white text-black hover:bg-[#2563EB] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <span>SEARCH MEMBER RECORD</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="pt-4 border-t border-white/10 space-y-2 text-[11px] text-white/50">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Working Hours</span>
                    <span className="text-white font-bold">05:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Support Line</span>
                    <span className="text-[#2563EB] font-bold">+91 {settings.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar Desktop */}
            <div className="max-w-7xl mx-auto w-full pt-16 grid grid-cols-4 gap-6 border-t border-white/10 mt-16">
              <div className="border-l border-white/10 pl-6 space-y-1">
                <p className="text-4xl sm:text-5xl font-black text-white font-display tracking-tighter">1,500+</p>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">ACTIVE MEMBERS</p>
              </div>
              <div className="border-l border-white/10 pl-6 space-y-1">
                <p className="text-4xl sm:text-5xl font-black text-[#2563EB] font-display tracking-tighter">12+</p>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">ELITE COACHES</p>
              </div>
              <div className="border-l border-white/10 pl-6 space-y-1">
                <p className="text-4xl sm:text-5xl font-black text-white font-display tracking-tighter">98%</p>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">SUCCESS RATE</p>
              </div>
              <div className="border-l border-white/10 pl-6 space-y-1">
                <p className="text-4xl sm:text-5xl font-black text-[#2563EB] font-display tracking-tighter">20,000</p>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">SQ FT ARENA</p>
              </div>
            </div>
          </div>

          {/* MOBILE VIEW (< 768px) - Single Column Layout */}
          <div className="block md:hidden w-full space-y-7">
            {/* Main Headline & Paragraph */}
            <div className="flex flex-col space-y-5">
              <div className="hero-label text-[#2563EB] italic flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                <span>HIGH PERFORMANCE FITNESS / 2026</span>
              </div>

              <h1 className="hero-heading select-none">
                <span className="text-white block">TRANSFORM</span>
                <span className="text-white block">YOUR BODY</span>
                <span className="text-[#2563EB] block">
                  <span className="inline">FORGE </span>
                  <span className="inline">LEGACY</span>
                </span>
              </h1>

              <p className="hero-paragraph">
                A high-performance arena at the intersection of raw strength and physical precision. High-tech cardio, heavy powerlifting, and elite certified coaches.
              </p>
            </div>

            {/* mobile-action-stats-wrapper */}
            <div className="mobile-action-stats-wrapper">
              {/* 1. Action Buttons Container */}
              <div className="action-buttons">
                <button
                  onClick={() => onNavigate('/register')}
                  className="btn-hero bg-[#2563EB] hover:bg-white text-white hover:text-black transition-all shadow-xl shadow-[#2563EB]/25 flex items-center justify-center gap-3 w-full font-extrabold text-xs sm:text-sm uppercase tracking-wider min-h-[52px] rounded-2xl p-4 box-border cursor-pointer"
                >
                  <span>BECOME A MEMBER</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </button>

                <button
                  onClick={() => onNavigate('/pay-fee')}
                  className="btn-hero bg-black hover:bg-white/10 text-white border border-white/20 transition-all flex items-center justify-center gap-2.5 w-full font-extrabold text-xs sm:text-sm uppercase tracking-wider min-h-[52px] rounded-2xl p-4 box-border cursor-pointer"
                >
                  <CreditCard className="w-5 h-5 text-[#2563EB] shrink-0" />
                  <span>PAY FEE ONLINE</span>
                </button>
              </div>

              {/* 2. Statistics Grid */}
              <div className="stats-grid">
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 flex flex-col justify-center space-y-1 min-w-0 overflow-hidden box-border">
                  <p className="text-2xl font-black text-white font-display tracking-tight break-words">1,500+</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold leading-tight">ACTIVE MEMBERS</p>
                </div>
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 flex flex-col justify-center space-y-1 min-w-0 overflow-hidden box-border">
                  <p className="text-2xl font-black text-[#2563EB] font-display tracking-tight break-words">12+</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold leading-tight">ELITE COACHES</p>
                </div>
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 flex flex-col justify-center space-y-1 min-w-0 overflow-hidden box-border">
                  <p className="text-2xl font-black text-white font-display tracking-tight break-words">98%</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold leading-tight">SUCCESS RATE</p>
                </div>
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 flex flex-col justify-center space-y-1 min-w-0 overflow-hidden box-border">
                  <p className="text-2xl font-black text-[#2563EB] font-display tracking-tight break-words">20,000+</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold leading-tight">SQ FT ARENA</p>
                </div>
              </div>

              {/* 3. Quick Fee Lookup Card */}
              <div className="w-full border border-white/10 bg-[#0A0A0A] p-6 rounded-3xl space-y-6 box-border">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#2563EB] font-bold italic">
                    Instant Access
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono uppercase tracking-tight">
                    QUICK FEE LOOKUP
                  </h3>
                  <p className="text-xs text-white/40">
                    Enter your Member Roll Number or Mobile to process fee payments instantly.
                  </p>
                </div>

                <form onSubmit={handleQuickLookup} className="space-y-3 w-full">
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder={`e.g. ABG-26-2431 or ${settings.phone}`}
                      value={quickRollInput}
                      onChange={(e) => {
                        setQuickRollInput(e.target.value);
                        setLookupError('');
                      }}
                      className="w-full bg-black border border-white/20 focus:border-[#2563EB] text-white px-4 py-3.5 rounded-xl text-xs font-mono placeholder:text-white/20 outline-none transition-colors box-border pr-10"
                    />
                    <Search className="w-4 h-4 text-white/40 absolute right-3.5 top-4" />
                  </div>

                  {lookupError && <p className="text-xs text-[#2563EB] font-bold">{lookupError}</p>}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-white text-black hover:bg-[#2563EB] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 box-border"
                  >
                    <span>SEARCH MEMBER RECORD</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="pt-4 border-t border-white/10 space-y-2 text-[11px] text-white/50">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Working Hours</span>
                    <span className="text-white font-bold">05:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Support Line</span>
                    <span className="text-[#2563EB] font-bold">+91 {settings.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <RevealOnScroll direction="up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.3em] italic flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                WORLD CLASS FACILITIES
              </span>
              <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase font-display">
                PREMIUM <span className="text-[#2563EB]">SERVICES</span>
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/services')}
              className="text-xs font-bold text-white hover:text-[#2563EB] uppercase tracking-[0.2em] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>VIEW ALL SERVICES</span>
              <ArrowRight className="w-4 h-4 text-[#2563EB]" />
            </button>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'STRENGTH TRAINING',
              desc: 'Heavy Rogue power racks, Olympic barbells, plate-loaded machines for muscular hypertrophy.',
              icon: Dumbbell,
            },
            {
              title: 'CARDIO & FAT LOSS',
              desc: 'Treadmills, stairmasters, spin bikes, and metabolic conditioning for rapid fat burn.',
              icon: Activity,
            },
            {
              title: 'CROSSFIT ARENA',
              desc: 'Functional rigs, bumper plates, kettlebells, battle ropes for explosive power.',
              icon: Zap,
            },
            {
              title: 'PERSONAL TRAINING',
              desc: '1-on-1 dedicated fitness blueprint, custom diet, and posture correction by elite coaches.',
              icon: Trophy,
            },
          ].map((srv, idx) => {
            const IconComp = srv.icon;
            return (
              <RevealOnScroll key={idx} delayMs={idx * 100} direction="up">
                <div
                  className="bg-[#0A0A0A] border border-white/10 hover:border-[#2563EB] p-8 rounded-2xl transition-all group hover:-translate-y-1 h-full flex flex-col"
                >
                  <div className="w-12 h-12 rounded-full border border-white/20 bg-black text-[#2563EB] flex items-center justify-center mb-6 group-hover:bg-[#2563EB] group-hover:text-white group-hover:border-[#2563EB] transition-colors shrink-0">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-white font-display tracking-tight mb-3 uppercase">{srv.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed font-normal">{srv.desc}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      {/* Membership Plans Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <RevealOnScroll direction="up">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.35em] italic">
              FLEXIBLE SUBSCRIPTIONS
            </span>
            <h2 className="text-4xl sm:text-6xl font-black text-white font-display uppercase tracking-tighter">
              MEMBERSHIP <span className="text-[#2563EB]">PLANS</span>
            </h2>
            <p className="text-xs text-white/50 max-w-xl mx-auto uppercase tracking-wider">
              Transparent pricing with zero hidden charges. Instant digital roll generation.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, idx) => (
            <RevealOnScroll key={plan.id} delayMs={idx * 100} direction="up">
              <div
                className={`relative bg-[#0A0A0A] border rounded-3xl p-8 flex flex-col justify-between transition-all hover:scale-[1.02] h-full ${
                  plan.popular
                    ? 'border-[#2563EB] shadow-2xl shadow-[#2563EB]/10'
                    : 'border-white/10'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#2563EB] text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-md z-10">
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-6">
                    <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white font-display tracking-tight">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider">
                        / {plan.durationMonths} {plan.durationMonths === 1 ? 'Month' : 'Months'}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-white/70 font-medium">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onNavigate('/register', { plan: plan.id })}
                  className={`w-full mt-8 py-3.5 rounded-full text-xs font-black tracking-[0.2em] uppercase transition-all cursor-pointer ${
                    plan.popular
                      ? 'bg-[#2563EB] hover:bg-white text-white hover:text-black shadow-lg shadow-[#2563EB]/25'
                      : 'bg-black border border-white/20 hover:border-white text-white'
                  }`}
                >
                  SELECT PLAN
                </button>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Interactive BMI & Fitness Health Calculator */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll direction="up">
          <div className="bg-[#0A0A0A] border border-white/10 p-8 sm:p-12 rounded-3xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.35em] italic flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  HEALTH & PERFORMANCE TOOLKIT
                </span>
                <h3 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tighter uppercase">
                  CALCULATE YOUR <span className="text-[#2563EB]">BMI SCORE</span>
                </h3>
                <p className="text-xs text-white/50 leading-relaxed font-normal">
                  Body Mass Index provides an instant biometric estimate. Calculate your proportions to select optimal training intensity at AB Gym.
                </p>
              </div>

              <form onSubmit={calculateBMI} className="bg-black p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-white/60 mb-2">WEIGHT (KG)</label>
                    <input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value) || '')}
                      className="w-full bg-[#0A0A0A] border border-white/20 text-white px-4 py-3 rounded-xl text-xs font-mono outline-none focus:border-[#2563EB]"
                      placeholder="70"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-white/60 mb-2">HEIGHT (CM)</label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value) || '')}
                      className="w-full bg-[#0A0A0A] border border-white/20 text-white px-4 py-3 rounded-xl text-xs font-mono outline-none focus:border-[#2563EB]"
                      placeholder="175"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#2563EB] hover:bg-white text-white hover:text-black font-black text-xs rounded-xl transition-colors uppercase tracking-[0.2em] cursor-pointer"
                >
                  COMPUTE BMI SCORE
                </button>

                {bmiResult && (
                  <div className="mt-4 p-4 bg-[#0A0A0A] rounded-xl border border-white/10 text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-white/40">CALCULATED RESULT</p>
                    <p className="text-4xl font-black text-white font-display tracking-tight">{bmiResult.bmi}</p>
                    <p className={`text-xs font-bold uppercase tracking-wider ${bmiResult.color}`}>CATEGORY: {bmiResult.category}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Trainer Spotlight Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <RevealOnScroll direction="up">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-white/10 pb-8">
            <div>
              <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.35em] italic">
                CERTIFIED MENTORS
              </span>
              <h2 className="text-4xl sm:text-6xl font-black text-white font-display uppercase tracking-tighter">
                MEET OUR <span className="text-[#2563EB]">COACHES</span>
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/trainers')}
              className="text-xs font-bold text-white hover:text-[#2563EB] uppercase tracking-[0.2em] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>VIEW ALL TRAINERS</span>
              <ArrowRight className="w-4 h-4 text-[#2563EB]" />
            </button>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trainers.map((tr, idx) => (
            <RevealOnScroll key={tr.id} delayMs={idx * 100} direction="up">
              <div
                className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden group hover:border-[#2563EB] transition-all h-full flex flex-col"
              >
                <div className="relative h-64 overflow-hidden shrink-0">
                  <img
                    src={tr.imageUrl}
                    alt={tr.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-[#2563EB] text-white text-[9px] font-black uppercase tracking-widest">
                    {tr.experience} EXP
                  </span>
                </div>
                <div className="p-6 space-y-2 flex-1">
                  <h3 className="font-black text-white text-base font-display uppercase tracking-tight">{tr.name}</h3>
                  <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">{tr.role}</p>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{tr.bio}</p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Gallery Showcase Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <RevealOnScroll direction="up">
          <div className="flex justify-between items-end border-b border-white/10 pb-8">
            <div>
              <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.35em] italic">
                INSIDE AB GYM
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-white font-display uppercase tracking-tighter">
                ARENA <span className="text-[#2563EB]">GALLERY</span>
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/gallery')}
              className="text-xs font-bold text-white hover:text-[#2563EB] uppercase tracking-[0.2em] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>EXPLORE GALLERY</span>
              <ArrowRight className="w-4 h-4 text-[#2563EB]" />
            </button>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {gallery.slice(0, 6).map((item, idx) => (
            <RevealOnScroll key={item.id} delayMs={idx * 80} direction="up">
              <div
                onClick={() => onNavigate('/gallery')}
                className="relative h-56 rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-[#2563EB] transition-colors"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors flex items-end p-5">
                  <div>
                    <p className="text-xs font-black text-white font-display uppercase tracking-wider">{item.title}</p>
                    <p className="text-[10px] text-[#2563EB] font-bold uppercase tracking-widest">{item.category}</p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>
    </div>
  );
};
