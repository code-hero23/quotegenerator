import React from 'react';
import { UserCheck, Layers, Image as ImageIcon, Send } from 'lucide-react';

const steps = [
  { id: 1, label: 'Client & Sales Rep', desc: 'Contact & Cover Details', icon: UserCheck },
  { id: 2, label: 'Variant Selection', desc: 'Choose Template Variants', icon: Layers },
  { id: 3, label: 'Quotation Snips', desc: 'Attach Pricing Tables', icon: ImageIcon },
  { id: 4, label: 'Generate & Export', desc: 'Compile & Download PPTX', icon: Send }
];

export default function StepIndicator({ currentStep, onSelectStep }) {
  return (
    <div className="w-full py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`flex items-center space-x-3.5 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : isDone
                  ? 'bg-slate-900/60 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-slate-900/30 border-white/5 hover:border-white/20 opacity-70'
              }`}
            >
              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Step Info */}
              <div className="overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Step 0{step.id}
                  </span>
                  {isDone && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                      Done
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-amber-400' : 'text-slate-200'}`}>
                  {step.label}
                </h4>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
