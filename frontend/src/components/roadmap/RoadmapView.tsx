import React, { useState, useEffect } from 'react';
import { Map, CheckCircle2, ShieldCheck, Target, Sparkles, Building, Layers, CheckSquare, Square, RefreshCw } from 'lucide-react';
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Map className="w-3.5 h-3.5 text-indigo-600" />
            <span>Personalized Career Roadmap</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Career Preparation Path</h2>
          <p className="text-xs text-slate-500 font-medium max-w-xl leading-relaxed">
            Automatically built around your career goal, current skills, skill gaps, and preparation timeline.
          </p>
        </div>

        {/* Goal Selector Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Target Role</label>
            <select
              value={targetRole}
              onChange={(e) => handleGoalChange(e.target.value, targetCompany)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="Data Analyst">Data Analyst</option>
              <option value="Software Development Engineer (SDE)">Software Engineer (SDE)</option>
              <option value="Product Analyst">Product Analyst</option>
              <option value="Machine Learning Engineer">Machine Learning Engineer</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Target Company (Optional)</label>
            <select
              value={targetCompany}
              onChange={(e) => handleGoalChange(targetRole, e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
          {/* Next Best Action Banner */}
          {data.next_best_action && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 to-purple-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 text-indigo-200 border border-white/15">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>Next Best Action</span>
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  {data.next_best_action.topic_name}
                </h3>
                <p className="text-xs text-indigo-100/90 font-medium">
                  <strong className="text-white">Why this matters:</strong> {data.next_best_action.reason}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-indigo-200">Est: {data.next_best_action.estimated_time}</span>
                <button
                  onClick={() => handleTopicToggle(data.next_best_action.topic_name, 'Pending')}
                  className="px-4 py-2.5 rounded-2xl bg-white text-indigo-950 font-extrabold text-xs flex items-center gap-2 shadow-sm hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <span>Complete Action</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Progress & Readiness Tier */}
            <div className="space-y-6 lg:col-span-1">
              {/* Overall Progress Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-900">{data.progress_pct}%</div>
                  <div className="text-xs text-indigo-600 font-bold mt-0.5">
                    {data.completed_topics_count} of {data.total_topics_count} Topics Completed
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${data.progress_pct}%` }}></div>
                </div>
              </div>

              {/* Readiness Tier Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placement Readiness</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    {data.readiness?.readiness_score !== null && data.readiness?.readiness_score !== undefined ? `${data.readiness.readiness_score} / 100` : 'Not Calculated'}
                  </div>
                  <div className="text-xs text-emerald-600 font-bold mt-0.5">
                    Tier: {data.readiness?.readiness_level || 'Not Calculated'}
                  </div>
                </div>
              </div>

              {/* Optional Company Profile Card */}
              {targetCompany !== 'Not specified' && data.company_profile?.interview_pattern && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-600" />
                    <span>{targetCompany} Format</span>
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {data.company_profile.interview_pattern}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Dynamic Role-Specific Phases */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Roadmap Phases for {data.target_role}</span>
                </h3>
                {updating && (
                  <span className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {(data.phases || []).map((phase: any) => (
                  <div
                    key={phase.phase}
                    className={`bg-white p-6 rounded-3xl border transition-all shadow-xs ${
                      phase.status === 'Completed'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : phase.status === 'In Progress'
                        ? 'border-indigo-200 bg-indigo-50/20 shadow-md shadow-indigo-500/5'
                        : 'border-slate-200/80 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            phase.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : phase.status === 'In Progress'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {phase.phase}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{phase.name}</h4>
                          <span className="text-[10px] font-semibold text-slate-400">Duration: {phase.duration}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                          phase.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : phase.status === 'In Progress'
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {phase.status}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {phase.topics.map((top: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => handleTopicToggle(top.name, top.status)}
                          className="flex items-start justify-between p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 cursor-pointer transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            {top.status === 'Completed' ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5 transition-all" />
                            )}
                            <div>
                              <div className={`text-xs font-bold ${top.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {top.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{top.reason}</div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${top.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/80 text-slate-600'}`}>
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
