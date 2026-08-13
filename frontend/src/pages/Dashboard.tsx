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
  AlertCircle
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

  const targetCompany = memoryData?.target_company;
  const readinessScore = memoryData?.readiness_score;
  const readinessLevel = memoryData?.readiness_level || 'Not calculated';
  const resumeScore = memoryData?.resume_score;
  const codingSolved = memoryData?.coding_solved || 0;
  const completedInterviews = memoryData?.completed_interviews || 0;
  const dailyTasks = roadmapData?.daily_tasks || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-blue-800/30 relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Placement Preparation Engine Active</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100">
              Welcome back, {user?.full_name || 'Student'}! 👋
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Target Goal: <strong className="text-blue-300">{targetCompany || 'Not set'}</strong> • Placement Readiness: <strong className="text-emerald-400">{readinessScore !== null && readinessScore !== undefined ? `${readinessScore}/100 (${readinessLevel})` : 'Not calculated'}</strong>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setActiveFeature('resume')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Upload Resume</span>
            </button>
            <button
              onClick={() => setActiveFeature('coding')}
              className="px-4 py-2.5 rounded-xl bg-darkCard hover:bg-slate-800 border border-darkBorder text-slate-200 font-medium text-xs flex items-center gap-2 transition-all"
            >
              <Code2 className="w-4 h-4 text-blue-400" />
              <span>Practice Coding</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Metrics Cards Grid (Displaying Real / Clean Empty States) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Placement Readiness Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Placement Readiness</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">
              {readinessScore !== null && readinessScore !== undefined ? `${readinessScore} / 100` : 'Not calculated'}
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-0.5">{readinessLevel}</div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${readinessScore || 0}%` }}
            ></div>
          </div>
        </div>

        {/* ATS Resume Score Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Resume ATS Score</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">
              {resumeScore !== null && resumeScore !== undefined ? `${resumeScore} / 100` : 'No resume analyzed yet'}
            </div>
            <div className="text-xs text-blue-400 font-medium mt-0.5">
              {resumeScore !== null ? 'ATS Benchmark Evaluated' : 'Upload PDF/DOCX resume'}
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${resumeScore || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Coding Solved Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Coding Solved</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">
              {codingSolved > 0 ? `${codingSolved} Problems` : 'No coding activity yet'}
            </div>
            <div className="text-xs text-indigo-400 font-medium mt-0.5">
              {codingSolved > 0 ? 'Sandboxed Submissions' : 'Attempt sandbox challenges'}
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${min(100, codingSolved * 10)}%` }}
            ></div>
          </div>
        </div>

        {/* Mock Interviews Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Mock Interviews</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Mic className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">
              {completedInterviews > 0 ? `${completedInterviews} Completed` : 'No interviews completed'}
            </div>
            <div className="text-xs text-purple-400 font-medium mt-0.5">
              {completedInterviews > 0 ? 'Sessions Evaluated' : 'Try technical or HR mock'}
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${min(100, completedInterviews * 25)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Dashboard Main Grid: Tasks + Host Agent Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Tasks & Milestones */}
        <div className="space-y-6 lg:col-span-1">
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-darkBorder pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Today's Study Plan</span>
              </h3>
              <span className="text-[11px] text-blue-400 font-semibold">
                {dailyTasks.length > 0 ? `${dailyTasks.filter((t: any) => t.completed).length} of ${dailyTasks.length} Done` : 'Empty'}
              </span>
            </div>

            {dailyTasks.length > 0 ? (
              <div className="space-y-3">
                {dailyTasks.map((t: any) => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${t.completed ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${t.completed ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                        {t.task}
                      </div>
                      <div className="text-[10px] text-slate-500">{t.category} • {t.est_minutes} mins</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-6 space-y-2">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <p>No study plan tasks generated yet.</p>
                <p className="text-[11px] text-slate-600">Upload a resume or attempt coding challenges to populate your personalized roadmap.</p>
              </div>
            )}
          </div>

          <div className="glass-card p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span>Career Roadmap</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {roadmapData?.status === 'Active'
                ? `Active learning roadmap for ${targetCompany || 'Target Role'}.`
                : 'No roadmap generated.'}
            </p>
            <button
              onClick={() => setActiveFeature('roadmap')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-400 rounded-xl transition-all"
            >
              {roadmapData?.status === 'Active' ? 'View Full Dynamic Roadmap' : 'Create Roadmap'}
            </button>
          </div>
        </div>

        {/* Right Column: Host Agent Interactive Chat Window */}
        <div className="lg:col-span-2">
          <HostAgentChat token={token} activeFeature="dashboard" />
        </div>
      </div>
    </div>
  );
};

function min(a: number, b: number) {
  return a < b ? a : b;
}
