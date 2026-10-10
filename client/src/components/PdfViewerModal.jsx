import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

export default function PdfViewerModal({ isOpen, onClose, pdfUrl, title }) {
  if (!isOpen || !pdfUrl) return null;

  // Ensure URL uses view or inline
  const viewUrl = pdfUrl.includes('/view/') 
    ? pdfUrl 
    : pdfUrl.replace('/download/', '/view/');

  const downloadUrl = pdfUrl.includes('/download/') 
    ? pdfUrl 
    : pdfUrl.replace('/view/', '/download/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-white/20 shadow-2xl bg-slate-950">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white truncate max-w-md">
                {title || 'Quotation PDF Preview'}
              </h3>
              <p className="text-xs text-slate-400">Live Vector PDF Document Viewer</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Open in new tab */}
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open New Tab</span>
            </a>

            {/* Direct Download */}
            <a
              href={downloadUrl}
              download
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF iframe */}
        <div className="flex-1 w-full bg-slate-900/50 relative">
          <iframe
            src={viewUrl}
            title="Quotation PDF"
            className="w-full h-full border-none"
          />
        </div>

      </div>
    </div>
  );
}
