import React, { useState, useEffect } from 'react';
import { Code2, Play, Send, Sparkles, RotateCcw, Maximize2, Minimize2, ArrowRight, CheckSquare, XCircle, FileCode2 } from 'lucide-react';
import axios from 'axios';

interface CodingSandboxProps {
  token: string;
}

export const CodingSandbox: React.FC<CodingSandboxProps> = ({ token }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'problem' | 'hints' | 'editorial'>('problem');
  const [consoleTab, setConsoleTab] = useState<'results' | 'history' | 'input'>('results');

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchQuestionsAndRecommendation = async () => {
    try {
      const qsRes = await axios.get('/api/v1/coding/questions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(qsRes.data || []);

      const recRes = await axios.get('/api/v1/coding/recommendation', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendation(recRes.data);

      const qRes = await axios.get(`/api/v1/coding/question/${selectedQuestionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentQuestion(qRes.data);
      if (qRes.data.starter_code?.[language]) {
        setCode(qRes.data.starter_code[language]);
      }
    } catch (err) {
      console.warn("Error initializing coding sandbox data");
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await axios.get('/api/v1/coding/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(res.data || []);
    } catch (err) {
      console.warn("Error fetching submissions history");
    }
  };

  useEffect(() => {
    fetchQuestionsAndRecommendation();
    fetchSubmissions();
  }, [token]);

  useEffect(() => {
    const loadQuestionDetail = async () => {
      try {
        const res = await axios.get(`/api/v1/coding/question/${selectedQuestionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentQuestion(res.data);
        const starter = res.data.starter_code?.[language] || '# Write code here';
        setCode(starter);
        setResult(null);
      } catch (err) {
        console.warn("Error loading question details");
      }
    };
    loadQuestionDetail();
  }, [selectedQuestionId]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (currentQuestion?.starter_code?.[newLang]) {
      setCode(currentQuestion.starter_code[newLang]);
    } else {
      setCode(`# Write ${newLang} code here`);
    }
  };

  const handleResetCode = () => {
    if (currentQuestion?.starter_code?.[language]) {
      setCode(currentQuestion.starter_code[language]);
    }
  };

  const handleRunCode = async () => {
    setRunning(true);
    setResult(null);
    setConsoleTab('results');

    try {
      const res = await axios.post(
        '/api/v1/coding/run',
        { question_id: selectedQuestionId, source_code: code, language, custom_input: customInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setResult({
        status: 'Compilation Error',
        stdout: '',
        stderr: 'Execution server failed. Please verify syntax.',
        runtime_ms: 0
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    setRunning(true);
    setResult(null);
    setConsoleTab('results');

    try {
      const res = await axios.post(
        '/api/v1/coding/submit',
        { question_id: selectedQuestionId, source_code: code, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      fetchSubmissions();
    } catch (err) {
      setResult({
        status: 'Error',
        stdout: '',
        stderr: 'Submission process error.',
        runtime_ms: 0
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 text-[#202321] ${isFullscreen ? 'fixed inset-0 z-50 bg-[#F7F4EE] p-6 overflow-y-auto max-w-none' : ''}`}>
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#059669] flex items-center justify-center text-white shadow-xs">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#059669] font-extrabold uppercase tracking-wider">PlaceX Practice Sandbox</span>
              <span className="text-[10px] bg-[#E6F4EA] text-[#047857] px-2 py-0.5 rounded-md font-mono font-bold">Judge0 Engine</span>
            </div>
            <select
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(Number(e.target.value))}
              className="bg-transparent text-[#202321] font-black text-lg focus:outline-none cursor-pointer mt-0.5"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id} className="bg-white text-[#202321] font-bold">
                  #{q.id}. {q.title} ({q.difficulty})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-4 py-2 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white cursor-pointer"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="cpp">C++ (GCC)</option>
          </select>

          <button
            onClick={handleResetCode}
            title="Reset to Starter Code"
            className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
            className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleRunCode}
            disabled={running}
            className="px-5 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#202321] font-bold text-xs flex items-center gap-2 border border-[#EAE7DF] transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-[#059669]" />
            <span>Run Code</span>
          </button>

          <button
            onClick={handleSubmitSolution}
            disabled={running}
            className="px-6 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Solution</span>
          </button>
        </div>
      </div>

      {/* Recommendation Banner */}
      {recommendation?.recommended_question && (
        <div className="p-4 rounded-2xl bg-[#059669] text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{recommendation.reason}</span>
          </div>
          <button
            onClick={() => setSelectedQuestionId(recommendation.recommended_question.id)}
            className="text-xs bg-white hover:bg-[#FAF8F5] text-[#047857] px-3.5 py-1.5 rounded-xl font-extrabold flex items-center gap-1 transition-all cursor-pointer shrink-0"
          >
            <span>Try #{recommendation.recommended_question.id}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#059669]" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Problem Statement */}
        <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex bg-[#FAF8F5] p-1 rounded-2xl max-w-xs border border-[#EAE7DF]">
              <button
                onClick={() => setActiveTab('problem')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'problem' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
                }`}
              >
                Problem
              </button>
              <button
                onClick={() => setActiveTab('hints')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'hints' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
                }`}
              >
                Hints ({currentQuestion?.hints?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('editorial')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'editorial' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
                }`}
              >
                Solution
              </button>
            </div>

            {activeTab === 'problem' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
                  <div>
                    <h3 className="text-xl font-black text-[#202321]">{currentQuestion?.title}</h3>
                    <span className="text-xs text-[#949A95] font-semibold">Estimated Time: {currentQuestion?.estimated_time || '20 mins'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      currentQuestion?.difficulty === 'Easy' ? 'bg-[#E6F4EA] text-[#047857]' : 'bg-[#FEF3C7] text-[#D97706]'
                    }`}>
                      {currentQuestion?.difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8F5] text-[#059669] border border-[#EAE7DF]">
                      {currentQuestion?.category}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#525753] leading-relaxed font-medium whitespace-pre-wrap">
                  {currentQuestion?.problem_statement}
                </div>

                {(currentQuestion?.visible_testcases || []).map((tc: any, i: number) => (
                  <div key={i} className="space-y-1.5 pt-2">
                    <h4 className="text-xs font-extrabold text-[#949A95] uppercase tracking-wider">Example {i + 1}</h4>
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-mono space-y-1 text-[#202321]">
                      <div><strong>Input:</strong> {tc.input}</div>
                      <div><strong>Output:</strong> {tc.expected || tc.output}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'hints' && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-[#949A95] uppercase tracking-wider">Progressive Hints</h4>
                {(currentQuestion?.hints || []).map((h: string, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs text-[#525753] font-medium space-y-1">
                    <div className="font-bold text-[#059669]">Hint {idx + 1}</div>
                    <div>{h}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'editorial' && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-[#949A95] uppercase tracking-wider">Reference Solution</h4>
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs text-[#202321] font-mono whitespace-pre-wrap leading-relaxed">
                  {currentQuestion?.editorial || "Review time and space complexity."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Console */}
        <div className="space-y-4">
          <div className="bg-[#202321] rounded-3xl overflow-hidden flex flex-col h-[340px] shadow-sm">
            <div className="px-4 py-2.5 bg-[#1A1D1A] border-b border-[#333734] flex items-center justify-between text-xs text-[#949A95] font-mono">
              <span className="flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-[#059669]" />
                <span>solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'cpp'}</span>
              </span>
              <span className="text-[#10B981] font-bold">Judge0 Ready</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full flex-1 p-4 bg-[#202321] text-[#FAF8F5] font-mono text-xs focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setConsoleTab('results')}
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    consoleTab === 'results' ? 'bg-[#059669] text-white' : 'text-[#666B67] hover:text-[#202321]'
                  }`}
                >
                  Test Results
                </button>
                <button
                  onClick={() => setConsoleTab('history')}
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    consoleTab === 'history' ? 'bg-[#059669] text-white' : 'text-[#666B67] hover:text-[#202321]'
                  }`}
                >
                  Submissions ({submissions.length})
                </button>
                <button
                  onClick={() => setConsoleTab('input')}
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    consoleTab === 'input' ? 'bg-[#059669] text-white' : 'text-[#666B67] hover:text-[#202321]'
                  }`}
                >
                  Custom Input
                </button>
              </div>

              {result && (
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold ${
                  result.status === 'Accepted' ? 'bg-[#E6F4EA] text-[#047857]' : 'bg-[#FEF3C7] text-[#D97706]'
                }`}>
                  {result.status}
                </span>
              )}
            </div>

            {consoleTab === 'results' && (
              <div>
                {result ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-[#202321] font-mono text-xs text-[#FAF8F5] max-h-32 overflow-y-auto">
                      {result.stdout || result.stderr || 'No stdout output.'}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
                        <div className="text-[10px] font-bold text-[#949A95] uppercase">Runtime</div>
                        <div className="text-xs font-black text-[#059669] mt-0.5">{result.runtime_ms} ms</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
                        <div className="text-[10px] font-bold text-[#949A95] uppercase">Complexity</div>
                        <div className="text-xs font-black text-[#047857] mt-0.5">{result.time_complexity || 'O(n)'}</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF]">
                        <div className="text-[10px] font-bold text-[#949A95] uppercase">Quality</div>
                        <div className="text-xs font-black text-[#D97706] mt-0.5">{result.code_quality_score || 85}/100</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#949A95] text-center py-4 font-medium">
                    Click 'Run Code' or 'Submit Solution' to execute code in Judge0 container.
                  </div>
                )}
              </div>
            )}

            {consoleTab === 'history' && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {submissions.length > 0 ? (
                  submissions.map((sub: any) => (
                    <div key={sub.id} className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7DF] flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        {sub.status === 'Accepted' ? (
                          <CheckSquare className="w-4 h-4 text-[#059669]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#D97706]" />
                        )}
                        <span className="font-bold text-[#202321]">{sub.status}</span>
                        <span className="text-[#949A95]">({sub.language})</span>
                      </div>
                      <span className="text-[#666B67] font-semibold">{sub.runtime_ms} ms</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#949A95] text-center py-4 font-medium">No submissions recorded yet.</div>
                )}
              </div>
            )}

            {consoleTab === 'input' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#666B67]">Custom Standard Input (stdin)</label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Paste stdin inputs here..."
                  rows={3}
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl p-3 text-xs text-[#202321] font-mono focus:outline-none focus:border-[#059669] focus:bg-white resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
