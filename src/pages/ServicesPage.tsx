import React from 'react';
import {
  Dumbbell,
  Activity,
  Flame,
  Zap,
  Trophy,
  Heart,
  Apple,
  Music,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { RevealOnScroll } from '../components/RevealOnScroll';

interface ServicesPageProps {
  onNavigate: (path: string, params?: Record<string, string>) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigate }) => {
  const servicesList = [
    {
      id: 'strength',
      title: 'Strength Training',
      subtitle: 'Hypertrophy & Muscle Building',
      icon: Dumbbell,
      intensity: 'High Intensity',
      timings: 'Daily 05:00 AM - 10:00 PM',
      description: 'Heavy Rogue power racks, calibrated plates, Olympic barbells, and dumbbell racks up to 60 kg for serious muscle hyper-trophy.',
      benefits: ['Promotes muscular hypertrophy', 'Increases bone density & tendon strength', 'Custom exercise selection'],
      recommendedFor: 'Standard & Premium Plans',
    },
    {
      id: 'cardio',
      title: 'Cardio Training',
      subtitle: 'Endurance & Stamina',
      icon: Activity,
      intensity: 'Moderate to High',
      timings: 'Daily 05:00 AM - 10:00 PM',
      description: 'High-tech commercial treadmills with heart-rate tracking, stairmasters, ellipticals, and spin bikes to boost cardiovascular stamina.',
      benefits: ['Enhances lung & heart endurance', 'Burns heavy calories', 'Reduces visceral body fat'],
      recommendedFor: 'All Plans',
    },
    {
      id: 'weight-loss',
      title: 'Weight Loss Programs',
      subtitle: 'Fat Shredding & Transformation',
      icon: Flame,
      intensity: 'High Intensity',
      timings: 'Mon-Sat 06:00 AM & 06:00 PM',
      description: 'Scientific fat reduction protocols combining high-intensity interval training (HIIT), bodyweight drills, and caloric deficit guidance.',
      benefits: ['Accelerated caloric burn', 'Targets belly & visceral fat', 'Includes weekly weigh-in tracking'],
      recommendedFor: 'Standard & Premium Plans',
    },
    {
      id: 'crossfit',
      title: 'CrossFit Arena',
      subtitle: 'Explosive Power & Athleticism',
      icon: Zap,
      intensity: 'Maximum Intensity',
      timings: 'Mon-Sat 07:00 AM & 07:00 PM',
      description: 'Dedicated functional rig, wall balls, plyo boxes, kettlebells, and battle ropes engineered for multi-planar functional fitness.',
      benefits: ['Builds functional power & agility', 'Enhances mental grit', 'High-energy community WODs'],
      recommendedFor: 'Standard, Premium & Annual',
    },
    {
      id: 'pt',
      title: 'Personal Training',
      subtitle: '1-on-1 Dedicated Coaching',
      icon: Trophy,
      intensity: 'Tailored to Goal',
      timings: 'By Appointment',
      description: 'Direct 1-on-1 attention from certified fitness coaches. Form correction, personalized macro tracking, and rapid result guarantees.',
      benefits: ['100% focused personal guidance', 'Zero room for injury', 'Fast-tracked body transformation'],
      recommendedFor: 'Premium & Annual VIP Plans',
    },
    {
      id: 'functional',
      title: 'Functional Training',
      subtitle: 'Core & Mobility Restoration',
      icon: Heart,
      intensity: 'Moderate Intensity',
      timings: 'Mon-Sat 08:00 AM & 05:00 PM',
      description: 'TRX suspension systems, resistance bands, Swiss balls, and mobility exercises designed to prevent injury and fix postural imbalances.',
      benefits: ['Improves joint posture & flexibility', 'Relieves lower back stiffness', 'Strengthens core stability'],
      recommendedFor: 'All Plans',
    },
    {
      id: 'diet',
      title: 'Diet Consultation',
      subtitle: 'Macro & Micro Nutrition',
      icon: Apple,
      intensity: 'Nutritional Blueprint',
      timings: 'Mon-Sat 10:00 AM - 02:00 PM',
      description: 'Comprehensive nutritional blueprints created by clinical dietitians based on your daily caloric burn, target weight, and dietary preferences.',
      benefits: ['Custom macronutrient breakdown', 'Indian meal options & vegetarian charts', 'Weekly diet check-ins'],
      recommendedFor: 'Standard, Premium & Annual',
    },
    {
      id: 'zumba',
      title: 'Zumba & Group Fitness',
      subtitle: 'Rhythm Cardio & Fun Workouts',
      icon: Music,
      intensity: 'High Fun & Cardio',
      timings: 'Tue/Thu/Sat 06:30 PM',
      description: 'Latin dance rhythm workouts led by certified ZIN instructors. Burn up to 600 calories per session while dancing to energetic music.',
      benefits: ['Fun cardio workout', 'Stress relief & stamina booster', 'Vibrant group atmosphere'],
      recommendedFor: 'Standard & Premium Plans',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 text-zinc-100">
      {/* Page Header */}
      <RevealOnScroll direction="up" delayMs={50}>
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Dumbbell className="w-4 h-4" />
            Full Spectrum Fitness
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-mono uppercase tracking-tight">
            AB GYM <span className="text-blue-500">SERVICES</span>
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Explore our 8 specialized training modules designed to cater to every fitness goal, from muscle building to Zumba cardio and clinical nutrition.
          </p>
        </div>
      </RevealOnScroll>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {servicesList.map((srv, idx) => {
          const IconComponent = srv.icon;
          return (
            <RevealOnScroll
              key={srv.id}
              direction="up"
              delayMs={(idx % 2) * 100 + Math.floor(idx / 2) * 60}
              className="h-full"
            >
              <div className="bg-zinc-900/80 border border-zinc-800 hover:border-blue-600/50 p-6 rounded-2xl flex flex-col justify-between transition-all group shadow-xl h-full">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-600/40 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white font-mono">{srv.title}</h3>
                        <p className="text-xs text-blue-400 font-semibold">{srv.subtitle}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      {srv.intensity}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">{srv.description}</p>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Key Benefits:</p>
                    <ul className="space-y-1 text-xs text-zinc-300">
                      {srv.benefits.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {srv.timings}
                  </span>
                  <button
                    onClick={() => onNavigate('/register')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/40 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Book & Register</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>
    </div>
  );
};
