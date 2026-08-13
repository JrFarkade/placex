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
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[#202321]">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex items-center justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FAF8F5] text-[#0284C7] border border-[#EAE7DF]">
            <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Native Resume-Matcher Engine</span>
          </div>
          <h2 className="text-2xl font-black text-[#202321] tracking-tight">Resume Intelligence & ATS Matcher</h2>
          <p className="text-xs text-[#666B67] font-medium max-w-xl leading-relaxed">
            Multi-engine PDF/DOCX parser evaluating ATS structural health, missing job keywords, and match score.
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[#EAE7DF] max-w-md shadow-xs">
        <button
          onClick={() => setActiveTab('mode_a')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === 'mode_a'
              ? 'bg-[#059669] text-white shadow-xs'
              : 'text-[#666B67] hover:text-[#202321]'
          }`}
        >
          MODE A: Health Check
        </button>
        <button
          onClick={() => setActiveTab('mode_b')}
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

        {/* Right Column: Results */}
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
