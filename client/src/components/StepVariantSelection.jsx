import React from 'react';
import { Check, Layers, ArrowLeft, ArrowRight, CheckSquare, Square, Wrench, Shield, Sparkles } from 'lucide-react';

export default function StepVariantSelection({
  variants = [],
  selectedVariantIds = [],
  setSelectedVariantIds,
  onBack,
  onNext
}) {

  const toggleVariant = (id) => {
    if (selectedVariantIds.includes(id)) {
      setSelectedVariantIds(selectedVariantIds.filter(vId => vId !== id));
    } else {
      setSelectedVariantIds([...selectedVariantIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedVariantIds(variants.map(v => v.id));
  };

  const clearAll = () => {
    setSelectedVariantIds([]);
  };

  const formatPrice = (price) => {
    if (!price) return 'Custom Quote';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  };

  const isValid = selectedVariantIds.length > 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Control bar */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Select Quoted Variants
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            The Template Subtraction Engine will preserve slides for selected variants and purge unselected variants.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={selectAll}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors"
          >
            Select All ({variants.length})
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-rose-400 transition-colors"
          >
            Clear Selection
          </button>
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
            {selectedVariantIds.length} of {variants.length} Selected
          </div>
        </div>
      </div>

      {/* Variants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {variants.map((variant) => {
          const isSelected = selectedVariantIds.includes(variant.id);
          const slideIndices = Array.isArray(variant.slideIndices) 
            ? variant.slideIndices 
            : (typeof variant.slideIndices === 'string' ? JSON.parse(variant.slideIndices || '[]') : []);

          return (
            <div
              key={variant.id}
              onClick={() => toggleVariant(variant.id)}
              className={`glass-panel cursor-pointer p-6 flex flex-col justify-between transition-all duration-200 border-2 ${
                isSelected
                  ? 'border-amber-500 bg-slate-900/90 shadow-xl shadow-amber-500/10'
                  : 'border-white/5 hover:border-white/20 bg-slate-900/40 opacity-85'
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="overflow-hidden">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block truncate">
                      {variant.category || 'Interior Specification'}
                    </span>
                    <h4 className="text-lg font-bold text-white mt-0.5 tracking-tight truncate">
                      {variant.name}
                    </h4>
                  </div>

                  {/* Checkbox Icon */}
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'border border-white/30 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                </div>

                {/* Price & Slide Mapping Badge */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <span className="text-xl font-extrabold text-amber-400 font-['Outfit']">
                    {formatPrice(variant.price)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono">
                    Slides: {slideIndices.join(', ')}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                  {variant.description}
                </p>

                {/* Specs List */}
                {variant.specs && (
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start space-x-2">
                      <Wrench className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-400">Carcass: </strong>
                        <span>{variant.specs.carcassMaterial}</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400/80 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-400">Shutters: </strong>
                        <span>{variant.specs.shutterFinish}</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-400/80 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-400">Hardware: </strong>
                        <span>{variant.specs.hardware}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Action */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className={`text-xs font-medium ${isSelected ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                  {isSelected ? '✓ Included in Quoted Presentation' : 'Click card to include'}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                  isSelected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-slate-400'
                }`}>
                  {isSelected ? 'Selected' : 'Select'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Details</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="btn-gold"
        >
          <span>Continue to Quotation Snips</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
