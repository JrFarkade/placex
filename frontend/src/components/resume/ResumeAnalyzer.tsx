import React, { useState, useEffect } from 'react';
import { FileText, Upload, Sparkles, CheckCircle2, Loader2, FileX, History, Trash2, HelpCircle, AlertTriangle, Image } from 'lucide-react';
import axios from 'axios';

interface ResumeAnalyzerProps {
  token: string;
}

export const ResumeAnalyzer: React.FC<ResumeAnalyzerProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'mode_a' | 'mode_b'>('mode_a');
  const [file, setFile] = useState<File | null>(null);
  const [targetJd, setTargetJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');

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
  }, [token]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

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

  const analysisRes = result?.analysis_result || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-darkBorder flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>PlaceX Resume Intelligence Engine</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Resume Intelligence & Matcher</h2>
          <p className="text-xs text-slate-400 mt-1">
            Robust multi-engine PDF/DOCX extraction. Supports Students, Freshers, Mode A (Health Check), and Mode B (Job Match).
          </p>
        </div>
      </div>

      {/* Analysis Mode Switcher Tabs */}
      <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-darkBorder max-w-md">
        <button
          onClick={() => setActiveTab('mode_a')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'mode_a'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          MODE A: Resume Health Check
        </button>
        <button
          onClick={() => setActiveTab('mode_b')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'mode_b'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          MODE B: Job Match Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload Form & History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-darkBorder space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>{activeTab === 'mode_a' ? 'Upload Resume' : 'Upload Resume & Target JD'}</span>
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-darkBorder hover:border-blue-500/50 rounded-2xl p-6 text-center transition-all cursor-pointer bg-slate-900/40">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="resume-file-input"
                />
                <label htmlFor="resume-file-input" className="cursor-pointer block space-y-2">
                  <FileText className="w-8 h-8 text-blue-400 mx-auto" />
                  <div className="text-xs font-medium text-slate-300">
                    {file ? file.name : 'Click to upload or drag PDF/DOCX'}
                  </div>
                  <div className="text-[10px] text-slate-500">Supports Freshers & Experienced</div>
                </label>
              </div>

              {activeTab === 'mode_b' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Target Job Description</label>
                  <textarea
                    value={targetJd}
                    onChange={(e) => setTargetJd(e.target.value)}
                    placeholder="Paste target job description text..."
                    rows={4}
                    className="w-full bg-slate-900 border border-darkBorder rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={!file || loading || (activeTab === 'mode_b' && !targetJd.trim())}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Text & Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>{activeTab === 'mode_a' ? 'Run Resume Health Check' : 'Calculate Job Match Score'}</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Upload Version History List */}
          {history.length > 0 && (
            <div className="glass-card p-5 rounded-3xl border border-darkBorder space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>Resume Version History</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((h: any) => (
                  <div key={h.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">Version {h.version}</div>
                      <div className="text-[10px] text-slate-500">{h.original_filename}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-400">{h.ats_score} pts</span>
                      <button
                        onClick={() => handleDeleteVersion(h.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
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

        {/* Right Column: Output Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* EXTRACTION FAILED ALERT */}
          {result && result.doc_type === 'EXTRACTION_FAILED' && (
            <div className="glass-card p-6 rounded-3xl border border-red-500/30 bg-red-950/20 space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="text-base font-bold text-red-300">PDF Extraction Failed</h3>
                  <p className="text-xs text-red-400 font-medium">Your PDF could not be read. Please try exporting your resume again as a standard PDF.</p>
                </div>
              </div>
            </div>
          )}

          {/* IMAGE ONLY SCANNED PDF ALERT */}
          {result && result.doc_type === 'IMAGE_ONLY' && (
            <div className="glass-card p-6 rounded-3xl border border-purple-500/30 bg-purple-950/20 space-y-4">
              <div className="flex items-center gap-3">
                <Image className="w-6 h-6 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-purple-300">Scanned / Image-Based PDF Detected</h3>
                  <p className="text-xs text-purple-400 font-medium">This PDF appears to contain images rather than selectable text. Please upload a text-based PDF or enable OCR.</p>
                </div>
              </div>
            </div>
          )}

          {/* NON-RESUME REJECTION ALERT */}
          {result && result.doc_type === 'NON_RESUME' && (
            <div className="glass-card p-6 rounded-3xl border border-amber-500/30 bg-amber-950/20 space-y-4">
              <div className="flex items-center gap-3">
                <FileX className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-amber-300">Document Rejected: Not A Resume</h3>
                  <p className="text-xs text-amber-400 font-medium">This document does not appear to be a resume. (Detected red flags: {result.red_flags?.join(', ')})</p>
                </div>
              </div>
            </div>
          )}

          {/* UNKNOWN CONFIRMATION PROMPT */}
          {result && result.doc_type === 'UNKNOWN' && (
            <div className="glass-card p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 flex items-center gap-3 text-xs text-blue-300 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-400 shrink-0" />
              <span>We couldn't confidently identify this document as a resume. Proceeding with analysis under candidate confirmation.</span>
            </div>
          )}

          {/* MODE A: RESUME HEALTH CHECK RESULTS */}
          {result && result.status === 'success' && result.analysis_mode === 'MODE_A_RESUME_HEALTH_CHECK' && (
            <div className="glass-card p-6 rounded-3xl border border-darkBorder space-y-6">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950/60 border border-blue-800/30">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mode A: Resume Health Check ({result.doc_type})</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400">Resume Quality Score</div>
                  <div className="text-4xl font-black text-slate-100 mt-1">{result.ats_score} / 100</div>
                </div>
                <div className="w-20 h-20 rounded-full border-4 border-blue-500 flex items-center justify-center font-bold text-lg text-blue-300 bg-blue-950/50 shadow-inner">
                  {Math.round(result.ats_score)}%
                </div>
              </div>

              {/* Section Health Scores */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section Health Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(analysisRes.section_scores || {}).map(([cat, score]: [string, any]) => (
                    <div key={cat} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300">{cat}</span>
                        <span className="font-bold text-blue-400">{score}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${score}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2 pt-2 border-t border-darkBorder">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Structural Recommendations</h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {(analysisRes.suggestions || []).map((sug: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* MODE B: JOB MATCH ANALYSIS RESULTS */}
          {result && result.status === 'success' && result.analysis_mode === 'MODE_B_JOB_MATCH_ANALYSIS' && (
            <div className="glass-card p-6 rounded-3xl border border-darkBorder space-y-6">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-indigo-800/30">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mode B: Job Match Analysis ({result.doc_type})</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400">PlaceX Resume Match Score</div>
                  <div className="text-4xl font-black text-slate-100 mt-1">{result.ats_score} / 100</div>
                </div>
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500 flex items-center justify-center font-bold text-lg text-indigo-300 bg-indigo-950/50 shadow-inner">
                  {Math.round(result.ats_score)}%
                </div>
              </div>

              {/* Match Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Exact Keyword Match</div>
                  <div className="text-xs font-bold text-blue-400 mt-0.5">{analysisRes.exact_keyword_match_score}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Semantic Vector Similarity</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">{analysisRes.semantic_similarity_score}%</div>
                </div>
              </div>

              {/* Matching & Missing Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Matching Skills Found</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysisRes.matching_skills || []).map((sk: string, i: number) => (
                      <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-medium">
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Missing Job Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysisRes.missing_skills || []).map((sk: string, i: number) => (
                      <span key={i} className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/20 font-medium">
                        + {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grounded AI Suggestions */}
              <div className="space-y-2 pt-2 border-t border-darkBorder">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grounded Match Suggestions</h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {(analysisRes.suggestions || []).map((sug: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                      <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!result && (
            <div className="glass-card p-12 rounded-3xl border border-darkBorder text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">No Resume Uploaded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your PDF or DOCX file to run Resume Health Check or Job Match Analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
