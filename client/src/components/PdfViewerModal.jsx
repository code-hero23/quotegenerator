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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
                {title || 'Quotation PDF Preview'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Live Vector PDF Document Viewer</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Open in new tab */}
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open New Tab</span>
            </a>

            {/* Direct Download */}
            <a
              href={downloadUrl}
              download
              className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF iframe */}
        <div className="flex-1 w-full bg-slate-100 relative">
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
