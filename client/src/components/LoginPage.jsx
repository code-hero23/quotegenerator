import React, { useState } from 'react';
import { Layers, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username and password.');
      return;
    }

    // Single simple login: accepts admin/admin123 or any valid credentials entered
    onLogin({
      username: trimmedUser,
      name: trimmedUser === 'admin' ? 'Mr. Abishek' : trimmedUser,
      role: 'Sales Representative'
    });
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* Header / Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-4">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 items-center justify-center shadow-xl shadow-amber-500/20 ring-1 ring-white/20">
          <Layers className="w-8 h-8 text-slate-950 font-bold" />
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
            COOKSCAPE STUDIO
          </h2>
          <p className="text-sm text-amber-400 font-medium mt-1">
            Quotation Generator Portal
          </p>
        </div>
      </div>

      {/* Simple Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel p-8 sm:p-10 space-y-6 border border-white/10 shadow-2xl">
          
          <div>
            <h3 className="text-lg font-bold text-white">Sign In</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your username and password to continue
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center space-x-2 text-rose-300 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username Input */}
            <div>
              <label className="form-label">Username</label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input pl-11"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-11 pr-11"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials Hint */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Demo login: <code className="text-amber-400 font-mono">admin</code> / <code className="text-amber-400 font-mono">admin123</code></span>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin123');
                }}
                className="text-amber-400 hover:underline font-medium text-[11px]"
              >
                Auto-fill
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="btn-gold w-full py-3.5 text-base shadow-xl shadow-amber-500/20 mt-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

        </div>
      </div>

    </div>
  );
}
