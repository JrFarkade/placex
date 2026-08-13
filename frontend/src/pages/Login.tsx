import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, User, Loader2, CheckCircle2, ShieldCheck, Map, Code2, Bot } from 'lucide-react';
import axios from 'axios';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for OAuth URL error query param (e.g. ?error=Google%20sign-in%20was%20cancelled.)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await axios.post('/api/v1/auth/register', {
          email,
          password,
          full_name: fullName,
          role: 'student'
        });
      }

      const res = await axios.post('/api/v1/auth/login', { email, password });
      onLoginSuccess(res.data.access_token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError('');

    try {
      const res = await axios.get('/api/v1/auth/google/login');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Google OAuth configuration error. Missing redirect URL.');
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to sign in with Google right now. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
      {/* Soft Pastel Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Editorial Hero & Value Proposition */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100/80 border border-purple-200 text-purple-700 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>AI-Powered Placement & Career OS</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
              Turn your <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                career preparation
              </span> <br />
              into progress.
            </h1>
            <p className="text-base text-slate-600 font-medium max-w-xl leading-relaxed">
              PlaceX brings your resume, coding sandbox, mock interviews, and personalized dynamic career roadmap into one intelligent operating system.
            </p>
          </div>

          {/* Module Pill Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">Host AI</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">Resume ATS</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5">
              <Code2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">Coding Practice</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5">
              <Map className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800">Career Roadmap</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Authentication Form Card */}
        <div className="lg:col-span-5">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl shadow-indigo-500/5 space-y-6">
            <div className="space-y-1.5 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900">
                {isRegister ? 'Create Student Account' : 'Welcome back to PlaceX'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isRegister ? 'Get your personalized career operating system' : 'Sign in to continue your career preparation'}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer mt-2"
              >
                <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative px-3 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-400">
                OR
              </span>
            </div>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-xs text-slate-500 hover:text-indigo-600 font-bold transition-all cursor-pointer"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
