import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Code2, 
  Mic, 
  ArrowRight,
  Bot,
  Map,
  Compass,
  ChevronRight,
  Edit3,
  Check,
  X
} from 'lucide-react';
import axios from 'axios';

interface DashboardProps {
  token: string;
  user: any;
  setActiveFeature: (feature: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, user, setActiveFeature }) => {
  const [memoryData, setMemoryData] = useState<any>(null);
  const [roadmapData, setRoadmapData] = useState<any>(null);
  
  // Target Role Edit State
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchData = async () => {
    try {
      const memRes = await axios.get('/api/v1/agent/memory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mem = memRes.data?.long_term || {};
      setMemoryData(mem);
      if (mem.target_role || mem.target_company) {
        setSelectedRole(mem.target_role || mem.target_company);
      }

      const roadRes = await axios.get('/api/v1/roadmap', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoadmapData(roadRes.data || {});
    } catch (err) {
      console.warn("Error loading user dashboard state");
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSaveTargetRole = async (newRole: string) => {
    if (!newRole.trim()) return;
    setUpdatingRole(true);
    try {
      await axios.post(
        '/api/v1/roadmap/goal',
        { target_role: newRole, target_company: 'Not specified' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
      setIsEditingRole(false);
    } catch (err) {
      console.warn("Failed to update target role");
    } finally {
      setUpdatingRole(false);
    }
  };

  const targetRole = memoryData?.target_role || memoryData?.target_company;
  const readinessScore = memoryData?.readiness_score;
  const readinessLevel = memoryData?.readiness_level || 'Not calculated';
  const resumeScore = memoryData?.resume_score;

  // Real ATS Resume Score calculation & humanized description
  const hasAnalyzedResume = resumeScore !== null && resumeScore !== undefined;
  
  let atsDescription = '';
  if (hasAnalyzedResume) {
    const scoreVal = Number(resumeScore);
    const roleText = targetRole ? ` for your ${targetRole} target role` : '';

    if (!targetRole) {
      atsDescription = 'Your resume has been analyzed. Set a target role for a more relevant match.';
    } else if (scoreVal >= 90) {
      atsDescription = `Your resume is a strong match${roleText}.`;
    } else if (scoreVal >= 75) {
      atsDescription = `Your resume is a good match${roleText}.`;
    } else if (scoreVal >= 60) {
      atsDescription = `Your resume is a fair match${roleText}. A few improvements could help.`;
    } else {
      atsDescription = `Your resume needs some improvements${roleText}.`;
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[#202321]">
      
      {/* 1. Dashboard Header & Dynamic Target Role */}
      <div className="p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FAF8F5] text-[#059669] border border-[#EAE7DF]">
              <Compass className="w-4 h-4 text-[#059669]" />
              <span>Your Career Dashboard</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#202321]">
              Good morning, {user?.full_name?.split(' ')[0] || 'Student'} 👋
            </h1>

            {/* Dynamic & Editable Target Role */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#666B67] font-medium pt-1">
              <span>Target Role:</span>
              
              {!isEditingRole ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE7DF] text-[#059669] font-extrabold text-xs">
                    {targetRole || 'Not set yet'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRole(targetRole || 'Data Analyst');
                      setIsEditingRole(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-bold text-[#525753] transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-[#059669]" />
                    <span>{targetRole ? 'Change' : 'Set Target Role'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3 py-1 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669]"
                  >
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Product Analyst">Product Analyst</option>
                    <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                  </select>
                  <button
                    onClick={() => handleSaveTargetRole(selectedRole)}
                    disabled={updatingRole}
                    className="p-1.5 rounded-xl bg-[#059669] text-white hover:bg-[#047857] transition-all cursor-pointer"
                    title="Save Target Role"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingRole(false)}
                    className="p-1.5 rounded-xl bg-[#FAF8F5] text-[#666B67] hover:bg-[#F4F1EA] border border-[#EAE7DF] transition-all cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Existing Right-Side Quick Actions */}
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

      {/* 2. RESUME SCORE SECTION (Replaces NEXT STEP) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="text-[11px] font-extrabold text-[#059669] uppercase tracking-wider">
            RESUME SCORE
          </div>

          {hasAnalyzedResume ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#202321]">{resumeScore}</span>
                <span className="text-sm font-bold text-[#666B67]">/ 100</span>
              </div>
              <p className="text-xs text-[#666B67] font-medium leading-relaxed pt-0.5">
                {atsDescription}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold text-[#202321]">
                Check your ATS score
              </h2>
              <p className="text-xs text-[#666B67] font-medium leading-relaxed pt-0.5">
                Upload your resume to see how well it matches your target role.
              </p>
            </>
          )}
        </div>

        <button
          onClick={() => setActiveFeature('resume')}
          className="px-5 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm shrink-0 transition-all cursor-pointer"
        >
          <span>{hasAnalyzedResume ? 'View Resume Analysis' : 'Check Resume'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Placement Readiness Indicator */}
      <div className="p-7 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-[#202321]">Placement Readiness</h3>
            <p className="text-xs text-[#666B67] font-medium">
              {readinessScore !== null && readinessScore !== undefined
                ? `You're making progress. Complete technical practice to increase your score.`
                : 'Upload a resume or complete coding tasks to calculate your readiness score.'}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EAE7DF]">
            <div className="text-2xl font-black text-[#059669]">
              {readinessScore !== null && readinessScore !== undefined ? `${readinessScore} / 100` : '0 / 100'}
            </div>
            <div className="text-xs font-bold text-[#666B67] border-l border-[#EAE7DF] pl-4">
              Tier: <strong className="text-[#047857] block">{readinessLevel}</strong>
            </div>
          </div>
        </div>

        <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#EAE7DF]">
          <div
            className="bg-[#059669] h-full rounded-full transition-all duration-500"
            style={{ width: `${readinessScore || 0}%` }}
          ></div>
        </div>
      </div>

      {/* 4. Core Modules Workspace Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-[#202321]">Career Modules Workspace</h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LARGE BLOCK: Host Agent (7 columns) */}
          <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-[#202321]">Host Agent</h3>
              <p className="text-xs text-[#525753] font-medium leading-relaxed max-w-lg">
                Your career mentor guiding your placement journey, skill evaluations, and preparation milestones. Ask questions anytime or request personalized tasks.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('agent')}
              className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Ask Host Agent</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* MEDIUM BLOCK: ATS Resume Checker (5 columns) */}
          <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-[#0284C7] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-[#202321]">ATS Resume Checker</h3>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Analyzes your resume for ATS compatibility, identifies missing job keywords, and calculates your match score.
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
              <h3 className="text-xl font-black text-[#202321]">Coding Sandbox</h3>
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

          {/* SMALL SUPPORTING BLOCK: AI Mock Interview (3 columns) */}
          <div className="lg:col-span-3 bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#FFE4E6] border border-[#FECDD3] text-[#E11D48] flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-[#202321]">AI Mock Interview</h4>
              <p className="text-xs text-[#666B67] font-medium">Technical, HR, & Project Viva preparation.</p>
            </div>

            <button
              onClick={() => setActiveFeature('interview')}
              className="w-full py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#202321] font-bold text-xs transition-all cursor-pointer"
            >
              View Module
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

    </div>
  );
};
