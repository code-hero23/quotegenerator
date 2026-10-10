import React from 'react';
import { UserCheck, Layers, LayoutGrid, Image as ImageIcon, Sparkles, Send } from 'lucide-react';

const steps = [
  { id: 1, label: 'Client & Rep', desc: 'Contact & Details', icon: UserCheck },
  { id: 2, label: 'Variants', desc: 'Choose Variants', icon: Layers },
  { id: 3, label: 'Units Snips', desc: 'Unit Pages (+)', icon: LayoutGrid },
  { id: 4, label: 'Quotation Snips', desc: 'Pricing Breakdown', icon: ImageIcon },
  { id: 5, label: 'Accessories', desc: 'Hardware & Fittings (+)', icon: Sparkles },
  { id: 6, label: 'Generate & Export', desc: 'Dual PPTX & PDF', icon: Send }
];

export default function StepIndicator({ currentStep, onSelectStep }) {
  const currentStepData = steps.find(s => s.id === currentStep) || steps[0];
  const progressPercent = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="w-full py-2 sm:py-4 space-y-2">
      {/* Mobile Top Progress Summary (Visible on small screens < 640px) */}
      <div className="sm:hidden glass-panel p-3 bg-white/90 border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
              {currentStep}
            </span>
            <span className="font-bold text-slate-900">{currentStepData.label}</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 font-mono">
            Step {currentStep} of {steps.length} ({progressPercent}%)
          </span>
        </div>

        {/* 6-Segment Progress Bar */}
        <div className="grid grid-cols-6 gap-1 h-1.5 w-full">
          {steps.map(s => (
            <div
              key={s.id}
              className={`rounded-full transition-all duration-300 ${
                s.id < currentStep
                  ? 'bg-emerald-500'
                  : s.id === currentStep
                  ? 'bg-amber-500'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Mobile Horizontal Scrollable Step Pills (< 640px) */}
      <div className="sm:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/25 ring-2 ring-amber-300/50'
                  : isDone
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[100px]">{step.label}</span>
              {isDone && <span className="text-[9px] bg-emerald-200/80 text-emerald-900 px-1 rounded font-bold">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Desktop / Tablet Full Grid (Visible >= 640px) */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`flex items-center space-x-3.5 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
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
