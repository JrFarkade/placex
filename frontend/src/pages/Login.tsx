import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, User, Loader2, ShieldCheck, Map, Code2, Bot } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center p-6 lg:p-12 relative overflow-hidden text-[#202321]">
      {/* Warm Background Subtle Elements */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#E6F4EA]/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FEF3C7]/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Warm Editorial Headline & Student-Focused Value Proposition */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6F4EA] border border-[#BBF7D0] text-[#047857] text-xs font-extrabold shadow-xs">
            <Sparkles className="w-4 h-4 text-[#059669]" />
            <span>Placement preparation, without the confusion.</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#202321] leading-[1.15] tracking-tight">
              Everything you need <br />
              <span className="text-[#059669]">
                to get placement-ready.
              </span>
            </h1>
            <p className="text-base text-[#525753] font-medium max-w-xl leading-relaxed">
              From improving your resume to practicing coding and interviews, PlaceX helps you figure out what to work on and keeps you moving forward.
            </p>
          </div>

          {/* Module Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-[#EAE7DF] shadow-xs flex items-center gap-3">
              <Bot className="w-5 h-5 text-[#059669] shrink-0" />
              <span className="text-xs font-bold text-[#202321]">Career Guidance</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#EAE7DF] shadow-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0284C7] shrink-0" />
              <span className="text-xs font-bold text-[#202321]">Resume Check</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#EAE7DF] shadow-xs flex items-center gap-3">
              <Code2 className="w-5 h-5 text-[#F59E0B] shrink-0" />
              <span className="text-xs font-bold text-[#202321]">Coding Practice</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#EAE7DF] shadow-xs flex items-center gap-3">
              <Map className="w-5 h-5 text-[#F43F5E] shrink-0" />
              <span className="text-xs font-bold text-[#202321]">Personalized Roadmap</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean White Authentication Form Card */}
        <div className="lg:col-span-5">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EAE7DF] shadow-xl shadow-[#202321]/5 space-y-6">
            <div className="space-y-1.5 text-center">
              <h2 className="text-2xl font-black text-[#202321]">
                {isRegister ? 'Create PlaceX Account' : 'Welcome back to PlaceX'}
              </h2>
              <p className="text-xs text-[#666B67] font-medium">
                {isRegister ? 'Set up your student career profile' : 'Sign in to access your placement workspace'}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-[#202321] mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#949A95] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#202321] font-semibold focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#202321] mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#949A95] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#202321] font-semibold focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202321] mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#949A95] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#202321] font-semibold focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer mt-2"
              >
                <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EAE7DF]"></div>
              </div>
              <span className="relative px-3 bg-white text-[10px] font-extrabold uppercase tracking-widest text-[#949A95]">
                OR
              </span>
            </div>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-sm flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#059669] animate-spin" />
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
                className="text-xs text-[#666B67] hover:text-[#059669] font-bold transition-all cursor-pointer"
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
