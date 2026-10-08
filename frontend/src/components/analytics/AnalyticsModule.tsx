import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Flame,
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Award,
  Zap,
  BarChart2,
  PieChart,
  Activity,
  FileText,
  Code2,
  Video,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
  Cell
} from 'recharts';

interface AnalyticsModuleProps {
  token: string;
  setActiveFeature: (feature: string) => void;
}

export const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({ token, setActiveFeature }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'learning' | 'skills' | 'placement'>('overview');
  const [daysPeriod, setDaysPeriod] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);

  // Analytics API Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [learningData, setLearningData] = useState<any>(null);
  const [skillsData, setSkillsData] = useState<any>(null);
  const [placementData, setPlacementData] = useState<any>(null);

  // Filter & Modal States
  const [learningFilter, setLearningFilter] = useState<string>('all');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [newGoalType, setNewGoalType] = useState<string>('coding');
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [newGoalTarget, setNewGoalTarget] = useState<number>(3);
  const [goalSubmitting, setGoalSubmitting] = useState<boolean>(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchTabAnalytics = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const res = await axios.get(`/api/v1/analytics/overview?days=${daysPeriod}`, authHeaders);
        setOverviewData(res.data);
      } else if (activeTab === 'learning') {
        const res = await axios.get(`/api/v1/analytics/learning?days=${daysPeriod}`, authHeaders);
        setLearningData(res.data);
      } else if (activeTab === 'skills') {
        const res = await axios.get(`/api/v1/analytics/skills?days=${daysPeriod}`, authHeaders);
        setSkillsData(res.data);
      } else if (activeTab === 'placement') {
        const res = await axios.get(`/api/v1/analytics/placement?days=${daysPeriod}`, authHeaders);
        setPlacementData(res.data);
      }
    } catch (err) {
      console.error("Failed fetching analytics tab data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabAnalytics();
  }, [activeTab, daysPeriod]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    setGoalSubmitting(true);
    try {
      await axios.post('/api/v1/analytics/goals', {
        goal_type: newGoalType,
        title: newGoalTitle.trim(),
        target_count: Number(newGoalTarget)
      }, authHeaders);

      setIsGoalModalOpen(false);
      setNewGoalTitle('');
      setNewGoalTarget(3);
      fetchTabAnalytics();
    } catch (err) {
      console.error("Failed creating goal", err);
    } finally {
      setGoalSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    try {
      await axios.delete(`/api/v1/analytics/goals/${goalId}`, authHeaders);
      fetchTabAnalytics();
    } catch (err) {
      console.error("Failed deleting goal", err);
    }
  };

  // Helper for rendering module icon
  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'coding': return <Code2 className="w-4 h-4 text-emerald-600" />;
      case 'knowledge':
      case 'quiz': return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'interview': return <Video className="w-4 h-4 text-purple-600" />;
      case 'resume': return <FileText className="w-4 h-4 text-amber-600" />;
      case 'roadmap': return <Activity className="w-4 h-4 text-indigo-600" />;
      default: return <Sparkles className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">

      {/* TOP HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#047857] mb-2 border border-[#A7F3D0]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PlaceX Learning OS</span>
          </div>
          <h1 className="text-3xl font-black text-[#202321] tracking-tight">Your Learning Analytics</h1>
          <p className="text-sm font-medium text-[#666B67] mt-1">
            Build consistency. Track progress. Prepare with purpose.
          </p>
        </div>

        {/* Date Range Period Selector */}
        <div className="flex items-center gap-1.5 bg-[#F7F4EE] p-1.5 rounded-2xl border border-[#EAE7DF] self-start md:self-auto">
          {[
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
            { label: '90 Days', val: 90 },
            { label: 'All Time', val: 365 }
          ].map(p => (
            <button
              key={p.val}
              onClick={() => setDaysPeriod(p.val)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                daysPeriod === p.val
                  ? 'bg-white text-[#202321] shadow-xs border border-[#EAE7DF]'
                  : 'text-[#666B67] hover:text-[#202321]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* FOUR NAVIGATION TABS */}
      <div className="flex border-b border-[#EAE7DF] space-x-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'learning', label: 'Learning', icon: Flame },
          { id: 'skills', label: 'Skills', icon: BarChart2 },
          { id: 'placement', label: 'Placement', icon: Target }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3.5 font-extrabold text-sm border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[#10B981] text-[#047857] bg-[#E6F4EA]/40 rounded-t-2xl'
                  : 'border-transparent text-[#666B67] hover:text-[#202321] hover:border-[#EAE7DF]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#10B981]' : 'text-[#666B67]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* LOADING SKELETON STATE */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-white rounded-3xl border border-[#EAE7DF] animate-pulse p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="h-72 bg-white rounded-3xl border border-[#EAE7DF] animate-pulse p-6"></div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && activeTab === 'overview' && overviewData && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* TODAY'S RECOMMENDED FOCUS */}
          {overviewData.todays_focus && (
            <div className="bg-gradient-to-br from-[#047857] to-[#065F46] text-white p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    <Zap className="w-3.5 h-3.5 fill-emerald-300" />
                    <span>Today's Focus</span>
                  </div>
                  <h2 className="text-2xl font-black">{overviewData.todays_focus.title}</h2>
                  <p className="text-emerald-100/90 text-sm font-medium leading-relaxed">
                    {overviewData.todays_focus.reason}
                  </p>
                </div>
                <button
                  onClick={() => setActiveFeature(overviewData.todays_focus.target_feature || 'coding')}
                  className="px-6 py-3.5 rounded-2xl bg-white text-[#047857] font-extrabold text-sm shadow-md hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
                >
                  <span>{overviewData.todays_focus.action_label || 'Start Now'}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Login Streak Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#666B67] uppercase tracking-wider">Login Streak</span>
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-[#202321]">
                  {overviewData.summary_cards.current_login_streak} <span className="text-sm font-bold text-[#666B67]">days</span>
                </div>
                <p className="text-xs font-semibold text-[#666B67] mt-1">
                  Longest streak: <strong className="text-[#202321]">{overviewData.summary_cards.longest_login_streak} days</strong>
                </p>
              </div>
            </div>

            {/* Active Days Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#666B67] uppercase tracking-wider">Active Days</span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-[#202321]">
                  {overviewData.summary_cards.active_days_in_period} <span className="text-sm font-bold text-[#666B67]">/ {daysPeriod} days</span>
                </div>
                <p className="text-xs font-semibold text-[#666B67] mt-1">
                  Lifetime active: <strong className="text-[#202321]">{overviewData.summary_cards.total_active_days} days</strong>
                </p>
              </div>
            </div>

            {/* Problems Solved Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#666B67] uppercase tracking-wider">Coding Solved</span>
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Code2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-[#202321]">
                  {overviewData.summary_cards.coding_solved_count} <span className="text-sm font-bold text-[#666B67]">solved</span>
                </div>
                <p className="text-xs font-semibold text-[#666B67] mt-1">
                  Submissions: <strong className="text-[#202321]">{overviewData.summary_cards.coding_attempted_count}</strong>
                </p>
              </div>
            </div>

            {/* Weekly Goals Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#666B67] uppercase tracking-wider">Weekly Goals</span>
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-[#202321]">
                  {overviewData.summary_cards?.goals_completed_count ?? 0} <span className="text-sm font-bold text-[#666B67]">/ {(overviewData.weekly_goals || []).length}</span>
                </div>
                <p className="text-xs font-semibold text-[#666B67] mt-1">
                  Quizzes done: <strong className="text-[#202321]">{overviewData.summary_cards?.quiz_attempted_count ?? 0}</strong>
                </p>
              </div>
            </div>

          </div>

          {/* WEEKLY ACTIVITY CHART */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#202321]">Learning Activity Trend</h3>
                <p className="text-xs font-semibold text-[#666B67]">
                  Daily timestamped student activities measured across PlaceX modules over past {daysPeriod} days
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-extrabold text-[#666B67]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Coding</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Quizzes</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> Interviews</span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overviewData.activity_chart_data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE6" />
                  <XAxis dataKey="display_date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE7DF', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#202321' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" name="Total Activity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TWO COLUMN ROW: WEEKLY GOALS & RECENT ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* WEEKLY GOALS SECTION */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#202321]">Weekly Goals</h3>
                  <p className="text-xs font-semibold text-[#666B67]">Synced automatically from your live practice</p>
                </div>
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#E6F4EA] text-[#047857] hover:bg-[#D1FAE5] font-extrabold text-xs transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Goal</span>
                </button>
              </div>

              <div className="space-y-4">
                {(overviewData.weekly_goals || []).map((goal: any) => {
                  const pct = Math.min(100, Math.round((goal.current_count / goal.target_count) * 100));
                  return (
                    <div key={goal.id} className="p-4 rounded-2xl border border-[#EAE7DF] bg-[#FAF9F5] space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${goal.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-700 border border-[#EAE7DF]'}`}>
                            {goal.is_completed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : getModuleIcon(goal.goal_type)}
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-[#202321]">{goal.title}</h4>
                            <p className="text-xs font-medium text-[#666B67]">
                              {goal.current_count} of {goal.target_count} completed
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            goal.is_completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {goal.status_text}
                          </span>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Delete goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-[#EAE7DF] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${goal.is_completed ? 'bg-emerald-500' : 'bg-[#10B981]'}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}

                {(overviewData.weekly_goals || []).length === 0 && (
                  <div className="text-center py-8 text-xs font-semibold text-[#666B67]">
                    No active goals for this week. Click "Add Goal" to set one!
                  </div>
                )}
              </div>
            </div>

            {/* RECENT ACTIVITY FEED */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#202321]">Recent Activity</h3>
                <p className="text-xs font-semibold text-[#666B67]">Chronological record of verified student events</p>
              </div>

              <div className="space-y-3">
                {(overviewData.recent_activities || []).map((act: any) => (
                  <div key={act.id} className="p-3.5 rounded-2xl border border-[#EAE7DF] hover:border-[#10B981]/50 bg-white transition-all flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-[#F7F4EE] shrink-0">
                        {getModuleIcon(act.module)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-[#202321] truncate">{act.title}</h4>
                        <p className="text-[11px] font-medium text-[#666B67] truncate">{act.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveFeature(act.target_feature || 'dashboard')}
                      className="px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-[#E6F4EA] text-[#202321] hover:text-[#047857] text-[11px] font-bold shrink-0 transition-all flex items-center gap-1"
                    >
                      <span>{act.action_label || 'View'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {overviewData.recent_activities.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <Clock className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                    <p className="text-xs font-bold text-[#666B67]">No recent activity recorded yet.</p>
                    <p className="text-[11px] text-[#9CA3AF]">Solve a coding problem or take a quiz to begin tracking!</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: LEARNING (Streak, Heatmap, Milestones) */}
      {!loading && activeTab === 'learning' && learningData && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* ANIMATED 7-DAY STREAK TRACKER */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Current Week Tracker</span>
                </div>
                <h3 className="text-xl font-black text-[#202321]">Weekly Engagement Calendar</h3>
                <p className="text-xs font-semibold text-[#666B67]">
                  {learningData.motivational_message}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-[#F7F4EE] p-3 rounded-2xl border border-[#EAE7DF]">
                <div>
                  <div className="text-xs font-bold text-[#666B67]">Streak</div>
                  <div className="text-lg font-black text-[#202321]">{learningData.current_streak} days</div>
                </div>
                <div className="h-8 w-px bg-[#EAE7DF]"></div>
                <div>
                  <div className="text-xs font-bold text-[#666B67]">This Week</div>
                  <div className="text-lg font-black text-[#047857]">{learningData.active_days_this_week} / 7 days</div>
                </div>
              </div>
            </div>

            {/* 7-DAY CARDS (Mon to Sun) */}
            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {(learningData.seven_day_tracker || []).map((day: any) => {
                let cardStyle = "bg-[#F7F4EE] border-[#EAE7DF] text-[#666B67]";
                if (day.status === 'completed') {
                  cardStyle = "bg-emerald-500 text-white border-emerald-600 shadow-sm";
                } else if (day.status === 'today') {
                  cardStyle = "bg-amber-400 text-[#202321] border-amber-500 ring-2 ring-amber-300 shadow-sm";
                } else if (day.status === 'missed') {
                  cardStyle = "bg-red-50 text-red-500 border-red-200";
                }

                return (
                  <div key={day.date} className={`p-3 md:p-4 rounded-2xl border text-center space-y-2 transition-all ${cardStyle}`}>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider">{day.day_abbr}</div>
                    <div className="text-lg md:text-xl font-black">{day.day_number}</div>
                    <div className="flex justify-center">
                      {day.is_active ? (
                        <Flame className={`w-5 h-5 ${day.status === 'completed' ? 'fill-white text-white' : 'fill-amber-600 text-amber-600'}`} />
                      ) : day.is_missed ? (
                        <X className="w-4 h-4 text-red-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current opacity-40 my-1.5"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] font-semibold text-[#666B67] bg-[#FAF9F5] p-3 rounded-xl border border-[#EAE7DF]">
              💡 <strong>Streak Rule:</strong> Daily login and qualifying learning actions (coding, quizzes, mock interviews) are recorded once per local calendar day to ensure genuine habit tracking.
            </div>
          </div>

          {/* HISTORICAL ACTIVITY HEATMAP */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#202321]">Activity Heatmap ({daysPeriod} Days)</h3>
                <p className="text-xs font-semibold text-[#666B67]">Contribution calendar measuring continuous practice</p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-[#666B67]">
                <span>Less</span>
                <span className="w-3.5 h-3.5 rounded-sm bg-[#EAE7DF] inline-block"></span>
                <span className="w-3.5 h-3.5 rounded-sm bg-[#D1FAE5] inline-block"></span>
                <span className="w-3.5 h-3.5 rounded-sm bg-[#6EE7B7] inline-block"></span>
                <span className="w-3.5 h-3.5 rounded-sm bg-[#10B981] inline-block"></span>
                <span className="w-3.5 h-3.5 rounded-sm bg-[#047857] inline-block"></span>
                <span>More</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="flex flex-wrap gap-2 pt-2">
              {(learningData.heatmap || []).map((cell: any) => {
                let bgHex = "#EAE7DF";
                if (cell.level === 1) bgHex = "#D1FAE5";
                else if (cell.level === 2) bgHex = "#6EE7B7";
                else if (cell.level === 3) bgHex = "#10B981";
                else if (cell.level === 4) bgHex = "#047857";

                return (
                  <div
                    key={cell.date}
                    style={{ backgroundColor: bgHex }}
                    className={`w-5 h-5 rounded-md transition-all hover:scale-125 cursor-pointer relative group ${cell.is_today ? 'ring-2 ring-[#202321]' : ''}`}
                  >
                    {/* Tooltip on Hover */}
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-[#202321] text-white text-[10px] rounded-xl shadow-xl z-30 pointer-events-none">
                      <div className="font-bold text-emerald-400">{cell.display_date}</div>
                      <div>{cell.count} total activities</div>
                      <div className="text-gray-300 mt-1">
                        Code: {cell.categories.coding} | Quiz: {cell.categories.quiz} | Int: {cell.categories.interview}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MILESTONES & ACHIEVEMENTS */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#202321]">Learning Milestones</h3>
              <p className="text-xs font-semibold text-[#666B67]">Earned badges based on verified milestone achievements</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(learningData.milestones || []).map((m: any) => (
                <div
                  key={m.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    m.is_earned
                      ? 'bg-gradient-to-br from-emerald-50/50 to-white border-emerald-300'
                      : 'bg-gray-50/50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${m.is_earned ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#202321]">{m.title}</h4>
                      <p className="text-xs font-medium text-[#666B67] mt-1">{m.description}</p>
                      <span className={`inline-block mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        m.is_earned ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {m.earned_text}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: SKILLS (Performance & Radar Chart) */}
      {!loading && activeTab === 'skills' && skillsData && (
        <div className="space-y-8 animate-fadeIn">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* DOMAIN QUIZ PERFORMANCE BAR CHART */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#202321]">Domain Assessment Accuracy</h3>
                <p className="text-xs font-semibold text-[#666B67]">Accuracy percentage across Knowledge Base subject domains</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillsData.domain_performance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE6" />
                    <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9CA3AF" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Accuracy']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE7DF' }}
                    />
                    <Bar dataKey="accuracy" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SKILL RADAR CHART */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#202321]">Engineering Skill Radar</h3>
                <p className="text-xs font-semibold text-[#666B67]">5 core engineering dimensions calculated from real assessments</p>
              </div>

              {skillsData.has_enough_radar_data ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={skillsData.radar_data}>
                      <PolarGrid stroke="#F0EEE6" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#202321', fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9CA3AF" />
                      <Radar name="Student Skill Level" dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-[#FAF9F5] p-6 rounded-2xl border border-[#EAE7DF] text-center space-y-3 my-4">
                  <HelpCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <h4 className="text-sm font-extrabold text-[#202321]">Radar Chart Locked</h4>
                  <p className="text-xs text-[#666B67] max-w-sm mx-auto leading-relaxed">
                    Complete at least one coding submission or domain quiz to unlock your personalized 5-pillar skill radar chart!
                  </p>
                  <button
                    onClick={() => setActiveFeature('coding')}
                    className="px-4 py-2 rounded-xl bg-[#047857] text-white text-xs font-bold shadow-xs hover:bg-[#065F46] transition-all"
                  >
                    Start Practice Coding
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* CODING SANDBOX STATS & STRENGTHS/WEAKNESSES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* CODING METRICS */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#202321]">Coding Sandbox Metrics</h3>
                <p className="text-xs font-semibold text-[#666B67]">Actual problem execution and difficulty distribution</p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-[#F7F4EE] border border-[#EAE7DF]">
                  <div className="text-2xl font-black text-[#202321]">{skillsData.coding_metrics.total_solved}</div>
                  <div className="text-xs font-bold text-[#666B67] mt-1">Solved</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F7F4EE] border border-[#EAE7DF]">
                  <div className="text-2xl font-black text-[#202321]">{skillsData.coding_metrics.total_attempted}</div>
                  <div className="text-xs font-bold text-[#666B67] mt-1">Submissions</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F7F4EE] border border-[#EAE7DF]">
                  <div className="text-2xl font-black text-emerald-600">{skillsData.coding_metrics.accuracy}%</div>
                  <div className="text-xs font-bold text-[#666B67] mt-1">Success Rate</div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[#666B67] uppercase tracking-wider">Difficulty Solved Distribution</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-xs font-bold text-emerald-800">Easy</span>
                    <div className="text-lg font-black text-emerald-700">{skillsData.coding_metrics.difficulty_distribution.Easy}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <span className="text-xs font-bold text-amber-800">Medium</span>
                    <div className="text-lg font-black text-amber-700">{skillsData.coding_metrics.difficulty_distribution.Medium}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                    <span className="text-xs font-bold text-red-800">Hard</span>
                    <div className="text-lg font-black text-red-700">{skillsData.coding_metrics.difficulty_distribution.Hard}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* STRENGTHS & WEAKNESSES */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#202321]">Strengths & Focus Areas</h3>
                <p className="text-xs font-semibold text-[#666B67]">Evidence-based feedback derived from your actual assessment activity</p>
              </div>

              <div className="space-y-4">
                {(skillsData.strengths || []).map((s: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{s.title}</span>
                      </h4>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Strength</span>
                    </div>
                    <p className="text-xs font-medium text-emerald-800/90 leading-relaxed">{s.description}</p>
                  </div>
                ))}

                {(skillsData.weaknesses || []).map((w: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>{w.title}</span>
                      </h4>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Focus Area</span>
                    </div>
                    <p className="text-xs font-medium text-amber-800/90 leading-relaxed">{w.description}</p>
                    <button
                      onClick={() => setActiveFeature(w.target_feature || 'knowledge')}
                      className="text-xs font-bold text-amber-800 underline hover:text-amber-900 flex items-center gap-1 pt-1"
                    >
                      <span>Practice Topic</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: PLACEMENT (Readiness Score & Resume/Interview History) */}
      {!loading && activeTab === 'placement' && placementData && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* PLACEMENT READINESS SCORE GAUGE CARD */}
          <div className="bg-gradient-to-br from-[#202321] to-[#111312] text-white p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Target className="w-3.5 h-3.5" />
                  <span>5-Tier Readiness Model</span>
                </div>
                <h2 className="text-2xl font-black">Placement Readiness Score</h2>
                <p className="text-xs font-medium text-gray-400 max-w-xl">
                  Weighted synthesis of Resume Quality (25%), Coding Solutions (35%), Interview Sessions (30%), and Practice Activity (10%).
                </p>
              </div>

              <div className="text-right bg-white/5 p-6 rounded-2xl border border-white/10 shrink-0 self-start md:self-auto">
                <div className="text-4xl font-black text-emerald-400">
                  {placementData.readiness.readiness_score !== null ? `${placementData.readiness.readiness_score}/100` : 'Not Calculated'}
                </div>
                <div className="mt-1">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white">
                    {placementData.readiness.readiness_level}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Weight Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
              {Object.entries(placementData.readiness.score_breakdown || {}).map(([key, val]: any) => (
                <div key={key} className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] font-bold text-gray-400 truncate">{key}</div>
                  <div className="text-sm font-black text-white mt-1">{String(val)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* TWO COLUMN ROW: ATS RESUME & MOCK INTERVIEWS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ATS RESUME HISTORY */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#202321]">ATS Resume Uploads</h3>
                  <p className="text-xs font-semibold text-[#666B67]">Saved ATS scores and file versions</p>
                </div>
                <button
                  onClick={() => setActiveFeature('resume')}
                  className="px-3.5 py-2 rounded-xl bg-[#E6F4EA] text-[#047857] hover:bg-[#D1FAE5] font-extrabold text-xs transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Analyze Resume</span>
                </button>
              </div>

              <div className="space-y-3">
                {(placementData.resume_history || []).map((r: any) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-[#EAE7DF] bg-[#FAF9F5] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-[#202321] truncate">{r.filename}</h4>
                        <p className="text-[11px] font-medium text-[#666B67]">Version {r.version} • {r.uploaded_at}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-emerald-600">{r.ats_score}/100</div>
                      <span className="text-[10px] font-extrabold text-[#666B67]">ATS Score</span>
                    </div>
                  </div>
                ))}

                {(placementData.resume_history || []).length === 0 && (
                  <div className="text-center py-10 space-y-2 text-xs text-[#666B67]">
                    <FileText className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                    <p className="font-bold">No resume uploaded yet.</p>
                    <p className="text-[11px] text-[#9CA3AF]">Upload your resume in Resume Analyzer to track your ATS score!</p>
                  </div>
                )}
              </div>
            </div>

            {/* MOCK INTERVIEWS */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#202321]">Mock Interview Performance</h3>
                  <p className="text-xs font-semibold text-[#666B67]">Evaluated competency breakdown across mock sessions</p>
                </div>
                <button
                  onClick={() => setActiveFeature('interview')}
                  className="px-3.5 py-2 rounded-xl bg-[#E6F4EA] text-[#047857] hover:bg-[#D1FAE5] font-extrabold text-xs transition-all flex items-center gap-1.5"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Mock Interview</span>
                </button>
              </div>

              {/* Competency score bars */}
              <div className="space-y-3">
                {(placementData.avg_competencies || []).map((c: any) => (
                  <div key={c.competency} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[#202321]">
                      <span>{c.competency}</span>
                      <span className="text-[#047857]">{c.has_data ? `${c.score}/100` : 'Not Evaluated'}</span>
                    </div>
                    <div className="w-full bg-[#EAE7DF] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] transition-all duration-500"
                        style={{ width: `${c.has_data ? c.score : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* CREATE GOAL MODAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAE7DF] p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#202321]">Add Weekly Goal</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202321] mb-1">Goal Category</label>
                <select
                  value={newGoalType}
                  onChange={(e) => setNewGoalType(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EAE7DF] bg-[#F7F4EE] text-xs font-bold text-[#202321]"
                >
                  <option value="coding">Coding Practice</option>
                  <option value="quiz">Knowledge Base Quiz</option>
                  <option value="interview">Mock Interview</option>
                  <option value="roadmap">Career Roadmap</option>
                  <option value="resume">Resume Optimization</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202321] mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solve 5 Array Coding Problems"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EAE7DF] bg-white text-xs font-bold text-[#202321]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202321] mb-1">Target Completion Count</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-[#EAE7DF] bg-white text-xs font-bold text-[#202321]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EAE7DF] text-xs font-bold text-[#666B67] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-bold shadow-xs transition-all"
                >
                  {goalSubmitting ? 'Saving...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AnalyticsModule;
