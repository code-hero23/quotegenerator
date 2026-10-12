import React from 'react';
import { Check, Layers, ArrowLeft, ArrowRight, Wrench, Shield, Sparkles } from 'lucide-react';

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

  const isValid = selectedVariantIds.length > 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Control bar */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            Select Quoted Variants
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            The Template Subtraction Engine will preserve slides for selected variants and purge unselected variants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={selectAll}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors text-center"
          >
            Select All ({variants.length})
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 border border-slate-200 text-xs font-semibold text-rose-600 transition-colors text-center"
          >
            Clear
          </button>
          <div className="w-full sm:w-auto text-center px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-xs font-bold text-amber-800">
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
                  ? 'border-amber-500 bg-amber-50/20 shadow-md ring-1 ring-amber-300/40'
                  : 'border-slate-200 hover:border-slate-300 bg-white shadow-xs'
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="overflow-hidden">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block truncate">
                      {variant.category || 'Interior Specification'}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 tracking-tight truncate">
                      {variant.name}
                    </h4>
                  </div>

                  {/* Checkbox Icon */}
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-white font-bold shadow-xs'
                        : 'border border-slate-300 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                </div>

                {/* Slide Mapping Badge */}
                <div className="flex items-center justify-end mb-4 pb-3 border-b border-slate-200">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold">
                    Slides: {slideIndices.join(', ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                  {variant.description}
                </p>

                {/* Specs List */}
                {variant.specs && (
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex items-start space-x-2">
                      <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-500">Carcass: </strong>
                        <span>{variant.specs.carcassMaterial}</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-500">Shutters: </strong>
                        <span>{variant.specs.shutterFinish}</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-500">Hardware: </strong>
                        <span>{variant.specs.hardware}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Action */}
              <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className={`text-xs font-semibold ${isSelected ? 'text-amber-800' : 'text-slate-500'}`}>
                  {isSelected ? '✓ Included in Quoted Presentation' : 'Click card to include'}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                  isSelected ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isSelected ? 'Selected' : 'Select'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Details</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="btn-gold w-full sm:w-auto"
        >
          <span>Continue to Units Snips</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
