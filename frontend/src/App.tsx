import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { HostAgentWorkspace } from './components/chat/HostAgentWorkspace';
import { GlobalHostAgentDrawer } from './components/chat/GlobalHostAgentDrawer';
import { ResumeAnalyzer } from './components/resume/ResumeAnalyzer';
import { CodingSandbox } from './components/coding/CodingSandbox';
import { InterviewSimulator } from './components/interview/InterviewSimulator';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { StudentProfile } from './components/profile/StudentProfile';
import { QuizModule } from './components/knowledge/QuizModule';
import { AnalyticsModule } from './components/analytics/AnalyticsModule';
import { Login } from './pages/Login';
import { BarChart3, Compass } from 'lucide-react';
import axios from 'axios';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('placex_token'));
  const [user, setUser] = useState<any>(
    localStorage.getItem('placex_user') ? JSON.parse(localStorage.getItem('placex_user')!) : null
  );
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeFeature, setActiveFeature] = useState('dashboard');
  const [validatingAuth, setValidatingAuth] = useState<boolean>(true);
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState<boolean>(false);

  // Validate authentication session on startup & handle Google / GitHub OAuth redirect callback params
  useEffect(() => {
    const validateSession = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token');
      const urlUser = searchParams.get('user');
      const urlFeature = searchParams.get('feature');

      if (urlFeature === 'profile') {
        setActiveFeature('profile');
      }

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

  const handleUpdateTargetCompany = async (newCompany: string | null) => {
    try {
      await axios.post('/api/v1/auth/profile', {
        target_company: newCompany || ""
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile((prev: any) => ({
        ...prev,
        target_company: newCompany
      }));
      window.dispatchEvent(new CustomEvent('placex:profile-updated'));
    } catch (err) {
      console.error("Failed updating target company", err);
    }
  };

  const isInterviewMode = activeFeature === 'interview';

  return (
    <div className={`flex min-h-screen ${isInterviewMode ? 'bg-[#0F141C]' : 'bg-[#F7F4EE]'} text-[#202321] relative`}>
      {/* Left Sidebar Navigation (Hidden in Interview Mode) */}
      {!isInterviewMode && (
        <Sidebar activeFeature={activeFeature} setActiveFeature={setActiveFeature} onLogout={handleLogout} />
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {!isInterviewMode && (
          <Navbar
            user={user}
            token={token}
            targetRole={userProfile?.target_role || null}
            targetCompany={userProfile?.target_company || null}
            readinessScore={userProfile?.readiness_score || null}
            onUpdateTargetCompany={handleUpdateTargetCompany}
            onLogout={handleLogout}
            onToggleAgent={() => setIsAgentDrawerOpen(!isAgentDrawerOpen)}
            isAgentOpen={isAgentDrawerOpen}
            setActiveFeature={setActiveFeature}
          />
        )}

        <main className={`flex-1 ${isInterviewMode ? 'p-0 overflow-hidden' : 'p-8 overflow-y-auto'}`}>
          {/* Keep-Alive Modules: In-memory state preserved across navigation */}
          <div className={activeFeature === 'dashboard' ? 'block' : 'hidden'}>
            <Dashboard token={token} user={user} setActiveFeature={setActiveFeature} />
          </div>

          <div className={activeFeature === 'profile' ? 'block' : 'hidden'}>
            <StudentProfile token={token} user={user} />
          </div>

          <div className={activeFeature === 'agent' ? 'block' : 'hidden'}>
            <HostAgentWorkspace token={token} setActiveFeature={setActiveFeature} />
          </div>

          <div className={activeFeature === 'resume' ? 'block' : 'hidden'}>
            <ResumeAnalyzer token={token} setActiveFeature={setActiveFeature} />
          </div>

          <div className={activeFeature === 'coding' ? 'block' : 'hidden'}>
            <CodingSandbox token={token} />
          </div>

          <div className={activeFeature === 'interview' ? 'block' : 'hidden'}>
            <InterviewSimulator token={token} onExit={() => setActiveFeature('dashboard')} />
          </div>

          <div className={activeFeature === 'roadmap' ? 'block' : 'hidden'}>
            <RoadmapView token={token} />
          </div>

          <div className={activeFeature === 'knowledge' ? 'block' : 'hidden'}>
            <QuizModule token={token} />
          </div>

          <div className={activeFeature === 'analytics' ? 'block' : 'hidden'}>
            <AnalyticsModule token={token} setActiveFeature={setActiveFeature} />
          </div>
        </main>
      </div>

      {/* Global Persistent Host Agent Drawer (Slide-over OS panel) */}
      <GlobalHostAgentDrawer
        token={token}
        activeFeature={activeFeature}
        setActiveFeature={setActiveFeature}
        isOpen={isAgentDrawerOpen}
        onClose={() => setIsAgentDrawerOpen(false)}
      />

      {/* Floating Host Agent quick launcher pill (visible when drawer is closed) */}
      {!isAgentDrawerOpen && activeFeature !== 'agent' && (
        <button
          onClick={() => setIsAgentDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#059669] hover:bg-[#047857] text-white px-4 py-3 rounded-full shadow-lg shadow-[#059669]/30 flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer font-extrabold text-xs tracking-wide"
          title="Open PlaceX Host Agent"
        >
          <Compass className="w-4 h-4 text-white" />
          <span>HOST AGENT</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
        </button>
      )}
    </div>
  );
};

export default App;
