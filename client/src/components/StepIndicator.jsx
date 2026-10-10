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
    <div className="w-full py-4">
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
                  ? 'bg-amber-50/80 border-amber-400 shadow-sm ring-1 ring-amber-300/50'
                  : isDone
                  ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-80'
              }`}
            >
              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Step Info */}
              <div className="overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Step 0{step.id}
                  </span>
                  {isDone && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                      Done
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-bold truncate ${isActive ? 'text-amber-800' : isDone ? 'text-emerald-900' : 'text-slate-700'}`}>
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
