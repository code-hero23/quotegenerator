import React, { useRef } from 'react';
import { 
  Plus, Trash2, UploadCloud, Image as ImageIcon, 
  ArrowLeft, ArrowRight, CheckCircle2, Eye, X, Layers, Sparkles 
} from 'lucide-react';

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
  unitPages = [],
  setUnitPages,
  onBack,
  onNext
}) {
  const fileInputRefs = useRef({});

  // Add a new unit page
  const handleAddPage = () => {
    const newIndex = unitPages.length + 1;
    const defaultCategory = COMMON_CATEGORIES[(newIndex - 1) % COMMON_CATEGORIES.length] || 'Modular Kitchen';
    const newPage = {
      id: `unit_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      title: `Unit ${newIndex} - ${defaultCategory}`,
      category: defaultCategory,
      notes: '',
      file: null,
      previewUrl: null
    };
    setUnitPages(prev => [...prev, newPage]);
  };

  // Remove a unit page
  const handleRemovePage = (pageId) => {
    if (unitPages.length <= 1) {
      // Just clear the single page
      setUnitPages([{
        id: `unit_${Date.now()}`,
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
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        return { ...p, file: null, previewUrl: null };
      }
      return p;
    }));
  };

  const uploadedPagesCount = unitPages.filter(p => p.file).length;

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

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-700">
              {uploadedPagesCount} of {unitPages.length} Uploaded
            </div>
            <div className="text-[11px] text-slate-500">Optional snip pages</div>
          </div>
          <button
            type="button"
            onClick={handleAddPage}
            className="btn-gold px-5 py-2.5 text-sm font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Add Unit Page</span>
          </button>
        </div>
      </div>

      {/* List of Unit Pages */}
      <div className="space-y-5">
        {unitPages.map((page, index) => {
          return (
            <div 
              key={page.id} 
              className="glass-panel p-5 border border-slate-200 hover:border-amber-300 transition-all duration-200 bg-white"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                    #{index + 1}
                  </span>
                  
                  {/* Editable Title */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={page.title}
                      onChange={(e) => handleUpdatePage(page.id, 'title', e.target.value)}
                      placeholder={`e.g. Unit ${index + 1} - Kitchen Breakdown`}
                      className="text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none w-full py-0.5 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                  {page.file ? (
                    // Uploaded State with Preview
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
                          {page.file.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(page.file.size / 1024).toFixed(1)} KB • Will be inserted into presentation
                        </p>
                        
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[page.id]?.click()}
                            className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClearFile(page.id)}
                            className="px-3 py-1 rounded bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 border border-rose-200 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Empty Dropzone State
                    <div
                      onClick={() => fileInputRefs.current[page.id]?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileChange(page.id, e.dataTransfer.files[0]);
                        }
                      }}
                      className="border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/30 rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[140px]"
                    >
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-amber-500 mb-2" />
                      <p className="text-xs font-bold text-slate-800">
                        Click or drag screenshot snip here
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        PNG, JPG, or WebP screenshot of unit plan or breakdown
                      </p>
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
        })}

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
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary px-6 py-3 text-sm font-semibold flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Variants</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {uploadedPagesCount > 0 
              ? `✓ ${uploadedPagesCount} unit snip(s) ready` 
              : 'Optional • Proceed whenever ready'}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="btn-gold px-8 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Next: Quotation Snips</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
