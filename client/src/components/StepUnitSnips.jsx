import React, { useRef, useState, useEffect } from 'react';
import {
  Plus, Trash2, UploadCloud, Image as ImageIcon,
  ArrowLeft, ArrowRight, CheckCircle2, Eye, X, Layers, Sparkles,
  Copy, Clipboard, FileSpreadsheet
} from 'lucide-react';
import { hasTableClipboardData, parseClipboardTable, convertTableToImageFile } from '../utils/tableToImage';

const COMMON_CATEGORIES = [
  'Modular Kitchen',
  'Master Bedroom',
  'Living Area',
  'Wardrobe & Storage',
  'Guest Bedroom',
  'Kids Bedroom',
  'Foyer & Entryway',
  'Pooja Unit',
  'Dining & Crockery',
  'Entertainment / TV Unit',
  'Study / Home Office',
  'Vanity / Bathroom',
  'Other Custom Unit'
];

export default function StepUnitSnips({
  variants = [],
  selectedVariantIds = [],
  unitPages = [],
  setUnitPages,
  onBack,
  onNext
}) {
  const fileInputRefs = useRef({});
  const [activePageId, setActivePageId] = useState(unitPages[0]?.id || null);
  const [selectedVariantFilter, setSelectedVariantFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const selectedVariants = variants.filter(v => selectedVariantIds.includes(v.id));

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Add a new unit page (optionally assigned to active variant filter)
  const handleAddPage = () => {
    const newIndex = unitPages.length + 1;
    const defaultCategory = COMMON_CATEGORIES[(newIndex - 1) % COMMON_CATEGORIES.length] || 'Modular Kitchen';
    const targetVariantId = selectedVariantFilter === 'all' 
      ? (selectedVariants.length === 1 ? selectedVariants[0].id : 'all') 
      : selectedVariantFilter;
    const newPage = {
      id: `unit_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      variantId: targetVariantId,
      title: `Unit ${newIndex} - ${defaultCategory}`,
      category: defaultCategory,
      notes: '',
      file: null,
      previewUrl: null
    };
    setUnitPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
  };

  // Duplicate a unit page for another variant
  const handleDuplicatePage = (page, targetVarId) => {
    const targetVar = variants.find(v => v.id === targetVarId);
    const varLabel = targetVar ? targetVar.name : 'All Variants';
    const newPage = {
      ...page,
      id: `unit_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      variantId: targetVarId,
      title: `${page.title} (${varLabel})`
    };
    setUnitPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
    showToast(`📋 Duplicated unit page for ${varLabel}!`);
  };

  // Remove a unit page
  const handleRemovePage = (pageId) => {
    if (unitPages.length <= 1) {
      setUnitPages([{
        id: `unit_${Date.now()}`,
        variantId: 'all',
        title: 'Unit 1 - Modular Kitchen',
        category: 'Modular Kitchen',
        notes: '',
        file: null,
        previewUrl: null
      }]);
      return;
    }
    setUnitPages(prev => prev.filter(p => p.id !== pageId));
  };

  // Update a specific field of a unit page
  const handleUpdatePage = (pageId, field, value) => {
    setUnitPages(prev => prev.map(p => {
      if (p.id === pageId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // Handle file drop/upload
  const handleFileChange = (pageId, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setUnitPages(prev => prev.map(p => {
      if (p.id === pageId) {
        return {
          ...p,
          file,
          previewUrl
        };
      }
      return p;
    }));
  };

  // Clear file from page
  const handleClearFile = (pageId) => {
    setUnitPages(prev => prev.map(p => {
      if (p.id === pageId) {
        if (p.previewUrl && !p.previewUrl.startsWith('/uploads/')) {
          URL.revokeObjectURL(p.previewUrl);
        }
        return { ...p, file: null, previewUrl: null };
      }
      return p;
    }));
  };

  // Copy snip image to system clipboard (Ctrl+C helper)
  const handleCopySnip = async (page) => {
    try {
      let blob = null;
      if (page.file) {
        blob = page.file;
      } else if (page.previewUrl) {
        const res = await fetch(page.previewUrl);
        blob = await res.blob();
      }
      if (!blob) return;

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        showToast(`📋 Copied image for "${page.title || 'Unit'}" to clipboard!`);
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
      // Don't intercept if user is typing in standard text inputs or textareas
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.type !== 'file') {
        return;
      }

      if (!e.clipboardData) return;

      // Find target unit page within visible pages
      const visiblePages = unitPages.filter(page => {
        if (selectedVariantFilter === 'all') return true;
        const pVid = page.variantId || 'all';
        return pVid === selectedVariantFilter || pVid === 'all';
      });

      let targetPage = visiblePages.find(p => p.id === activePageId);
      if (!targetPage || targetPage.file || targetPage.previewUrl) {
        const emptyPage = visiblePages.find(p => !p.file && !p.previewUrl);
        if (emptyPage) {
          targetPage = emptyPage;
        }
      }

      // 1. Check if clipboard contains an image (Snipping Tool, print screen, copied image)
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
        if (targetPage && !targetPage.file && !targetPage.previewUrl) {
          handleFileChange(targetPage.id, imageFile);
          showToast(`📋 Screenshot attached to "${targetPage.title || 'Unit'}"!`);
        } else {
          // If all visible pages have attachments, auto-create a new unit page
          const newIndex = unitPages.length + 1;
          const defaultCategory = COMMON_CATEGORIES[(newIndex - 1) % COMMON_CATEGORIES.length] || 'Modular Kitchen';
          const targetVariantId = selectedVariantFilter === 'all' 
            ? (selectedVariants.length === 1 ? selectedVariants[0].id : 'all') 
            : selectedVariantFilter;
          const newPage = {
            id: `unit_${Date.now()}_${Math.random().toString(36).substring(5)}`,
            variantId: targetVariantId,
            title: `Unit ${newIndex} - ${defaultCategory}`,
            category: defaultCategory,
            notes: '',
            file: imageFile,
            previewUrl: URL.createObjectURL(imageFile)
          };
          setUnitPages(prev => [...prev, newPage]);
          setActivePageId(newPage.id);
          showToast(`📋 Screenshot attached to new page: "${newPage.title}"!`);
        }
        return;
      }

      // 2. Check if clipboard contains Excel spreadsheet table data (HTML table or TSV)
      if (hasTableClipboardData(e.clipboardData)) {
        e.preventDefault();
        try {
          const tableData = parseClipboardTable(e.clipboardData);
          if (tableData && tableData.allRows.length > 0) {
            showToast('⏳ Converting Excel spreadsheet cells into crisp table image...', 'info');
            const pageTitle = (targetPage && targetPage.title) 
              ? targetPage.title 
              : `Unit ${unitPages.length + 1} - Specifications`;
            const pageCategory = (targetPage && targetPage.category) || 'Modular Kitchen';
            const convertedFile = await convertTableToImageFile(tableData, {
              title: `${pageTitle} - Specifications`,
              filename: `Excel_Unit_${pageCategory.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
            });

            if (targetPage && !targetPage.file && !targetPage.previewUrl) {
              handleFileChange(targetPage.id, convertedFile);
              showToast(`📊 Excel table (${tableData.rowCount} rows × ${tableData.colCount} cols) converted & attached to "${pageTitle}"!`);
            } else {
              const newIndex = unitPages.length + 1;
              const defaultCategory = COMMON_CATEGORIES[(newIndex - 1) % COMMON_CATEGORIES.length] || 'Modular Kitchen';
              const targetVariantId = selectedVariantFilter === 'all' 
                ? (selectedVariants.length === 1 ? selectedVariants[0].id : 'all') 
                : selectedVariantFilter;
              const newPage = {
                id: `unit_${Date.now()}_${Math.random().toString(36).substring(5)}`,
                variantId: targetVariantId,
                title: pageTitle,
                category: defaultCategory,
                notes: '',
                file: convertedFile,
                previewUrl: URL.createObjectURL(convertedFile)
              };
              setUnitPages(prev => [...prev, newPage]);
              setActivePageId(newPage.id);
              showToast(`📊 Excel table (${tableData.rowCount} rows × ${tableData.colCount} cols) converted & attached to "${newPage.title}"!`);
            }
            return;
          }
        } catch (err) {
          console.error('[StepUnitSnips] Excel table conversion error:', err);
          showToast('⚠️ Could not convert Excel table to image. Please try again.', 'error');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [unitPages, activePageId, selectedVariantFilter, selectedVariants]);

  const uploadedPagesCount = unitPages.filter(p => p.file || p.previewUrl).length;

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Top Banner & Action Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-200/60 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
              Step 03
            </span>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              Units Snips (Unit-Wise Breakdown Pages)
            </h3>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Upload screenshot snips for individual units (e.g. Kitchen, Master Bedroom, Wardrobes). Click the <strong>"+ Add Unit Page"</strong> button below to create additional pages as needed.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-700">
              {uploadedPagesCount} of {unitPages.length} Uploaded
            </div>
            <div className="text-[11px] text-slate-500">Optional snip pages</div>
          </div>
          <button
            type="button"
            onClick={handleAddPage}
            className="btn-gold w-full sm:w-auto px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Add Unit Page</span>
          </button>
        </div>
      </div>

      {/* Variant Filter Tabs & Placement Info */}
      <div className="space-y-3">
        {selectedVariants.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Filter By Variant:
            </span>
            <button
              type="button"
              onClick={() => handleSelectFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedVariantFilter === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Units ({unitPages.length})
            </button>
            {selectedVariants.map(v => {
              const count = unitPages.filter(p => {
                const pVid = p.variantId || 'all';
                return pVid === v.id || pVid === 'all';
              }).length;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectFilterTab(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedVariantFilter === v.id
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{v.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedVariantFilter === v.id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Slide Sequencing:</strong> Unit breakdown pages will be inserted directly <strong>AFTER</strong> the specification page and <strong>BEFORE</strong> the quotation page for their designated variant.
            </span>
          </div>
        </div>
      </div>

      {/* List of Unit Pages */}
      <div className="space-y-5">
        {(() => {
          const displayedPages = unitPages.filter(page => {
            if (selectedVariantFilter === 'all') return true;
            const pVid = page.variantId || 'all';
            return pVid === selectedVariantFilter || pVid === 'all';
          });

          if (displayedPages.length === 0) {
            const activeVarObj = selectedVariants.find(v => v.id === selectedVariantFilter);
            return (
              <div className="p-8 text-center border-2 border-dashed border-amber-200 rounded-2xl bg-amber-50/20 space-y-3">
                <Layers className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
                <p className="text-sm font-bold text-slate-800">
                  No unit pages assigned to {activeVarObj ? activeVarObj.name : 'this variant'} yet.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Add a unit breakdown page specifically for {activeVarObj ? activeVarObj.name : 'this variant'} or switch to view all units.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddPage}
                    className="btn-gold text-xs px-4 py-2 font-bold rounded-lg cursor-pointer shadow-xs"
                  >
                    + Add Unit Page for {activeVarObj ? activeVarObj.name : 'Variant'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectFilterTab('all')}
                    className="btn-secondary text-xs px-4 py-2 font-semibold rounded-lg cursor-pointer bg-white"
                  >
                    View All Units ({unitPages.length})
                  </button>
                </div>
              </div>
            );
          }

          return displayedPages.map((page, index) => {
          const isAllVariants = !page.variantId || page.variantId === 'all';
          const assignedVariant = !isAllVariants ? variants.find(v => v.id === page.variantId) : null;
          return (
            <div
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={`glass-panel p-4 sm:p-5 border transition-all duration-200 bg-white cursor-pointer ${
                activePageId === page.id
                  ? 'border-amber-400 ring-2 ring-amber-400/25 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                    #{index + 1}
                  </span>

                  {/* Editable Title */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={page.title || ''}
                      onChange={(e) => handleUpdatePage(page.id, 'title', e.target.value)}
                      placeholder={`e.g. Unit ${index + 1} - ${page.category || 'Breakdown'}`}
                      className="text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none w-full py-0.5 transition-colors truncate"
                    />
                  </div>

                  {/* Unified Target Variant Selector */}
                  <div className="flex items-center gap-1.5 bg-amber-50/90 hover:bg-amber-100/70 border border-amber-300 rounded-lg px-2.5 py-1.5 transition-all shadow-2xs">
                    <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wide">
                      Target Variant:
                    </span>
                    <select
                      value={page.variantId || 'all'}
                      onChange={(e) => handleVariantChange(page.id, e.target.value)}
                      className="text-xs font-bold text-amber-950 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="all">🌐 All Selected Variants</option>
                      {selectedVariants.map(v => (
                        <option key={v.id} value={v.id}>🎯 {v.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Selection */}
                  <select
                    value={page.category}
                    onChange={(e) => handleUpdatePage(page.id, 'category', e.target.value)}
                    className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:border-amber-500 focus:outline-none"
                  >
                    {COMMON_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {/* Duplicate to Other Variant */}
                  {selectedVariants.length > 1 && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDuplicatePage(page, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-xs font-medium text-amber-700 bg-amber-50/50 hover:bg-amber-100/50 border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                      title="Duplicate this page for another variant"
                    >
                      <option value="" disabled>📋 Copy to Variant...</option>
                      {selectedVariants.map(v => (
                        <option key={v.id} value={v.id}>Copy for {v.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Remove Page Button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePage(page.id)}
                    title="Remove this unit page"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Upload Dropzone & Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* Image Upload Area (8 cols on lg) */}
                <div className="lg:col-span-8">
                  {(page.file || page.previewUrl) ? (
                    // Uploaded State with Preview (supports re-edited previewUrl)
                    <div className="relative border-2 border-emerald-300 rounded-xl p-3 bg-emerald-50/30 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-slate-900/5 shrink-0 flex items-center justify-center border border-slate-200">
                        <img
                          src={page.previewUrl}
                          alt={page.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 text-left space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Snip Attached Successfully</span>
                        </div>
                        <p className="text-xs font-mono font-medium text-slate-700 truncate">
                          {page.file ? page.file.name : (page.title ? `${page.title} Snip` : 'Saved Unit Snip')}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {page.file ? `${(page.file.size / 1024).toFixed(1)} KB • ` : ''}{page.variantId && page.variantId !== 'all' ? `Will be inserted after ${variants.find(v => v.id === page.variantId)?.name || 'variant'} specs` : 'Will be inserted across each selected variant'} specs
                        </p>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySnip(page);
                            }}
                            className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Copy image to clipboard (Ctrl+C)"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRefs.current[page.id]?.click();
                            }}
                            className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-all cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearFile(page.id);
                            }}
                            className="px-3 py-1 rounded bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 border border-rose-200 transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Empty Dropzone State
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePageId(page.id);
                        fileInputRefs.current[page.id]?.click();
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileChange(page.id, e.dataTransfer.files[0]);
                        }
                      }}
                      className="border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/30 rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[140px]"
                    >
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-amber-500 mb-1.5" />
                      <p className="text-xs font-bold text-slate-800">
                        Click or drag screenshot snip here
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        PNG, JPG, or WebP screenshot of unit plan or breakdown
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                          <Clipboard className="w-3 h-3 text-amber-700" />
                          <span>Paste Screenshot (<strong>Ctrl+V</strong>)</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                          <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                          <span>Copy Excel &amp; Press <strong>Ctrl+V</strong> (auto-converts)</span>
                        </span>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current[page.id] = el)}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(page.id, e.target.files[0]);
                      }
                      e.target.value = '';
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Optional Notes & Remarks (4 cols on lg) */}
                <div className="lg:col-span-4 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Unit Specification Remarks (Optional)
                    </label>
                    <textarea
                      value={page.notes}
                      onChange={(e) => handleUpdatePage(page.id, 'notes', e.target.value)}
                      placeholder="e.g. Dimensions: 10ft x 12ft, Marine Ply with Acrylic Finish, Tandem drawer boxes..."
                      rows={4}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:outline-none text-slate-700 bg-slate-50 resize-none"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Tip: You can add as many unit pages as you need for this project.
                  </div>
                </div>

              </div>
            </div>
          );
        });
      })()}

        {/* Large Add Page CTA Card */}
        <button
          type="button"
          onClick={handleAddPage}
          className="w-full border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/30 hover:bg-amber-50/70 p-5 rounded-2xl flex items-center justify-center gap-3 text-amber-800 font-bold text-sm transition-all duration-200 cursor-pointer shadow-sm group"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-amber-500/30">
            <Plus className="w-5 h-5" />
          </div>
          <span>+ Add Another Unit Page (Kitchen, Bedroom, Living, etc.)</span>
        </button>
      </div>

      {/* Bottom Step Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary w-full sm:w-auto px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Variants</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {uploadedPagesCount > 0
              ? `✓ ${uploadedPagesCount} unit snip(s) ready`
              : 'Optional • Proceed whenever ready'}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="btn-gold w-full sm:w-auto px-8 py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Next: Quotation Snips</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
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
