import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  FileText, 
  Code2, 
  Mic, 
  Map, 
  BookOpen,
  ArrowRight, 
  Sparkles, 
  Flame, 
  Calendar, 
  Target, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Check, 
  X, 
  Edit3, 
  TrendingUp, 
  Award, 
  PlayCircle,
  ExternalLink,
  Layers,
  HelpCircle,
  Zap,
  CheckCircle,
  Circle,
  AlertCircle,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import axios from 'axios';

interface DashboardProps {
  token: string;
  user: any;
  setActiveFeature: (feature: string) => void;
}

interface WeeklyGoalItem {
  id: number;
  goal_type: string;
  title: string;
  target_count: number;
  current_count: number;
  is_completed: boolean;
  status_text?: string;
}

interface DayTrackerItem {
  day_abbr: string;
  day_full: string;
  date: string;
  day_number: number;
  is_active: boolean;
  has_learning: boolean;
  is_today: boolean;
  is_upcoming: boolean;
  is_missed: boolean;
  status: 'completed' | 'today' | 'upcoming' | 'missed';
  actions_count: number;
  login_count: number;
}

interface CalendarDay {
  date: string;
  count: number;
  level: number;
  is_today: boolean;
  is_future: boolean;
}

interface ActivityItem {
  id: string;
  module: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  score?: number | null;
  action_label: string;
  target_feature: string;
}

interface TodaysFocusData {
  title: string;
  reason: string;
  estimated_duration: string;
  action_label: string;
  target_feature: string;
  is_completed: boolean;
  category: string;
}

