import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Code2, 
  Mic, 
  CheckCircle2, 
  Clock, 
  Target,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Bot,
  Map,
  TrendingUp,
  Brain
} from 'lucide-react';
import { HostAgentChat } from '../components/chat/HostAgentChat';
import axios from 'axios';

interface DashboardProps {
  token: string;
  user: any;
  setActiveFeature: (feature: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, user, setActiveFeature }) => {
  const [memoryData, setMemoryData] = useState<any>(null);
  const [roadmapData, setRoadmapData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const memRes = await axios.get('/api/v1/agent/memory', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMemoryData(memRes.data?.long_term || {});

        const roadRes = await axios.get('/api/v1/roadmap', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoadmapData(roadRes.data || {});
      } catch (err) {
        console.warn("Error loading user dashboard state");
      }
    };
    fetchData();
  }, [token]);

  const targetRole = memoryData?.target_role || memoryData?.target_company;
  const readinessScore = memoryData?.readiness_score;
  const readinessLevel = memoryData?.readiness_level || 'Not calculated';
  const resumeScore = memoryData?.resume_score;
  const codingSolved = memoryData?.coding_solved || 0;
  const completedInterviews = memoryData?.completed_interviews || 0;
  const dailyTasks = roadmapData?.daily_tasks || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* 1. Header Banner & Next Best Action Card */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white relative overflow-hidden shadow-lg shadow-indigo-900/10">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-indigo-200 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Personalized Career Space</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Good morning, {user?.full_name?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="text-sm text-indigo-100/90 font-medium max-w-xl leading-relaxed">
              Target Role: <strong className="text-white underline font-bold">{targetRole || 'Not specified'}</strong> • Readiness: <strong className="text-emerald-300 font-bold">{readinessScore !== null && readinessScore !== undefined ? `${readinessScore}/100` : 'Not calculated'}</strong>
            </p>
          </div>

          {/* Next Best Action Card */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 max-w-md space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs text-indigo-200 font-bold uppercase tracking-wider">
              <span>Next Best Action</span>
              <span className="bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">Recommended</span>
            </div>
            <p className="text-sm font-bold text-white">
              {dailyTasks.length > 0 ? dailyTasks[0]?.task : 'Complete 3 SQL & Analytics practice problems to boost readiness.'}
            </p>
            <button
              onClick={() => setActiveFeature('coding')}
              className="w-full py-2.5 rounded-xl bg-white text-indigo-900 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
            >
              <span>Start Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Core Metrics Cards Grid (Placement Readiness & Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Placement Readiness */}
        <div className="placex-card placex-card-hover p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Readiness Score</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {readinessScore !== null && readinessScore !== undefined ? `${readinessScore} / 100` : 'Not calculated'}
            </div>
            <div className="text-xs text-emerald-600 font-bold mt-0.5">{readinessLevel}</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${readinessScore || 0}%` }}
            ></div>
          </div>
        </div>

        {/* ATS Resume Score */}
        <div className="placex-card placex-card-hover p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resume ATS Score</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {resumeScore !== null && resumeScore !== undefined ? `${resumeScore} / 100` : 'No resume uploaded'}
            </div>
            <div className="text-xs text-indigo-600 font-bold mt-0.5">
              {resumeScore !== null ? 'ATS Benchmark Passed' : 'Upload PDF/DOCX'}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${resumeScore || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Coding Solved */}
        <div className="placex-card placex-card-hover p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coding Solved</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {codingSolved > 0 ? `${codingSolved} Problems` : '0 Problems'}
            </div>
            <div className="text-xs text-purple-600 font-bold mt-0.5">
              {codingSolved > 0 ? 'Sandboxed Submissions' : 'Start practice sandbox'}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${min(100, codingSolved * 10)}%` }}
            ></div>
          </div>
        </div>

        {/* Mock Interviews */}
        <div className="placex-card placex-card-hover p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mock Interviews</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Mic className="w-5 h-5 text-rose-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {completedInterviews > 0 ? `${completedInterviews} Sessions` : '0 Sessions'}
            </div>
            <div className="text-xs text-rose-500 font-bold mt-0.5">
              {completedInterviews > 0 ? 'Evaluated Feedback' : 'Try technical or HR mock'}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${min(100, completedInterviews * 25)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Gateway Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Career Preparation Modules</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Host AI Mentor Card */}
          <div className="placex-card placex-card-hover p-6 flex flex-col justify-between space-y-4 border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Host AI Career Mentor</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Your personalized AI companion guiding your onboarding, skill gap analysis, and roadmap updates.
              </p>
            </div>
            <button
              onClick={() => setActiveFeature('agent')}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Open Host Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Resume Intelligence Card */}
          <div className="placex-card placex-card-hover p-6 flex flex-col justify-between space-y-4 border-purple-100 bg-gradient-to-b from-purple-50/50 to-white">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Resume Intelligence</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Native ATS parser based on Resume-Matcher evaluating document structure, missing keywords, and score.
              </p>
            </div>
            <button
              onClick={() => setActiveFeature('resume')}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Analyze Resume</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Career Roadmap Card */}
          <div className="placex-card placex-card-hover p-6 flex flex-col justify-between space-y-4 border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <Map className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Personalized Roadmap</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Role-specific phase builder tracking mastered topics, progress, and next best milestone.
              </p>
            </div>
            <button
              onClick={() => setActiveFeature('roadmap')}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>View Career Roadmap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Host Agent Chat Embed */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Interactive Career Mentor</h2>
        <HostAgentChat token={token} activeFeature="dashboard" />
      </div>

    </div>
  );
};

function min(a: number, b: number) {
  return a < b ? a : b;
}
