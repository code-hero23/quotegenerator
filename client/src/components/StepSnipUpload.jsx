import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud, X, ArrowLeft, ArrowRight, CheckCircle2,
  FileImage, Plus, Trash2, RefreshCw, Eye, Sparkles, Layers,
  FileText, AlertCircle, Copy, Clipboard, FileSpreadsheet,
  ChevronDown, Check, Files
} from 'lucide-react';
import { hasTableClipboardData, parseClipboardTable, convertTableToImageFile } from '../utils/tableToImage';

const COMMON_PAGE_TITLES = [
  'Main Quotation',
  'Hardware & Fittings',
  'Appliances & Sinks',
  'Civil & Granite Work',
  'Wardrobe Internal Specs',
  'Accessories Breakdown',
  'Payment Schedule & Terms'
];

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
  const [activePageId, setActivePageId] = useState(null);
  const [variantFilter, setVariantFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [copyMenuPageId, setCopyMenuPageId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Helper: Get pages for a variant as normalized array of objects
  const getPages = (variantId) => {
    const raw = snipFiles[variantId];
    if (!raw) {
      return [{
        id: `page_${variantId}_1`,
        pageNumber: 1,
        title: 'Main Quotation',
        file: null,
        previewUrl: null,
        name: '',
        size: 0
      }];
    }

    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        return [{
          id: `page_${variantId}_1`,
          pageNumber: 1,
          title: 'Main Quotation',
          file: null,
          previewUrl: null,
          name: '',
          size: 0
        }];
      }
      return raw.map((item, idx) => {
        if (!item) {
          return {
            id: `page_${variantId}_${idx + 1}`,
            pageNumber: idx + 1,
            title: idx === 0 ? 'Main Quotation' : `Quotation Page ${idx + 1}`,
            file: null,
            previewUrl: null,
            name: '',
            size: 0
          };
        }
        if (item instanceof File) {
          return {
            id: `page_${variantId}_${idx + 1}`,
            pageNumber: idx + 1,
            title: idx === 0 ? 'Main Quotation' : `Quotation Page ${idx + 1}`,
            file: item,
            previewUrl: URL.createObjectURL(item),
            name: item.name,
            size: item.size
          };
        }
        return {
          id: item.id || `page_${variantId}_${idx + 1}`,
          pageNumber: idx + 1,
          title: item.title || (idx === 0 ? 'Main Quotation' : `Quotation Page ${idx + 1}`),
          file: item.file || null,
          previewUrl: item.previewUrl || (item.file instanceof File ? URL.createObjectURL(item.file) : null),
          name: item.name || (item.file?.name) || 'Quotation Snip',
          size: item.size || (item.file?.size) || 0
        };
      });
    }

    // Single item
    const file = raw instanceof File ? raw : (raw.file || null);
    const previewUrl = typeof raw === 'string' ? raw : (raw.previewUrl || (file ? URL.createObjectURL(file) : null));
    return [{
      id: raw.id || `page_${variantId}_1`,
      pageNumber: 1,
      title: raw.title || 'Main Quotation',
      file,
      previewUrl,
      name: raw.name || file?.name || 'Quotation Snip',
      size: raw.size || file?.size || 0
    }];
  };

  // Add an extra quotation page to a variant
  const handleAddExtraPage = (variantId, customTitle = null) => {
    const currentPages = getPages(variantId);
    const newPageNum = currentPages.length + 1;
    const defaultTitle = customTitle || COMMON_PAGE_TITLES[Math.min(newPageNum - 1, COMMON_PAGE_TITLES.length - 1)] || `Quotation Page ${newPageNum}`;

    const newPage = {
      id: `snip_${variantId}_${Date.now()}_${Math.random().toString(36).substring(4)}`,
      pageNumber: newPageNum,
      title: defaultTitle,
      file: null,
      previewUrl: null,
      name: '',
      size: 0
    };

    setSnipFiles(prev => ({
      ...prev,
      [variantId]: [...currentPages, newPage]
    }));

    setActiveVariantId(variantId);
    setActivePageId(newPage.id);

    const vName = variants.find(v => v.id === variantId)?.name || 'Variant';
    showToast(`📄 Added extra quotation slide (Page ${newPageNum}) for ${vName}!`);
  };

  // Remove a page (or clear Page 1)
  const handleRemovePage = (variantId, pageId) => {
    const currentPages = getPages(variantId);
    if (currentPages.length <= 1) {
      // Clear Page 1 content instead of deleting it
      setSnipFiles(prev => ({
        ...prev,
        [variantId]: [{
          id: `page_${variantId}_1`,
          pageNumber: 1,
          title: 'Main Quotation',
          file: null,
          previewUrl: null,
          name: '',
          size: 0
        }]
      }));
      showToast('Cleared quotation page image.');
      return;
    }

    const filtered = currentPages.filter(p => p.id !== pageId).map((p, idx) => ({
      ...p,
      pageNumber: idx + 1
    }));

    setSnipFiles(prev => ({
      ...prev,
      [variantId]: filtered
    }));
    showToast('Removed quotation page.');
  };

  // Update page title
  const handleUpdatePageTitle = (variantId, pageId, title) => {
    setSnipFiles(prev => {
      const currentPages = getPages(variantId);
      const updated = currentPages.map(p => p.id === pageId ? { ...p, title } : p);
      return { ...prev, [variantId]: updated };
    });
  };

  // Attach a file to a specific page
  const handleSetPageFile = (variantId, pageId, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    setSnipFiles(prev => {
      const currentPages = getPages(variantId);
      const updated = currentPages.map(p => {
        if (p.id === pageId) {
          return {
            ...p,
            file,
            previewUrl,
            name: file.name,
            size: file.size
          };
        }
        return p;
      });
      return { ...prev, [variantId]: updated };
    });
    setActiveVariantId(variantId);
    setActivePageId(pageId);
  };

  // Clear file from a page
  const handleClearPageFile = (variantId, pageId) => {
    setSnipFiles(prev => {
      const currentPages = getPages(variantId);
      const updated = currentPages.map(p => {
        if (p.id === pageId) {
          if (p.previewUrl && !p.previewUrl.startsWith('/uploads/')) {
            URL.revokeObjectURL(p.previewUrl);
          }
          return {
            ...p,
            file: null,
            previewUrl: null,
            name: '',
            size: 0
          };
        }
        return p;
      });
      return { ...prev, [variantId]: updated };
    });
  };

  // Duplicate a page to another variant
  const handleDuplicatePageToVariant = (page, sourceVariantId, targetVariantId) => {
    if (!page) return;
    const targetPages = getPages(targetVariantId);
    const targetVar = variants.find(v => v.id === targetVariantId);
    const newPageNum = targetPages.length + 1;

    const duplicated = {
      ...page,
      id: `snip_${targetVariantId}_${Date.now()}_${Math.random().toString(36).substring(4)}`,
      pageNumber: newPageNum,
      title: page.title || `Quotation Page ${newPageNum}`
    };

    setSnipFiles(prev => ({
      ...prev,
      [targetVariantId]: [...targetPages, duplicated]
    }));

    setCopyMenuPageId(null);
    showToast(`📋 Copied page "${page.title}" to ${targetVar?.name || 'target variant'}!`);
  };

  // Copy snip image to system clipboard (Ctrl+C helper)
  const handleCopySnip = async (page, variant) => {
    if (!page.file && !page.previewUrl) return;
    try {
      if (page.file && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ [page.file.type || 'image/png']: page.file })
        ]);
        showToast(`📋 Copied snip for "${variant.name}" to clipboard!`);
      } else {
        showToast('⚠️ Right click thumbnail and choose "Copy Image"', 'info');
      }
    } catch (err) {
      console.warn('Clipboard copy error:', err);
      showToast('⚠️ Could not copy image to clipboard', 'error');
    }
  };

  // Global Paste listener (Ctrl+V for Screenshots and Excel data)
  useEffect(() => {
    const handlePaste = async (e) => {
      // Don't intercept when user is typing in standard text inputs
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.type !== 'file') {
        return;
      }

      if (!e.clipboardData) return;

      const targetVariant = selectedVariants.find(v => v.id === activeVariantId) || selectedVariants[0];
      if (!targetVariant) return;

      // Find target page: activePageId, or first empty page, or create new page
      const currentPages = getPages(targetVariant.id);
      let targetPage = currentPages.find(p => p.id === activePageId);
      if (!targetPage) {
        targetPage = currentPages.find(p => !p.file && !p.previewUrl);
      }

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
        if (targetPage) {
          handleSetPageFile(targetVariant.id, targetPage.id, imageFile);
          showToast(`📋 Screenshot attached to "${targetVariant.name}" (Page ${targetPage.pageNumber})!`);
        } else {
          // If all current pages are filled, automatically create extra page!
          handleAddExtraPage(targetVariant.id);
          setTimeout(() => {
            const updatedPages = getPages(targetVariant.id);
            const lastPage = updatedPages[updatedPages.length - 1];
            if (lastPage) {
              handleSetPageFile(targetVariant.id, lastPage.id, imageFile);
              showToast(`📋 Screenshot attached to newly added Page ${lastPage.pageNumber} of "${targetVariant.name}"!`);
            }
          }, 50);
        }
        return;
      }

      // 2. Check for Excel table data in clipboard
      if (hasTableClipboardData(e.clipboardData)) {
        e.preventDefault();
        try {
          const tableData = parseClipboardTable(e.clipboardData);
          if (tableData && tableData.allRows.length > 0) {
            showToast('⏳ Converting Excel spreadsheet cells into table image...', 'info');
            const pageNum = targetPage ? targetPage.pageNumber : currentPages.length + 1;
            const convertedFile = await convertTableToImageFile(tableData, {
              title: `${targetVariant.name} - Quotation (Page ${pageNum})`,
              filename: `Excel_Quote_${targetVariant.name.replace(/[^a-zA-Z0-9]/g, '_')}_p${pageNum}_${Date.now()}`
            });

            if (targetPage) {
              handleSetPageFile(targetVariant.id, targetPage.id, convertedFile);
              showToast(`📊 Excel table converted & attached to "${targetVariant.name}" (Page ${targetPage.pageNumber})!`);
            } else {
              handleAddExtraPage(targetVariant.id);
              setTimeout(() => {
                const updatedPages = getPages(targetVariant.id);
                const lastPage = updatedPages[updatedPages.length - 1];
                if (lastPage) {
                  handleSetPageFile(targetVariant.id, lastPage.id, convertedFile);
                  showToast(`📊 Excel table converted & attached to Page ${lastPage.pageNumber} of "${targetVariant.name}"!`);
                }
              }, 50);
            }
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
  }, [selectedVariants, activeVariantId, activePageId, snipFiles]);

  // Total pages and filled pages across all variants
  const totalPagesCount = selectedVariants.reduce((sum, v) => sum + getPages(v.id).length, 0);
  const totalAttachedCount = selectedVariants.reduce((sum, v) => {
    return sum + getPages(v.id).filter(p => p.file || p.previewUrl).length;
  }, 0);

  // Filtered variants
  const displayedVariants = variantFilter === 'all'
    ? selectedVariants
    : selectedVariants.filter(v => v.id === variantFilter);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold transition-all ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : (toast.type === 'info' ? 'bg-sky-600 text-white' : 'bg-emerald-600 text-white')
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Step Header & Quick Action */}
      <div className="glass-panel p-6 border-l-4 border-l-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-amber-600" />
              Quotation Snips & Multi-Page Tables
            </h3>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Step 5 of 6
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Attach itemized quotation snips. If a variant requires multiple pages or extended pricing tables, use the <span className="font-bold text-amber-900">+ Add Extra Page</span> button to automatically clone continuous quotation slides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{totalAttachedCount} of {totalPagesCount} Pages Ready</span>
          </div>

          {/* Quick Add Extra Page to Active Variant */}
          {selectedVariants.length > 0 && (
            <button
              type="button"
              onClick={() => handleAddExtraPage(activeVariantId || selectedVariants[0].id)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Add an extra quotation slide to the current variant"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Extra Page</span>
            </button>
          )}
        </div>
      </div>

      {/* Variant Filter Tabs */}
      {selectedVariants.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setVariantFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              variantFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>All Variants</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {selectedVariants.length}
            </span>
          </button>

          {selectedVariants.map(v => {
            const pages = getPages(v.id);
            const isSelected = variantFilter === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVariantFilter(v.id);
                  setActiveVariantId(v.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{v.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-black/10' : 'bg-slate-200 text-slate-700'}`}>
                  {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Variants & Pages Cards */}
      <div className="space-y-8">
        {displayedVariants.map((variant) => {
          const pages = getPages(variant.id);
          const slideIndices = Array.isArray(variant.slideIndices) 
            ? variant.slideIndices 
            : (typeof variant.slideIndices === 'string' ? JSON.parse(variant.slideIndices || '[]') : []);
          const quoteBaseSlide = slideIndices.length >= 3 ? slideIndices[2] : 9;

          return (
            <div
              key={variant.id}
              onClick={() => setActiveVariantId(variant.id)}
              className={`glass-panel p-6 space-y-5 transition-all border ${
                activeVariantId === variant.id
                  ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                  : 'border-slate-200'
              }`}
            >
              
              {/* Variant Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-base">{variant.name}</h4>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {variant.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Base Quotation: Slide {quoteBaseSlide}
                    </span>
                    <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {pages.length} {pages.length === 1 ? 'Quotation Slide' : `Quotation Slides (+${pages.length - 1} extra)`}
                    </span>
                  </div>
                </div>

                {/* + Add Extra Page Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddExtraPage(variant.id);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                    <span>+ Add Extra Page</span>
                  </button>
                </div>
              </div>

              {/* Pages Grid for This Variant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pages.map((page, idx) => {
                  const isPrimary = idx === 0;
                  const slideNum = isPrimary ? `Slide ${quoteBaseSlide}` : `Slide ${quoteBaseSlide} (+${idx})`;
                  const hasImage = Boolean(page.file || page.previewUrl);
                  const isPageActive = activePageId === page.id && activeVariantId === variant.id;

                  return (
                    <div
                      key={page.id || idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVariantId(variant.id);
                        setActivePageId(page.id);
                      }}
                      className={`rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-3 relative ${
                        isPageActive
                          ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      
                      {/* Page Card Header: Page Badge & Editable Title */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              isPrimary ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-sky-100 text-sky-900 border border-sky-200'
                            }`}>
                              Page {page.pageNumber} {isPrimary ? '(Primary Slide)' : '(Extra Slide)'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {slideNum}
                            </span>
                          </div>

                          {/* Editable Page Title */}
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="text"
                              value={page.title || ''}
                              onChange={(e) => handleUpdatePageTitle(variant.id, page.id, e.target.value)}
                              placeholder={`e.g. Quotation Page ${page.pageNumber}`}
                              className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-hidden px-1 py-0.5 rounded w-full transition-colors"
                              title="Click to rename slide title"
                            />
                          </div>
                        </div>

                        {/* Top Page Actions (Copy to Variant / Delete Page) */}
                        <div className="flex items-center space-x-1 shrink-0 relative">
                          {/* Copy to another variant dropdown */}
                          {selectedVariants.length > 1 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCopyMenuPageId(copyMenuPageId === page.id ? null : page.id);
                                }}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 text-xs transition-colors cursor-pointer"
                                title="Copy this page to another variant"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {copyMenuPageId === page.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 space-y-1 animate-fadeIn">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">
                                    Copy Page to:
                                  </div>
                                  {selectedVariants.filter(v => v.id !== variant.id).map(targetVar => (
                                    <button
                                      key={targetVar.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDuplicatePageToVariant(page, variant.id, targetVar.id);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-50 hover:text-amber-900 transition-colors flex items-center justify-between"
                                    >
                                      <span className="truncate">{targetVar.name}</span>
                                      <span className="text-[10px] text-slate-400">Add</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Delete Extra Page button (only for idx > 0, or clears if idx === 0) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePage(variant.id, page.id);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs transition-colors cursor-pointer"
                            title={isPrimary ? 'Clear Page Image' : 'Delete this Extra Quotation Page'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Page Body: Image Preview OR Dropzone */}
                      {hasImage ? (
                        <div className="space-y-3">
                          {/* Image Thumbnail & Meta */}
                          <div className="flex items-center space-x-3 bg-white p-2.5 rounded-xl border border-slate-200">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePreview({ url: page.previewUrl, title: `${variant.name} - ${page.title}` });
                              }}
                              className="w-20 h-20 rounded-lg overflow-hidden bg-slate-50 shrink-0 border border-slate-200 flex items-center justify-center p-1 cursor-pointer group"
                              title="Click to preview fullscreen"
                            >
                              <img
                                src={page.previewUrl}
                                alt={page.title}
                                className="w-full h-full object-contain rounded group-hover:scale-105 transition-transform"
                              />
                            </div>

                            <div className="overflow-hidden flex-1 min-w-0 space-y-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {page.name || `${variant.name}_Page_${page.pageNumber}.png`}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {page.size ? `${(page.size / 1024).toFixed(1)} KB` : 'Image Attached'} • {isPrimary ? 'Base Quote' : 'Cloned Slide'}
                              </p>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Attached</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySnip(page, variant);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Copy image to clipboard (Ctrl+C)"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Copy</span>
                            </button>

                            {/* View / Zoom */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePreview({ url: page.previewUrl, title: `${variant.name} - ${page.title}` });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Preview Fullscreen"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Zoom</span>
                            </button>

                            {/* Replace Button & Hidden Input */}
                            <input
                              ref={(el) => (replaceInputRefs.current[page.id] = el)}
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleSetPageFile(variant.id, page.id, e.target.files[0]);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                replaceInputRefs.current[page.id]?.click();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Replace this image"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Replace</span>
                            </button>

                            {/* Clear file */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearPageFile(variant.id, page.id);
                              }}
                              className="px-2 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs transition-colors cursor-pointer"
                              title="Clear image"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Empty Dropzone for This Page */
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVariantId(variant.id);
                            setActivePageId(page.id);
                            fileInputRefs.current[page.id]?.click();
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleSetPageFile(variant.id, page.id, e.dataTransfer.files[0]);
                            }
                          }}
                          className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white hover:bg-amber-50/40 group"
                        >
                          <input
                            ref={(el) => (fileInputRefs.current[page.id] = el)}
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleSetPageFile(variant.id, page.id, e.target.files[0]);
                                e.target.value = '';
                              }
                            }}
                          />

                          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center text-slate-500 group-hover:text-amber-700 transition-colors mb-2">
                            <UploadCloud className="w-5 h-5 stroke-[2.2]" />
                          </div>

                          <span className="text-xs font-bold text-slate-800 group-hover:text-amber-900">
                            Upload Snip for Page {page.pageNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Click to browse, or paste with <kbd className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-[10px] border">Ctrl+V</kbd>
                          </span>

                          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              <Clipboard className="w-3 h-3 text-amber-700" />
                              <span>Screenshot</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                              <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                              <span>Excel Table</span>
                            </span>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Bottom Card Action: Full-width + Add Extra Page for this Variant */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddExtraPage(variant.id);
                }}
                className="w-full py-3 px-4 border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-900 transition-all cursor-pointer group mt-2"
              >
                <Plus className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform stroke-[2.5]" />
                <span>+ Add Extra Quotation Page for {variant.name} (Slide {quoteBaseSlide} • Page {pages.length + 1})</span>
              </button>

            </div>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Accessories</span>
        </button>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNext}
            className="btn-gold w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <span>Proceed to Review &amp; Generate</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fullscreen Preview Lightbox */}
      {activePreview && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActivePreview(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {activePreview.title || 'Quotation Snip Preview'}
              </h4>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-100/50 flex-1 min-h-[300px]">
              <img
                src={activePreview.url}
                alt="Quotation Snip"
                className="max-w-full max-h-[75vh] object-contain rounded shadow-xs"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
