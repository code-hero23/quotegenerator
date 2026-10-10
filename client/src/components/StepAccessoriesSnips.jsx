import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, UploadCloud, Image as ImageIcon, 
  ArrowLeft, ArrowRight, CheckCircle2, Eye, X, Sparkles,
  ChevronLeft, ChevronRight, PackagePlus, FileText,
  Copy, Clipboard, FileSpreadsheet
} from 'lucide-react';
import { hasTableClipboardData, parseClipboardTable, convertTableToImageFile } from '../utils/tableToImage';

const ACCESSORY_CATEGORIES = [
  'Kitchen Hardware & Baskets',
  'Tandem Boxes & Cutlery Trays',
  'Corner Carousel / Magic Corner',
  'Tall Unit Pantry Pull-out',
  'Lift-up Systems (Blum Aventos)',
  'Wardrobe Accessories & Pull-outs',
  'Under-sink Waste & Detergent Pull-out',
  'LED Profile Lighting & Sensors',
  'Handles, Knobs & Profile Channels',
  'Appliance Fittings & Chimney',
  'Bathroom Vanity Hardware',
  'Other Custom Accessories'
];

export default function StepAccessoriesSnips({
  accessoryPages = [],
  setAccessoryPages,
  onBack,
  onNext
}) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [viewMode, setViewMode] = useState('tabs'); // 'tabs' or 'all'
  const [toast, setToast] = useState(null);
  const fileInputRefs = useRef({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Ensure activePageIndex stays within bounds
  const safeIndex = Math.min(Math.max(0, activePageIndex), Math.max(0, accessoryPages.length - 1));
  const currentPage = accessoryPages[safeIndex] || null;

  // Add a new accessory page when "+" is pressed
  const handleAddPage = () => {
    const newIndex = accessoryPages.length + 1;
    const defaultCategory = ACCESSORY_CATEGORIES[(newIndex - 1) % ACCESSORY_CATEGORIES.length] || 'Kitchen Hardware & Baskets';
    const newPage = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      title: `Accessory Page ${newIndex} - ${defaultCategory}`,
      category: defaultCategory,
      notes: '',
      file: null,
      previewUrl: null
    };
    setAccessoryPages(prev => [...prev, newPage]);
    setActivePageIndex(accessoryPages.length);
  };

  // Remove an accessory page
  const handleRemovePage = (pageId, indexToRemove) => {
    if (accessoryPages.length <= 1) {
      setAccessoryPages([{
        id: `acc_${Date.now()}`,
        title: 'Accessory Page 1 - Kitchen Hardware & Baskets',
        category: 'Kitchen Hardware & Baskets',
        notes: '',
        file: null,
        previewUrl: null
      }]);
      setActivePageIndex(0);
      return;
    }
    
    setAccessoryPages(prev => prev.filter(p => p.id !== pageId));
    if (activePageIndex >= accessoryPages.length - 1) {
      setActivePageIndex(Math.max(0, accessoryPages.length - 2));
    }
  };

  // Update field of a page
  const handleUpdatePage = (pageId, field, value) => {
    setAccessoryPages(prev => prev.map(p => {
      if (p.id === pageId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // Handle file upload
  const handleFileChange = (pageId, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAccessoryPages(prev => prev.map(p => {
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

  // Clear file
  const handleClearFile = (pageId) => {
    setAccessoryPages(prev => prev.map(p => {
      if (p.id === pageId) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        return { ...p, file: null, previewUrl: null };
      }
      return p;
    }));
  };

  // Copy snip image to clipboard (Ctrl+C helper)
  const handleCopySnip = async (page) => {
    if (!page.file) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ [page.file.type || 'image/png']: page.file })
        ]);
        showToast(`📋 Copied accessory image for "${page.title}" to clipboard!`);
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
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.type !== 'file') {
        return;
      }

      if (!e.clipboardData) return;

      const targetPage = currentPage || accessoryPages[0];
      if (!targetPage) return;

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
        handleFileChange(targetPage.id, imageFile);
        showToast(`📋 Screenshot attached to "${targetPage.title}"!`);
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
              title: `${targetPage.title} - Hardware Specifications`,
              filename: `Excel_Acc_${targetPage.category.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
            });
            handleFileChange(targetPage.id, convertedFile);
            showToast(`📊 Excel table (${tableData.rowCount} rows × ${tableData.colCount} cols) converted & attached to "${targetPage.title}"!`);
            return;
          }
        } catch (err) {
          console.error('[StepAccessoriesSnips] Excel conversion error:', err);
          showToast('⚠️ Could not convert Excel table to image.', 'error');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [accessoryPages, currentPage, safeIndex]);

  const uploadedPagesCount = accessoryPages.filter(p => p.file).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-200/70 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
              Step 05
            </span>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Accessories & Hardware Snips (Multi-Page)
            </h3>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Upload screenshot snips for modular hardware, pull-out baskets, and accessories. Press the <strong>"+"</strong> button to add another page where you can upload more accessory-wise snips with the same typography and slide layout.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800">
              {uploadedPagesCount} of {accessoryPages.length} Pages Attached
            </div>
            <div className="text-[11px] text-slate-500">Optional accessory slides</div>
          </div>
          
          {/* Main + Add Page Button */}
          <button
            type="button"
            onClick={handleAddPage}
            className="btn-gold w-full sm:w-auto px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer rounded-xl"
          >
            <Plus className="w-5 h-5" />
            <span>Add Another Page</span>
          </button>
        </div>
      </div>

      {/* Interactive Page Navigation Bar with prominent "+" Icon */}
      <div className="glass-panel p-3 bg-slate-50/80 border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 max-w-full flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-2 shrink-0">
            Accessory Pages ({accessoryPages.length}):
          </span>

          {accessoryPages.map((page, idx) => {
            const isActive = idx === safeIndex && viewMode === 'tabs';
            const hasSnip = !!page.file;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => {
                  setActivePageIndex(idx);
                  setViewMode('tabs');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25 ring-2 ring-amber-300/60'
                    : hasSnip
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-400'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>Page {idx + 1}</span>
                {hasSnip && (
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
                <span className="max-w-[120px] truncate text-[11px] font-normal opacity-90">
                  {page.category || page.title}
                </span>
              </button>
            );
          })}

          {/* Prominent "+" Add Page Icon in the Tab Bar */}
          <button
            type="button"
            onClick={handleAddPage}
            title="Add another accessory page"
            className="w-9 h-9 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 flex items-center justify-center font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 shadow-sm"
          >
            <Plus className="w-5 h-5 text-amber-800" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-semibold text-slate-600 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('tabs')}
            className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'tabs' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-slate-50'}`}
          >
            Single Page Focus
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'all' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-slate-50'}`}
          >
            View All ({accessoryPages.length})
          </button>
        </div>
      </div>

      {/* Single Page Tab View */}
      {viewMode === 'tabs' && currentPage && (
        <div className="glass-panel p-6 border-2 border-amber-300/80 bg-white space-y-6 shadow-md transition-all">
          
          {/* Page Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                #{safeIndex + 1}
              </span>
              
              {/* Editable Page Title */}
              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Accessory Page Title (Editable)
                </label>
                <input
                  type="text"
                  value={currentPage.title}
                  onChange={(e) => handleUpdatePage(currentPage.id, 'title', e.target.value)}
                  placeholder={`e.g. Accessory Page ${safeIndex + 1} - Kitchen Tandem Boxes`}
                  className="text-lg font-bold text-slate-900 bg-transparent border-b border-slate-200 hover:border-slate-400 focus:border-amber-500 focus:outline-none w-full py-0.5 transition-colors font-['Outfit']"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Category Dropdown */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Accessory Category
                </label>
                <select
                  value={currentPage.category}
                  onChange={(e) => handleUpdatePage(currentPage.id, 'category', e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none"
                >
                  {ACCESSORY_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Remove Page Button */}
              <button
                type="button"
                onClick={() => handleRemovePage(currentPage.id, safeIndex)}
                title="Remove this accessory page"
                className="mt-4 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Upload Dropzone & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Image Upload Area (8 cols) */}
            <div className="lg:col-span-8">
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Accessory Breakdown Snip (Image)</span>
                {currentPage.file && (
                  <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Attached
                  </span>
                )}
              </label>

              {currentPage.file ? (
                <div className="relative border-2 border-emerald-300 rounded-2xl p-4 bg-emerald-50/30 flex flex-col sm:flex-row items-center gap-5">
                  <div className="w-full sm:w-60 h-44 rounded-xl overflow-hidden bg-slate-900/5 shrink-0 flex items-center justify-center border border-slate-200 shadow-inner">
                    <img 
                      src={currentPage.previewUrl} 
                      alt={currentPage.title} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 text-left space-y-2 min-w-0">
                    <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ready for Slide Insertion</span>
                    </div>
                    <p className="text-sm font-mono font-semibold text-slate-800 truncate">
                      {currentPage.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(currentPage.file.size / 1024).toFixed(1)} KB • Rendered with template typography
                    </p>
                    
                    <div className="flex items-center gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => handleCopySnip(currentPage)}
                        className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Copy image to clipboard (Ctrl+C)"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[currentPage.id]?.click()}
                        className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer"
                      >
                        Replace Image
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearFile(currentPage.id)}
                        className="px-4 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 transition-all cursor-pointer"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRefs.current[currentPage.id]?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(currentPage.id, e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[180px] group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-amber-600 flex items-center justify-center mb-3 transition-colors">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Click or drag accessory snip here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload PNG, JPG, or WebP screenshot for {currentPage.title}
                  </p>
                  
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

              <input
                type="file"
                ref={(el) => (fileInputRefs.current[currentPage.id] = el)}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(currentPage.id, e.target.files[0]);
                  }
                }}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Optional Specifications & Hardware Details (4 cols) */}
            <div className="lg:col-span-4 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hardware Specifications & Brand Notes (Optional)
                </label>
                <textarea
                  value={currentPage.notes}
                  onChange={(e) => handleUpdatePage(currentPage.id, 'notes', e.target.value)}
                  placeholder="e.g. Hettich InnoTech Atira, Soft-close 30kg capacity, anthracite grey finish, lifetime warranty..."
                  rows={5}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none text-slate-700 bg-slate-50 resize-none leading-relaxed"
                />
              </div>

              {/* Page Switcher Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  disabled={safeIndex === 0}
                  onClick={() => setActivePageIndex(safeIndex - 1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev Page</span>
                </button>

                <span className="text-xs font-bold text-slate-500">
                  Page {safeIndex + 1} of {accessoryPages.length}
                </span>

                {safeIndex < accessoryPages.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActivePageIndex(safeIndex + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-slate-700 cursor-pointer"
                  >
                    <span>Next Page</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddPage}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Next</span>
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Grid View: Show All Pages Stacked */}
      {viewMode === 'all' && (
        <div className="space-y-5">
          {accessoryPages.map((page, index) => (
            <div 
              key={page.id} 
              className="glass-panel p-5 border border-slate-200 hover:border-amber-300 transition-all duration-200 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={page.title}
                    onChange={(e) => handleUpdatePage(page.id, 'title', e.target.value)}
                    className="text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none w-full py-0.5 font-['Outfit']"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={page.category}
                    onChange={(e) => handleUpdatePage(page.id, 'category', e.target.value)}
                    className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
                  >
                    {ACCESSORY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemovePage(page.id, index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  {page.file ? (
                    <div className="flex items-center gap-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <img src={page.previewUrl} alt={page.title} className="w-20 h-14 object-contain rounded bg-white" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{page.file.name}</p>
                        <button
                          type="button"
                          onClick={() => handleClearFile(page.id)}
                          className="text-[11px] text-rose-600 font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRefs.current[page.id]?.click()}
                      className="border border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-4 text-center cursor-pointer text-xs text-slate-600"
                    >
                      Click to upload snip for {page.title}
                    </div>
                  )}
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current[page.id] = el)}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(page.id, e.target.files[0]);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={page.notes}
                    onChange={(e) => handleUpdatePage(page.id, 'notes', e.target.value)}
                    placeholder="Hardware brand & specs (optional)..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Large Bottom "+ Add Another Accessory Page" Button */}
      <button
        type="button"
        onClick={handleAddPage}
        className="w-full border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/30 hover:bg-amber-50/70 p-5 rounded-2xl flex items-center justify-center gap-3 text-amber-800 font-bold text-sm transition-all duration-200 cursor-pointer shadow-sm group"
      >
        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-amber-500/30">
          <Plus className="w-5 h-5" />
        </div>
        <span>+ Add Another Accessory Page (Tandem Boxes, Corner Units, Tall Pull-outs, etc.)</span>
      </button>

      {/* Step Navigation Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary w-full sm:w-auto px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quotation Snips</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {uploadedPagesCount > 0 
              ? `✓ ${uploadedPagesCount} accessory snip(s) configured` 
              : 'Optional • Continue when ready'}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="btn-gold w-full sm:w-auto px-8 py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Next: Generate & Export</span>
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
