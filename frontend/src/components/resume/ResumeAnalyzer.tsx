import React, { useState, useEffect } from 'react';
import { FileText, Upload, Sparkles, CheckCircle2, Loader2, FileX, History, Trash2, HelpCircle, AlertTriangle, Image, Bot, ArrowRight, Lightbulb, Target, AlertCircle, Send, MessageSquare } from 'lucide-react';
import axios from 'axios';

interface ResumeAnalyzerProps {
  token: string;
  setActiveFeature?: (feature: string) => void;
}

export const ResumeAnalyzer: React.FC<ResumeAnalyzerProps> = ({ token, setActiveFeature }) => {
  const [activeTab, setActiveTab] = useState<'mode_a' | 'mode_b'>('mode_a');
  const [file, setFile] = useState<File | null>(null);
  const [targetJd, setTargetJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');

  // Host Agent Review state
  const [agentReviewLoading, setAgentReviewLoading] = useState(false);
  const [agentReview, setAgentReview] = useState<any>(null);
  const [agentReviewError, setAgentReviewError] = useState('');

  // Host Agent Interactive Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; timestamp: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/v1/resume/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data || []);
    } catch (err) {
      console.warn("Could not load resume history");
    }
  };

  useEffect(() => {
    fetchHistory();
    if (token) {
      axios.post('/api/v1/agent/events', {
        event_type: 'ats.opened',
        module: 'resume'
      }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  }, [token]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);
    setAgentReview(null);
    setAgentReviewError('');

    const formData = new FormData();
    formData.append('file', file);
    if (activeTab === 'mode_b' && targetJd.trim()) {
      formData.append('target_jd', targetJd);
    }

    try {
      const res = await axios.post('/api/v1/resume/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(res.data);
      fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Resume analysis failed. Please verify file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVersion = async (resumeId: number) => {
    try {
      await axios.delete(`/api/v1/resume/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchHistory();
      if (result?.resume_id === resumeId) setResult(null);
    } catch (err) {
      alert("Failed to delete resume version.");
    }
  };

  const handleReviewWithHostAgent = async () => {
    if (!result || !result.status) return;

    setAgentReviewLoading(true);
    setAgentReviewError('');
    setChatMessages([]);

    try {
      if (result.analysis_mode === 'MODE_A_RESUME_HEALTH_CHECK') {
        const payload = {
          ats_score: result.ats_score || 0,
          doc_type: result.doc_type || 'TEXT_RESUME',
          section_scores: result.analysis_result?.section_scores || {},
          suggestions: result.analysis_result?.suggestions || []
        };
        const res = await axios.post('/api/v1/agent/review/ats', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'error') {
          setAgentReviewError(res.data.message || "Host Agent couldn't analyze this result right now. Please try again.");
        } else {
          setAgentReview(res.data);
        }
      } else if (result.analysis_mode === 'MODE_B_JOB_MATCH_ANALYSIS') {
        const payload = {
          match_score: result.ats_score || 0,
          exact_keyword_match_score: result.analysis_result?.exact_keyword_match_score || 0,
          semantic_similarity_score: result.analysis_result?.semantic_similarity_score || 0,
          matching_skills: result.analysis_result?.matching_skills || [],
          missing_skills: result.analysis_result?.missing_skills || [],
          job_description: targetJd
        };
        const res = await axios.post('/api/v1/agent/review/jd-match', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'error') {
          setAgentReviewError(res.data.message || "Host Agent couldn't analyze this result right now. Please try again.");
        } else {
          setAgentReview(res.data);
        }
      }
    } catch (err: any) {
      setAgentReviewError(err.response?.data?.detail || "Host Agent couldn't analyze this result right now. Please try again.");
    } finally {
      setAgentReviewLoading(false);
    }
  };

  const handleSendChatMessage = async (msgText?: string) => {
    const textToSend = (msgText || chatInput).trim();
    if (!textToSend || sendingChat || !result) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setSendingChat(true);

    try {
      const payload = {
        message: textToSend,
        analysis_mode: result.analysis_mode,
        ats_score: result.ats_score || 0,
        section_scores: result.analysis_result?.section_scores || {},
        suggestions: result.analysis_result?.suggestions || [],
        matching_skills: result.analysis_result?.matching_skills || [],
        missing_skills: result.analysis_result?.missing_skills || [],
        job_description: targetJd,
        conversation_history: chatMessages.map(m => ({ sender: m.sender, text: m.text }))
      };

      const res = await axios.post('/api/v1/agent/explain/resume/chat', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'success' && res.data.reply) {
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'agent',
            text: res.data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'agent',
            text: res.data.message || "Host Agent couldn't analyze this question right now. Please try again.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          text: err.response?.data?.detail || "Host Agent couldn't analyze this question right now. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  const analysisRes = result?.analysis_result || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[#202321]">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex items-center justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FAF8F5] text-[#0284C7] border border-[#EAE7DF]">
            <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>ATS Resume Checker</span>
          </div>
          <h2 className="text-2xl font-black text-[#202321] tracking-tight">Resume Analysis & Job Match</h2>
          <p className="text-xs text-[#666B67] font-medium max-w-xl leading-relaxed">
            Analyzes your resume for ATS compatibility, identifies missing job keywords, and calculates your match score.
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[#EAE7DF] max-w-md shadow-xs">
        <button
          onClick={() => { setActiveTab('mode_a'); setAgentReview(null); }}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === 'mode_a'
              ? 'bg-[#059669] text-white shadow-xs'
              : 'text-[#666B67] hover:text-[#202321]'
          }`}
        >
          MODE A: Health Check
        </button>
        <button
          onClick={() => { setActiveTab('mode_b'); setAgentReview(null); }}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === 'mode_b'
              ? 'bg-[#059669] text-white shadow-xs'
              : 'text-[#666B67] hover:text-[#202321]'
          }`}
        >
          MODE B: Job Match
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload Form & History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#202321] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#059669]" />
              <span>{activeTab === 'mode_a' ? 'Upload Resume' : 'Upload Resume & Target JD'}</span>
            </h3>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-[#EAE7DF] hover:border-[#059669] rounded-2xl p-6 text-center transition-all cursor-pointer bg-[#FAF8F5]">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="resume-file-input"
                />
                <label htmlFor="resume-file-input" className="cursor-pointer block space-y-2">
                  <FileText className="w-8 h-8 text-[#059669] mx-auto" />
                  <div className="text-xs font-bold text-[#202321]">
                    {file ? file.name : 'Click to upload PDF or DOCX'}
                  </div>
                  <div className="text-[10px] text-[#949A95] font-semibold">Supports Freshers & Experienced</div>
                </label>
              </div>

              {activeTab === 'mode_b' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#202321]">Target Job Description</label>
                  <textarea
                    value={targetJd}
                    onChange={(e) => setTargetJd(e.target.value)}
                    placeholder="Paste job description text..."
                    rows={4}
                    className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl p-3 text-xs font-medium text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white resize-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={!file || loading || (activeTab === 'mode_b' && !targetJd.trim())}
                className="w-full py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting & Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>{activeTab === 'mode_a' ? 'Run Health Check' : 'Calculate Match Score'}</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Upload History */}
          {history.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-3">
              <h4 className="text-xs font-extrabold text-[#949A95] uppercase tracking-wider flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#059669]" />
                <span>Resume Versions</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((h: any) => (
                  <div key={h.id} className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#202321]">Version {h.version}</div>
                      <div className="text-[10px] text-[#949A95] font-semibold">{h.original_filename}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#059669]">{h.ats_score} pts</span>
                      <button
                        onClick={() => handleDeleteVersion(h.id)}
                        className="text-[#949A95] hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Results & Host Agent Review */}
        <div className="lg:col-span-2 space-y-6">
          {/* EXTRACTION FAILED */}
          {result && result.doc_type === 'EXTRACTION_FAILED' && (
            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
                <div>
                  <h3 className="text-base font-extrabold text-rose-900">PDF Extraction Failed</h3>
                  <p className="text-xs text-rose-700 font-medium">Your PDF could not be read. Try re-exporting as a standard text PDF.</p>
                </div>
              </div>
            </div>
          )}

          {/* IMAGE ONLY */}
          {result && result.doc_type === 'IMAGE_ONLY' && (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-3">
                <Image className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="text-base font-extrabold text-amber-900">Scanned PDF Detected</h3>
                  <p className="text-xs text-amber-700 font-medium">This PDF contains scanned images rather than selectable text. Upload a text-based PDF.</p>
                </div>
              </div>
            </div>
          )}

          {/* NON RESUME */}
          {result && result.doc_type === 'NON_RESUME' && (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-3">
                <FileX className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="text-base font-extrabold text-amber-900">Document Rejected: Not A Resume</h3>
                  <p className="text-xs text-amber-700 font-medium">Red flags detected: {result.red_flags?.join(', ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* UNKNOWN PROMPT */}
          {result && result.doc_type === 'UNKNOWN' && (
            <div className="p-4 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] flex items-center gap-3 text-xs font-semibold text-[#047857] mb-4">
              <HelpCircle className="w-5 h-5 text-[#059669] shrink-0" />
              <span>We couldn't confidently identify this file as a resume. Proceeding under candidate confirmation.</span>
            </div>
          )}

          {/* MODE A RESULTS */}
          {result && result.status === 'success' && result.analysis_mode === 'MODE_A_RESUME_HEALTH_CHECK' && (
            <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-[#059669] text-white shadow-md">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 border border-white/25 mb-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mode A: Health Check ({result.doc_type})</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-100">Resume Quality Score</div>
                  <div className="text-4xl font-black text-white mt-1">{result.ats_score} / 100</div>
                </div>
                <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center font-black text-xl text-white bg-white/10 shadow-inner">
                  {Math.round(result.ats_score)}%
                </div>
              </div>

              {/* Section Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-[#949A95] uppercase tracking-wider">Section Health Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(analysisRes.section_scores || {}).map(([cat, score]: [string, any]) => (
                    <div key={cat} className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#202321]">{cat}</span>
                        <span className="font-black text-[#059669]">{score}%</span>
                      </div>
                      <div className="w-full bg-[#EAE7DF] h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-[#059669] rounded-full" style={{ width: `${score}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2 pt-2 border-t border-[#F4F1EA]">
                <h4 className="text-xs font-extrabold text-[#949A95] uppercase tracking-wider">Structural Recommendations</h4>
                <ul className="space-y-2 text-xs text-[#525753] font-medium">
                  {(analysisRes.suggestions || []).map((sug: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* HOST AGENT REVIEW CTA BUTTON */}
              <div className="pt-4 border-t border-[#EAE7DF]">
                <button
                  onClick={handleReviewWithHostAgent}
                  disabled={agentReviewLoading}
                  className="w-full py-3.5 rounded-2xl bg-[#0F766E] hover:bg-[#0D9488] text-white font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {agentReviewLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Host Agent Analyzing Result...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>🤖 Review with PlaceX Host Agent</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE B RESULTS */}
          {result && result.status === 'success' && result.analysis_mode === 'MODE_B_JOB_MATCH_ANALYSIS' && (
            <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-[#059669] text-white shadow-md">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 border border-white/25 mb-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mode B: Job Match ({result.doc_type})</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-100">PlaceX Job Match Score</div>
                  <div className="text-4xl font-black text-white mt-1">{result.ats_score} / 100</div>
                </div>
                <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center font-black text-xl text-white bg-white/10 shadow-inner">
                  {Math.round(result.ats_score)}%
                </div>
              </div>

              {/* Match Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0]">
                  <div className="text-[10px] font-bold text-[#525753] uppercase">Exact Keyword Match</div>
                  <div className="text-base font-black text-[#047857] mt-0.5">{analysisRes.exact_keyword_match_score}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
                  <div className="text-[10px] font-bold text-[#525753] uppercase">Semantic Similarity</div>
                  <div className="text-base font-black text-[#059669] mt-0.5">{analysisRes.semantic_similarity_score}%</div>
                </div>
              </div>

              {/* Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#047857] uppercase tracking-wider">Matching Skills Found</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysisRes.matching_skills || []).map((sk: string, i: number) => (
                      <span key={i} className="text-xs bg-[#E6F4EA] text-[#047857] px-3 py-1 rounded-xl border border-[#BBF7D0] font-bold">
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#D97706] uppercase tracking-wider">Missing Job Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysisRes.missing_skills || []).map((sk: string, i: number) => (
                      <span key={i} className="text-xs bg-[#FEF3C7] text-[#D97706] px-3 py-1 rounded-xl border border-[#FDE68A] font-bold">
                        + {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* HOST AGENT REVIEW CTA BUTTON */}
              <div className="pt-4 border-t border-[#EAE7DF]">
                <button
                  onClick={handleReviewWithHostAgent}
                  disabled={agentReviewLoading}
                  className="w-full py-3.5 rounded-2xl bg-[#0F766E] hover:bg-[#0D9488] text-white font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {agentReviewLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Host Agent Analyzing Result...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>🤖 Review with PlaceX Host Agent</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* HOST AGENT ADVICE CARD (GROUNDED 4-QUESTION FRAMEWORK) */}
          {agentReviewError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{agentReviewError}</span>
            </div>
          )}

          {agentReview && agentReview.status === 'success' && (
            <div className="bg-[#FAF8F5] p-6 sm:p-8 rounded-3xl border-2 border-[#0D9488] shadow-md space-y-6 transition-all">
              {/* Header Banner */}
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE7DF]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0D9488] flex items-center justify-center text-white shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#202321] tracking-tight">PlaceX Host Agent Guidance</h3>
                    <p className="text-[11px] text-[#666B67] font-semibold">Grounded AI Analysis • 4-Question Framework</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase">
                  Verified Analysis
                </div>
              </div>

              {/* Master Prompt Grounded Explanation Cards */}
              <div className="space-y-4">
                {/* 1. WHY THIS SCORE */}
                <div className="bg-white p-5 rounded-2xl border border-[#EAE7DF] space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black text-[#0D9488] uppercase tracking-wider">
                    <Target className="w-4 h-4" />
                    <span>Why you received this {activeTab === 'mode_a' ? 'ATS score' : 'match score'}</span>
                  </div>
                  <p className="text-xs text-[#202321] font-medium leading-relaxed">
                    {agentReview.why_score || agentReview.what}
                  </p>
                </div>

                {/* 2. WHAT IS WORKING */}
                <div className="bg-white p-5 rounded-2xl border border-[#EAE7DF] space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black text-[#059669] uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{activeTab === 'mode_a' ? 'What is working' : 'What already matches'}</span>
                  </div>
                  <p className="text-xs text-[#202321] font-medium leading-relaxed">
                    {agentReview.what_is_working || agentReview.what_already_matches || agentReview.why}
                  </p>
                </div>

                {/* 3. WHAT COULD IMPROVE */}
                <div className="bg-white p-5 rounded-2xl border border-[#EAE7DF] space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black text-[#D97706] uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4" />
                    <span>{activeTab === 'mode_a' ? 'What could improve' : 'What is missing / weak'}</span>
                  </div>
                  <p className="text-xs text-[#202321] font-medium leading-relaxed">
                    {agentReview.what_could_improve || agentReview.what_is_missing || agentReview.so_what}
                  </p>
                </div>

                {/* 4. WHAT TO CHANGE FIRST */}
                <div className="bg-white p-5 rounded-2xl border border-[#EAE7DF] space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black text-[#0284C7] uppercase tracking-wider">
                    <ArrowRight className="w-4 h-4" />
                    <span>{activeTab === 'mode_a' ? 'What to change first' : 'What to prioritize'}</span>
                  </div>
                  <p className="text-xs text-[#202321] font-medium leading-relaxed">
                    {agentReview.what_to_change_first || agentReview.what_to_prioritize || agentReview.now_what}
                  </p>
                </div>
              </div>

              {/* Recommendations List */}
              {agentReview.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#666B67] uppercase tracking-wider">Prioritized Next Steps</h4>
                  <div className="space-y-1.5">
                    {agentReview.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs font-bold text-[#202321] bg-white p-3 rounded-xl border border-[#EAE7DF]">
                        <span className="text-[#0D9488] font-black">{i + 1}.</span>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Navigation Buttons */}
              {agentReview.navigate_actions?.length > 0 && (
                <div className="pt-2 border-t border-[#EAE7DF] space-y-2">
                  <h4 className="text-xs font-extrabold text-[#202321] uppercase tracking-wider">Direct Module Actions</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {agentReview.navigate_actions.map((act: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveFeature && setActiveFeature(act.target_tab)}
                        className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <span>{act.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Host Agent Resume / JD Chat */}
              <div className="pt-4 border-t border-[#EAE7DF] space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#202321]">
                  <MessageSquare className="w-4 h-4 text-[#0D9488]" />
                  <span>Ask Host Agent about your resume & placement strategy</span>
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    activeTab === 'mode_a' ? "Why is my ATS score low?" : "Why is my JD match low?",
                    "What should I add to my resume?",
                    "Which skills are most critical?",
                    "How can I improve without lying?"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendChatMessage(chip)}
                      disabled={sendingChat}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-[#0D9488] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      💡 {chip}
                    </button>
                  ))}
                </div>

                {/* Conversation History Stream */}
                {chatMessages.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 bg-white rounded-2xl border border-[#EAE7DF]">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl text-xs ${
                          msg.sender === 'user'
                            ? 'bg-[#E6F4EA] text-[#047857] ml-8 border border-[#BBF7D0]'
                            : 'bg-[#FAF8F5] text-[#202321] mr-8 border border-[#EAE7DF]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-black mb-1 opacity-70">
                          <span>{msg.sender === 'user' ? 'YOU' : 'HOST AGENT'}</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}
                    {sendingChat && (
                      <div className="flex items-center gap-2 text-xs text-[#0D9488] font-bold p-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Host Agent is reasoning over your resume...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Input Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChatMessage();
                    }}
                    disabled={sendingChat}
                    placeholder="Ask Host Agent about improving your resume..."
                    className="flex-1 bg-white border border-[#EAE7DF] rounded-xl px-3.5 py-2.5 text-xs text-[#202321] focus:outline-none focus:border-[#0D9488] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendChatMessage()}
                    disabled={sendingChat || !chatInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    {sendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {!result && (
            <div className="bg-white p-12 rounded-3xl border border-[#EAE7DF] text-center space-y-3 shadow-xs">
              <FileText className="w-12 h-12 text-[#949A95] mx-auto" />
              <h4 className="text-sm font-extrabold text-[#202321]">No Resume Uploaded Yet</h4>
              <p className="text-xs text-[#666B67] max-w-sm mx-auto font-medium">
                Upload your PDF or DOCX file to run Health Check or Job Match Analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
