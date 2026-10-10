import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud, X, ArrowLeft, ArrowRight, CheckCircle2,
  FileImage, Plus, Trash2, RefreshCw, Eye, Sparkles, Layers,
  FileText, AlertCircle, Copy, Clipboard, FileSpreadsheet
} from 'lucide-react';
import { hasTableClipboardData, parseClipboardTable, convertTableToImageFile } from '../utils/tableToImage';

export default function StepSnipUpload({
  variants = [],
  selectedVariantIds = [],
  snipFiles = {},
  setSnipFiles,
  onBack,
  onNext
}) {
  const selectedVariants = variants.filter(v => selectedVariantIds.includes(v.id));
  const fileInputRefs = useRef({});
  const replaceInputRefs = useRef({});
  const [activePreview, setActivePreview] = useState(null); // { url, title }
  const [activeVariantId, setActiveVariantId] = useState(selectedVariants[0]?.id || null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Normalize snips for a variant to an array of objects
  const getSnips = (variantId) => {
    const raw = snipFiles[variantId];
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw instanceof File || (raw && raw.name)) {
      return [{
        id: `snip_${variantId}_0`,
        file: raw,
        previewUrl: typeof raw === 'string' ? raw : (raw instanceof File ? URL.createObjectURL(raw) : null),
        name: raw.name || 'Quotation Snip',
        size: raw.size || 0
      }];
    }
    return [];
  };

  // Add multiple or single files to a variant
  const handleAddFiles = (variantId, newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const fileList = Array.from(newFiles).filter(f => f.type && f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    setSnipFiles(prev => {
      const existing = getSnips(variantId);
      const newItems = fileList.map((file, idx) => ({
        id: `snip_${variantId}_${Date.now()}_${idx}_${Math.random().toString(36).substring(4)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      }));
      return {
        ...prev,
        [variantId]: [...existing, ...newItems]
      };
    });
  };

  // Remove single snip
  const handleRemoveSnip = (variantId, snipId) => {
    setSnipFiles(prev => {
      const existing = getSnips(variantId);
      const filtered = existing.filter(s => s.id !== snipId);
      return {
        ...prev,
        [variantId]: filtered
      };
    });
  };

  // Replace single snip
  const handleReplaceFile = (variantId, snipId, newFile) => {
    if (!newFile) return;
    setSnipFiles(prev => {
      const existing = getSnips(variantId);
      const updated = existing.map(s => {
        if (s.id === snipId) {
          return {
            ...s,
            file: newFile,
            previewUrl: URL.createObjectURL(newFile),
            name: newFile.name,
            size: newFile.size
          };
        }
        return s;
      });
      return {
        ...prev,
        [variantId]: updated
      };
    });
  };

  // Copy snip image to clipboard (Ctrl+C helper)
  const handleCopySnip = async (snip, variant) => {
    if (!snip.file) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ [snip.file.type || 'image/png']: snip.file })
        ]);
        showToast(`📋 Copied snip for "${variant.name}" to clipboard!`);
      } else {
        showToast('⚠️ Clipboard copy is not supported in this browser', 'error');
      }
    } catch (err) {
      console.warn('Clipboard copy error:', err);
      showToast('⚠️ Could not copy image to clipboard', 'error');
    }
  };

  // Clipboard Paste listener (Ctrl+V for Screenshots and Excel data)
  useEffect(() => {
    const handlePaste = async (e) => {
      // Don't intercept when user is typing in standard text inputs
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.type !== 'file') {
        return;
      }

      if (!e.clipboardData) return;

      const targetVariant = selectedVariants.find(v => v.id === activeVariantId) ||
                            selectedVariants.find(v => getSnips(v.id).length === 0) ||
                            selectedVariants[0];

      if (!targetVariant) return;

      // 1. Check for image in clipboard
      const items = e.clipboardData.items || [];
      let imageFile = null;
      for (const item of items) {
        if (item.type && item.type.startsWith('image/')) {
          imageFile = item.getAsFile();
          break;
        }
      }

      if (imageFile) {
        e.preventDefault();
        handleAddFiles(targetVariant.id, [imageFile]);
        showToast(`📋 Screenshot attached to "${targetVariant.name}"!`);
        return;
      }

      // 2. Check for Excel table data in clipboard
      if (hasTableClipboardData(e.clipboardData)) {
        e.preventDefault();
        try {
          const tableData = parseClipboardTable(e.clipboardData);
          if (tableData && tableData.allRows.length > 0) {
            showToast('⏳ Converting Excel spreadsheet cells into table image...', 'info');
            const convertedFile = await convertTableToImageFile(tableData, {
              title: `${targetVariant.name} - Quotation Breakdown`,
              filename: `Excel_Quote_${targetVariant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
            });
            handleAddFiles(targetVariant.id, [convertedFile]);
            showToast(`📊 Excel table (${tableData.rowCount} rows × ${tableData.colCount} cols) converted & attached to "${targetVariant.name}"!`);
            return;
          }
        } catch (err) {
          console.error('[StepSnipUpload] Excel conversion error:', err);
          showToast('⚠️ Could not convert Excel table to image.', 'error');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedVariants, activeVariantId, snipFiles]);

  // Calculate total snips attached across all variants
  const totalAttachedSnips = selectedVariants.reduce((sum, v) => sum + getSnips(v.id).length, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Informative Header */}
      <div className="glass-panel p-6 border-l-4 border-l-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-600" />
            Quotation Snips & Itemized Tables
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Attach screenshot snips of your itemized pricing breakdown. If a variant requires multiple pages or tables, click the <span className="font-semibold text-amber-800">+ Add Snip</span> button to inject additional continuous quotation slides automatically.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800">
            {totalAttachedSnips > 0 ? `✓ ${totalAttachedSnips} Snip${totalAttachedSnips > 1 ? 's' : ''} Attached` : 'Optional • You may skip'}
          </div>
        </div>
      </div>

      {/* Grid of Snip Cards per Selected Variant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedVariants.map((variant) => {
          const snipsList = getSnips(variant.id);
          const snipCount = snipsList.length;

          const slideIndices = Array.isArray(variant.slideIndices) 
            ? variant.slideIndices 
            : (typeof variant.slideIndices === 'string' ? JSON.parse(variant.slideIndices || '[]') : []);
          const quoteSlide = slideIndices.length >= 3 ? slideIndices[2] : 9;

          return (
            <div
              key={variant.id}
              onClick={() => setActiveVariantId(variant.id)}
              className={`glass-panel p-6 space-y-4 flex flex-col justify-between cursor-pointer transition-all ${
                activeVariantId === variant.id
                  ? 'border-amber-400 ring-2 ring-amber-400/25 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              
              {/* Variant Header & Multi-Snip Actions */}
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{variant.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{variant.category}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Primary Quote: Slide {quoteSlide}
                      </span>
                      {snipCount > 1 && (
                        <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          +{snipCount - 1} extra slide{snipCount > 2 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Top + Add Snip Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[variant.id]?.click()}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title="Add another quotation snip for this variant"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                      <span>Add Snip</span>
                    </button>

                    {/* Hidden Multi-file input */}
                    <input
                      ref={(el) => (fileInputRefs.current[variant.id] = el)}
                      type="file"
                      multiple
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleAddFiles(variant.id, e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* List of Attached Snips for This Variant */}
                {snipCount > 0 ? (
                  <div className="space-y-3 mt-4">
                    {snipsList.map((snip, idx) => {
                      const isPrimary = idx === 0;
                      const slideLabel = isPrimary 
                        ? `Slide ${quoteSlide} (Primary)` 
                        : `Slide ${quoteSlide} (Page ${idx + 1})`;

                      return (
                        <div
                          key={snip.id || idx}
                          className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center space-x-3.5 hover:border-amber-300 hover:bg-amber-50/20 transition-all"
                        >
                          {/* Thumbnail */}
                          <div 
                            className="w-16 h-16 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200 flex items-center justify-center p-1 cursor-pointer group"
                            onClick={() => setActivePreview({ url: snip.previewUrl, title: `${variant.name} - Snip #${idx + 1}` })}
                            title="Click to preview image"
                          >
                            {snip.previewUrl ? (
                              <img
                                src={snip.previewUrl}
                                alt={`Snip ${idx + 1}`}
                                className="w-full h-full object-contain rounded group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <FileImage className="w-6 h-6 text-slate-400" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="overflow-hidden flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                Snip #{idx + 1}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium truncate">
                                {slideLabel}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate mt-1">
                              {snip.name || `Quotation_Part_${idx + 1}.png`}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {snip.size ? `${(snip.size / 1024).toFixed(1)} KB` : 'Attached'} • {isPrimary ? 'Main Quotation Slide' : 'Cloned Continuous Slide'}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySnip(snip, variant);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                              title="Copy image to clipboard (Ctrl+C)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Preview Eye */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePreview({ url: snip.previewUrl, title: `${variant.name} - Snip #${idx + 1}` });
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                              title="Preview Snip"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Replace input & trigger */}
                            <input
                              ref={(el) => (replaceInputRefs.current[`${variant.id}_${snip.id}`] = el)}
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleReplaceFile(variant.id, snip.id, e.target.files[0]);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                replaceInputRefs.current[`${variant.id}_${snip.id}`]?.click();
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-700 border border-slate-200 transition-colors cursor-pointer"
                              title="Replace this image"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSnip(variant.id, snip.id);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                              title="Remove this snip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick + Add Another Snip Strip */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVariantId(variant.id);
                        fileInputRefs.current[variant.id]?.click();
                      }}
                      className="w-full py-2.5 px-3 border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-800 hover:text-amber-900 transition-all cursor-pointer group mt-2"
                    >
                      <Plus className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform stroke-[2.5]" />
                      <span>+ Add Another Quotation Snip for {variant.name} (Page {snipCount + 1})</span>
                    </button>
                  </div>
                ) : (
                  /* Initial Empty Dropzone */
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveVariantId(variant.id);
                      fileInputRefs.current[variant.id]?.click();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) {
                        handleAddFiles(variant.id, e.dataTransfer.files);
                      }
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-amber-50/30 group mt-4 text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:bg-amber-100 flex items-center justify-center text-slate-500 group-hover:text-amber-700 transition-colors mb-3 shadow-xs">
                      <Plus className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-amber-900">
                      Upload Quotation Snip for {variant.name}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Click or drag screenshot here • Supports multiple snips via +
                    </span>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                        <Clipboard className="w-3 h-3 text-amber-700" />
                        <span>Paste Screenshot (<strong>Ctrl+V</strong>)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                        <span>Copy Excel &amp; Press <strong>Ctrl+V</strong></span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Floating Image Preview Modal */}
      {activePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] w-full p-4 flex flex-col shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">{activePreview.title}</h4>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 rounded-xl mt-3">
              <img
                src={activePreview.url}
                alt="Enlarged Snip"
                className="max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Units Snips</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn-gold w-full sm:w-auto"
        >
          <span>Continue to Accessories & Hardware</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Feedback Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-fadeIn transition-all ${
          toast.type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : toast.type === 'info'
            ? 'bg-slate-900 text-amber-300 border-slate-700'
            : 'bg-emerald-900 text-white border-emerald-700'
        }`}>
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 opacity-70 hover:opacity-100 cursor-pointer p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
