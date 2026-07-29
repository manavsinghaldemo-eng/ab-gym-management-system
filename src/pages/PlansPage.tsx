import React from 'react';
import { getStoredPlans } from '../lib/storage';
import { Check, ShieldCheck, Dumbbell, Sparkles, HelpCircle } from 'lucide-react';

interface PlansPageProps {
  onNavigate: (path: string, params?: Record<string, string>) => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ onNavigate }) => {
  const plans = getStoredPlans();

  const comparisonFeatures = [
    { name: 'Full Gym & Heavy Weight Floor', basic: true, standard: true, premium: true, annual: true },
    { name: 'Locker & Shower Facility', basic: true, standard: true, premium: true, annual: true },
    { name: 'CrossFit Rig & Functional Arena', basic: false, standard: true, premium: true, annual: true },
    { name: 'Zumba & Group Fitness Classes', basic: false, standard: true, premium: true, annual: true },
    { name: 'Personalized Diet Blueprint', basic: false, standard: '1 Session', premium: 'Monthly', annual: 'Unlimited' },
    { name: 'Personal Trainer Sessions', basic: false, standard: false, premium: '2 Sessions/mo', annual: '4 Sessions/mo' },
    { name: 'Steam & Sauna Access', basic: false, standard: '1x/week', premium: 'Unlimited', annual: 'Unlimited' },
    { name: 'Free AB Gym T-Shirt & Shaker', basic: false, standard: false, premium: false, annual: true },
    { name: 'Monthly Body Composition Analysis', basic: false, standard: false, premium: true, annual: true },
    { name: 'Free Monthly Guest Passes', basic: '0 Passes', standard: '0 Passes', premium: '2 Passes/mo', annual: '5 Passes/mo' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 text-zinc-100">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Dumbbell className="w-4 h-4" />
          Transparent Pricing
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white font-mono uppercase tracking-tight">
          MEMBERSHIP <span className="text-blue-500">PLANS</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Choose a plan that fits your athletic timeline. No hidden registration fees beyond the standard refundable deposit. Instant Roll Number generation on sign-up.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-zinc-900 border rounded-2xl p-6 flex flex-col justify-between transition-all hover:scale-[1.02] shadow-xl ${
              plan.popular
                ? 'border-blue-600 shadow-blue-950/50 bg-gradient-to-b from-zinc-900 via-[#081028] to-zinc-900'
                : 'border-zinc-800'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                {plan.badge}
              </span>
            )}

            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-xl font-black text-white font-mono">{plan.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white font-mono">
                    ₹{plan.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    / {plan.durationMonths} {plan.durationMonths === 1 ? 'Month' : 'Months'}
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-zinc-300">
                {plan.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onNavigate('/register', { plan: plan.id })}
              className={`w-full mt-8 py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                plan.popular
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700'
              }`}
            >
              Select & Register
            </button>
          </div>
        ))}
      </div>

      {/* Feature Comparison Matrix Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden p-6 space-y-6">
        <h3 className="text-xl font-black text-white font-mono uppercase border-b border-zinc-800 pb-4 text-center sm:text-left">
          COMPREHENSIVE <span className="text-blue-500">FEATURE MATRIX</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4">Basic (₹999)</th>
                <th className="py-3 px-4 text-blue-400">Standard (₹2499)</th>
                <th className="py-3 px-4">Premium (₹4499)</th>
                <th className="py-3 px-4">Annual VIP (₹7999)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {comparisonFeatures.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{row.name}</td>
                  <td className="py-3.5 px-4">
                    {typeof row.basic === 'boolean' ? (
                      row.basic ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )
                    ) : (
                      row.basic
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-blue-300">
                    {typeof row.standard === 'boolean' ? (
                      row.standard ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )
                    ) : (
                      row.standard
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {typeof row.premium === 'boolean' ? (
                      row.premium ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )
                    ) : (
                      row.premium
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-400">
                    {typeof row.annual === 'boolean' ? (
                      row.annual ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )
                    ) : (
                      row.annual
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
