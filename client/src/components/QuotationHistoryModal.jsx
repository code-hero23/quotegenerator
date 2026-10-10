import React, { useState } from 'react';
import { 
  X, History, Download, Calendar, User, FileText, Search, 
  Layers, MapPin, Phone, FileCheck, Check, Sparkles, TrendingUp, Filter, Eye 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white font-['Outfit']">Quotation Vault & History</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {totalCount} Generated
                </span>
              </div>
              <p className="text-xs text-slate-400">View live PDFs and download presentations (.pptx) or documents (.pdf)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Analytics Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-900/60 border-b border-white/5 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block mb-0.5">Total Presentations</span>
            <span className="text-lg font-bold text-white font-['Outfit']">{totalCount} Quotes</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block mb-0.5">Quoted Pipeline Value</span>
            <span className="text-lg font-bold text-amber-400 font-['Outfit']">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPipelineValue)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block mb-0.5">Available Formats</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
              <Check className="w-4 h-4" /> PPTX + Live PDF Preview
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by client, location, or QT-number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              All Quotes
            </button>
            <button
              onClick={() => setFilterType('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'recent'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Today's Quotes
            </button>
          </div>
        </div>

        {/* Quotations List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <FileText className="w-14 h-14 text-slate-600 mx-auto" />
              <h4 className="text-base font-semibold text-slate-300">No matching quotation records found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery ? 'Try clearing your search query.' : 'Generate your first quotation presentation using the 4-step wizard.'}
              </p>
            </div>
          ) : (
            filteredQuotations.map((quote) => {
              const client = quote.client || {};
              const user = quote.user || {};
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
                  className="p-5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
                >
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {quote.quotationNumber}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(quote.id, quote.quotationNumber)}
                        className="text-[10px] text-slate-500 hover:text-amber-400 font-mono transition-colors"
                      >
                        {copiedId === quote.id ? '✓ Copied' : 'Copy Ref'}
                      </button>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                          {client.name || 'Valued Client'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                          {client.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {client.location}
                            </span>
                          )}
                          {client.contactNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              {client.contactNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-amber-400 font-['Outfit'] block">
                          {formattedPrice}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {variants.length} Variant{variants.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Variant Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {variants.map((v, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300 font-medium">
                          {v.name || v}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: TRIPLE ACTIONS (VIEW PDF + DOWNLOAD PDF + DOWNLOAD PPTX) */}
                  <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                    {/* View PDF Button */}
                    {pdfViewUrl && (
                      <button
                        type="button"
                        onClick={() => onPreviewPdf && onPreviewPdf(pdfViewUrl, `${client.name || 'Client'} Quotation PDF`)}
                        className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>👁️ View PDF</span>
                      </button>
                    )}

                    {/* PDF Download Button */}
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        download
                        className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Download PDF</span>
                      </a>
                    )}

                    {/* PPTX Download Button */}
                    {pptxUrl && (
                      <a
                        href={pptxUrl}
                        download
                        className="px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all hover:shadow-md hover:shadow-amber-500/10"
                      >
                        <Download className="w-3.5 h-3.5" />
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
        <div className="p-4 border-t border-white/10 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredQuotations.length} of {quotations.length} records</span>
          <button
            onClick={onClose}
            className="btn-secondary py-1.5 px-4 text-xs"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
}
