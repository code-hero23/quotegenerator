import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, Compass, Loader2 } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/users/login', {
        username: trimmedUser,
        password: trimmedPass
      });

      if (res.data && res.data.success && res.data.user) {
        onLogin(res.data.user);
      } else {
        throw new Error(res.data.error || 'Authentication failed');
      }
    } catch (err) {
      console.warn('Login failure:', err);
      const msg = err.response?.data?.error || err.message || 'Invalid username or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* Header / Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-3">
        <div className="inline-flex p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <img src="/logo.jpeg" alt="Cookscape Logo" className="h-16 w-auto object-contain rounded-xl" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
            COOKSCAPE STUDIO
          </h2>
          <p className="text-sm text-amber-700 font-semibold mt-0.5">
            Quotation & Feasibility Portal
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white p-8 sm:p-10 space-y-6 border border-slate-200 rounded-2xl shadow-xl">
          
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sign In</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials to access the quotation workspace
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
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
                  disabled={loading}
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
                  disabled={loading}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Demo Credential Presets */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Quick Sign In Presets</div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold">Administrator:</span>
                  <code className="text-amber-800 font-mono">admin</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('admin123');
                  }}
                  className="text-amber-600 hover:text-amber-800 font-semibold text-[11px] underline"
                >
                  Auto-fill
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <Compass className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-semibold">Feasibility Architect:</span>
                  <code className="text-sky-800 font-mono">abishek</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('abishek');
                    setPassword('arch123');
                  }}
                  className="text-sky-600 hover:text-sky-800 font-semibold text-[11px] underline"
                >
                  Auto-fill
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3.5 text-base shadow-lg shadow-amber-500/20 mt-2 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>
      </div>

    </div>
  );
}

