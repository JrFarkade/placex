import React, { useState, useEffect } from 'react';
import { Map, CheckCircle2, ShieldCheck, Target, Sparkles, Layers, ChevronDown, ChevronUp, Clock, AlertCircle, BookOpen, CheckSquare, Square, PlayCircle, RefreshCw } from 'lucide-react';
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

export const RoadmapView: React.FC<RoadmapViewProps> = ({ token }) => {
  const [branches, setBranches] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>(['Beginner', 'Intermediate', 'Advanced']);
  const [selectedBranch, setSelectedBranch] = useState<string>('Data Science');
  const [selectedLevel, setSelectedLevel] = useState<string>('Beginner');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<{ [key: number]: boolean }>({});

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/v1/roadmap/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.branches && res.data.branches.length > 0) {
        setBranches(res.data.branches);
        setSelectedBranch(res.data.branches[0]);
      }
      if (res.data.levels) {
        setLevels(res.data.levels);
      }
    } catch (err) {
      console.warn("Failed to fetch branches");
    }
  };

  const fetchPath = async (branch: string, level: string) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/v1/roadmap/path?branch=${encodeURIComponent(branch)}&level=${encodeURIComponent(level)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (err) {
      console.warn("Failed to fetch roadmap path");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch && selectedLevel) {
      fetchPath(selectedBranch, selectedLevel);
    }
  }, [selectedBranch, selectedLevel]);

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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (err) {
      console.warn("Failed to toggle week status");
    }
  };

  const toggleExpand = (weekNum: number) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[#202321]">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
            <Map className="w-3.5 h-3.5 text-[#059669]" />
            <span>Official PlaceX Career Roadmap</span>
          </div>
          <h2 className="text-2xl font-black text-[#202321] tracking-tight">Career Roadmap (24 Weeks)</h2>
          <p className="text-xs text-[#666B67] font-medium max-w-xl leading-relaxed">
            Follow the authoritative 24-week industry curriculum tailored to your career track and expertise level.
          </p>
        </div>

        {/* Dropdown Track & Level Selectors */}
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

          <div className="flex flex-col">
            <label className="text-[10px] font-extrabold text-[#949A95] uppercase tracking-wider mb-1">Expertise Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white transition-all cursor-pointer shadow-xs"
            >
              {levels.map(l => (
                <option key={l} value={l}>{l} Level</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Progress Card & Metrics */}
          <div className="space-y-6 lg:col-span-1">
            {/* Overall Progress */}
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-4">
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
              <div className="w-full bg-[#FAF8F5] h-3 rounded-full overflow-hidden border border-[#EAE7DF]">
                <div
                  className="bg-[#059669] h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.progress_pct}%` }}
                ></div>
              </div>

              <div className="pt-3 border-t border-[#F4F1EA] flex justify-between text-xs text-[#666B67] font-semibold">
                <span className="flex items-center gap-1.5 text-[#047857]">
                  <CheckSquare className="w-4 h-4 text-[#059669]" />
                  {data.completed_count} Completed
                </span>
                <span className="flex items-center gap-1.5 text-[#D97706]">
                  <PlayCircle className="w-4 h-4 text-[#F59E0B]" />
                  {data.in_progress_count} In Progress
                </span>
              </div>
            </div>

            {/* Placement Readiness */}
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#949A95] uppercase tracking-wider">Placement Readiness</span>
                <ShieldCheck className="w-5 h-5 text-[#059669]" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#202321]">
                  {data.readiness?.readiness_score !== null && data.readiness?.readiness_score !== undefined ? `${data.readiness.readiness_score} / 100` : 'Not Calculated'}
                </div>
                <div className="text-xs text-[#047857] font-bold mt-0.5">
                  Tier: {data.readiness?.readiness_level || 'Not Calculated'}
                </div>
              </div>
            </div>

            {/* Active Track Info */}
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#202321] uppercase tracking-wider">
                <Layers className="w-4 h-4 text-[#059669]" />
                <span>Active Track Info</span>
              </div>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                Currently displaying <strong>{selectedBranch}</strong> ({selectedLevel} Level). Every week includes explicit prerequisites and verification completion criteria.
              </p>
            </div>
          </div>

          {/* Right Column: 24 Expandable Week Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202321] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#059669]" />
                <span>24-Week Curriculum ({selectedBranch} — {selectedLevel})</span>
              </h3>
              {loading && (
                <span className="text-xs text-[#059669] font-bold flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading...
                </span>
              )}
            </div>

            <div className="space-y-3">
              {(data.weeks || []).map((w: WeekEntry) => {
                const isExpanded = expandedWeeks[w.week];
                return (
                  <div
                    key={w.week}
                    className={`bg-white rounded-2xl border transition-all shadow-xs ${
                      w.status === 'Completed'
                        ? 'border-[#BBF7D0] bg-[#F0FDF4]/40'
                        : w.status === 'In Progress'
                        ? 'border-[#FDE68A] bg-[#FEF3C7]/20'
                        : 'border-[#EAE7DF] hover:border-[#CBD5E1]'
                    }`}
                  >
                    {/* Week Main Row */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-xs ${
                            w.status === 'Completed'
                              ? 'bg-[#E6F4EA] text-[#047857]'
                              : w.status === 'In Progress'
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-[#FAF8F5] text-[#949A95] border border-[#EAE7DF]'
                          }`}
                        >
                          W{w.week}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-sm font-extrabold ${w.status === 'Completed' ? 'text-[#666B67] line-through' : 'text-[#202321]'}`}>
                              {w.topic}
                            </h4>
                            {w.priority && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EAE7DF] text-[#525753]">
                                {w.priority}
                              </span>
                            )}
                            {w.difficulty && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#047857]">
                                {w.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleStatusToggle(w.week, w.status)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            w.status === 'Completed'
                              ? 'bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]'
                              : w.status === 'In Progress'
                              ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                              : 'bg-[#FAF8F5] text-[#666B67] border border-[#EAE7DF] hover:bg-[#F4F1EA]'
                          }`}
                        >
                          {w.status === 'Completed' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                              <span>Completed</span>
                            </>
                          ) : w.status === 'In Progress' ? (
                            <>
                              <PlayCircle className="w-3.5 h-3.5 text-[#D97706]" />
                              <span>In Progress</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5 text-[#949A95]" />
                              <span>Not Started</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => toggleExpand(w.week)}
                          className="p-1.5 rounded-xl bg-[#FAF8F5] text-[#666B67] border border-[#EAE7DF] hover:bg-[#F4F1EA] transition-all cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Row */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-[#F4F1EA] bg-[#FAF8F5]/50 rounded-b-2xl space-y-3">
                        {w.prerequisites && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-[#949A95] uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-[#059669]" />
                              Prerequisites
                            </span>
                            <p className="text-xs text-[#525753] font-medium leading-relaxed bg-white p-3 rounded-xl border border-[#EAE7DF]">
                              {w.prerequisites}
                            </p>
                          </div>
                        )}

                        {w.completion_criteria && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-[#949A95] uppercase tracking-wider flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-[#059669]" />
                              Completion Criteria
                            </span>
                            <p className="text-xs text-[#525753] font-medium leading-relaxed bg-white p-3 rounded-xl border border-[#EAE7DF]">
                              {w.completion_criteria}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
