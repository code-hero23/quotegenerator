import React, { useState } from 'react';
import { 
  X, History, Download, Calendar, Search, 
  MapPin, Phone, Check, Eye, FileText 
} from 'lucide-react';

export default function QuotationHistoryModal({ isOpen, onClose, quotations = [], onPreviewPdf }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  // Filter & Search Logic
  const filteredQuotations = quotations.filter((q) => {
    const client = q.client || {};
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (q.quotationNumber && q.quotationNumber.toLowerCase().includes(query)) ||
      (client.name && client.name.toLowerCase().includes(query)) ||
      (client.location && client.location.toLowerCase().includes(query)) ||
      (client.contactNumber && client.contactNumber.includes(query));

    if (!matchesSearch) return false;

    if (filterType === 'recent') {
      const isToday = new Date(q.createdAt).toDateString() === new Date().toDateString();
      return isToday;
    }
    return true;
  });

  // Calculate Metrics
  const totalCount = quotations.length;
  let totalPipelineValue = 0;
  quotations.forEach(q => {
    const variants = Array.isArray(q.selectedVariants) 
      ? q.selectedVariants 
      : (typeof q.selectedVariants === 'string' ? JSON.parse(q.selectedVariants || '[]') : []);
    const sum = variants.reduce((s, v) => s + (v.price || 0), 0);
    totalPipelineValue += sum;
  });

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-sm shadow-amber-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">Quotation Vault & History</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  {totalCount} Generated
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">View live PDFs and download presentations (.pptx) or documents (.pdf)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Analytics Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50/70 border-b border-slate-200 text-xs">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block mb-0.5 font-medium">Total Presentations</span>
            <span className="text-lg font-bold text-slate-900 font-['Outfit']">{totalCount} Quotes</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block mb-0.5 font-medium">Quoted Pipeline Value</span>
            <span className="text-lg font-bold text-amber-800 font-['Outfit']">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPipelineValue)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-slate-500 block mb-0.5 font-medium">Available Formats</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1.5 mt-1">
              <Check className="w-4 h-4" /> PPTX + Live PDF Preview
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by client, location, or QT-number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'all'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All Quotes
            </button>
            <button
              onClick={() => setFilterType('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'recent'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Today's Quotes
            </button>
          </div>
        </div>

        {/* Quotations List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <FileText className="w-14 h-14 text-slate-400 mx-auto" />
              <h4 className="text-base font-semibold text-slate-700">No matching quotation records found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery ? 'Try clearing your search query.' : 'Generate your first quotation presentation using the 4-step wizard.'}
              </p>
            </div>
          ) : (
            filteredQuotations.map((quote) => {
              const client = quote.client || {};
              const variants = Array.isArray(quote.selectedVariants) 
                ? quote.selectedVariants 
                : (typeof quote.selectedVariants === 'string' ? JSON.parse(quote.selectedVariants || '[]') : []);

              const quoteTotal = variants.reduce((s, v) => s + (v.price || 0), 0);
              const formattedPrice = new Intl.NumberFormat('en-IN', { 
                style: 'currency', 
                currency: 'INR', 
                maximumFractionDigits: 0 
              }).format(quoteTotal);

              const pptxUrl = quote.downloadUrl || null;
              const pdfUrl = quote.pdfDownloadUrl || (quote.downloadUrl ? quote.downloadUrl.replace(/\.pptx$/i, '.pdf') : null);
              const pdfViewUrl = pdfUrl ? pdfUrl.replace('/download/', '/view/') : null;

              return (
                <div
                  key={quote.id}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group shadow-xs"
                >
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {quote.quotationNumber}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(quote.id, quote.quotationNumber)}
                        className="text-[10px] text-slate-400 hover:text-amber-700 font-mono transition-colors font-medium"
                      >
                        {copiedId === quote.id ? '✓ Copied' : 'Copy Ref'}
                      </button>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                          {client.name || 'Valued Client'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                          {client.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {client.location}
                            </span>
                          )}
                          {client.contactNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {client.contactNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-amber-800 font-['Outfit'] block">
                          {formattedPrice}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {variants.length} Variant{variants.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Variant Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {variants.map((v, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                          {v.name || v}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: ACTIONS (VIEW PDF + DOWNLOAD PDF + DOWNLOAD PPTX) */}
                  <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* View PDF Button */}
                    {pdfViewUrl && (
                      <button
                        type="button"
                        onClick={() => onPreviewPdf && onPreviewPdf(pdfViewUrl, `${client.name || 'Client'} Quotation PDF`)}
                        className="px-3.5 py-2 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-600" />
                        <span>👁️ View PDF</span>
                      </button>
                    )}

                    {/* PDF Download Button */}
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        download
                        className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Download PDF</span>
                      </a>
                    )}

                    {/* PPTX Download Button */}
                    {pptxUrl && (
                      <a
                        href={pptxUrl}
                        download
                        className="px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-700" />
                        <span>Download PPTX</span>
                      </a>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredQuotations.length} of {quotations.length} records</span>
          <button
            onClick={onClose}
            className="btn-secondary py-1.5 px-4 text-xs font-semibold"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
}
