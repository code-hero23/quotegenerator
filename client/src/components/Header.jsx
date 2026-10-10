import React from 'react';
import { Layers, FileText, Database, History, CheckCircle2, AlertCircle, User, LogOut } from 'lucide-react';

export default function Header({ 
  isPostgresConnected, 
  onOpenHistory, 
  historyCount, 
  activeUser, 
  onLogout 
}) {
  return (
    <header className="border-b border-white/10 bg-[#0a0f1d]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
            <Layers className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-['Outfit']">COOKSCAPE</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                PERN QUOTE STUDIO
              </span>
            </div>
            <p className="text-xs text-slate-400">Master Template Subtraction Engine • PPTX & PDF Dual Export</p>
          </div>
        </div>

        {/* User Profile, System Badges & Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Master Template Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-medium">Master-Template.pptx</span>
            <span className="text-emerald-400 font-semibold">• 29 Slides</span>
          </div>

          {/* Database Status */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300">DB:</span>
            {isPostgresConnected ? (
              <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PostgreSQL</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400 font-semibold" title="Using local data storage. Connect PostgreSQL in .env to sync.">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Local DB</span>
              </span>
            )}
          </div>

          {/* Quotes Vault / History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Quotation Vault</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Simple User Badge & Logout */}
          {activeUser && (
            <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-xs">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-slate-200 capitalize">
                  {activeUser.username || activeUser.name || 'Admin'}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
