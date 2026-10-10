import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, ArrowLeft, ArrowRight, CheckCircle2, FileImage } from 'lucide-react';

export default function StepSnipUpload({
  variants = [],
  selectedVariantIds = [],
  snipFiles = {},
  setSnipFiles,
  onBack,
  onNext
}) {

  const selectedVariants = variants.filter(v => selectedVariantIds.includes(v.id));

  const handleFileChange = (variantId, file) => {
    if (!file) return;
    setSnipFiles(prev => ({
      ...prev,
      [variantId]: file
    }));
  };

  const removeFile = (variantId) => {
    setSnipFiles(prev => {
      const copy = { ...prev };
      delete copy[variantId];
      return copy;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Informative Header */}
      <div className="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-400" />
            Quotation Snips & Itemized Tables
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Attach screenshot snips of your itemized pricing breakdown. The backend will automatically inject each image into its respective variant Quotation slide.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300 shrink-0">
          Optional • You may skip if not using snips
        </div>
      </div>

      {/* Grid of Snip Dropzones per Selected Variant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedVariants.map((variant) => {
          const file = snipFiles[variant.id];
          const slideIndices = Array.isArray(variant.slideIndices) 
            ? variant.slideIndices 
            : (typeof variant.slideIndices === 'string' ? JSON.parse(variant.slideIndices || '[]') : []);
          const quoteSlide = slideIndices.length >= 3 ? slideIndices[2] : 'Quotation Slide';

          return (
            <div key={variant.id} className="glass-panel p-6 space-y-4">
              
              {/* Variant Title & Quote Slide Tag */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-base">{variant.name}</h4>
                  <span className="text-xs text-amber-400 font-medium">Injected on Slide {quoteSlide}</span>
                </div>
                {file && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Attached
                  </span>
                )}
              </div>

              {/* Upload Drop Zone / Preview */}
              {file ? (
                <div className="relative rounded-xl border border-emerald-500/30 bg-slate-900/80 p-4 flex items-center space-x-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10 flex items-center justify-center">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Snip preview"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-semibold text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • {file.type || 'image'}
                    </p>
                    <span className="inline-block mt-2 text-[11px] text-emerald-400 font-medium">
                      ✓ Ready for PPTX injection
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFile(variant.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove snip"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-amber-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/30 hover:bg-slate-900/60 group">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(variant.id, e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-amber-500/20 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors mb-3">
                    <FileImage className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-300 group-hover:text-amber-300 text-center">
                    Upload Quotation Snip for {variant.name}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    PNG, JPEG, or WebP screenshot
                  </span>
                </label>
              )}

            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Variants</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn-gold"
        >
          <span>Continue to Review & Generate</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
