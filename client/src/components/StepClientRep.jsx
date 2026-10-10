import React from 'react';
import { User, Phone, MapPin, Mail, Calendar, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function StepClientRep({ clientInfo, setClientInfo, repInfo, setRepInfo, onNext }) {

  const loadTemplateDefaults = () => {
    setClientInfo({
      name: 'Mr. Aravindan',
      contact: '7418414780',
      location: 'Individual Villa Adyar',
      date: new Date().toLocaleDateString('en-GB')
    });
    setRepInfo({
      name: 'Mr. Abishek',
      contact: '93611 84787',
      email: 'designs.cookscape@gmail.com'
    });
  };

  const loadSampleClient = () => {
    setClientInfo({
      name: 'Dr. Siddharth & Meera Menon',
      contact: '+91 98401 23456',
      location: 'Skyline Waterfront Penthouse, ECR',
      date: new Date().toLocaleDateString('en-GB')
    });
    setRepInfo({
      name: 'Karthik Ramanathan',
      contact: '+91 94444 88888',
      email: 'karthik@cookscape.in'
    });
  };

  const isValid = clientInfo.name && clientInfo.contact && clientInfo.location;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Intro Banner with One-Click Pre-fills */}
      <div className="glass-panel p-6 border-l-4 border-l-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Cover Page & Footer Typography
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            These variables are dynamically injected into Slide 1 (Cover Page) and into the footer banner across every variant slide in the presentation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadTemplateDefaults}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-amber-300 transition-colors"
          >
            Load Master Template Defaults
          </button>
          <button
            type="button"
            onClick={loadSampleClient}
            className="px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-400 transition-colors"
          >
            Demo Premium Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Client Details Section */}
        <div className="glass-panel p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Client Details</h3>
              <p className="text-xs text-slate-400">Appears on Cover Page & Master Footers</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Client Name *</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input pl-11"
                  placeholder="e.g. Mr. Aravindan / Rajesh Sharma"
                  value={clientInfo.name || ''}
                  onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Contact Number *</label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-input pl-11"
                    placeholder="e.g. 7418414780"
                    value={clientInfo.contact || ''}
                    onChange={(e) => setClientInfo({ ...clientInfo, contact: e.target.value })}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="form-label">Quotation Date</label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-input pl-11"
                    placeholder="e.g. 10/10/2026"
                    value={clientInfo.date || ''}
                    onChange={(e) => setClientInfo({ ...clientInfo, date: e.target.value })}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Site / Property Location *</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input pl-11"
                  placeholder="e.g. Individual Villa Adyar / Prestige Falcon City"
                  value={clientInfo.location || ''}
                  onChange={(e) => setClientInfo({ ...clientInfo, location: e.target.value })}
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>
        </div>

        {/* Sales Rep / Designer Section */}
        <div className="glass-panel p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Sales Representative / Designer</h3>
              <p className="text-xs text-slate-400">Appears in Designer Details box on Cover Page</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Designer / Rep Name *</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input pl-11"
                  placeholder="e.g. Mr. Abishek"
                  value={repInfo.name || ''}
                  onChange={(e) => setRepInfo({ ...repInfo, name: e.target.value })}
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="form-label">Designer Contact Phone</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input pl-11"
                  placeholder="e.g. 93611 84787"
                  value={repInfo.contact || ''}
                  onChange={(e) => setRepInfo({ ...repInfo, contact: e.target.value })}
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="form-label">Designer Official Email</label>
              <div className="relative">
                <input
                  type="email"
                  className="form-input pl-11"
                  placeholder="e.g. designs.cookscape@gmail.com"
                  value={repInfo.email || ''}
                  onChange={(e) => setRepInfo({ ...repInfo, email: e.target.value })}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Live Footer Preview Box */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5 mt-2">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Slide Footer Preview:
              </span>
              <p className="text-xs font-mono text-slate-300 break-words">
                {clientInfo.name || '[Client Name]'} | {clientInfo.location || '[Location]'} | {clientInfo.contact || '[Contact]'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Next */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="btn-gold"
        >
          <span>Continue to Variant Selection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
