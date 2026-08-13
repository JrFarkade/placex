import React, { useState, useEffect } from 'react';
import { Map, CheckCircle2, ShieldCheck, Target, Sparkles, Building, Layers, ArrowRight, CheckSquare, Square, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface RoadmapViewProps {
  token: string;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ token }) => {
  const [targetRole, setTargetRole] = useState('Data Analyst');
  const [targetCompany, setTargetCompany] = useState('Not specified');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchRoadmap = async (role: string, company: string) => {
    setLoading(true);
    try {
      const compParam = company !== 'Not specified' ? `&target_company=${encodeURIComponent(company)}` : '';
      const res = await axios.get(`/api/v1/roadmap?target_role=${encodeURIComponent(role)}${compParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      if (res.data.target_role && res.data.target_role !== 'Not specified') {
        setTargetRole(res.data.target_role);
      }
    } catch (err) {
      console.warn("Roadmap fetch error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap(targetRole, targetCompany);
  }, []);

  const handleGoalChange = async (newRole: string, newCompany: string) => {
    setUpdating(true);
    setTargetRole(newRole);
    setTargetCompany(newCompany);
    try {
      const compVal = newCompany === 'Not specified' ? null : newCompany;
      const res = await axios.post(
        '/api/v1/roadmap/goal',
        { target_role: newRole, target_company: compVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (err) {
      console.warn("Failed to update roadmap goal");
    } finally {
      setUpdating(false);
    }
  };

  const handleTopicToggle = async (topicName: string, currentStatus: string) => {
    const newCompleted = currentStatus !== 'Completed';
    try {
      const res = await axios.post(
        '/api/v1/roadmap/topic/toggle',
        { topic_name: topicName, completed: newCompleted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (err) {
      console.warn("Failed to toggle topic status");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-darkBorder flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Map className="w-3.5 h-3.5" />
            <span>Personalized Career Roadmap</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Your Learning Path</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Built dynamically around your career goal, current skills, skill gaps, and preparation timeline.
          </p>
        </div>

        {/* Goal Selector Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Career Role</label>
            <select
              value={targetRole}
              onChange={(e) => handleGoalChange(e.target.value, targetCompany)}
              className="bg-slate-900 border border-darkBorder rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Data Analyst">Data Analyst</option>
              <option value="Software Development Engineer (SDE)">Software Engineer (SDE)</option>
              <option value="Product Analyst">Product Analyst</option>
              <option value="Machine Learning Engineer">Machine Learning Engineer</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Company (Optional)</label>
            <select
              value={targetCompany}
              onChange={(e) => handleGoalChange(targetRole, e.target.value)}
              className="bg-slate-900 border border-darkBorder rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Not specified">Not specified (Role Focused)</option>
              <option value="Google">Google</option>
              <option value="Amazon">Amazon</option>
              <option value="Microsoft">Microsoft</option>
            </select>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Next Best Action Card (Top Actionable Insight) */}
          {data.next_best_action && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-800/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>Next Best Action</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-100 mt-1">
                  {data.next_best_action.topic_name}
                </h3>
                <p className="text-xs text-slate-400">
                  <strong className="text-blue-300">Why this matters:</strong> {data.next_best_action.reason}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold text-slate-400">Est. Time: {data.next_best_action.estimated_time}</span>
                <button
                  onClick={() => handleTopicToggle(data.next_best_action.topic_name, 'Pending')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <span>Mark Completed</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Readiness Tier & Progress Card */}
            <div className="space-y-6 lg:col-span-1">
              {/* Overall Progress Card */}
              <div className="glass-card p-6 rounded-3xl border border-darkBorder space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roadmap Completion</span>
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-100">{data.progress_pct}%</div>
                  <div className="text-xs text-blue-400 font-semibold mt-0.5">
                    {data.completed_topics_count} of {data.total_topics_count} Topics Completed
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${data.progress_pct}%` }}></div>
                </div>
              </div>

              {/* Readiness Tier Card */}
              <div className="glass-card p-6 rounded-3xl border border-darkBorder space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placement Readiness</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-100">
                    {data.readiness?.readiness_score !== null && data.readiness?.readiness_score !== undefined ? `${data.readiness.readiness_score} / 100` : 'Not Calculated'}
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                    Tier: {data.readiness?.readiness_level || 'Not Calculated'}
                  </div>
                </div>
              </div>

              {/* Optional Target Company Card */}
              {targetCompany !== 'Not specified' && data.company_profile?.interview_pattern && (
                <div className="glass-card p-6 rounded-3xl border border-darkBorder space-y-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-400" />
                    <span>{targetCompany} Company Profile</span>
                  </h3>
                  <div className="text-xs text-slate-300 space-y-2">
                    <div>
                      <span className="text-slate-500 font-medium">Interview Format:</span>
                      <div className="font-semibold text-slate-200 mt-0.5">{data.company_profile.interview_pattern}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Dynamic Role-Specific Phases */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Roadmap Phases for {data.target_role}</span>
                </h3>
                {updating && (
                  <span className="text-xs text-blue-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {(data.phases || []).map((phase: any) => (
                  <div
                    key={phase.phase}
                    className={`glass-card p-5 rounded-2xl border transition-all ${
                      phase.status === 'Completed'
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : phase.status === 'In Progress'
                        ? 'border-blue-500/40 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                        : 'border-darkBorder bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            phase.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : phase.status === 'In Progress'
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {phase.phase}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-100">{phase.name}</h4>
                          <span className="text-[10px] text-slate-500">Duration: {phase.duration}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          phase.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : phase.status === 'In Progress'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {phase.status}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      {phase.topics.map((top: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => handleTopicToggle(top.name, top.status)}
                          className="flex items-start justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 cursor-pointer transition-all group"
                        >
                          <div className="flex items-start gap-2.5">
                            {top.status === 'Completed' ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 group-hover:text-blue-400 shrink-0 mt-0.5 transition-all" />
                            )}
                            <div>
                              <div className={`text-xs font-semibold ${top.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                                {top.name}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{top.reason}</div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${top.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {top.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
