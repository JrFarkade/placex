import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Code2, 
  Play, 
  Send, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database, 
  Bookmark, 
  BookmarkCheck, 
  Lightbulb, 
  FileCode, 
  Sparkles, 
  Search, 
  Filter, 
  BarChart3, 
  History, 
  ListFilter,
  Check,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface CodingSandboxProps {
  token: string;
}

export const CodingSandbox: React.FC<CodingSandboxProps> = ({ token }) => {
  // Navigation View State: 'workspace' | 'questions' | 'recommended' | 'submissions' | 'stats'
  const [activeTab, setActiveTab] = useState<'workspace' | 'questions' | 'recommended' | 'submissions' | 'stats'>('workspace');

  // Question State
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Editor State
  const [language, setLanguage] = useState<'python' | 'javascript' | 'cpp'>('python');
  const [sourceCode, setSourceCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Execution & Output State
  const [executing, setExecuting] = useState(false);
  const [executingSubmit, setExecutingSubmit] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<'output' | 'tests' | 'custom'>('output');

  // Submission & Stats State
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  // Hints & Editorial State
  const [showHint, setShowHint] = useState(false);
  const [activeHintIndex, setActiveHintIndex] = useState(0);
  const [showEditorial, setShowEditorial] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // 1. Initial Load: Fetch questions list, recommendation, stats, & submission history
  useEffect(() => {
    fetchQuestions();
    fetchRecommendation();
    fetchStats();
    fetchSubmissions();
  }, [token]);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('/api/v1/coding/questions', {
        ...authHeader,
        params: {
          search: searchQuery,
          difficulty: selectedDifficulty !== 'All' ? selectedDifficulty : undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined
        }
      });
      setQuestions(res.data || []);
      if (res.data && res.data.length > 0 && !currentQuestion) {
        loadQuestionDetail(res.data[0].id);
      }
    } catch (e) {
      console.warn("Failed loading questions list");
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [searchQuery, selectedDifficulty, selectedCategory, selectedStatus]);

  const fetchRecommendation = async () => {
    try {
      const res = await axios.get('/api/v1/coding/recommendation', authHeader);
      setRecommendation(res.data);
    } catch (e) {
      console.warn("Failed loading coding recommendation");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/v1/coding/stats', authHeader);
      setUserStats(res.data);
    } catch (e) {
      console.warn("Failed loading coding stats");
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await axios.get('/api/v1/coding/submissions', authHeader);
      setSubmissionHistory(res.data || []);
    } catch (e) {
      console.warn("Failed loading submission history");
    }
  };

  // 2. Load Single Question Details & Draft/Starter Code
  const loadQuestionDetail = async (questionId: number) => {
    setLoadingQuestion(true);
    setExecutionResult(null);
    setShowHint(false);
    setShowEditorial(false);

    try {
      const res = await axios.get(`/api/v1/coding/question/${questionId}`, authHeader);
      const q = res.data;
      setCurrentQuestion(q);

      // Check for saved user draft for this language
      const draftRes = await axios.get('/api/v1/coding/draft', {
        ...authHeader,
        params: { question_id: questionId, language }
      });

      if (draftRes.data?.draft) {
        setSourceCode(draftRes.data.draft);
      } else {
        const starter = q.starter_code?.[language] || getFallbackStarterCode(q, language);
        setSourceCode(starter);
      }
    } catch (e) {
      console.warn("Error fetching question detail");
    } finally {
      setLoadingQuestion(false);
    }
  };

  // Switch Language & Restore Draft or Starter Code
  const handleLanguageChange = async (newLang: 'python' | 'javascript' | 'cpp') => {
    setLanguage(newLang);
    if (!currentQuestion) return;

    try {
      const draftRes = await axios.get('/api/v1/coding/draft', {
        ...authHeader,
        params: { question_id: currentQuestion.id, language: newLang }
      });

      if (draftRes.data?.draft) {
        setSourceCode(draftRes.data.draft);
      } else {
        const starter = currentQuestion.starter_code?.[newLang] || getFallbackStarterCode(currentQuestion, newLang);
        setSourceCode(starter);
      }
    } catch (e) {
      const starter = currentQuestion.starter_code?.[newLang] || getFallbackStarterCode(currentQuestion, newLang);
      setSourceCode(starter);
    }
  };

  // Auto-Save Draft on Code Editor Change
  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setSourceCode(newCode);

    if (currentQuestion) {
      axios.post('/api/v1/coding/draft', {
        question_id: currentQuestion.id,
        language,
        source_code: newCode
      }, authHeader).catch(() => {});
    }
  };

  // Reset Code to Starter Template
  const handleResetCode = () => {
    if (!currentQuestion) return;
    const starter = currentQuestion.starter_code?.[language] || getFallbackStarterCode(currentQuestion, language);
    setSourceCode(starter);
    setShowResetModal(false);
    
    axios.post('/api/v1/coding/draft', {
      question_id: currentQuestion.id,
      language,
      source_code: starter
    }, authHeader).catch(() => {});
  };

  // Toggle Bookmark
  const handleToggleBookmark = async () => {
    if (!currentQuestion) return;
    try {
      const res = await axios.post('/api/v1/coding/bookmark', { question_id: currentQuestion.id }, authHeader);
      setCurrentQuestion((prev: any) => ({ ...prev, is_bookmarked: res.data.is_bookmarked }));
      fetchQuestions();
    } catch (e) {}
  };

  // Run Code (Visible Test / Custom Input Execution)
  const handleRunCode = async () => {
    if (!currentQuestion || executing || executingSubmit) return;
    setExecuting(true);
    setExecutionResult(null);
    setActiveOutputTab('output');

    try {
      const res = await axios.post('/api/v1/coding/run', {
        question_id: currentQuestion.id,
        source_code: sourceCode,
        language,
        custom_input: customInput
      }, authHeader);

      setExecutionResult(res.data);
    } catch (e: any) {
      setExecutionResult({
        status: 'Runtime Error',
        stdout: '',
        stderr: e.response?.data?.detail || 'Execution error occurred.',
        runtime_ms: 0
      });
    } finally {
      setExecuting(false);
    }
  };

  // Submit Solution (Visible + Hidden Testcase Evaluation & Statistics Update)
  const handleSubmitSolution = async () => {
    if (!currentQuestion || executing || executingSubmit) return;
    setExecutingSubmit(true);
    setExecutionResult(null);
    setActiveOutputTab('tests');

    try {
      const res = await axios.post('/api/v1/coding/submit', {
        question_id: currentQuestion.id,
        source_code: sourceCode,
        language
      }, authHeader);

      setExecutionResult(res.data);
      if (res.data.status === 'Accepted') {
        setCurrentQuestion((prev: any) => ({ ...prev, is_solved: true }));
      }
      fetchStats();
      fetchSubmissions();
      fetchQuestions();
    } catch (e: any) {
      setExecutionResult({
        status: 'Error',
        stderr: e.response?.data?.detail || 'Submission failed.',
        passed_testcases: 0,
        total_testcases: 1
      });
    } finally {
      setExecutingSubmit(false);
    }
  };

  // Fallback starter template generator
  function getFallbackStarterCode(q: any, lang: string) {
    if (lang === 'python') return `def solve():\n    # Write your solution here\n    pass\n`;
    if (lang === 'javascript') return `function solve() {\n    // Write your solution here\n}\n`;
    return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
  }

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 text-[#202321] ${isFullscreen ? 'fixed inset-0 z-50 bg-[#F7F4EE] p-6 overflow-y-auto max-w-none' : ''}`}>
      
      {/* 1. Header & Primary Navigation Tabs */}
      <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shadow-xs">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#202321] tracking-tight">Coding Practice Sandbox</h1>
            <p className="text-xs text-[#666B67] font-medium">Real-time compiler sandbox with Judge0 execution & AST complexity analysis</p>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center bg-[#FAF8F5] p-1.5 rounded-2xl border border-[#EAE7DF] gap-1 shadow-xs">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'workspace' ? 'bg-[#059669] text-white shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
            }`}
          >
            Practice Workspace
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'questions' ? 'bg-[#059669] text-white shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
            }`}
          >
            All Problems ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'recommended' ? 'bg-[#059669] text-white shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
            }`}
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'submissions' ? 'bg-[#059669] text-white shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'stats' ? 'bg-[#059669] text-white shadow-xs' : 'text-[#666B67] hover:text-[#202321]'
            }`}
          >
            Dashboard / Stats
          </button>
        </div>
      </div>

      {/* 2. VIEW TAB: PRACTICE WORKSPACE */}
      {activeTab === 'workspace' && currentQuestion && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Problem Details, Examples, Hints, Editorial */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6 flex flex-col justify-between max-h-[850px] overflow-y-auto">
            <div className="space-y-6">
              
              {/* Question Header & Selector Dropdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      currentQuestion.difficulty === 'Easy' ? 'bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]' :
                      currentQuestion.difficulty === 'Medium' ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]' :
                      'bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3]'
                    }`}>
                      {currentQuestion.difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#666B67]">
                      {currentQuestion.category}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleBookmark}
                    className="p-2 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] transition-all cursor-pointer"
                    title="Bookmark Problem"
                  >
                    {currentQuestion.is_bookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-[#059669]" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-[#949A95]" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-[#202321]">{currentQuestion.title}</h2>
                  {currentQuestion.is_solved && (
                    <span className="flex items-center gap-1 text-xs font-extrabold text-[#059669]">
                      <CheckCircle2 className="w-4 h-4" /> Solved
                    </span>
                  )}
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-[#949A95] uppercase tracking-wider">Problem Description</h3>
                <p className="text-xs sm:text-sm text-[#525753] font-medium leading-relaxed whitespace-pre-line">
                  {currentQuestion.problem_statement}
                </p>
              </div>

              {/* Input / Output Formats & Constraints */}
              {(currentQuestion.input_format || currentQuestion.constraints) && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-2 text-xs">
                  {currentQuestion.input_format && (
                    <div>
                      <strong className="text-[#202321] block font-bold">Input Format:</strong>
                      <code className="text-[#525753] font-semibold">{currentQuestion.input_format}</code>
                    </div>
                  )}
                  {currentQuestion.constraints && (
                    <div className="pt-1">
                      <strong className="text-[#202321] block font-bold">Constraints:</strong>
                      <code className="text-[#525753] font-semibold whitespace-pre-line">{currentQuestion.constraints}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Hints Accordion */}
              {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#F4F1EA]">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-2 text-xs font-extrabold text-[#0284C7] hover:text-[#0369A1] cursor-pointer"
                  >
                    <Lightbulb className="w-4 h-4 text-[#0284C7]" />
                    <span>{showHint ? 'Hide Hints' : `Show Hints (${currentQuestion.hints.length})`}</span>
                  </button>

                  {showHint && (
                    <div className="p-4 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] text-xs text-[#0369A1] font-medium space-y-2">
                      <p>{currentQuestion.hints[activeHintIndex]}</p>
                      {currentQuestion.hints.length > 1 && (
                        <div className="flex gap-2 pt-1">
                          {currentQuestion.hints.map((_: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setActiveHintIndex(idx)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                activeHintIndex === idx ? 'bg-[#0284C7] text-white' : 'bg-white text-[#0284C7]'
                              }`}
                            >
                              Hint {idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Solution / Editorial */}
              {currentQuestion.editorial && (
                <div className="space-y-2 pt-2 border-t border-[#F4F1EA]">
                  <button
                    onClick={() => setShowEditorial(!showEditorial)}
                    className="flex items-center gap-2 text-xs font-extrabold text-[#059669] hover:text-[#047857] cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-[#059669]" />
                    <span>{showEditorial ? 'Hide Editorial Approach' : 'View Editorial Approach'}</span>
                  </button>

                  {showEditorial && (
                    <div className="p-4 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-xs text-[#047857] font-medium whitespace-pre-line leading-relaxed">
                      {currentQuestion.editorial}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Switch to next problem */}
            <div className="pt-4 border-t border-[#F4F1EA] flex justify-between items-center text-xs font-bold text-[#666B67]">
              <span>Problem #{currentQuestion.id} of {questions.length}</span>
              <button
                onClick={() => {
                  const nextId = (currentQuestion.id % questions.length) + 1;
                  loadQuestionDetail(nextId);
                }}
                className="flex items-center gap-1 text-[#059669] hover:text-[#047857] cursor-pointer"
              >
                <span>Next Problem</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Monaco Editor, Controls, & Execution Console */}
          <div className="lg:col-span-7 space-y-4 flex flex-col">
            
            {/* Editor Action Bar */}
            <div className="bg-white p-4 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-wrap items-center justify-between gap-3">
              
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#949A95] uppercase">Language:</span>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as any)}
                  className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-3.5 py-2 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] cursor-pointer"
                >
                  <option value="python">Python (3.8+)</option>
                  <option value="javascript">JavaScript (Node.js)</option>
                  <option value="cpp">C++ (GCC)</option>
                </select>
              </div>

              {/* Execution Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowResetModal(true)}
                  className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
                  title="Reset to Starter Template"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={handleRunCode}
                  disabled={executing || executingSubmit}
                  className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 text-[#059669] fill-[#059669]" />
                  <span>{executing ? 'Running...' : 'Run Code'}</span>
                </button>

                <button
                  onClick={handleSubmitSolution}
                  disabled={executing || executingSubmit}
                  className="px-5 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 fill-white" />
                  <span>{executingSubmit ? 'Submitting...' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>

            {/* MONACO CODE EDITOR CONTAINER */}
            <div className="rounded-3xl border border-[#333734] overflow-hidden bg-[#1E1E1E] shadow-lg h-[420px]">
              <Editor
                height="100%"
                language={language === 'cpp' ? 'cpp' : language}
                theme="vs-dark"
                value={sourceCode}
                onChange={handleEditorChange}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: 'on',
                  folding: true,
                  renderLineHighlight: 'all'
                }}
              />
            </div>

            {/* OUTPUT & TEST RESULTS CONSOLE */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-4">
              
              {/* Output Tab Selector */}
              <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
                <div className="flex items-center gap-3 text-xs font-extrabold">
                  <button
                    onClick={() => setActiveOutputTab('output')}
                    className={`cursor-pointer ${activeOutputTab === 'output' ? 'text-[#059669] border-b-2 border-[#059669] pb-1' : 'text-[#666B67]'}`}
                  >
                    Console Output
                  </button>
                  <button
                    onClick={() => setActiveOutputTab('tests')}
                    className={`cursor-pointer ${activeOutputTab === 'tests' ? 'text-[#059669] border-b-2 border-[#059669] pb-1' : 'text-[#666B67]'}`}
                  >
                    Test Evaluation
                  </button>
                  <button
                    onClick={() => setActiveOutputTab('custom')}
                    className={`cursor-pointer ${activeOutputTab === 'custom' ? 'text-[#059669] border-b-2 border-[#059669] pb-1' : 'text-[#666B67]'}`}
                  >
                    Custom Input
                  </button>
                </div>

                {executionResult && (
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className={`px-2.5 py-0.5 rounded-full ${
                      executionResult.status === 'Accepted' ? 'bg-[#E6F4EA] text-[#047857]' : 'bg-rose-50 text-rose-600'
                    }`}>
                      Status: {executionResult.status}
                    </span>
                    {executionResult.runtime_ms !== undefined && (
                      <span className="text-[#666B67]">Runtime: {executionResult.runtime_ms} ms</span>
                    )}
                  </div>
                )}
              </div>

              {/* Console Output Panel */}
              {activeOutputTab === 'output' && (
                <div className="space-y-2">
                  {executionResult ? (
                    <div className="space-y-2 font-mono text-xs">
                      {executionResult.stdout && (
                        <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-[#202321] whitespace-pre-wrap">
                          <strong className="text-[#059669] block mb-1 font-sans">stdout:</strong>
                          {executionResult.stdout}
                        </div>
                      )}
                      {executionResult.stderr && (
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 whitespace-pre-wrap">
                          <strong className="text-rose-800 block mb-1 font-sans">stderr / error:</strong>
                          {executionResult.stderr}
                        </div>
                      )}
                      {executionResult.time_complexity && (
                        <div className="flex gap-4 pt-2 text-[11px] font-sans text-[#666B67] font-bold">
                          <span>Estimated Time Complexity: <strong className="text-[#202321]">{executionResult.time_complexity}</strong></span>
                          <span>Estimated Space Complexity: <strong className="text-[#202321]">{executionResult.space_complexity}</strong></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#949A95] font-medium py-4 text-center">
                      Click <strong className="text-[#202321]">Run Code</strong> or <strong className="text-[#059669]">Submit Solution</strong> to see real Judge0 execution results.
                    </div>
                  )}
                </div>
              )}

              {/* Test Evaluation Panel */}
              {activeOutputTab === 'tests' && (
                <div className="space-y-3 text-xs font-medium">
                  {executionResult?.passed_testcases !== undefined ? (
                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[#202321]">Tests Passed:</span>
                        <span className="text-[#059669]">{executionResult.passed_testcases} / {executionResult.total_testcases}</span>
                      </div>
                      <div className="w-full bg-[#EAE7DF] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#059669] h-full rounded-full transition-all"
                          style={{ width: `${(executionResult.passed_testcases / Math.max(1, executionResult.total_testcases)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#949A95] font-medium py-4 text-center">
                      Submit your solution to evaluate official visible and hidden test cases.
                    </div>
                  )}
                </div>
              )}

              {/* Custom Input Area */}
              {activeOutputTab === 'custom' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#202321]">Custom STDIN Input:</label>
                  <textarea
                    rows={3}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter custom stdin test arguments..."
                    className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl p-3 text-xs font-mono text-[#202321] focus:outline-none focus:border-[#059669]"
                  ></textarea>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 3. VIEW TAB: ALL QUESTIONS BROWSER */}
      {activeTab === 'questions' && (
        <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          
          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-[#949A95] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coding problems by title or topic..."
                className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#202321] focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div className="sm:col-span-7 flex flex-wrap items-center gap-3">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#202321] focus:outline-none"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#202321] focus:outline-none"
              >
                <option value="All">All Topics</option>
                <option value="SQL">SQL</option>
                <option value="Python">Python</option>
                <option value="Arrays">Arrays</option>
                <option value="Data Analysis">Data Analysis</option>
                <option value="Strings">Strings</option>
                <option value="Stacks">Stacks</option>
                <option value="Trees">Trees</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#202321] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="unsolved">Unsolved</option>
                <option value="solved">Solved</option>
                <option value="bookmarked">Bookmarked</option>
              </select>
            </div>
          </div>

          {/* Question List Table */}
          <div className="overflow-x-auto border border-[#EAE7DF] rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE7DF] text-[11px] font-extrabold text-[#949A95] uppercase tracking-wider">
                  <th className="p-4">Status</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Role Focus</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EA] text-xs font-bold text-[#202321]">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-[#FAF8F5]/80 transition-all">
                    <td className="p-4">
                      {q.is_solved ? (
                        <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-[#EAE7DF] block"></span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-[#202321]">{q.title}</div>
                    </td>
                    <td className="p-4 text-[#666B67]">{q.category}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        q.difficulty === 'Easy' ? 'bg-[#E6F4EA] text-[#047857]' :
                        q.difficulty === 'Medium' ? 'bg-[#FEF3C7] text-[#D97706]' :
                        'bg-[#FFE4E6] text-[#E11D48]'
                      }`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="p-4 text-[#666B67]">
                      {q.role_tags?.join(', ') || 'Software Engineer'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          loadQuestionDetail(q.id);
                          setActiveTab('workspace');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs transition-all cursor-pointer"
                      >
                        Solve Problem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. VIEW TAB: RECOMMENDED FOR YOU */}
      {activeTab === 'recommended' && recommendation && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
            <Sparkles className="w-4 h-4 text-[#059669]" />
            <span>RECOMMENDED FOR YOU</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                recommendation.recommended_question.difficulty === 'Easy' ? 'bg-[#E6F4EA] text-[#047857]' : 'bg-[#FEF3C7] text-[#D97706]'
              }`}>
                {recommendation.recommended_question.difficulty}
              </span>
              <span className="text-xs font-bold text-[#666B67]">{recommendation.recommended_question.category}</span>
            </div>

            <h2 className="text-2xl font-black text-[#202321]">{recommendation.recommended_question.title}</h2>
            <p className="text-sm text-[#525753] font-medium leading-relaxed">
              {recommendation.recommended_question.problem_statement}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-semibold text-[#047857]">
            💡 <strong>Why it's recommended:</strong> {recommendation.reason}
          </div>

          <button
            onClick={() => {
              loadQuestionDetail(recommendation.recommended_question.id);
              setActiveTab('workspace');
            }}
            className="w-full py-4 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
          >
            <span>Start Practice Problem</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. VIEW TAB: SUBMISSIONS HISTORY */}
      {activeTab === 'submissions' && (
        <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-4">
          <h2 className="text-xl font-black text-[#202321]">Submission History</h2>
          
          <div className="overflow-x-auto border border-[#EAE7DF] rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE7DF] text-[11px] font-extrabold text-[#949A95] uppercase tracking-wider">
                  <th className="p-4">Status</th>
                  <th className="p-4">Problem</th>
                  <th className="p-4">Language</th>
                  <th className="p-4">Tests Passed</th>
                  <th className="p-4">Runtime</th>
                  <th className="p-4">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EA] text-xs font-bold text-[#202321]">
                {submissionHistory.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#FAF8F5]/80">
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        sub.status === 'Accepted' ? 'bg-[#E6F4EA] text-[#047857]' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold">{sub.question_title}</td>
                    <td className="p-4 text-[#666B67] capitalize">{sub.language}</td>
                    <td className="p-4">{sub.passed_testcases} / {sub.total_testcases}</td>
                    <td className="p-4">{sub.runtime_ms} ms</td>
                    <td className="p-4 text-[#949A95]">{sub.submitted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VIEW TAB: DASHBOARD / STATS */}
      {activeTab === 'stats' && userStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs text-center space-y-1">
              <div className="text-3xl font-black text-[#059669]">{userStats.solved_count}</div>
              <div className="text-xs font-bold text-[#666B67]">Problems Solved</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs text-center space-y-1">
              <div className="text-3xl font-black text-[#0284C7]">{userStats.accuracy}%</div>
              <div className="text-xs font-bold text-[#666B67]">Accuracy Rate</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs text-center space-y-1">
              <div className="text-3xl font-black text-[#D97706]">{userStats.streak_days} Days</div>
              <div className="text-xs font-bold text-[#666B67]">Active Streak</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs text-center space-y-1">
              <div className="text-3xl font-black text-[#202321]">{userStats.total_submissions}</div>
              <div className="text-xs font-bold text-[#666B67]">Total Submissions</div>
            </div>
          </div>

          {/* Topic Mastery Progress Bars */}
          <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-4">
            <h3 className="text-lg font-black text-[#202321]">Topic Mastery</h3>
            <div className="space-y-4">
              {userStats.topic_mastery?.map((tm: any) => (
                <div key={tm.topic} className="space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between">
                    <span className="text-[#202321]">{tm.topic}</span>
                    <span className="text-[#059669]">{tm.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#EAE7DF]">
                    <div className="bg-[#059669] h-full rounded-full transition-all" style={{ width: `${tm.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Code */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xl max-w-sm w-full space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-[#D97706] mx-auto" />
            <h3 className="text-lg font-black text-[#202321]">Reset Code?</h3>
            <p className="text-xs text-[#666B67] font-medium">
              This will restore your code editor to the initial starter template. Any unsubmitted code will be reset.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#666B67] hover:bg-[#F4F1EA]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetCode}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-700 shadow-xs"
              >
                Reset Code
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
