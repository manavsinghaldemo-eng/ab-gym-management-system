import React from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Powering Up AB Gym...',
  fullScreen = true,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center select-none">
      {/* Animated Official AB Gym Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: [0.95, 1.05, 0.95] }}
        transition={{
          opacity: { duration: 0.5, ease: 'easeOut' },
          scale: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="relative flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full scale-125" />
        <img
          src="/assets/ab-gym-logo.png"
          alt="AB Gym Official Logo"
          referrerPolicy="no-referrer"
          loading="eager"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallbackEl = document.getElementById('loading-screen-logo-fallback');
            if (fallbackEl) fallbackEl.style.display = 'flex';
          }}
          className="h-28 sm:h-36 w-auto object-contain relative z-10 filter drop-shadow-[0_0_25px_rgba(37,99,235,0.5)]"
        />
        <div
          id="loading-screen-logo-fallback"
          style={{ display: 'none' }}
          className="items-center gap-3 relative z-10"
        >
          <div className="w-16 h-16 rounded-full border-2 border-blue-500 bg-black flex items-center justify-center">
            <span className="font-mono font-black text-blue-500 text-xl">AB</span>
          </div>
          <span className="text-3xl font-black text-white font-mono tracking-tight">
            AB <span className="text-blue-500">GYM</span>
          </span>
        </div>
      </motion.div>

      {/* Pulsing Loading Spinner & Status Text */}
      <div className="space-y-3 z-10">
        <div className="flex items-center justify-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
          />
          <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
            HIGH PERFORMANCE
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono tracking-wider">
          {message}
        </p>
      </div>
    </div>
  );

  if (!fullScreen) {
    return <div className="py-12 flex items-center justify-center">{content}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-[#050505] text-white flex items-center justify-center"
    >
      {content}
    </motion.div>
  );
};
