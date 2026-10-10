import React, { useState } from 'react';
import { 
  Download, ArrowLeft, Cpu, CheckCircle2, 
  Layers, User, Sparkles, Loader2, FileText, Eye, Maximize2 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StepReviewGenerate({
  clientInfo,
  repInfo,
  variants,
  selectedVariantIds,
  snipFiles,
  onBack,
  onGenerate,
  isGenerating,
  generationResult,
  onReset,
  onPreviewPdf
}) {
  const [engineType, setEngineType] = useState('node');
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState(true);

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
  const estimatedOutputSlides = totalMasterSlides - subtractedSlidesCount;

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
              <p className="text-slate-900 font-semibold">{clientInfo.name}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold block">Contact Number</span>
              <p className="text-slate-700 font-mono">{clientInfo.contact}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold block">Site Location</span>
              <p className="text-slate-700">{clientInfo.location}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500 font-bold block">Quotation Date</span>
              <p className="text-slate-700 font-mono">{clientInfo.date || 'Today'}</p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <span className="text-xs uppercase text-amber-700 font-bold block">Sales Rep / Designer</span>
              <p className="text-slate-900 font-semibold">{repInfo.name || 'Cookscape Design Team'}</p>
              <p className="text-xs text-slate-600">{repInfo.contact} • {repInfo.email}</p>
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
            {selectedVariants.map(v => (
              <div key={v.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{v.name}</p>
                  <p className="text-[11px] text-slate-500">{v.category}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {v.specs?.warranty || 'Approved'}
                  </span>
                  {snipFiles[v.id] && (
                    <span className="block text-[10px] text-emerald-700 font-bold mt-1">✓ Snip attached</span>
                  )}
                </div>
              </div>
            ))}
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

      </div>

      {/* Generation Result Success Card */}
      {generationResult ? (
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
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            
            {/* View PDF Button */}
            {pdfViewUrl && (
              <button
                type="button"
                onClick={() => onPreviewPdf && onPreviewPdf(pdfViewUrl, `${clientInfo.name} Quotation PDF`)}
                className="px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition-all hover:-translate-y-0.5"
              >
                <Eye className="w-4 h-4" />
                <span>👁️ View & Preview PDF</span>
              </button>
            )}

            {/* PDF Download Button */}
            <a
              href={pdfDownloadUrl}
              download
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-cyan-400 text-cyan-800 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:-translate-y-0.5"
            >
              <FileText className="w-4 h-4 text-cyan-600" />
              <span>Download PDF (.pdf)</span>
            </a>

            {/* PPTX Download Button */}
            <a
              href={pptxDownloadUrl}
              download
              className="btn-gold text-sm px-6 py-3.5 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PowerPoint (.pptx)</span>
            </a>

          </div>

          {/* EMBEDDED LIVE PDF PREVIEW */}
          {pdfViewUrl && (
            <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden bg-white text-left shadow-md">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Live PDF Document Preview (Scroll to inspect pages)
                </span>
                <div className="flex items-center space-x-2">
                  <a
                    href={pdfViewUrl}
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
                    className="text-slate-600 hover:text-slate-900 text-[11px] px-2.5 py-1 rounded bg-white border border-slate-200 font-semibold"
                  >
                    {showEmbeddedPdf ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>

              {showEmbeddedPdf && (
                <div className="w-full h-[550px] bg-slate-100">
                  <iframe
                    src={pdfViewUrl}
                    title="Live Quotation PDF Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onReset}
              className="btn-secondary px-6 py-2.5 text-xs text-slate-600 hover:text-slate-900"
            >
              Create Another Quotation
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-slate-900">Ready to Compile Presentation & PDF</h3>
            <p className="text-sm text-slate-600 mt-1">
              Your customized quotation will be generated in both <strong>PowerPoint (.pptx)</strong> and <strong>PDF (.pdf)</strong> formats simultaneously.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={onBack}
              disabled={isGenerating}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="btn-gold text-base px-8 py-3.5 shadow-md shadow-amber-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Compiling PPTX & PDF Formats...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Quotation (PPTX & PDF)</span>
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
        </div>
      )}

    </div>
  );
}
