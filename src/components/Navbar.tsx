import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Menu,
  X,
  CreditCard,
  UserPlus,
  ShieldCheck,
  PhoneCall,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { getStoredSettings, STORAGE_EVENT } from '../lib/storage';
import { GymSettings } from '../types';
import abGymLogo from '../assets/ab-gym-logo.png';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<GymSettings>(getStoredSettings());

  useEffect(() => {
    const handleStorageChange = () => {
      setSettings(getStoredSettings());
    };
    window.addEventListener(STORAGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(STORAGE_EVENT, handleStorageChange);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Plans', path: '/plans' },
    { name: 'Register', path: '/register' },
    { name: 'Pay Fee', path: '/pay-fee' },
    { name: 'Trainers', path: '/trainers' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Contact', path: '/contact' },
  ];

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 text-white transition-all">
      {/* Top Announcement Bar */}
      {settings.announcement && (
        <div className="bg-[#2563EB] text-white text-[11px] py-1.5 px-4 text-center font-bold tracking-widest uppercase flex items-center justify-center gap-2">
          <Flame className="w-4 h-4 animate-pulse text-white" />
          <span>{settings.announcement}</span>
          <button
            onClick={() => handleLinkClick('/register')}
            className="underline font-black hover:text-black transition-colors hidden sm:inline-block ml-2"
          >
            CLAIM OFFER &rarr;
          </button>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <button
            onClick={() => handleLinkClick('/')}
            className="flex items-center gap-3 group text-left focus:outline-none"
            id="brand-logo-btn"
          >
            <div className="relative flex items-center justify-center">
              <img
                src={abGymLogo}
                alt="AB Gym Official Logo"
                referrerPolicy="no-referrer"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallbackEl = document.getElementById('navbar-logo-fallback');
                  if (fallbackEl) fallbackEl.style.display = 'flex';
                }}
                className="h-[40px] md:h-[48px] w-auto object-contain transition-transform group-hover:scale-105 filter drop-shadow-[0_0_10px_rgba(37,99,235,0.3)]"
              />
              <div
                id="navbar-logo-fallback"
                style={{ display: 'none' }}
                className="items-center gap-2"
              >
                <div className="w-10 h-10 border border-[#2563EB]/40 rounded-full flex items-center justify-center bg-black">
                  <span className="font-black text-xs text-[#2563EB] font-mono">AB</span>
                </div>
                <span className="text-xl font-black tracking-tight text-white font-mono">
                  AB <span className="text-[#2563EB]">GYM</span>
                </span>
              </div>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleLinkClick(link.path)}
                  id={`nav-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                    isActive
                      ? 'text-[#2563EB] font-bold border-b-2 border-[#2563EB] pb-0.5'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.name}
                </button>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => handleLinkClick('/pay-fee')}
              id="desktop-pay-fee-btn"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold border transition-all ${
                currentPath === '/pay-fee'
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-white/90 border-white/20 hover:border-white hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="font-bold">PAY FEE</span>
            </button>

            <button
              onClick={() => handleLinkClick('/register')}
              id="desktop-register-btn"
              className="flex items-center gap-2 px-5 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold bg-[#2563EB] text-white hover:bg-white hover:text-black transition-all shadow-lg shadow-[#2563EB]/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>JOIN NOW</span>
            </button>

            <button
              onClick={() => handleLinkClick('/admin/login')}
              id="desktop-admin-btn"
              title="Admin Portal"
              className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center ${
                currentPath.startsWith('/admin')
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'bg-black text-white/60 border-white/20 hover:text-white hover:border-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => handleLinkClick('/pay-fee')}
              className="sm:hidden min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-700 text-blue-400 active:scale-95 transition-transform"
            >
              Pay Fee
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              id="mobile-menu-toggle-btn"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 focus:outline-none active:scale-95 transition-transform"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-blue-500" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0F0F12] border-b border-zinc-800 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-zinc-800/80">
            <button
              onClick={() => handleLinkClick('/register')}
              className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30 active:scale-95 transition-transform"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Now</span>
            </button>
            <button
              onClick={() => handleLinkClick('/pay-fee')}
              className="flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-200 border border-zinc-700 active:scale-95 transition-transform"
            >
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span>Pay Fee</span>
            </button>
          </div>

          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleLinkClick(link.path)}
                  className={`w-full flex items-center justify-between min-h-[44px] px-3.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] ${
                    isActive
                      ? 'bg-blue-950/50 text-blue-400 border border-blue-600/40'
                      : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  <span>{link.name}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              );
            })}
            <button
              onClick={() => handleLinkClick('/admin/login')}
              className="w-full flex items-center justify-between min-h-[44px] px-3.5 py-3 rounded-xl text-sm font-semibold text-zinc-400 bg-zinc-950 border border-zinc-800 mt-2 hover:text-blue-400 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Admin Portal
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>
          </div>

          <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-blue-500" />
              {settings.phone}
            </span>
            <span className="text-zinc-500">{settings.operatingHours.monSat}</span>
          </div>
        </div>
      )}
    </header>
  );
};
