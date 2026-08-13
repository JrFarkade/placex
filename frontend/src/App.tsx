import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { HostAgentChat } from './components/chat/HostAgentChat';
import { ResumeAnalyzer } from './components/resume/ResumeAnalyzer';
import { CodingSandbox } from './components/coding/CodingSandbox';
import { InterviewSimulator } from './components/interview/InterviewSimulator';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { Login } from './pages/Login';
import axios from 'axios';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('placex_token'));
  const [user, setUser] = useState<any>(
    localStorage.getItem('placex_user') ? JSON.parse(localStorage.getItem('placex_user')!) : null
  );
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeFeature, setActiveFeature] = useState('dashboard');
  const [validatingAuth, setValidatingAuth] = useState<boolean>(true);

  // Validate authentication session on startup & handle Google OAuth redirect callback params
  useEffect(() => {
    const validateSession = async () => {
      // 1. Check if returning from Google OAuth Redirect (?token=...&user=...)
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token');
      const urlUser = searchParams.get('user');

      let currentToken = localStorage.getItem('placex_token');

      if (urlToken && urlUser) {
        try {
          const parsedUser = JSON.parse(decodeURIComponent(urlUser));
          localStorage.setItem('placex_token', urlToken);
          localStorage.setItem('placex_user', JSON.stringify(parsedUser));
          currentToken = urlToken;
          setToken(urlToken);
          setUser(parsedUser);
          // Clean token query parameters from URL bar
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error("Failed parsing URL oauth user", e);
        }
      }

      if (!currentToken) {
        setToken(null);
        setUser(null);
        setUserProfile(null);
        setValidatingAuth(false);
        return;
      }

      try {
        const res = await axios.get('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        setUser(res.data);
        localStorage.setItem('placex_user', JSON.stringify(res.data));

        // Load authenticated student profile
        const profRes = await axios.get('/api/v1/auth/profile', {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        setUserProfile(profRes.data);
      } catch (error) {
        // Invalid or expired token: clear fake/stale session
        localStorage.removeItem('placex_token');
        localStorage.removeItem('placex_user');
        setToken(null);
        setUser(null);
        setUserProfile(null);
      } finally {
        setValidatingAuth(false);
      }
    };

    validateSession();
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('placex_token', newToken);
    localStorage.setItem('placex_user', JSON.stringify(newUser));
    setValidatingAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('placex_token');
    localStorage.removeItem('placex_user');
    setToken(null);
    setUser(null);
    setUserProfile(null);
  };

  if (validatingAuth) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center text-slate-400 text-sm font-medium">
        Verifying PlaceX Authentication Session...
      </div>
    );
  }

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-darkBg text-slate-100">
      {/* Left Sidebar Navigation */}
      <Sidebar activeFeature={activeFeature} setActiveFeature={setActiveFeature} onLogout={handleLogout} />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          user={user}
          targetCompany={userProfile?.target_company || null}
          readinessScore={userProfile?.readiness_score || null}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {activeFeature === 'dashboard' && (
            <Dashboard token={token} user={user} setActiveFeature={setActiveFeature} />
          )}

          {activeFeature === 'agent' && (
            <div className="max-w-5xl mx-auto">
              <HostAgentChat token={token} activeFeature="agent" />
            </div>
          )}

          {activeFeature === 'resume' && (
            <ResumeAnalyzer token={token} />
          )}

          {activeFeature === 'coding' && (
            <CodingSandbox token={token} />
          )}

          {activeFeature === 'interview' && (
            <InterviewSimulator token={token} />
          )}

          {activeFeature === 'roadmap' && (
            <RoadmapView token={token} />
          )}

          {activeFeature !== 'dashboard' && activeFeature !== 'agent' && activeFeature !== 'resume' && activeFeature !== 'coding' && activeFeature !== 'interview' && activeFeature !== 'roadmap' && (
            <div className="glass-card p-12 rounded-3xl border border-darkBorder text-center max-w-2xl mx-auto my-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
                {activeFeature.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-slate-100 capitalize">{activeFeature} Module Ready</h2>
              <p className="text-sm text-slate-400">
                Connected to FastAPI backend service layer. Use the Host Agent panel anytime for guided orchestration.
              </p>
              <button
                onClick={() => setActiveFeature('agent')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-500/20 transition-all"
              >
                Open Host Agent Chat
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
