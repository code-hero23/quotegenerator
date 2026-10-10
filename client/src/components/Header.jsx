import React from 'react';
import { FileText, History, User, LogOut } from 'lucide-react';

export default function Header({ 
  onOpenHistory, 
  historyCount, 
  activeUser, 
  onLogout 
}) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-auto flex items-center justify-center p-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <img src="/logo.jpeg" alt="Cookscape Logo" className="h-10 w-auto object-contain rounded-lg" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-['Outfit']">COOKSCAPE</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                QUOTE STUDIO
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Master Template Subtraction Engine • PPTX & PDF Dual Export</p>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Master Template Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="text-slate-700 font-medium">Master-Template.pptx</span>
            <span className="text-emerald-600 font-bold">• 29 Slides</span>
          </div>

          {/* Quotes Vault / History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <History className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Quotation Vault</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Simple User Badge & Logout */}
          {activeUser && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold text-slate-800 capitalize">
                  {activeUser.username || activeUser.name || 'Admin'}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium transition-colors"
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
