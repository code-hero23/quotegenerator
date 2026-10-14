import React from 'react';
import { FileText, History, User, LogOut, Download, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';

export default function Header({ 
  onOpenHistory, 
  historyCount, 
  activeUser, 
  onLogout,
  onOpenUserManagement,
  isInstallable = false,
  isOnline = true,
  onInstall,
  autosaveStatus,
  lastSavedAt,
  onSaveNow
}) {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="h-9 sm:h-12 w-auto flex items-center justify-center p-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden shrink-0">
            <img src="/logo.jpeg" alt="Cookscape Logo" className="h-7 sm:h-10 w-auto object-contain rounded-lg" />
          </div>
          <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 shrink-0">
            QUOTE GENERATOR
          </span>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          
          {/* Master Template Badge (hidden on mobile and tablet) */}
          <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="text-slate-700 font-medium">Master-Template.pptx</span>
            <span className="text-emerald-600 font-bold">• 29 Slides</span>
          </div>

          {/* Autosave Status Badge */}
          {autosaveStatus && (
            <button
              type="button"
              onClick={onSaveNow}
              title={lastSavedAt ? `Autosaved at ${lastSavedAt.toLocaleTimeString()} (Click to save now)` : 'Click to save draft now'}
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                autosaveStatus === 'saving'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : autosaveStatus === 'saved'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : autosaveStatus === 'unsaved'
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-600'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {autosaveStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Saving...</span>
                </>
              )}
              {autosaveStatus === 'saved' && (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {lastSavedAt
                      ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : 'Draft Saved'}
                  </span>
                </>
              )}
              {autosaveStatus === 'unsaved' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Unsaved edits</span>
                </>
              )}
              {autosaveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Autosave failed</span>
                </>
              )}
            </button>
          )}

          {/* Admin Architects Management Button */}
          {activeUser?.role === 'admin' && (
            <button
              onClick={onOpenUserManagement}
              className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Manage Feasibility Architects & User Access"
            >
              <User className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-bold">👥 Architects</span>
            </button>
          )}

          {/* Quotes Vault / History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs transition-colors shrink-0 cursor-pointer"
            title="Quotation Vault & History"
          >
            <History className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Quotation Vault</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] sm:text-[11px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* PWA Install Button (shown when installable) */}
          {isInstallable && (
            <button
              onClick={onInstall}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border border-amber-400 text-xs font-bold shadow-xs hover:shadow transition-all shrink-0 cursor-pointer animate-pulse"
              title="Install Cookscape App to Desktop or Home Screen"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Offline indicator */}
          {!isOnline && (
            <div
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold shrink-0"
              title="Offline Mode - Cached PWA active"
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}

          {/* User Badge & Logout */}
          {activeUser && (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200">
              <div className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs shrink-0 max-w-[120px] sm:max-w-none ${
                activeUser.role === 'admin'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-sky-50 border-sky-200 text-sky-900'
              }`}>
                <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div className="truncate">
                  <span className="font-bold capitalize block leading-tight truncate">
                    {activeUser.name || activeUser.username}
                  </span>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block leading-tight">
                    {activeUser.role === 'admin' ? 'Administrator' : 'Feasibility Architect'}
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center space-x-1 p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium transition-colors shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
