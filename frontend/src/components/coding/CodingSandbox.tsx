import React, { useState, useEffect } from 'react';
import { Code2, Play, Send, CheckCircle2, AlertCircle, Clock, Cpu, Sparkles, Terminal, BookOpen, RotateCcw, Maximize2, Minimize2, ArrowRight, CheckSquare, XCircle, FileCode2 } from 'lucide-react';
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
  const [consoleTab, setConsoleTab] = useState<'results' | 'history' | 'complexity' | 'input'>('results');

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
    <div className={`space-y-6 max-w-7xl mx-auto pb-8 ${isFullscreen ? 'fixed inset-0 z-50 bg-darkBg p-6 overflow-y-auto max-w-none' : ''}`}>
      {/* Top Header Controls */}
      <div className="glass-card p-4 rounded-3xl border border-darkBorder flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">PlaceX Practice Platform</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Judge0 Sandboxed</span>
            </div>
            <select
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(Number(e.target.value))}
              className="bg-transparent text-slate-100 font-extrabold text-base focus:outline-none cursor-pointer mt-0.5"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id} className="bg-slate-900 text-slate-200">
                  #{q.id}. {q.title} ({q.difficulty})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-slate-900 border border-darkBorder rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="cpp">C++ (GCC)</option>
          </select>

          <button
            onClick={handleResetCode}
            title="Reset to Starter Code"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-darkBorder text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-darkBorder text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleRunCode}
            disabled={running}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-400" />
            <span>Run Code</span>
          </button>

          <button
            onClick={handleSubmitSolution}
            disabled={running}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Solution</span>
          </button>
        </div>
      </div>

      {/* Recommendation Banner */}
      {recommendation?.recommended_question && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-medium">{recommendation.reason}</span>
          </div>
          <button
            onClick={() => setSelectedQuestionId(recommendation.recommended_question.id)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
          >
            <span>Try #{recommendation.recommended_question.id}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Content Area: Problem Panel vs. Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Problem Panel with Tabs */}
        <div className="glass-card p-6 rounded-3xl border border-darkBorder flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Header Tabs */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-darkBorder max-w-xs">
              <button
                onClick={() => setActiveTab('problem')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'problem' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Problem
              </button>
              <button
                onClick={() => setActiveTab('hints')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'hints' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hints ({currentQuestion?.hints?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('editorial')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'editorial' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solution
              </button>
            </div>

            {/* PROBLEM TAB CONTENT */}
            {activeTab === 'problem' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-darkBorder pb-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-100">{currentQuestion?.title}</h3>
                    <span className="text-xs text-slate-500 font-medium">Estimated Time: {currentQuestion?.estimated_time || '20 mins'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      currentQuestion?.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {currentQuestion?.difficulty}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {currentQuestion?.category}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion?.problem_statement}
                </div>

                {/* Visible Testcases */}
                {(currentQuestion?.visible_testcases || []).map((tc: any, i: number) => (
                  <div key={i} className="space-y-1.5 pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Example {i + 1}</h4>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                      <div><strong>Input:</strong> {tc.input}</div>
                      <div><strong>Output:</strong> {tc.expected || tc.output}</div>
                    </div>
                  </div>
                ))}

                {currentQuestion?.constraints && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Constraints</h4>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-mono">
                      {currentQuestion.constraints}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HINTS TAB CONTENT */}
            {activeTab === 'hints' && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progressive Guidance</h4>
                {(currentQuestion?.hints || []).map((h: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1">
                    <div className="font-bold text-blue-400">Hint {idx + 1}</div>
                    <div>{h}</div>
                  </div>
                ))}
              </div>
            )}

            {/* EDITORIAL TAB CONTENT */}
            {activeTab === 'editorial' && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Solution Approach</h4>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {currentQuestion?.editorial || "Review time and space complexity."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Console */}
        <div className="space-y-4">
          {/* Code Editor Container */}
          <div className="glass-card rounded-3xl border border-darkBorder overflow-hidden flex flex-col h-[340px]">
            <div className="px-4 py-2 bg-slate-900 border-b border-darkBorder flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                <span>solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'cpp'}</span>
              </span>
              <span>Monaco Environment Ready</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full flex-1 p-4 bg-darkBg text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Console & Test Results Panel */}
          <div className="glass-card p-5 rounded-3xl border border-darkBorder space-y-3">
            <div className="flex items-center justify-between border-b border-darkBorder pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setConsoleTab('results')}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                    consoleTab === 'results' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Test Results
                </button>
                <button
                  onClick={() => setConsoleTab('history')}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                    consoleTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Submissions ({submissions.length})
                </button>
                <button
                  onClick={() => setConsoleTab('input')}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                    consoleTab === 'input' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Input
                </button>
              </div>

              {result && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  result.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {result.status}
                </span>
              )}
            </div>

            {/* CONSOLE TAB: RESULTS */}
            {consoleTab === 'results' && (
              <div>
                {result ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-900 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {result.stdout || result.stderr || 'No stdout output generated.'}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[10px] text-slate-500">Runtime</div>
                        <div className="text-xs font-bold text-blue-400 mt-0.5">{result.runtime_ms} ms</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[10px] text-slate-500">Estimated Complexity</div>
                        <div className="text-xs font-bold text-emerald-400 mt-0.5">{result.time_complexity || 'O(n)'}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[10px] text-slate-500">Code Quality</div>
                        <div className="text-xs font-bold text-purple-400 mt-0.5">{result.code_quality_score || 85}/100</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-4">
                    Click 'Run Code' for quick testing or 'Submit Solution' for official evaluation.
                  </div>
                )}
              </div>
            )}

            {/* CONSOLE TAB: SUBMISSION HISTORY */}
            {consoleTab === 'history' && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {submissions.length > 0 ? (
                  submissions.map((sub: any) => (
                    <div key={sub.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        {sub.status === 'Accepted' ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-bold text-slate-200">{sub.status}</span>
                        <span className="text-slate-500">({sub.language})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{sub.runtime_ms} ms</span>
                        <span>{sub.submitted_at.slice(11, 16)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-4">No submissions recorded yet.</div>
                )}
              </div>
            )}

            {/* CONSOLE TAB: CUSTOM INPUT */}
            {consoleTab === 'input' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400">Custom Standard Input (stdin)</label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Paste custom input lines here..."
                  rows={3}
                  className="w-full bg-slate-900 border border-darkBorder rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