interface SkillItem {
  skill_name: string;
  status: string;
  activity_count: string;
  level: string;
  target_feature: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, user, setActiveFeature }) => {
  // 1. Data States
  const [memoryData, setMemoryData] = useState<any>(null);
  const [nextAction, setNextAction] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  // 2. Activity & 7-Day Streak States
  const [streakData, setStreakData] = useState<{
    current_streak: number;
    longest_streak: number;
    active_days_this_week: number;
    total_active_days: number;
    seven_day_tracker: DayTrackerItem[];
    motivational_message: string;
    calendar: CalendarDay[];
  }>({
    current_streak: 1,
    longest_streak: 1,
    active_days_this_week: 1,
    total_active_days: 1,
    seven_day_tracker: [],
    motivational_message: 'Keep your momentum going! Complete a task today to advance your placement preparation.',
    calendar: []
  });

  // Selected Day Detail Modal/Popover
  const [activeHoverDay, setActiveHoverDay] = useState<DayTrackerItem | null>(null);

  // 3. Weekly Goals States & Modal
  const [goals, setGoals] = useState<WeeklyGoalItem[]>([]);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [newGoalCategory, setNewGoalCategory] = useState('coding');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(3);
  const [goalSubmitting, setGoalSubmitting] = useState(false);

  // 4. Today's Focus State
  const [todaysFocus, setTodaysFocus] = useState<TodaysFocusData | null>(null);

  // 5. Skills in Progress State
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);

  // 6. Recent Activities State
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  // 7. Header inline target role edit state
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const studentName = user?.full_name?.trim() ? user.full_name.split(' ')[0] : 'Student';

  // Category presets for Add Goal Modal
  const categoryPresets: Record<string, string[]> = {
    coding: [
      'Solve 3 Technical Coding Problems',
      'Solve 5 Easy DSA Warmups',
      'Solve 2 Medium Array & String Problems',
      'Complete 1 Complex Dynamic Programming Task'
    ],
    quiz: [
      'Complete 2 Knowledge Quizzes',
      'Score 80%+ on Core CS Aptitude Quiz',
      'Master 10 Software Engineering MCQs',
      'Attempt 1 AI/ML Domain Assessment'
    ],
    interview: [
      'Attempt 1 AI Mock Interview',
      'Practice 1 Technical DSA Interview Round',
      'Complete 1 HR Behavioral Interview Simulation',
      'Run 1 Project Viva Practice Session'
    ],
    resume: [
      'Upload and achieve 75+ ATS Resume Score',
      'Add target role keywords to Resume Work Experience',
      'Review missing skill gaps against Target Job Description'
    ],
    roadmap: [
      'Complete Current Career Roadmap Week',
      'Review Prerequisites for Upcoming Week',
      'Check off 5 Topics in Career Curriculum'
    ],
    custom: []
  };

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Host Agent Memory & State
      const memRes = await axios.get('/api/v1/agent/memory', { headers }).catch(() => null);
      if (memRes?.data?.long_term) {
        const mem = memRes.data.long_term;
        setMemoryData(mem);
        if (mem.target_role) setSelectedRole(mem.target_role);
        if (mem.target_company) setSelectedCompany(mem.target_company);
      }

      // Next Best Action
      axios.get('/api/v1/agent/next-action', { headers })
        .then(res => setNextAction(res.data))
        .catch(() => {});

      // Active Host Agent tasks
      axios.get('/api/v1/agent/tasks', { headers })
        .then(res => setTasks(res.data?.tasks || []))
        .catch(() => {});

      // Activity streak & 7-Day tracker
      axios.get('/api/v1/dashboard/activity', { headers })
        .then(res => {
          if (res.data && Array.isArray(res.data.seven_day_tracker)) {
            setStreakData(res.data);
          }
        })
        .catch(() => {});

      // Weekly Goals
      axios.get('/api/v1/dashboard/goals', { headers })
        .then(res => {
          if (res.data?.goals) setGoals(res.data.goals);
        })
        .catch(() => {});

      // Today's Focus
      axios.get('/api/v1/dashboard/todays-focus', { headers })
        .then(res => {
          if (res.data?.focus) setTodaysFocus(res.data.focus);
        })
        .catch(() => {});

      // Skills in Progress
      axios.get('/api/v1/dashboard/skills', { headers })
        .then(res => {
          if (res.data?.skills) setSkillsList(res.data.skills);
        })
        .catch(() => {});

      // Recent Activity Feed
      axios.get('/api/v1/dashboard/recent-activity', { headers })
        .then(res => {
          if (res.data?.activities) setRecentActivities(res.data.activities);
        })
        .catch(() => {});

    } catch (err) {
      console.warn('Dashboard loading fallback:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Ping dashboard activity (idempotent for today)
    if (token) {
      axios.post('/api/v1/dashboard/activity/ping', { is_login: true }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    const handleSync = () => fetchDashboardData();
    window.addEventListener('placex:quiz-completed', handleSync);
    window.addEventListener('placex:profile-updated', handleSync);
    window.addEventListener('placex:coding-completed', handleSync);
    window.addEventListener('placex:resume-uploaded', handleSync);

    return () => {
      window.removeEventListener('placex:quiz-completed', handleSync);
      window.removeEventListener('placex:profile-updated', handleSync);
      window.removeEventListener('placex:coding-completed', handleSync);
      window.removeEventListener('placex:resume-uploaded', handleSync);
    };
  }, [token]);

  // Save Target Role & Company
  const handleSavePreferences = async () => {
    if (!selectedRole.trim()) return;
    setUpdatingRole(true);
    try {
      await axios.post(
        '/api/v1/roadmap/goal',
        { 
          target_role: selectedRole.trim(),
          target_company: selectedCompany.trim() || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDashboardData();
      window.dispatchEvent(new CustomEvent('placex:profile-updated'));
      setIsEditingRole(false);
    } catch (err) {
      console.warn('Failed to update target role/company');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Add Weekly Goal
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    setGoalSubmitting(true);
    try {
      const res = await axios.post(
        '/api/v1/dashboard/goals',
        {
          goal_type: newGoalCategory,
          title: newGoalTitle.trim(),
          target_count: Number(newGoalTarget) || 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setGoals(prev => [...prev, res.data]);
        setIsAddGoalModalOpen(false);
        setNewGoalTitle('');
        setNewGoalTarget(3);
      }
    } catch (err) {
      console.warn('Failed creating weekly goal');
    } finally {
      setGoalSubmitting(false);
    }
  };

  // Delete Weekly Goal
  const handleDeleteGoal = async (id: number) => {
    try {
      await axios.delete(`/api/v1/dashboard/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.warn('Failed deleting goal');
    }
  };

  const targetRole = memoryData?.target_role || null;
  const targetCompany = memoryData?.target_company || null;
  const readinessScore = memoryData?.readiness_score;
  const readinessLevel = memoryData?.readiness_level || 'Beginner';
  const resumeScore = memoryData?.resume_score;
  const codingSolved = memoryData?.coding_solved || 0;
  const interviewCount = memoryData?.completed_interviews || 0;

  // Render contribution level color in PlaceX green palette
  const getContributionColor = (level: number, isFuture: boolean) => {
    if (isFuture) return 'bg-[#FAF8F5] border border-dashed border-[#EAE7DF]';
    switch (level) {
      case 0: return 'bg-[#F2EFE9] border border-[#E8E4DA]';
      case 1: return 'bg-[#A7F3D0] border border-[#6EE7B7]'; // Light mint
      case 2: return 'bg-[#34D399] border border-[#10B981]'; // Medium green
      case 3: return 'bg-[#059669] border border-[#047857]'; // PlaceX Brand green
      case 4: return 'bg-[#064E3B] border border-[#022C22]'; // Deep forest
      default: return 'bg-[#F2EFE9] border border-[#E8E4DA]';
    }
  };

  // Helper icon by goal type
  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'coding': return <Code2 className="w-4 h-4 text-[#D97706]" />;
      case 'quiz': return <BookOpen className="w-4 h-4 text-[#7C3AED]" />;
      case 'interview': return <Mic className="w-4 h-4 text-[#E11D48]" />;
      case 'resume': return <FileText className="w-4 h-4 text-[#0284C7]" />;
      case 'roadmap': return <Map className="w-4 h-4 text-[#059669]" />;
      default: return <Target className="w-4 h-4 text-[#059669]" />;
    }
  };

  // Helper badge color by goal type
  const getGoalBadgeStyle = (type: string) => {
    switch (type) {
      case 'coding': return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      case 'quiz': return 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]';
      case 'interview': return 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]';
      case 'resume': return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'roadmap': return 'bg-[#E6F4EA] text-[#047857] border-[#BBF7D0]';
      default: return 'bg-[#FAF8F5] text-[#525753] border-[#EAE7DF]';
    }
  };

  const completedGoalsCount = goals.filter(g => g.is_completed).length;
  const totalGoalsActions = goals.reduce((acc, g) => acc + g.target_count, 0);
  const completedGoalsActions = goals.reduce((acc, g) => acc + Math.min(g.current_count, g.target_count), 0);

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16 text-[#202321]">

      {/* ========================================================
          1. DASHBOARD HEADER & PERSONALIZATION
      ======================================================== */}
      <div className="p-7 sm:p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold bg-[#FAF8F5] text-[#059669] border border-[#EAE7DF]">
              <Compass className="w-3.5 h-3.5 text-[#059669]" />
              <span>Career Command Center</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#202321]">
              {getGreeting()}, {studentName} 👋
            </h1>

            {/* Target Role & Company Info / Inline Editor */}
            {!isEditingRole ? (
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#525753] font-medium pt-0.5">
                <span className="text-[#666B67]">Target Role:</span>
                
                <span className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE7DF] text-[#059669] font-extrabold">
                  {targetRole || 'Not Selected Yet'}
                </span>

                {targetCompany && (
                  <span className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE7DF] text-[#202321] font-bold">
                    @ {targetCompany}
                  </span>
                )}

                <button
                  onClick={() => {
                    setSelectedRole(targetRole || 'Software Engineer');
                    setSelectedCompany(targetCompany || '');
                    setIsEditingRole(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-bold text-[#525753] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-[#059669]" />
                  <span>{targetRole ? 'Edit Target' : 'Configure Target'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3 py-1.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669]"
                >
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                  <option value="Product Analyst">Product Analyst</option>
                  <option value="Cyber Security Analyst">Cyber Security Analyst</option>
                </select>

                <input
                  type="text"
                  placeholder="Target company (e.g. Google, TCS, Amazon)"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3 py-1.5 text-xs font-medium text-[#202321] placeholder-[#9CA3AF] focus:outline-none focus:border-[#059669] w-48"
                />

                <button
                  onClick={handleSavePreferences}
                  disabled={updatingRole}
                  className="p-1.5 rounded-xl bg-[#059669] text-white hover:bg-[#047857] transition-all cursor-pointer"
                  title="Save Preferences"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingRole(false)}
                  className="p-1.5 rounded-xl bg-[#FAF8F5] text-[#666B67] hover:bg-[#F4F1EA] border border-[#EAE7DF] transition-all cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-3 shrink-0">
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

      {/* ========================================================
          2. HOST AGENT NEXT BEST ACTION BANNER (IF ACTIVE)
      ======================================================== */}
      {nextAction && (
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-teal-900 via-[#115E59] to-[#0D9488] text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-teal-800/80 text-teal-200 border border-teal-600/50 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Host Agent Next Best Action</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {nextAction.current_priority}
            </h2>
            
            <p className="text-xs text-teal-100/90 font-medium leading-relaxed">
              {nextAction.reason}
            </p>
            
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">Recommended:</span>
              <span className="text-xs font-bold text-white bg-teal-800/60 px-2.5 py-0.5 rounded-lg border border-teal-600/40">
                {nextAction.recommended_action}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2.5 shrink-0 w-full md:w-auto relative z-10">
            <button
              onClick={() => {
                const targetMod = nextAction.relevant_module;
                if (targetMod === 'knowledge' || targetMod === 'quiz') setActiveFeature('knowledge');
                else if (targetMod === 'coding') setActiveFeature('coding');
                else if (targetMod === 'resume') setActiveFeature('resume');
                else if (targetMod === 'roadmap') setActiveFeature('roadmap');
                else if (targetMod === 'interview') setActiveFeature('interview');
                else setActiveFeature('agent');
              }}
              className="px-6 py-3 rounded-2xl bg-white hover:bg-teal-50 text-[#0F766E] font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>{nextAction.cta_label || 'Execute Next Action'}</span>
              <ArrowRight className="w-4 h-4 text-[#0F766E]" />
            </button>

            <button
              onClick={() => setActiveFeature('agent')}
              className="px-4 py-2 rounded-xl bg-teal-800/60 hover:bg-teal-800/90 border border-teal-600/40 text-teal-200 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-teal-300" />
              <span>Open Host Agent</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          3. UPGRADED 7-DAY STREAK EXPERIENCE (ANIMATED & ENGAGING)
      ======================================================== */}
      <div className="p-7 sm:p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-6 relative overflow-hidden">
        
        {/* Header & Metrics */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center relative">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#202321]">7-Day Active Streak</h2>
              
              {streakData.current_streak > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  {streakData.current_streak} {streakData.current_streak === 1 ? 'day streak' : 'days streak'} 🔥
                </span>
              )}
            </div>
            
            <p className="text-xs sm:text-sm text-[#525753] font-medium leading-relaxed">
              {streakData.motivational_message}
            </p>
          </div>

          {/* 3 Compact Metrics Cards */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-center min-w-[95px]">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#666B67] block">Current Streak</span>
              <span className="text-base sm:text-lg font-black text-[#059669] flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500 inline" />
                {streakData.current_streak} {streakData.current_streak === 1 ? 'day' : 'days'}
              </span>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-center min-w-[95px]">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#666B67] block">Longest Streak</span>
              <span className="text-base sm:text-lg font-black text-[#202321]">
                {streakData.longest_streak} {streakData.longest_streak === 1 ? 'day' : 'days'}
              </span>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-center min-w-[95px]">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#666B67] block">This Week</span>
              <span className="text-base sm:text-lg font-black text-[#059669]">
                {streakData.active_days_this_week} / 7
              </span>
            </div>
          </div>
        </div>

        {/* 7-DAY VISUAL TRACKER CARDS (Monday - Sunday) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
          <div className="grid grid-cols-7 gap-2 sm:gap-3.5">
            {(streakData?.seven_day_tracker || []).map((day) => {
              const isComp = day.status === 'completed';
              const isTod = day.status === 'today';
              const isUpc = day.status === 'upcoming';
              const isMis = day.status === 'missed';

              return (
                <div
                  key={day.day_abbr}
                  onMouseEnter={() => setActiveHoverDay(day)}
                  onMouseLeave={() => setActiveHoverDay(null)}
                  className={`relative p-2.5 sm:p-3.5 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-between gap-2 cursor-pointer ${
                    isComp
                      ? 'bg-white border-[#A7F3D0] shadow-xs hover:border-[#34D399] hover:-translate-y-1'
                      : isTod
                      ? 'bg-white border-[#059669] ring-2 ring-[#059669]/20 shadow-xs hover:-translate-y-1'
                      : isMis
                      ? 'bg-[#FAF8F5] border-[#EAE7DF] opacity-70 hover:opacity-100'
                      : 'bg-[#FAF8F5] border-dashed border-[#D1CDC2] opacity-75'
                  }`}
                >
                  {/* Day Label */}
                  <span className={`text-[11px] font-black uppercase tracking-wider ${
                    isTod ? 'text-[#059669]' : isComp ? 'text-[#202321]' : 'text-[#666B67]'
                  }`}>
                    {day.day_abbr}
                  </span>

                  {/* Indicator Icon */}
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                    isComp 
                      ? 'bg-[#059669] text-white shadow-sm shadow-[#059669]/30'
                      : isTod
                      ? 'bg-[#E6F4EA] text-[#059669] border-2 border-[#059669] animate-pulse'
                      : isMis
                      ? 'bg-[#F2EFE9] text-[#9CA3AF]'
                      : 'bg-white text-[#D1CDC2] border border-[#EAE7DF]'
                  }`}>
                    {isComp ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : isTod ? (
                      <Flame className="w-5 h-5 text-[#059669] fill-[#059669]" />
                    ) : isMis ? (
                      <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full border border-[#9CA3AF]" />
                    )}
                  </div>

                  {/* Date & Subtext */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold text-[#202321] block">
                      {new Date(day.date).getDate()}
                    </span>
                    <span className={`text-[9px] font-bold block ${
                      isComp ? 'text-[#059669]' : isTod ? 'text-[#059669]' : isMis ? 'text-[#9CA3AF]' : 'text-[#666B67]'
                    }`}>
                      {isComp ? 'Active' : isTod ? 'Today' : isMis ? 'Missed' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hover Day Detail Bar */}
          {activeHoverDay && (
            <div className="mt-3.5 pt-3 border-t border-[#EAE7DF] flex items-center justify-between text-xs text-[#525753] font-medium px-1 animate-fadeIn">
              <span className="font-bold text-[#202321]">
                {activeHoverDay.day_full}, {new Date(activeHoverDay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}:
              </span>
              <span>
                {activeHoverDay.is_active 
                  ? `Recorded ${activeHoverDay.actions_count} learning activity event(s) and ${activeHoverDay.login_count} session login(s).`
                  : activeHoverDay.is_today
                  ? 'No learning actions completed yet today. Start practicing below to log your streak!'
                  : activeHoverDay.is_missed
                  ? 'No practice activity was logged on this day.'
                  : 'Upcoming placement prep day.'}
              </span>
            </div>
          )}
        </div>

        {/* Secondary Compact Historical Heatmap (60-Day) */}
        <div className="pt-2 border-t border-[#EAE7DF]">
          <div className="flex items-center justify-between pb-3 text-xs text-[#666B67] font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#059669]" />
              <span>Historical Activity Heatmap (Last 60 Days)</span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#666B67] mr-1">Less</span>
              <div className="w-3 h-3 rounded-xs bg-[#F2EFE9] border border-[#E8E4DA]" title="No activity" />
              <div className="w-3 h-3 rounded-xs bg-[#A7F3D0] border border-[#6EE7B7]" title="1 action" />
              <div className="w-3 h-3 rounded-xs bg-[#34D399] border border-[#10B981]" title="2-3 actions" />
              <div className="w-3 h-3 rounded-xs bg-[#059669] border border-[#047857]" title="4-6 actions" />
              <div className="w-3 h-3 rounded-xs bg-[#064E3B] border border-[#022C22]" title="7+ actions" />
              <span className="text-[#666B67] ml-1">More</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="min-w-[620px]">
              <div className="grid grid-flow-col grid-rows-7 gap-1 justify-start">
                {(streakData?.calendar || []).map((day, idx) => (
                  <div
                    key={idx}
                    title={`${day.date}: ${day.count} activity event(s)`}
                    className={`w-3 h-3 rounded-xs transition-transform hover:scale-125 cursor-pointer ${getContributionColor(
                      day.level,
                      day.is_future
                    )} ${day.is_today ? 'ring-2 ring-[#059669] ring-offset-1' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================
          4. TODAY'S FOCUS & SKILLS IN PROGRESS (STUDENT PRODUCTIVITY)
      ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

        {/* TODAY'S FOCUS (7 Cols) */}
        <div className="lg:col-span-7 p-7 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E6F4EA] border border-[#BBF7D0] flex items-center justify-center text-[#059669]">
                  <Zap className="w-4 h-4 fill-[#059669]" />
                </div>
                <h3 className="text-xl font-black text-[#202321]">Today's Focus</h3>
              </div>

              {todaysFocus?.estimated_duration && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8F5] border border-[#EAE7DF] text-[#666B67] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#059669]" />
                  <span>Est: {todaysFocus.estimated_duration}</span>
                </span>
              )}
            </div>

            {todaysFocus ? (
              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-black text-[#202321]">{todaysFocus.title}</h4>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-[#EAE7DF] text-[#059669]">
                    Recommended Action
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#525753] font-medium leading-relaxed">
                  {todaysFocus.reason}
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-1">
                <h4 className="text-sm font-black text-[#202321]">Daily Placement Step</h4>
                <p className="text-xs text-[#666B67]">
                  Start by solving a recommended coding problem or evaluating your ATS resume score.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (todaysFocus?.target_feature) {
                setActiveFeature(todaysFocus.target_feature);
              } else {
                setActiveFeature('coding');
              }
            }}
            className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <span>{todaysFocus?.action_label || 'Start Today’s Focus'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* SKILLS IN PROGRESS (5 Cols) */}
        <div className="lg:col-span-5 p-7 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#059669]" />
                <h3 className="text-xl font-black text-[#202321]">Skills in Progress</h3>
              </div>
              <span className="text-xs font-bold text-[#666B67]">{targetRole || 'Software Engineer'}</span>
            </div>

            <p className="text-xs text-[#666B67] font-medium">
              Core competencies mapped to your target career role with real practice metrics.
            </p>

            {skillsList.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {skillsList.map((sk) => (
                  <div
                    key={sk.skill_name}
                    className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] flex items-center justify-between gap-3 hover:border-[#D1CDC2] transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h5 className="text-xs font-black text-[#202321] truncate">{sk.skill_name}</h5>
                      <span className="text-[11px] text-[#666B67] block">{sk.activity_count}</span>
                    </div>

                    <button
                      onClick={() => setActiveFeature(sk.target_feature)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[11px] font-bold text-[#059669] shrink-0 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Practice</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-center text-xs text-[#666B67]">
                Configure target role above to populate role competencies.
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveFeature('roadmap')}
            className="w-full py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-extrabold text-[#202321] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>View Full Career Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#059669]" />
          </button>
        </div>

      </div>

      {/* ========================================================
          5. YOUR WEEKLY GOALS (PREMIUM PRODUCTIVITY FEATURE)
      ======================================================== */}
      <div className="p-7 sm:p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#059669]" />
              <h2 className="text-2xl font-black text-[#202321]">Your Weekly Goals</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#666B67] font-medium">
              Small steps every week. Consistent practice brings you closer to your target role.
            </p>
          </div>

          {/* Weekly Summary & Add Goal Action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-black text-[#202321]">
              <span className="text-[#059669]">{completedGoalsActions}</span> of {totalGoalsActions} actions completed
            </div>

            <button
              onClick={() => setIsAddGoalModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm shadow-[#059669]/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Goal</span>
            </button>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => {
            const percent = Math.min(100, Math.round((g.current_count / g.target_count) * 100));
            const isDone = g.is_completed;

            return (
              <div
                key={g.id}
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                  isDone 
                    ? 'bg-[#FAF8F5] border-[#A7F3D0] shadow-xs' 
                    : 'bg-white border-[#EAE7DF] shadow-xs hover:border-[#D1CDC2] hover:-translate-y-0.5'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Icon, Category Pill, Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#EAE7DF] flex items-center justify-center">
                        {getGoalIcon(g.goal_type)}
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getGoalBadgeStyle(g.goal_type)}`}>
                        {g.goal_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#059669] bg-[#E6F4EA] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#666B67]">
                          {g.current_count > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1 rounded-lg text-[#9CA3AF] hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className={`text-sm font-black leading-snug ${isDone ? 'text-[#525753] line-through' : 'text-[#202321]'}`}>
                    {g.title}
                  </h4>

                  {/* Progress Numbers & Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#666B67]">
                      <span>{g.current_count} of {g.target_count} completed</span>
                      <span className="font-extrabold text-[#202321]">{percent}%</span>
                    </div>

                    <div className="w-full bg-[#F4F1EA] h-2 rounded-full overflow-hidden border border-[#EAE7DF]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? 'bg-[#059669]' : 'bg-[#34D399]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action: Context-Aware Destination */}
                <button
                  onClick={() => {
                    if (g.goal_type === 'coding') setActiveFeature('coding');
                    else if (g.goal_type === 'quiz') setActiveFeature('knowledge');
                    else if (g.goal_type === 'interview') setActiveFeature('interview');
                    else if (g.goal_type === 'resume') setActiveFeature('resume');
                    else if (g.goal_type === 'roadmap') setActiveFeature('roadmap');
                    else setActiveFeature('coding');
                  }}
                  className={`w-full py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDone
                      ? 'bg-white hover:bg-[#F4F1EA] border-[#EAE7DF] text-[#525753]'
                      : 'bg-[#FAF8F5] hover:bg-[#F4F1EA] border-[#EAE7DF] text-[#059669] font-extrabold'
                  }`}
                >
                  <span>{isDone ? 'Review Activity' : 'Continue Goal'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-xs text-[#666B67] font-medium flex items-center justify-between border-t border-[#EAE7DF]">
          <span>Weekly reset occurs automatically every Monday at 00:00 UTC.</span>
          <span className="font-bold text-[#059669]">
            {completedGoalsCount} of {goals.length} target goals achieved
          </span>
        </div>
      </div>

      {/* ========================================================
          ADD GOAL MODAL
      ======================================================== */}
      {isAddGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAE7DF] shadow-2xl max-w-lg w-full p-7 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#059669]" />
                <h3 className="text-xl font-black text-[#202321]">Add a Weekly Goal</h3>
              </div>
              <button
                onClick={() => setIsAddGoalModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#666B67] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-4">
              {/* Category Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#202321]">Goal Category</label>
                <select
                  value={newGoalCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setNewGoalCategory(cat);
                    const presets = categoryPresets[cat];
                    if (presets && presets.length > 0) {
                      setNewGoalTitle(presets[0]);
                    } else {
                      setNewGoalTitle('');
                    }
                  }}
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669]"
                >
                  <option value="coding">Coding Practice</option>
                  <option value="quiz">Knowledge Quizzes</option>
                  <option value="interview">Mock Interviews</option>
                  <option value="resume">Resume Improvement</option>
                  <option value="roadmap">Career Roadmap</option>
                  <option value="custom">Custom Goal</option>
                </select>
              </div>

              {/* Suggestions Chips */}
              {categoryPresets[newGoalCategory]?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#666B67]">Suggested for this category:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryPresets[newGoalCategory].map((sug) => (
                      <button
                        type="button"
                        key={sug}
                        onClick={() => setNewGoalTitle(sug)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all cursor-pointer ${
                          newGoalTitle === sug
                            ? 'bg-[#E6F4EA] border-[#059669] text-[#059669] font-bold'
                            : 'bg-[#FAF8F5] border-[#EAE7DF] text-[#525753] hover:bg-[#F4F1EA]'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#202321]">Goal Description</label>
                <input
                  type="text"
                  placeholder="e.g. Solve 3 Coding Problems"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#202321] focus:outline-none focus:border-[#059669]"
                />
              </div>

              {/* Target Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#202321]">Target Quantity (Per Week)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddGoalModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-bold text-[#666B67] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          6. RECENT ACTIVITY FEED
      ======================================================== */}
      <div className="p-7 sm:p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#059669]" />
              <h3 className="text-xl font-black text-[#202321]">Recent Activity</h3>
            </div>
            <p className="text-xs text-[#666B67] font-medium">
              Real recorded performance history from your placement prep assessments.
            </p>
          </div>

          <span className="text-xs font-extrabold text-[#059669]">
            {recentActivities.length} recent events
          </span>
        </div>

        {recentActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] flex flex-col justify-between gap-3 hover:border-[#D1CDC2] hover:-translate-y-0.5 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-[#EAE7DF] text-[#059669]">
                      {act.module}
                    </span>
                    <span className="text-[11px] text-[#9CA3AF] font-medium">
                      {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-[#202321] line-clamp-1">{act.title}</h4>
                  <p className="text-[11px] text-[#666B67] line-clamp-2">{act.description}</p>
                </div>

                <button
                  onClick={() => setActiveFeature(act.target_feature)}
                  className="w-full py-2 rounded-xl bg-white hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-bold text-[#202321] flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span>{act.action_label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#059669]" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-center space-y-2">
            <PlayCircle className="w-8 h-8 text-[#9CA3AF] mx-auto" />
            <p className="text-xs font-bold text-[#202321]">No activity recorded yet</p>
            <p className="text-[11px] text-[#666B67]">
              Start by checking your resume, taking a quiz, or solving a coding exercise.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================
          7. ATS RESUME READINESS & OVERALL PLACEMENT READINESS
      ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

        {/* Card A: ATS Resume Score */}
        <div className="p-7 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold text-[#059669] uppercase tracking-wider">
              ATS RESUME READINESS
            </div>

            {resumeScore !== null && resumeScore !== undefined ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#202321]">{resumeScore}</span>
                  <span className="text-sm font-bold text-[#666B67]">/ 100</span>
                </div>
                <p className="text-xs text-[#666B67] font-medium leading-relaxed">
                  Your resume has been benchmarked for ATS compatibility. Upload new revisions to maximize keyword match.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-[#202321]">Check your ATS score</h3>
                <p className="text-xs text-[#666B67] font-medium leading-relaxed">
                  Upload your resume to evaluate keyword match and ATS parseability against target roles.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveFeature('resume')}
            className="w-full py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <span>{resumeScore ? 'View Full ATS Analysis' : 'Upload Resume for ATS Check'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card B: Placement Readiness Tier */}
        <div className="p-7 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold text-[#059669] uppercase tracking-wider">
              OVERALL PLACEMENT READINESS
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-4xl font-black text-[#202321]">
                  {readinessScore !== null && readinessScore !== undefined ? readinessScore : 0}
                  <span className="text-sm font-bold text-[#666B67]"> / 100</span>
                </div>
                <div className="text-xs font-bold text-[#525753]">
                  Tier Level: <span className="text-[#059669] font-black">{readinessLevel}</span>
                </div>
              </div>

              <div className="text-right text-xs text-[#666B67]">
                <div>Coding Solved: <strong>{codingSolved}</strong></div>
                <div>Interviews: <strong>{interviewCount}</strong></div>
              </div>
            </div>

            <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#EAE7DF] mt-2">
              <div
                className="bg-[#059669] h-full rounded-full transition-all duration-500"
                style={{ width: `${readinessScore || 0}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setActiveFeature('agent')}
            className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4 text-[#059669]" />
            <span>Consult Host Agent for Tier Advancement</span>
          </button>
        </div>

      </div>

      {/* ========================================================
          8. CAREER MODULES WORKSPACE (ALL 6 INTEGRATED MODULES)
      ======================================================== */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[#202321]">Career Modules Workspace</h2>
            <p className="text-xs text-[#666B67] font-medium">
              Access PlaceX's integrated suite of AI-assisted placement prep tools.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Module 1: Host Agent Intelligence */}
          <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#D1CDC2] transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#202321]">Host Agent Intelligence</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#059669] border border-[#EAE7DF]">
                  Core AI Orchestrator
                </span>
              </div>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Central intelligence monitoring your weaknesses, orchestrating practice tasks, and guiding placement progression.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('agent')}
              className="w-full py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span>Open Host Agent</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 2: ATS Resume Checker */}
          <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#D1CDC2] transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#202321]">ATS Resume Checker</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#0284C7] border border-[#EAE7DF]">
                  {resumeScore ? `Latest Score: ${resumeScore}/100` : 'Resume Upload'}
                </span>
              </div>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Evaluates resume formatting, identifies missing job keywords, and matches against target roles and JDs.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('resume')}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Check Resume</span>
              <ChevronRight className="w-4 h-4 text-[#059669]" />
            </button>
          </div>

          {/* Module 3: Coding Sandbox */}
          <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#D1CDC2] transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#202321]">Coding Sandbox</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#D97706] border border-[#EAE7DF]">
                  {codingSolved} Problems Solved
                </span>
              </div>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Code execution container with Python/JS/C++ support, stdin interaction, testcases, and Host Agent error analysis.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('coding')}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Practice Coding</span>
              <ChevronRight className="w-4 h-4 text-[#059669]" />
            </button>
          </div>

          {/* Module 4: AI Mock Interview */}
          <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#D1CDC2] transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFE4E6] border border-[#FECDD3] text-[#E11D48] flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#202321]">AI Mock Interview</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#E11D48] border border-[#EAE7DF]">
                  {interviewCount} Completed Sessions
                </span>
              </div>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Simulated real-time interview room covering Technical, HR, and Project Viva rounds with detailed feedback reports.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('interview')}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Launch Interview</span>
              <ChevronRight className="w-4 h-4 text-[#059669]" />
            </button>
          </div>

          {/* Module 5: Career Roadmap */}
          <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#D1CDC2] transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#047857] flex items-center justify-center">
                <Map className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#202321]">Career Roadmap</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#047857] border border-[#EAE7DF]">
                  24-Week Structured Path
                </span>
              </div>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Full 24-week curriculum covering DSA, Web, ML, and Core subjects with week-by-week Host Agent guidance.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('roadmap')}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>View Roadmap</span>
              <ChevronRight className="w-4 h-4 text-[#059669]" />
            </button>
          </div>

          {/* Module 6: Knowledge Base & Quizzes */}
          <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#D1CDC2] transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#202321]">Knowledge Base</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#7C3AED] border border-[#EAE7DF]">
                  Curated MCQs & Explanations
                </span>
              </div>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Topic-wise quizzes with domain progression and instant Host Agent explanation for incorrect choices.
              </p>
            </div>

            <button
              onClick={() => setActiveFeature('knowledge')}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Take Quiz</span>
              <ChevronRight className="w-4 h-4 text-[#059669]" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
