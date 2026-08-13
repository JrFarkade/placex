import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Code2, 
  Mic, 
  Target,
  Sparkles,
  ArrowRight,
  Bot,
  Map,
  Compass,
  CheckCircle2,
  ChevronRight
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

  const journeySteps = [
    { name: 'Profile', done: true },
    { name: 'Skills', done: !!targetRole },
    { name: 'Resume', done: resumeScore !== null && resumeScore !== undefined },
    { name: 'Practice', done: codingSolved > 0 },
    { name: 'Interview', done: completedInterviews > 0 },
    { name: 'Placement Ready', done: (readinessScore || 0) >= 80 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 text-[#202321]">
      
      {/* 1. Top Greeting Banner & Target Role */}
      <div className="p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
              <Compass className="w-4 h-4 text-[#059669]" />
              <span>Career Operating Workspace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#202321]">
              Good morning, {user?.full_name?.split(' ')[0] || 'Student'} 👋
            </h1>
            <div className="flex items-center gap-3 text-sm text-[#666B67] font-medium pt-1">
              <span>Target Role:</span>
              <span className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE7DF] text-[#059669] font-extrabold text-xs">
                {targetRole || 'Not specified (Set in Profile / Host Agent)'}
              </span>
            </div>
          </div>

          {/* Quick Action Switchers */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveFeature('resume')}
              className="px-4 py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#059669]" />
              <span>Analyze Resume</span>
            </button>
            <button
              onClick={() => setActiveFeature('coding')}
              className="px-5 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>Practice Coding</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Major Focus: NEXT BEST ACTION CARD */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-[#059669] to-[#047857] text-white shadow-md shadow-[#059669]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/15 text-emerald-100 border border-white/20 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>PRIMARY NEXT BEST ACTION</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {dailyTasks.length > 0 ? dailyTasks[0]?.task : 'Strengthen your SQL & Analytical Data Skills'}
          </h2>
          <p className="text-xs text-emerald-100 font-medium leading-relaxed">
            Your recent preparation history shows that SQL joins and query optimization are currently your highest-impact improvement areas for target role placement.
          </p>
        </div>

        <button
          onClick={() => setActiveFeature('coding')}
          className="px-6 py-3.5 rounded-2xl bg-white hover:bg-[#FAF8F5] text-[#047857] font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm shrink-0 transition-all cursor-pointer"
        >
          <span>Start Practice</span>
          <ArrowRight className="w-4 h-4 text-[#059669]" />
        </button>
      </div>

      {/* 3. YOUR PLACEMENT JOURNEY (Visual Progress Path) */}
      <div className="p-7 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#202321] uppercase tracking-wider">YOUR PLACEMENT JOURNEY</h3>
          <span className="text-xs font-bold text-[#059669]">Step-by-step Readiness</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {journeySteps.map((step, idx) => (
            <div
              key={step.name}
              className={`p-3.5 rounded-2xl border text-center space-y-1.5 transition-all ${
                step.done
                  ? 'bg-[#E6F4EA] border-[#BBF7D0] text-[#047857]'
                  : 'bg-[#FAF8F5] border-[#EAE7DF] text-[#666B67]'
              }`}
            >
              <div className="flex items-center justify-center">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-[#949A95] text-[10px] font-bold flex items-center justify-center text-[#666B67]">
                    {idx + 1}
                  </span>
                )}
              </div>
              <div className="text-xs font-extrabold">{step.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. PLACEMENT READINESS (Teal Visual Score & Breakdown) */}
      <div className="p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-[#202321]">Placement Readiness</h3>
            <p className="text-xs text-[#666B67] font-medium">
              {readinessScore !== null && readinessScore !== undefined
                ? `You're making solid progress. Technical practice is currently your main lever.`
                : 'Upload a resume or complete coding tasks to generate your readiness baseline.'}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#FAF8F5] p-4 rounded-2xl border border-[#EAE7DF]">
            <div className="text-3xl font-black text-[#059669]">
              {readinessScore !== null && readinessScore !== undefined ? `${readinessScore} / 100` : '0 / 100'}
            </div>
            <div className="text-xs font-bold text-[#666B67] border-l border-[#EAE7DF] pl-4">
              Tier: <strong className="text-[#047857] block">{readinessLevel}</strong>
            </div>
          </div>
        </div>

        <div className="w-full bg-[#FAF8F5] h-3 rounded-full overflow-hidden border border-[#EAE7DF]">
          <div
            className="bg-[#059669] h-full rounded-full transition-all duration-500"
            style={{ width: `${readinessScore || 0}%` }}
          ></div>
        </div>
      </div>

      {/* 5. MODULE PREVIEW (Varied Visual Block Sizes) */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-[#202321]">Career Modules Workspace</h2>

        {/* Varied Block Sizes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LARGE BLOCK: Host AI Mentor (7 columns) */}
          <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-[#202321]">Host AI Career Mentor</h3>
              <p className="text-xs text-[#525753] font-medium leading-relaxed max-w-lg">
                Your calm, intelligent AI companion for career guidance, skill evaluation, and roadmap orchestration. Ask questions anytime or request personalized practice tasks.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('agent')}
              className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Ask PlaceX Mentor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* MEDIUM BLOCK: Resume Intelligence (5 columns) */}
          <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-[#0284C7] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#202321]">Resume Intelligence</h3>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Native ATS parser based on Resume-Matcher. Evaluates document health, missing job keywords, and score.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('resume')}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Upload & Check ATS</span>
              <ChevronRight className="w-4 h-4 text-[#059669]" />
            </button>
          </div>

          {/* MEDIUM BLOCK: Coding Sandbox (6 columns) */}
          <div className="lg:col-span-6 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#202321]">Coding Practice Sandbox</h3>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Judge0 execution container supporting Python, JavaScript, and C++. Includes visible/hidden testcases and AST complexity analysis.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('coding')}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Open Coding Sandbox</span>
              <ChevronRight className="w-4 h-4 text-[#059669]" />
            </button>
          </div>

          {/* SMALL SUPPORTING BLOCK: Mock Interview (3 columns) */}
          <div className="lg:col-span-3 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#FFE4E6] border border-[#FECDD3] text-[#E11D48] flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-[#202321]">Mock Interview</h4>
              <p className="text-xs text-[#666B67] font-medium">Technical, HR, & Project Viva with STT analysis.</p>
            </div>

            <button
              onClick={() => setActiveFeature('interview')}
              className="w-full py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#202321] font-bold text-xs transition-all cursor-pointer"
            >
              Start Session
            </button>
          </div>

          {/* SMALL SUPPORTING BLOCK: Career Roadmap (3 columns) */}
          <div className="lg:col-span-3 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#047857] flex items-center justify-center">
                <Map className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-[#202321]">Career Roadmap</h4>
              <p className="text-xs text-[#666B67] font-medium">Dynamic phase builder for target roles.</p>
            </div>

            <button
              onClick={() => setActiveFeature('roadmap')}
              className="w-full py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#202321] font-bold text-xs transition-all cursor-pointer"
            >
              View Journey
            </button>
          </div>

        </div>
      </div>

      {/* 6. Host Agent Chat Embed */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-[#202321]">Interactive Career Companion</h2>
        <HostAgentChat token={token} activeFeature="dashboard" />
      </div>

    </div>
  );
};
