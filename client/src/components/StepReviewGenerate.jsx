import React, { useState } from 'react';
import { 
  Download, ArrowLeft, Cpu, CheckCircle2, 
  Layers, User, Sparkles, Loader2, FileText, Eye, Maximize2, PlusCircle,
  RefreshCw, Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StepReviewGenerate({
  clientInfo,
  repInfo,
  variants,
  selectedVariantIds,
  snipFiles,
  unitPages = [],
  accessoryPages = [],
  onBack,
  onGenerate,
  isGenerating,
  generationResult,
  onReset,
  onPreviewPdf,
  hasChangesSinceGeneration = false,
  parentQuotationNumber = null,
  onEditStep
}) {
  const [engineType, setEngineType] = useState('node');
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState(true);
  const [showPreviousResult, setShowPreviousResult] = useState(false);

  const showSuccessCard = Boolean(generationResult && !hasChangesSinceGeneration);

  const selectedVariants = variants.filter(v => selectedVariantIds.includes(v.id));
  const unselectedVariants = variants.filter(v => !selectedVariantIds.includes(v.id));

  const totalMasterSlides = 29;
  let subtractedSlidesCount = 0;
  unselectedVariants.forEach(v => {
    const indices = Array.isArray(v.slideIndices) 
      ? v.slideIndices 
      : (typeof v.slideIndices === 'string' ? JSON.parse(v.slideIndices || '[]') : []);
    subtractedSlidesCount += indices.length;
  });

  // Calculate additional slides added by extra snips (beyond primary snip)
  let extraVariantSlides = 0;
  selectedVariants.forEach(v => {
    const snips = snipFiles[v.id];
    const count = Array.isArray(snips) 
      ? snips.filter(s => s && (s.file || s instanceof File)).length 
      : (snips ? 1 : 0);
    if (count > 1) {
      extraVariantSlides += (count - 1);
    }
  });

  const extraUnitSlides = Array.isArray(unitPages) ? unitPages.filter(p => p.file || p.previewUrl || p.filePath).length : 0;
  const extraAccSlides = Array.isArray(accessoryPages) ? accessoryPages.filter(p => p.file || p.previewUrl || p.filePath).length : 0;
  const estimatedOutputSlides = totalMasterSlides - subtractedSlidesCount + extraUnitSlides + extraAccSlides + extraVariantSlides;

  const handleStartGeneration = async () => {
    const res = await onGenerate(engineType);
    if (res && res.success) {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  };

  // Derive URLs
  const pptxDownloadUrl = generationResult 
    ? (generationResult.pptxDownloadUrl || generationResult.downloadUrl) 
    : null;
    
  const pdfDownloadUrl = generationResult 
    ? (generationResult.pdfDownloadUrl || (generationResult.downloadUrl && generationResult.downloadUrl.replace(/\.pptx$/i, '.pdf'))) 
    : null;

  const pdfViewUrl = generationResult 
    ? (generationResult.pdfViewUrl || (pdfDownloadUrl ? pdfDownloadUrl.replace('/download/', '/view/') : null))
    : null;

  const livePdfViewUrl = pdfViewUrl ? `${pdfViewUrl}?t=${generationResult?.durationMs || Date.now()}` : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Review Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Client & Rep Summary */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-amber-700 font-bold pb-3 border-b border-slate-200">
            <User className="w-5 h-5 text-amber-600" />
            <h4 className="text-slate-900 text-base">Client & Designer</h4>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold block">Client Name</span>
              <p className="text-slate-900 font-semibold">{clientInfo.name || 'Not Specified'}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold block">Contact Number</span>
              <p className="text-slate-700 font-mono">{clientInfo.contact || 'Not Specified'}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold block">Site Location</span>
              <p className="text-slate-700">{clientInfo.location || 'Not Specified'}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold block">Quotation Date</span>
              <p className="text-slate-700 font-mono">{clientInfo.date || 'Today'}</p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <span className="text-xs uppercase text-amber-700 font-bold block">Sales Rep / Designer</span>
              <p className="text-slate-900 font-semibold">{repInfo.name || 'Cookscape Design Team'}</p>
              <p className="text-xs text-slate-600">
                {(repInfo.contact || repInfo.email)
                  ? `${repInfo.contact || ''}${repInfo.contact && repInfo.email ? ' • ' : ''}${repInfo.email || ''}`
                  : 'Design Team'}
              </p>
            </div>
          </div>
        </div>

        {/* Selected Variants Summary */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-amber-700 font-bold pb-3 border-b border-slate-200">
            <Layers className="w-5 h-5 text-amber-600" />
            <h4 className="text-slate-900 text-base">Selected Variants ({selectedVariants.length})</h4>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {selectedVariants.map(v => {
              const vSnips = Array.isArray(snipFiles[v.id]) 
                ? snipFiles[v.id].filter(s => s && (s.file || s.previewUrl || s instanceof File))
                : (snipFiles[v.id] ? [snipFiles[v.id]] : []);
              const snipCount = vSnips.length;

              return (
                <div key={v.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{v.name}</p>
                    <p className="text-[11px] text-slate-500">{v.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {v.specs?.warranty || 'Approved'}
                    </span>
                    {snipCount > 0 ? (
                      <span className="block text-[10px] text-emerald-700 font-bold mt-1">
                        ✓ {snipCount} {snipCount === 1 ? 'Quotation Page' : `Pages (+${snipCount - 1} Extra)`}
                      </span>
                    ) : (
                      <span className="block text-[10px] text-slate-400 font-medium mt-1">
                        Default Quotation Slide
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-600">Selected Specifications</span>
            <span className="text-sm font-bold text-slate-900 font-['Outfit']">{selectedVariants.length} Active Modules</span>
          </div>
        </div>

        {/* PPTX Subtraction Pipeline Architecture */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-amber-700 font-bold pb-3 border-b border-slate-200">
            <Cpu className="w-5 h-5 text-amber-600" />
            <h4 className="text-slate-900 text-base">Template Subtraction Pipeline</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>Master Template Base:</span>
                <span className="font-mono font-bold text-slate-900">29 Slides</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Unselected Variant Slides to Purge:</span>
                <span className="font-mono font-bold">-{subtractedSlidesCount} Slides</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
                <span>Output Presentation:</span>
                <span className="font-mono font-bold text-emerald-800">{estimatedOutputSlides} Slides</span>
              </div>
            </div>

            {/* Dual Export Feature Tag */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-slate-700 space-y-1">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-700" />
                Dual Format Compilation
              </span>
              <p className="text-[11px] text-slate-600">
                Simultaneously generates both an editable <strong>PowerPoint (.pptx)</strong> presentation and an official vector <strong>PDF quotation</strong> document.
              </p>
            </div>
          </div>
        </div>

        {/* Unit Breakdown Snips Overview */}
        {unitPages && unitPages.length > 0 && (
          <div className="md:col-span-3 glass-panel p-4 flex flex-wrap items-center justify-between gap-3 bg-amber-50/40 border-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-amber-500/30">
                {unitPages.length}
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Unit Breakdown Pages Configured: <strong className="text-amber-800">{unitPages.length} Unit Page(s)</strong>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {unitPages.filter(u => u.file || u.previewUrl || u.filePath).length} snip image(s) attached
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {unitPages.map((u, i) => {
                const isAttached = Boolean(u.file || u.previewUrl || u.filePath);
                return (
                  <span 
                    key={u.id || i} 
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 ${
                      isAttached 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>#{i + 1}</span>
                    <span className="truncate max-w-[120px]">{u.title || u.category}</span>
                    {isAttached && <span className="text-emerald-600 font-bold">✓</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Accessories Breakdown Snips Overview */}
        {accessoryPages && accessoryPages.length > 0 && (
          <div className="md:col-span-3 glass-panel p-4 flex flex-wrap items-center justify-between gap-3 bg-purple-50/40 border-purple-200">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-purple-600/30">
                {accessoryPages.length}
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Accessories &amp; Hardware Pages: <strong className="text-purple-900">{accessoryPages.length} Page(s)</strong>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {accessoryPages.filter(a => a.file || a.previewUrl || a.filePath).length} hardware snip(s) attached
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {accessoryPages.map((a, i) => {
                const isAttached = Boolean(a.file || a.previewUrl || a.filePath);
                return (
                  <span 
                    key={a.id || i} 
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 ${
                      isAttached 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>#{i + 1}</span>
                    <span className="truncate max-w-[120px]">{a.title || a.category}</span>
                    {isAttached && <span className="text-emerald-600 font-bold">✓</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Changes Detected Alert Banner */}
      {hasChangesSinceGeneration && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm shadow-amber-500/30">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>Quotation Details Modified</span>
                {parentQuotationNumber && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                    Previous: {parentQuotationNumber}
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                You made changes to client details or specifications. Click below to compile your new quotation revision!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartGeneration}
            disabled={isGenerating}
            className="btn-gold text-xs sm:text-sm px-5 py-2.5 shrink-0 shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling New Version...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Compile New Quotation</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Generation Result Success Card */}
      {showSuccessCard ? (
        <div className="glass-panel p-6 sm:p-8 border-2 border-emerald-400 bg-emerald-50/40 space-y-6 text-center animate-fadeIn shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-800">
              Quotation Generated Successfully
            </span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {clientInfo.name} — {generationResult.quotationNumber}
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Compiled in <span className="text-slate-900 font-mono font-bold">{generationResult.durationMs}ms</span> • Both presentation and document ready for download
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="inline-flex flex-wrap items-center justify-center gap-4 p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
            <div>
              <span className="text-slate-500">PPTX Slides: </span>
              <strong className="text-slate-900 font-mono">{generationResult.slideCount || estimatedOutputSlides}</strong>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <div>
              <span className="text-slate-500">PPTX Size: </span>
              <strong className="text-slate-900 font-mono">{((generationResult.pptxFileSize || generationResult.fileSize) / (1024 * 1024)).toFixed(1)} MB</strong>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <div>
              <span className="text-slate-500">PDF Document: </span>
              <strong className="text-cyan-700 font-mono">{generationResult.pdfFileSize ? `${(generationResult.pdfFileSize / 1024).toFixed(1)} KB` : 'Ready'}</strong>
            </div>
          </div>

          {/* ACTION BUTTONS (VIEW PDF + DOWNLOAD PDF + DOWNLOAD PPTX) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full">
            
            {/* View PDF Button */}
            {livePdfViewUrl && (
              <button
                type="button"
                onClick={() => onPreviewPdf && onPreviewPdf(livePdfViewUrl, `${clientInfo.name} Quotation PDF (${generationResult.quotationNumber})`)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>👁️ View & Preview PDF</span>
              </button>
            )}

            {/* PDF Download Button */}
            <a
              href={pdfDownloadUrl}
              download
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-cyan-400 text-cyan-800 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-cyan-600" />
              <span>Download PDF (.pdf)</span>
            </a>

            {/* PPTX Download Button */}
            <a
              href={pptxDownloadUrl}
              download
              className="btn-gold w-full sm:w-auto text-sm px-6 py-3.5 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PowerPoint (.pptx)</span>
            </a>

          </div>

          {/* EMBEDDED LIVE PDF PREVIEW */}
          {livePdfViewUrl && (
            <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden bg-white text-left shadow-md">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">Live PDF Document Preview — {generationResult.quotationNumber}</span>
                </span>
                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={livePdfViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-slate-900 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-white border border-slate-200 font-semibold"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Fullscreen</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowEmbeddedPdf(!showEmbeddedPdf)}
                    className="text-slate-600 hover:text-slate-900 text-[11px] px-2.5 py-1 rounded bg-white border border-slate-200 font-semibold cursor-pointer"
                  >
                    {showEmbeddedPdf ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>

              {showEmbeddedPdf && (
                <div className="w-full h-[380px] sm:h-[550px] bg-slate-100">
                  <iframe
                    src={livePdfViewUrl}
                    title="Live Quotation PDF Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* ACTIONS: MAKE CHANGES / RE-COMPILE / FRESH QUOTE */}
          <div className="pt-6 border-t border-emerald-200/70 flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              type="button"
              onClick={() => onEditStep ? onEditStep(1) : onBack()}
              className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
              title="Return to Step 1 to modify client or quotation details"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>✏️ Modify / Edit Quotation</span>
            </button>

            <button
              type="button"
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              title="Re-generate quotation file"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>🔄 Re-compile Quotation</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="px-5 py-3 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
              title="Clear draft and start a completely new quotation"
            >
              <PlusCircle className="w-4 h-4 text-slate-400" />
              <span>Start Fresh Quotation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-5 sm:p-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-slate-900">
              {hasChangesSinceGeneration ? 'Ready to Compile Updated Quotation' : 'Ready to Compile Presentation & PDF'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {hasChangesSinceGeneration
                ? `Your updated client details and specifications will be compiled into a brand new PowerPoint (.pptx) and vector PDF document${parentQuotationNumber ? ` (Revision of ${parentQuotationNumber})` : ''}.`
                : 'Your customized quotation will be generated in both PowerPoint (.pptx) and PDF (.pdf) formats simultaneously.'}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBack}
              disabled={isGenerating}
              className="btn-secondary w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="btn-gold w-full sm:w-auto text-base px-8 py-3.5 shadow-md shadow-amber-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Compiling PPTX & PDF Formats...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{hasChangesSinceGeneration ? '⚡ Generate Updated Quotation (PPTX & PDF)' : 'Generate Quotation (PPTX & PDF)'}</span>
                </>
              )}
            </button>
          </div>

          {isGenerating && (
            <div className="w-full max-w-md space-y-2 text-center animate-pulse">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-500 h-full w-3/4 animate-pulse"></div>
              </div>
              <p className="text-xs text-amber-800 font-mono font-semibold">
                Subtracting PPTX Slides • Rendering Vector PDF • Generating Dual Exports...
              </p>
            </div>
          )}

          {/* Reference to previously generated quotation if available */}
          {generationResult && hasChangesSinceGeneration && (
            <div className="w-full max-w-xl mt-4 pt-4 border-t border-slate-200 text-left">
              <button
                type="button"
                onClick={() => setShowPreviousResult(!showPreviousResult)}
                className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 font-medium py-1 cursor-pointer"
              >
                <span>📂 Previous Generation ({parentQuotationNumber || generationResult.quotationNumber})</span>
                <span className="font-mono text-[11px] underline text-amber-700">{showPreviousResult ? 'Hide' : 'Show downloads'}</span>
              </button>
              {showPreviousResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">
                    Compiled previously as <strong>{parentQuotationNumber || generationResult.quotationNumber}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {pdfDownloadUrl && (
                      <a href={pdfDownloadUrl} download className="px-2.5 py-1 rounded bg-white border border-slate-200 text-cyan-800 hover:text-cyan-900 font-semibold text-[11px]">
                        Previous PDF
                      </a>
                    )}
                    {pptxDownloadUrl && (
                      <a href={pptxDownloadUrl} download className="px-2.5 py-1 rounded bg-white border border-slate-200 text-amber-800 hover:text-amber-900 font-semibold text-[11px]">
                        Previous PPTX
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
