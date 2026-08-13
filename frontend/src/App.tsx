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
import { BookOpen, BarChart3 } from 'lucide-react';
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

        const profRes = await axios.get('/api/v1/auth/profile', {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        setUserProfile(profRes.data);
      } catch (error) {
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
      <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center text-[#666B67] text-sm font-bold">
        Verifying PlaceX Session...
      </div>
    );
  }

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F7F4EE] text-[#202321]">
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

        <main className="flex-1 p-8 overflow-y-auto">
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

          {activeFeature === 'knowledge' && (
            <div className="bg-white p-12 rounded-3xl border border-[#EAE7DF] text-center max-w-2xl mx-auto my-12 space-y-4 shadow-xs">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FAF8F5] text-[#0284C7] border border-[#EAE7DF]">
                <BookOpen className="w-4 h-4 text-[#0284C7]" />
                <span>Coming Soon</span>
              </div>
              <h2 className="text-2xl font-black text-[#202321]">Knowledge Base</h2>
              <p className="text-sm text-[#666B67] font-medium leading-relaxed">
                A dedicated knowledge layer for career resources and personalized guidance.
              </p>
            </div>
          )}

          {activeFeature === 'analytics' && (
            <div className="bg-white p-12 rounded-3xl border border-[#EAE7DF] text-center max-w-2xl mx-auto my-12 space-y-4 shadow-xs">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                <BarChart3 className="w-4 h-4 text-[#D97706]" />
                <span>Under Development</span>
              </div>
              <h2 className="text-2xl font-black text-[#202321]">Analytics</h2>
              <p className="text-sm text-[#666B67] font-medium leading-relaxed">
                Progress analytics and placement-readiness insights will be available in a future update.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
