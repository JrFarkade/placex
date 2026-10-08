import React, { useState, useEffect } from 'react';
import { 
  Map, 
  CheckCircle2, 
  ShieldCheck, 
  Target, 
  Sparkles, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  CheckSquare, 
  Square, 
  PlayCircle, 
  RefreshCw, 
  Bot, 
  Loader2, 
  Plus,
  ArrowRight,
  X,
  Send,
  HelpCircle,
  Lightbulb,
  Compass,
  Award,
  ExternalLink,
  Calendar,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

interface RoadmapViewProps {
  token: string;
}

interface WeekEntry {
  week: number;
  topic: string;
  difficulty: string;
  priority: string;
  prerequisites: string;
  completion_criteria: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

interface HostGuideData {
  branch: string;
  level: string;
  week_number: number;
  week_title: string;
  explanation: string;
  key_concepts?: string[];
  practical_exercises?: string[];
  common_mistakes?: string[];
  verification_goal?: string;
  future_connection?: string;
  resources?: string[];
}

interface ChatMsg {
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

const MONTH_METADATA = [
  { month: 1, title: 'Month 1: Core Foundations & Language Fluency', range: 'Weeks 1 – 4', weeks: [1, 2, 3, 4] },
  { month: 2, title: 'Month 2: Algorithms, Data Models & Architecture', range: 'Weeks 5 – 8', weeks: [5, 6, 7, 8] },
  { month: 3, title: 'Month 3: Production Tooling & System Engineering', range: 'Weeks 9 – 12', weeks: [9, 10, 11, 12] },
  { month: 4, title: 'Month 4: Deep Domain & Advanced Frameworks', range: 'Weeks 13 – 16', weeks: [13, 14, 15, 16] },
  { month: 5, title: 'Month 5: Industry Capstones & Optimization', range: 'Weeks 17 – 20', weeks: [17, 18, 19, 20] },
  { month: 6, title: 'Month 6: Placement Mastery & Technical Interview Prep', range: 'Weeks 21 – 24', weeks: [21, 22, 23, 24] }
];

const TRACK_DESCRIPTIONS: { [key: string]: { description: string; highlights: string[]; iconBg: string } } = {
  'Data Science': {
    description: 'Master analytical statistics, predictive machine learning, SQL warehousing, and enterprise data storytelling.',
    highlights: ['Python & Pandas', 'Statistical Modeling', 'Scikit-Learn & ML', 'Deep Learning & NLP'],
    iconBg: 'bg-emerald-50 text-[#059669] border-[#BBF7D0]'
  },
  'AI/ML Engineering': {
    description: 'Design and deploy production neural architectures, generative AI models, computer vision, and scalable MLOps pipelines.',
    highlights: ['Deep Neural Networks', 'PyTorch & Transformers', 'Computer Vision', 'LLMs & MLOps'],
    iconBg: 'bg-teal-50 text-[#0F766E] border-teal-200'
  },
  'Cybersecurity': {
    description: 'Protect enterprise infrastructure through packet analysis, defensive telemetry, offensive penetration testing, and cloud security.',
    highlights: ['Linux & TCP/IP', 'Intrusion Detection', 'Penetration Testing', 'Cloud & Zero-Trust'],
    iconBg: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  'Computer Science / Software Development': {
    description: 'Build enterprise-grade software with rigorous algorithmic problem solving, design patterns, microservices, and distributed systems.',
    highlights: ['Data Structures & Algos', 'System Design & APIs', 'Full-Stack Engineering', 'Distributed Scale'],
    iconBg: 'bg-purple-50 text-purple-700 border-purple-200'
  }
};

export const RoadmapView: React.FC<RoadmapViewProps> = ({ token }) => {
  const [branches, setBranches] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>(['Beginner', 'Intermediate', 'Advanced']);
  const [selectedBranch, setSelectedBranch] = useState<string>('Data Science');
  const [selectedLevel, setSelectedLevel] = useState<string>('Beginner');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'all'>('all');

  // Week Details & Host Agent Learning Drawer
  const [activeWeekDetails, setActiveWeekDetails] = useState<WeekEntry | null>(null);
  const [loadingGuide, setLoadingGuide] = useState<boolean>(false);
  const [guideError, setGuideError] = useState<string>('');
  const [guideCache, setGuideCache] = useState<{ [weekNum: number]: HostGuideData }>({});
  
  // Learning Chat per week
  const [chatMessages, setChatMessages] = useState<{ [weekNum: number]: ChatMsg[] }>({});
  const [questionInput, setQuestionInput] = useState<string>('');
  const [sendingQuestion, setSendingQuestion] = useState<boolean>(false);

  // Practice Tasks state
  const [createdTasks, setCreatedTasks] = useState<{ [key: number]: boolean }>({});
  const [creatingTaskWeek, setCreatingTaskWeek] = useState<number | null>(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/v1/roadmap/branches', authHeader);
      if (res.data.branches && res.data.branches.length > 0) {
        setBranches(res.data.branches);
        if (!selectedBranch || !res.data.branches.includes(selectedBranch)) {
          setSelectedBranch(res.data.default_branch || res.data.branches[0]);
        }
      }
      if (res.data.levels) {
        setLevels(res.data.levels);
      }
    } catch (err) {
      console.warn("Failed to fetch branches", err);
    }
  };

  const fetchPath = async (branch: string, level: string) => {
    if (branch === 'None / Not Selected') {
      setData({
        branch: 'None / Not Selected',
        level,
        total_weeks: 0,
        completed_count: 0,
        in_progress_count: 0,
        progress_pct: 0,
        weeks: [],
        readiness: null
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(
        `/api/v1/roadmap/path?branch=${encodeURIComponent(branch)}&level=${encodeURIComponent(level)}`,
        authHeader
      );
      setData(res.data);
    } catch (err) {
      console.warn("Failed to fetch roadmap path", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    if (token) {
      axios.post('/api/v1/agent/events', {
        event_type: 'roadmap.opened',
        module: 'roadmap'
      }, authHeader).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (selectedBranch && selectedLevel) {
      fetchPath(selectedBranch, selectedLevel);
      if (token && selectedBranch !== 'None / Not Selected') {
        axios.post('/api/v1/agent/events', {
          event_type: 'roadmap.career_selected',
          module: 'roadmap',
          data: { branch: selectedBranch, level: selectedLevel }
        }, authHeader).catch(() => {});
      }
    }
  }, [selectedBranch, selectedLevel]);

  // Status toggle handler
  const handleStatusToggle = async (weekNum: number, currentStatus: string) => {
    let nextStatus = 'In Progress';
    if (currentStatus === 'Not Started') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else nextStatus = 'Not Started';

    try {
      const res = await axios.post(
        '/api/v1/roadmap/toggle-week',
        {
          branch: selectedBranch,
          level: selectedLevel,
          week_num: weekNum,
          status: nextStatus
        },
        authHeader
      );
      setData(res.data);

      if (activeWeekDetails && activeWeekDetails.week === weekNum) {
        setActiveWeekDetails(prev => prev ? { ...prev, status: nextStatus as any } : null);
      }

      if (nextStatus === 'Completed') {
        axios.post('/api/v1/agent/events', {
          event_type: 'roadmap.week_completed',
          module: 'roadmap',
          data: { branch: selectedBranch, level: selectedLevel, week_num: weekNum }
        }, authHeader).catch(() => {});
      } else if (nextStatus === 'In Progress') {
        axios.post('/api/v1/agent/events', {
          event_type: 'roadmap.week_started',
          module: 'roadmap',
          data: { branch: selectedBranch, level: selectedLevel, week_num: weekNum }
        }, authHeader).catch(() => {});
      }
    } catch (err) {
      console.warn("Failed to toggle week status");
    }
  };

  // Open Week Details and fetch Host Agent guidance dynamically
  const handleOpenWeekDetails = async (week: WeekEntry) => {
    setActiveWeekDetails(week);
    if (guideCache[week.week]) return;

    setLoadingGuide(true);
    setGuideError('');

    try {
      const res = await axios.post('/api/v1/agent/explain/roadmap-week', {
        branch: selectedBranch,
        level: selectedLevel,
        week_number: week.week,
        week_title: week.topic,
        prerequisites: week.prerequisites,
        completion_criteria: week.completion_criteria
      }, authHeader);

      if (res.data.status === 'success') {
        setGuideCache(prev => ({ ...prev, [week.week]: res.data }));
      } else {
        setGuideError(res.data.message || "Host Agent couldn't generate the learning guidance right now. Please try again.");
      }
    } catch (err: any) {
      setGuideError(err.response?.data?.message || "Host Agent couldn't generate the learning guidance right now. Please try again.");
    } finally {
      setLoadingGuide(false);
    }
  };

  // Send a learning question to the Host Agent for the active week
  const handleSendQuestion = async (customQ?: string) => {
    if (!activeWeekDetails) return;
    const q = (customQ || questionInput).trim();
    if (!q || sendingQuestion) return;

    setQuestionInput('');
    setSendingQuestion(true);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMsg = { sender: 'user', text: q, timestamp: timeStr };

    setChatMessages(prev => ({
      ...prev,
      [activeWeekDetails.week]: [...(prev[activeWeekDetails.week] || []), userMsg]
    }));

    try {
      const res = await axios.post('/api/v1/agent/explain/roadmap-week', {
        branch: selectedBranch,
        level: selectedLevel,
        week_number: activeWeekDetails.week,
        week_title: activeWeekDetails.topic,
        prerequisites: activeWeekDetails.prerequisites,
        completion_criteria: activeWeekDetails.completion_criteria,
        user_question: q
      }, authHeader);

      const replyText = res.data.answer || res.data.explanation || "I've reviewed this topic. How else can I assist your study for this week?";
      const agentMsg: ChatMsg = {
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => ({
        ...prev,
        [activeWeekDetails.week]: [...(prev[activeWeekDetails.week] || []), agentMsg]
      }));
    } catch (err) {
      const errMsg: ChatMsg = {
        sender: 'agent',
        text: "Host Agent couldn't generate an answer right now. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => ({
        ...prev,
        [activeWeekDetails.week]: [...(prev[activeWeekDetails.week] || []), errMsg]
      }));
    } finally {
      setSendingQuestion(false);
    }
  };

  // Add Practice Task
  const handleCreateHostTask = async (week: WeekEntry) => {
    setCreatingTaskWeek(week.week);
    try {
      await axios.post('/api/v1/agent/tasks', {
        title: `Week ${week.week}: Master ${week.topic}`,
        description: `Prerequisites: ${week.prerequisites || 'None'}. Verification: ${week.completion_criteria || 'Implement topic in Coding Sandbox.'}`,
        module: 'roadmap',
        priority: 'high',
        target_route: '/roadmap'
      }, authHeader);
      setCreatedTasks(prev => ({ ...prev, [week.week]: true }));
    } catch (err) {
      console.warn("Failed to create host task");
    } finally {
      setCreatingTaskWeek(null);
    }
  };

  // Calculate Month progress stats
  const getMonthStats = (weeksList: number[]) => {
    if (!data?.weeks) return { completed: 0, inProgress: 0, total: weeksList.length };
    const monthWeeks = (data.weeks as WeekEntry[]).filter(w => weeksList.includes(w.week));
    const completed = monthWeeks.filter(w => w.status === 'Completed').length;
    const inProgress = monthWeeks.filter(w => w.status === 'In Progress').length;
    return { completed, inProgress, total: weeksList.length };
  };

  const isNoneSelected = selectedBranch === 'None / Not Selected';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-[#202321]">
      
      {/* 1. Header Toolbar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
            <Map className="w-3.5 h-3.5 text-[#059669]" />
            <span>PlaceX 6-Month Career Operating System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#202321] tracking-tight">Career Roadmap (24 Weeks)</h1>
          <p className="text-xs text-[#666B67] font-medium max-w-xl leading-relaxed">
            A structured 24-week engineering journey organized across six progressive months with contextual guidance from the PlaceX Host Agent.
          </p>
        </div>

        {/* Track & Level Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-extrabold text-[#949A95] uppercase tracking-wider mb-1">Career Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white transition-all cursor-pointer shadow-xs"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {!isNoneSelected && (
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-[#949A95] uppercase tracking-wider mb-1">Expertise Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white transition-all cursor-pointer shadow-xs"
              >
                {levels.map(l => (
                  <option key={l} value={l}>{l} Track</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 2. NONE / NOT SELECTED STATE (Part 4) */}
      {isNoneSelected ? (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#EAE7DF] shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[#FAF8F5] border border-[#EAE7DF] text-[#059669] flex items-center justify-center mx-auto shadow-xs">
            <Compass className="w-8 h-8" />
          </div>
          
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-[#202321]">No Career Track Selected Yet</h2>
            <p className="text-xs text-[#666B67] leading-relaxed font-medium">
              You are not locked into any single path. Browse the four primary engineering disciplines below and select a 24-week curriculum whenever you are ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto pt-4 text-left">
            {Object.entries(TRACK_DESCRIPTIONS).map(([trackName, meta]) => (
              <div
                key={trackName}
                className="bg-[#FAF8F5] hover:bg-white p-6 rounded-3xl border border-[#EAE7DF] hover:border-[#BBF7D0] transition-all shadow-xs flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${meta.iconBg}`}>
                      24 Weeks · 6 Months
                    </span>
                    <Sparkles className="w-4 h-4 text-[#059669] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-base font-black text-[#202321]">{trackName}</h3>
                  <p className="text-xs text-[#666B67] font-medium leading-relaxed">{meta.description}</p>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {meta.highlights.map(h => (
                      <span key={h} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white border border-[#EAE7DF] text-[#525753]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBranch(trackName)}
                  className="w-full py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span>Select {trackName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 3. ACTIVE ROADMAP 6-MONTH JOURNEY (Parts 5, 6, 7, 8, 9, 10) */
        <div className="space-y-6">
          
          {/* Top Progress & Metrics Cards */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Progress */}
              <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#949A95] uppercase tracking-wider">Track Completion</span>
                  <Target className="w-5 h-5 text-[#059669]" />
                </div>
                <div>
                  <div className="text-3xl font-black text-[#202321]">{data.progress_pct}%</div>
                  <div className="text-xs text-[#059669] font-bold mt-0.5">
                    {data.completed_count} of {data.total_weeks} Weeks Completed
                  </div>
                </div>
                <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#EAE7DF]">
                  <div
                    className="bg-[#059669] h-full rounded-full transition-all duration-500"
                    style={{ width: `${data.progress_pct}%` }}
                  ></div>
                </div>
              </div>

              {/* Placement Readiness */}
              <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#949A95] uppercase tracking-wider">Placement Readiness</span>
                  <ShieldCheck className="w-5 h-5 text-[#059669]" />
                </div>
                <div>
                  <div className="text-3xl font-black text-[#202321]">
                    {data.readiness?.readiness_score !== null && data.readiness?.readiness_score !== undefined ? `${data.readiness.readiness_score} / 100` : 'Not Calculated'}
                  </div>
                  <div className="text-xs text-[#047857] font-bold mt-0.5">
                    Tier: {data.readiness?.readiness_level || 'Foundation'}
                  </div>
                </div>
                <p className="text-[11px] text-[#666B67] font-medium">Evaluated from your ATS score, coding submissions & quizzes.</p>
              </div>

              {/* Active Track Info */}
              <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#949A95] uppercase tracking-wider">Active Track</span>
                  <Layers className="w-5 h-5 text-[#059669]" />
                </div>
                <h3 className="text-base font-black text-[#202321]">{selectedBranch}</h3>
                <p className="text-xs text-[#666B67] font-medium leading-relaxed">
                  Level: <strong>{selectedLevel}</strong>. All 24 weeks include prerequisites, completion criteria, and on-demand Host Agent mentoring.
                </p>
              </div>
            </div>
          )}

          {/* Month Filter Navigator */}
          <div className="bg-white p-3 rounded-2xl border border-[#EAE7DF] shadow-xs flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-[#949A95] px-3 shrink-0 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#059669]" />
              <span>Journey View:</span>
            </span>

            <button
              onClick={() => setSelectedMonthFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                selectedMonthFilter === 'all'
                  ? 'bg-[#059669] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#666B67] hover:bg-[#F4F1EA] border border-[#EAE7DF]'
              }`}
            >
              All 6 Months (24 Weeks)
            </button>

            {MONTH_METADATA.map(m => {
              const stats = getMonthStats(m.weeks);
              const isSelected = selectedMonthFilter === m.month;
              return (
                <button
                  key={m.month}
                  onClick={() => setSelectedMonthFilter(m.month)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-[#666B67] hover:bg-[#F4F1EA] border border-[#EAE7DF]'
                  }`}
                >
                  <span>Month {m.month}</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-[#E6F4EA] text-[#047857]'}`}>
                    {stats.completed}/4
                  </span>
                </button>
              );
            })}
          </div>

          {/* 6-Month Timeline Journey Layout */}
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-[#EAE7DF] text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#059669] animate-spin mx-auto" />
              <p className="text-xs font-bold text-[#666B67]">Loading 24-week curriculum for {selectedBranch}...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {MONTH_METADATA
                .filter(m => selectedMonthFilter === 'all' || selectedMonthFilter === m.month)
                .map((m) => {
                  const stats = getMonthStats(m.weeks);
                  const monthWeeksData = (data?.weeks || []).filter((w: WeekEntry) => m.weeks.includes(w.week));

                  return (
                    <div key={m.month} className="space-y-4">
                      {/* Month Section Header */}
                      <div className="bg-[#FAF8F5] px-6 py-4 rounded-2xl border border-[#EAE7DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#059669] text-white font-black text-sm flex items-center justify-center shadow-xs">
                            M{m.month}
                          </div>
                          <div>
                            <h2 className="text-sm font-black text-[#202321]">{m.title}</h2>
                            <span className="text-[10px] font-bold text-[#666B67]">{m.range}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className="text-xs font-bold text-[#047857] bg-[#E6F4EA] px-3 py-1 rounded-full border border-[#BBF7D0]">
                            {stats.completed} of 4 Weeks Completed
                          </span>
                        </div>
                      </div>

                      {/* 4 Weeks Grid for this Month */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {monthWeeksData.map((w: WeekEntry) => {
                          const isCompleted = w.status === 'Completed';
                          const isInProgress = w.status === 'In Progress';

                          return (
                            <div
                              key={w.week}
                              onClick={() => handleOpenWeekDetails(w)}
                              className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between space-y-4 ${
                                isCompleted
                                  ? 'bg-[#F0FDF4]/50 border-[#BBF7D0] hover:border-[#059669]'
                                  : isInProgress
                                  ? 'bg-[#FEF3C7]/30 border-[#FDE68A] hover:border-[#F59E0B]'
                                  : 'bg-white border-[#EAE7DF] hover:border-[#059669]'
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Card Header Badge & Status */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                                        isCompleted
                                          ? 'bg-[#E6F4EA] text-[#047857]'
                                          : isInProgress
                                          ? 'bg-[#F59E0B] text-white'
                                          : 'bg-[#FAF8F5] text-[#949A95] border border-[#EAE7DF]'
                                      }`}
                                    >
                                      W{w.week}
                                    </span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EAE7DF] text-[#666B67]">
                                      {w.difficulty || 'Core'}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusToggle(w.week, w.status);
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                                      isCompleted
                                        ? 'bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]'
                                        : isInProgress
                                        ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                                        : 'bg-[#FAF8F5] text-[#949A95] border border-[#EAE7DF] hover:bg-[#F4F1EA]'
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                        <span>Completed</span>
                                      </>
                                    ) : isInProgress ? (
                                      <>
                                        <PlayCircle className="w-3 h-3 text-[#D97706]" />
                                        <span>In Progress</span>
                                      </>
                                    ) : (
                                      <>
                                        <Square className="w-3 h-3" />
                                        <span>Not Started</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Title */}
                                <h3 className={`text-sm font-black leading-snug ${isCompleted ? 'text-[#666B67]' : 'text-[#202321]'}`}>
                                  {w.topic}
                                </h3>

                                {/* Prerequisites preview */}
                                {w.prerequisites && (
                                  <p className="text-[11px] text-[#666B67] line-clamp-2 leading-relaxed">
                                    <strong className="text-[#202321]">Prerequisites:</strong> {w.prerequisites}
                                  </p>
                                )}
                              </div>

                              {/* Card Footer Actions */}
                              <div className="pt-2 border-t border-[#F4F1EA] flex items-center justify-between gap-2">
                                <span className="text-[10px] font-extrabold text-[#0D9488] flex items-center gap-1">
                                  <Bot className="w-3.5 h-3.5 text-[#0D9488]" />
                                  <span>Learn with Host Agent</span>
                                </span>
                                <span className="text-[10px] font-bold text-[#666B67] flex items-center gap-0.5">
                                  <span>Details</span>
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* 4. WEEK DETAILS & HOST AGENT LEARNING MODAL / DRAWER (Parts 6, 7, 8, 9, 10) */}
      {activeWeekDetails && (
        <div className="fixed inset-0 z-50 bg-[#202321]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EAE7DF] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-fade-in">
            
            {/* Modal Header */}
            <div className="bg-[#FAF8F5] px-6 py-4 border-b border-[#EAE7DF] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#059669] text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                  W{activeWeekDetails.week}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#059669] uppercase tracking-wider">
                      {selectedBranch} · {selectedLevel}
                    </span>
                    <span className="text-[10px] font-bold text-[#949A95]">·</span>
                    <span className="text-[10px] font-bold text-[#666B67]">
                      Week {activeWeekDetails.week} of 24
                    </span>
                  </div>
                  <h2 className="text-base font-black text-[#202321]">{activeWeekDetails.topic}</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveWeekDetails(null)}
                className="p-2 rounded-xl text-[#949A95] hover:text-[#202321] hover:bg-[#F4F1EA] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Official Week Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-1">
                  <span className="text-[10px] font-extrabold text-[#949A95] uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-[#059669]" />
                    Prerequisites
                  </span>
                  <p className="text-xs text-[#202321] font-semibold leading-relaxed">
                    {activeWeekDetails.prerequisites || 'Basic understanding of foundational programming.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-1">
                  <span className="text-[10px] font-extrabold text-[#949A95] uppercase tracking-wider flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-[#059669]" />
                    Verification Completion Criteria
                  </span>
                  <p className="text-xs text-[#202321] font-semibold leading-relaxed">
                    {activeWeekDetails.completion_criteria || 'Complete coding implementation in the Coding Sandbox.'}
                  </p>
                </div>
              </div>

              {/* Host Agent Dynamic Guidance Card */}
              <div className="bg-[#FAF8F5] p-5 rounded-3xl border-2 border-[#0D9488] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#EAE7DF] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#202321]">PlaceX Host Agent Learning Guide</h3>
                      <span className="text-[10px] font-bold text-[#0D9488] uppercase">Dynamic Curriculum Intelligence</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateHostTask(activeWeekDetails)}
                    disabled={creatingTaskWeek === activeWeekDetails.week || createdTasks[activeWeekDetails.week]}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black inline-flex items-center gap-1.5 transition-all cursor-pointer bg-white border border-[#EAE7DF] hover:bg-[#FAF8F5] disabled:opacity-60"
                  >
                    {creatingTaskWeek === activeWeekDetails.week ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#0D9488]" />
                        <span>Adding Task...</span>
                      </>
                    ) : createdTasks[activeWeekDetails.week] ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                        <span className="text-[#059669]">Added to Tasks</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 text-[#0D9488]" />
                        <span>Add as Host Task</span>
                      </>
                    )}
                  </button>
                </div>

                {loadingGuide && (
                  <div className="py-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin mx-auto" />
                    <p className="text-xs font-bold text-[#0D9488]">Preparing your learning guide for Week {activeWeekDetails.week}...</p>
                    <p className="text-[10px] text-[#666B67]">Analyzing core concepts, practical exercises & verification goals.</p>
                  </div>
                )}

                {guideError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{guideError}</span>
                  </div>
                )}

                {/* Render Host Agent Generated Breakdown */}
                {guideCache[activeWeekDetails.week] && !loadingGuide && (
                  <div className="space-y-4 pt-1">
                    {/* 1. Overview */}
                    <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-xs text-[#0F766E]">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span className="uppercase tracking-wider">What This Week Means & Why It Matters</span>
                      </div>
                      <p className="text-xs text-[#202321] font-semibold leading-relaxed pl-5">
                        {guideCache[activeWeekDetails.week].explanation}
                      </p>
                    </div>

                    {/* 2. Key Concepts (Step-by-Step Order) */}
                    {guideCache[activeWeekDetails.week].key_concepts && (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#EAE7DF] space-y-2">
                        <span className="text-[10px] font-extrabold text-[#059669] uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-[#059669]" />
                          Step-by-Step Concepts to Learn
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                          {guideCache[activeWeekDetails.week].key_concepts?.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE7DF]">
                              <span className="w-4 h-4 rounded-full bg-[#E6F4EA] text-[#047857] font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-[11px] font-bold text-[#202321]">{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Practical Coding Exercises */}
                    {guideCache[activeWeekDetails.week].practical_exercises && (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#EAE7DF] space-y-2">
                        <span className="text-[10px] font-extrabold text-[#0D9488] uppercase tracking-wider flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-[#0D9488]" />
                          Hands-On Practice Exercises
                        </span>
                        <ul className="space-y-1.5 pl-1">
                          {guideCache[activeWeekDetails.week].practical_exercises?.map((ex, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-[#202321] font-medium">
                              <span className="text-[#059669] font-bold">▸</span>
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 4. Common Pitfalls & End-of-Week Verification */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {guideCache[activeWeekDetails.week].common_mistakes && (
                        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            Common Pitfalls
                          </span>
                          <ul className="space-y-1 pl-1">
                            {guideCache[activeWeekDetails.week].common_mistakes?.map((m, i) => (
                              <li key={i} className="text-[11px] text-[#444] font-medium leading-relaxed">
                                • {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {guideCache[activeWeekDetails.week].verification_goal && (
                        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                          <span className="text-[10px] font-extrabold text-[#047857] uppercase tracking-wider flex items-center gap-1">
                            <Award className="w-3 h-3 text-[#059669]" />
                            Verification Goal
                          </span>
                          <p className="text-[11px] text-[#202321] font-bold leading-relaxed">
                            {guideCache[activeWeekDetails.week].verification_goal}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Host Agent Learning Dialogue / Chat (Part 9, 10) */}
              <div className="bg-white p-5 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#059669]" />
                    <h3 className="text-xs font-black text-[#202321]">
                      Ask Host Agent about Week {activeWeekDetails.week}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#949A95]">
                    Context: {selectedBranch} (W{activeWeekDetails.week})
                  </span>
                </div>

                {/* Quick Question Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "What should I learn first?",
                    "Give me 5 practice problems",
                    "Explain this topic simply",
                    "Make me a 3-day study plan"
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={sendingQuestion}
                      onClick={() => handleSendQuestion(chip)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FAF8F5] hover:bg-[#E6F4EA] text-[#525753] hover:text-[#047857] border border-[#EAE7DF] hover:border-[#BBF7D0] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Chat Messages Log for this Week */}
                {(chatMessages[activeWeekDetails.week] || []).length > 0 && (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
                    {(chatMessages[activeWeekDetails.week] || []).map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-[#059669] text-white rounded-br-xs font-semibold'
                              : 'bg-white text-[#202321] border border-[#EAE7DF] rounded-bl-xs font-medium'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-[#949A95] px-1 mt-0.5">{msg.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Question Input Box */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder={`Ask Host Agent about Week ${activeWeekDetails.week} concepts, projects, or practice...`}
                    disabled={sendingQuestion}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendQuestion();
                    }}
                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-[#EAE7DF] bg-[#FAF8F5] focus:outline-none focus:border-[#059669] focus:bg-white disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendQuestion()}
                    disabled={sendingQuestion || !questionInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {sendingQuestion ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF8F5] border-t border-[#EAE7DF] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleStatusToggle(activeWeekDetails.week, activeWeekDetails.status)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                  activeWeekDetails.status === 'Completed'
                    ? 'bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]'
                    : activeWeekDetails.status === 'In Progress'
                    ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                    : 'bg-white text-[#666B67] border border-[#EAE7DF] hover:bg-[#F4F1EA]'
                }`}
              >
                {activeWeekDetails.status === 'Completed' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    <span>Status: Completed</span>
                  </>
                ) : activeWeekDetails.status === 'In Progress' ? (
                  <>
                    <PlayCircle className="w-4 h-4 text-[#D97706]" />
                    <span>Status: In Progress</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" />
                    <span>Status: Not Started</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveWeekDetails(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-bold text-[#666B67] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
