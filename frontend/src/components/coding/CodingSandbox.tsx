import React, { useState, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { 
  Code2, 
  Play, 
  Square, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Loader2, 
  Terminal, 
  ChevronDown, 
  ChevronRight,
  HelpCircle,
  Wrench,
  BookOpen,
  ArrowRight,
  Bot,
  RotateCcw
} from 'lucide-react';
import axios from 'axios';

interface CodingSandboxProps {
  token: string;
}

interface AIDebugResult {
  status: string;
  error_type?: string;
  what_went_wrong: string;
  why_it_happened: string;
  suggested_fix?: string;
  corrected_code: string;
  is_valid?: boolean;
}

const DEFAULT_PYTHON_CODE = `# Write your Python code here\nprint("Hello, PlaceX!")\n`;

export const CodingSandbox: React.FC<CodingSandboxProps> = ({ token }) => {
  // Editor State
  const [sourceCode, setSourceCode] = useState<string>(DEFAULT_PYTHON_CODE);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [showStdin, setShowStdin] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Execution State
  const [executing, setExecuting] = useState<boolean>(false);
  const [outputStatus, setOutputStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'timeout' | 'stopped'>('idle');
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [errorType, setErrorType] = useState<string>('');

  // Host Agent AI Debug State
  const [loadingAIDebug, setLoadingAIDebug] = useState<boolean>(false);
  const [aiDebugResult, setAiDebugResult] = useState<AIDebugResult | null>(null);
  const [aiDebugError, setAiDebugError] = useState<string>('');
  const [copiedFix, setCopiedFix] = useState<boolean>(false);
  const [fixApplied, setFixApplied] = useState<boolean>(false);
  const [previousCodeBeforeFix, setPreviousCodeBeforeFix] = useState<string | null>(null);

  // Confirmation Modal for Clear
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Monaco Editor & AbortController Refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // Setup Monaco Python Autocomplete & Settings on Editor Mount
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Python Language Autocomplete Provider if not registered
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions = [
          { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'print(value, ...)', range },
          { label: 'input', kind: monaco.languages.CompletionItemKind.Function, insertText: 'input(${1:prompt})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'input(prompt)', range },
          { label: 'int', kind: monaco.languages.CompletionItemKind.Class, insertText: 'int(${1:x})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'int(x)', range },
          { label: 'str', kind: monaco.languages.CompletionItemKind.Class, insertText: 'str(${1:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'str(obj)', range },
          { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${1:sequence})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'len(obj)', range },
          { label: 'range', kind: monaco.languages.CompletionItemKind.Function, insertText: 'range(${1:stop})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'range(stop)', range },
          { label: 'list', kind: monaco.languages.CompletionItemKind.Class, insertText: 'list(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'list(iterable)', range },
          { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'For Loop', range },
          { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'If Statement', range },
          { label: 'try', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Try / Except', range }
        ];

        return { suggestions };
      }
    });
  };

  // Highlight error line in Monaco Editor
  const highlightErrorLine = (line: number) => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(line, 1, line, 1000),
        options: {
          isWholeLine: true,
          className: 'bg-rose-50 border-l-4 border-rose-500',
          glyphMarginClassName: 'text-rose-600 font-bold'
        }
      }
    ]);
  };

  const clearErrorHighlight = () => {
    if (editorRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  };

  const handleJumpToErrorLine = (line: number) => {
    if (!editorRef.current) return;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.focus();
  };

  // 1. RUN CODE (Reads EXACT current Monaco value)
  const handleRunCode = async () => {
    if (executing) return;
    
    // Always read current code directly from Monaco instance to prevent stale state
    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    setSourceCode(currentCode);

    // Auto-open Stdin panel if input() call is present in current code and stdin is empty
    if (currentCode.includes('input(') && !stdinInput.trim()) {
      setShowStdin(true);
    }

    setExecuting(true);
    setOutputStatus('running');
    setStdout('');
    setStderr('');
    setRuntimeMs(null);
    setErrorLine(null);
    setErrorType('');
    clearErrorHighlight();
    setAiDebugResult(null);
    setAiDebugError('');
    setFixApplied(false);

    abortControllerRef.current = new AbortController();

    try {
      const res = await axios.post('/api/v1/coding/run', {
        question_id: 1,
        source_code: currentCode,
        language: 'python',
        custom_input: stdinInput
      }, {
        ...authHeader,
        signal: abortControllerRef.current.signal
      });

      const data = res.data;
      const status = data.status || 'Accepted';
      setRuntimeMs(data.runtime_ms || 0);

      if (status === 'Time Limit Exceeded' || (data.stderr && data.stderr.includes('timed out'))) {
        setOutputStatus('timeout');
        setStderr(data.stderr || 'Execution timed out (Time Limit Exceeded: >4000ms).');
        setErrorType('Timeout');
      } else if (status === 'Runtime Error' || status === 'Compilation Error' || status === 'Input / EOF Error' || data.stderr) {
        setOutputStatus('error');
        setStdout(data.stdout || '');
        const errText = data.stderr || data.compile_output || 'Runtime Error occurred.';
        setStderr(errText);

        // Classify specific Python error type
        for (const known of ['TypeError', 'SyntaxError', 'NameError', 'ValueError', 'ZeroDivisionError', 'IndexError', 'KeyError', 'AttributeError', 'EOFError', 'IndentationError']) {
          if (errText.includes(known)) {
            setErrorType(known);
            break;
          }
        }

        // Parse line number from traceback
        const match = errText.match(/line (\d+)/i);
        if (match && match[1]) {
          const parsedLine = parseInt(match[1]);
          setErrorLine(parsedLine);
          highlightErrorLine(parsedLine);
        }
      } else {
        setOutputStatus('success');
        setStdout(data.stdout || '(No output produced)');
      }
    } catch (err: any) {
      if (axios.isCancel(err)) {
        setOutputStatus('stopped');
        setStderr('Execution stopped by user.');
      } else {
        setOutputStatus('error');
        setStderr(err.response?.data?.detail || 'Execution error occurred on server.');
      }
    } finally {
      setExecuting(false);
      abortControllerRef.current = null;
    }
  };

  // 2. STOP CODE
  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setExecuting(false);
    setOutputStatus('stopped');
    setStderr('Execution stopped.');
  };

  // 3. CLEAR EDITOR
  const handleClearCode = () => {
    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    if (currentCode.trim() && currentCode.trim() !== DEFAULT_PYTHON_CODE.trim()) {
      setShowClearConfirm(true);
    } else {
      confirmClearCode();
    }
  };

  const confirmClearCode = () => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) model.setValue(DEFAULT_PYTHON_CODE);
      else editorRef.current.setValue(DEFAULT_PYTHON_CODE);
    }
    setSourceCode(DEFAULT_PYTHON_CODE);
    setOutputStatus('idle');
    setStdout('');
    setStderr('');
    setErrorLine(null);
    setErrorType('');
    clearErrorHighlight();
    setAiDebugResult(null);
    setShowClearConfirm(false);
  };

  // 4. EXPLAIN & FIX WITH HOST AGENT (Sends EXACT Current Monaco Code)
  const handleAskHostAgentFix = async () => {
    if (loadingAIDebug || !stderr) return;

    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    setSourceCode(currentCode);

    setLoadingAIDebug(true);
    setAiDebugError('');
    setAiDebugResult(null);
    setFixApplied(false);

    try {
      const res = await axios.post('/api/v1/coding/ai-debug', {
        source_code: currentCode,
        error_message: stderr,
        traceback: stderr,
        stdin_input: stdinInput,
        language: 'python'
      }, authHeader);

      setAiDebugResult(res.data);
    } catch (err: any) {
      setAiDebugError(err.response?.data?.detail || "Couldn't get Host Agent error analysis. Please try again.");
    } finally {
      setLoadingAIDebug(false);
    }
  };

  // 5. APPLY FIX (Visually & Immediately Updates Monaco Model instance)
  const handleApplyFix = () => {
    if (!aiDebugResult || !aiDebugResult.corrected_code) return;
    const newCode = aiDebugResult.corrected_code;
    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;

    // Store previous code version for Undo Fix capability
    setPreviousCodeBeforeFix(currentCode);
    setSourceCode(newCode);

    // Update Monaco editor model directly so user sees the change immediately
    if (editorRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (model) {
        model.setValue(newCode);
      } else {
        editor.setValue(newCode);
      }
      editor.focus();
    }

    setFixApplied(true);
    clearErrorHighlight();
    setErrorLine(null);
  };

  // 6. UNDO FIX (Restores previous code version)
  const handleUndoFix = () => {
    if (!previousCodeBeforeFix) return;
    const restoredCode = previousCodeBeforeFix;
    setSourceCode(restoredCode);

    if (editorRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (model) {
        model.setValue(restoredCode);
      } else {
        editor.setValue(restoredCode);
      }
      editor.focus();
    }

    setFixApplied(false);
    setPreviousCodeBeforeFix(null);
  };

  // Copy Fix Code to Clipboard
  const handleCopyFix = () => {
    if (!aiDebugResult || !aiDebugResult.corrected_code) return;
    navigator.clipboard.writeText(aiDebugResult.corrected_code);
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 text-[#202321] ${isFullscreen ? 'fixed inset-0 z-50 bg-[#F7F4EE] p-6 overflow-y-auto max-w-none' : ''}`}>
      
      {/* 1. Header Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center shadow-xs">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#202321] tracking-tight">Coding Sandbox</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#FAF8F5] text-[#059669] border border-[#EAE7DF] uppercase">
                Python 3.x Engine
              </span>
            </div>
            <p className="text-xs text-[#666B67] font-medium">Write Python code with interactive input(), execute in a real sandbox, and analyze errors with PlaceX Host Agent.</p>
          </div>
        </div>

        {/* Primary Actions Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Run Button */}
          <button
            onClick={handleRunCode}
            disabled={executing}
            className="px-5 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {executing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run ▶</span>
              </>
            )}
          </button>

          {/* Stop Button */}
          {executing ? (
            <button
              onClick={handleStopExecution}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop ■</span>
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-[#949A95] font-extrabold text-xs flex items-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Square className="w-4 h-4" />
              <span>Stop ■</span>
            </button>
          )}

          {/* Clear Button */}
          <button
            onClick={handleClearCode}
            disabled={executing}
            className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-[#666B67]" />
            <span>Clear</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CODE EDITOR & INTERACTIVE STDIN */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          
          {/* Code Editor Container */}
          <div className="bg-white rounded-3xl border border-[#EAE7DF] shadow-xs overflow-hidden flex flex-col">
            <div className="bg-[#FAF8F5] px-5 py-3 border-b border-[#EAE7DF] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#202321]">
                <Terminal className="w-4 h-4 text-[#059669]" />
                <span>main.py</span>
              </div>
              <div className="flex items-center gap-3">
                {errorLine && (
                  <button
                    onClick={() => handleJumpToErrorLine(errorLine)}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Line {errorLine} Error</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                <span className="text-[11px] font-semibold text-[#666B67]">Python 3.x Autocomplete</span>
              </div>
            </div>

            <div className="h-[440px] w-full pt-2">
              <Editor
                height="100%"
                language="python"
                theme="vs-light"
                value={sourceCode}
                onMount={handleEditorDidMount}
                onChange={(val) => setSourceCode(val || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'Fira Code, Menlo, Monaco, Consolas, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  insertSpaces: true,
                  lineNumbers: 'on',
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: 'all',
                  smoothScrolling: true,
                  bracketPairColorization: { enabled: true },
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  autoIndent: 'full',
                  tabCompletion: 'on',
                  acceptSuggestionOnEnter: 'on',
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: { other: true, comments: false, strings: false }
                }}
              />
            </div>
          </div>

          {/* Interactive Standard Input (stdin) Box */}
          <div className="bg-white rounded-2xl border border-[#EAE7DF] overflow-hidden shadow-xs">
            <button
              onClick={() => setShowStdin(!showStdin)}
              className="w-full px-5 py-3 bg-[#FAF8F5] flex items-center justify-between text-xs font-bold text-[#202321] hover:bg-[#F4F1EA] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {showStdin ? <ChevronDown className="w-4 h-4 text-[#059669]" /> : <ChevronRight className="w-4 h-4 text-[#666B67]" />}
                <span>Standard Input (stdin)</span>
                {stdinInput.trim() ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                    Input Ready ({stdinInput.split('\n').filter(Boolean).length} line{stdinInput.split('\n').filter(Boolean).length === 1 ? '' : 's'})
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-[#666B67] italic">(Optional)</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-[#666B67]">Passed to input() prompts</span>
            </button>

            {showStdin && (
              <div className="p-4 bg-white border-t border-[#EAE7DF] space-y-2">
                <textarea
                  rows={3}
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  placeholder="Enter input values for input() here (one line per input prompt)..."
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl p-3 text-xs font-mono text-[#202321] focus:outline-none focus:border-[#059669] resize-none"
                />
                <div className="text-[10px] text-[#666B67] font-medium flex items-center justify-between">
                  <span>Sequential input() prompts consume lines from stdin in order.</span>
                  <span>Lines: {stdinInput.split('\n').filter(Boolean).length}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REAL OUTPUT & HOST AGENT ADVICE */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          
          {/* Output Panel Box */}
          <div className="bg-white rounded-3xl border border-[#EAE7DF] shadow-xs flex-1 flex flex-col overflow-hidden min-h-[440px]">
            <div className="bg-[#FAF8F5] px-5 py-3 border-b border-[#EAE7DF] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#202321]">
                <span>OUTPUT</span>
                {outputStatus === 'running' && (
                  <span className="flex items-center gap-1 text-[10px] text-[#059669] font-extrabold">
                    <Loader2 className="w-3 h-3 animate-spin" /> Running...
                  </span>
                )}
                {outputStatus === 'success' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                    Success
                  </span>
                )}
                {(outputStatus === 'error' || outputStatus === 'timeout') && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <span>{errorType || (outputStatus === 'timeout' ? 'Timeout' : 'Error')}</span>
                  </span>
                )}
                {outputStatus === 'stopped' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                    Stopped
                  </span>
                )}
              </div>

              {runtimeMs !== null && (
                <span className="text-[10px] font-mono text-[#666B67] font-semibold">
                  {runtimeMs} ms
                </span>
              )}
            </div>

            {/* Output Display Body */}
            <div className="p-5 flex-1 bg-[#FAF8F5]/60 font-mono text-xs overflow-y-auto max-h-[360px] space-y-3">
              
              {outputStatus === 'idle' && (
                <p className="text-[#949A95] font-sans font-medium italic">Run your Python code to view stdout/stderr output.</p>
              )}

              {outputStatus === 'running' && (
                <div className="flex items-center gap-2 text-[#059669] font-sans font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing Python runtime...</span>
                </div>
              )}

              {outputStatus === 'success' && (
                <pre className="whitespace-pre-wrap text-[#202321] leading-relaxed font-mono select-text">
                  {stdout}
                </pre>
              )}

              {outputStatus === 'timeout' && (
                <div className="space-y-2 text-rose-600 font-mono">
                  <p className="font-bold">Execution timed out.</p>
                  <pre className="whitespace-pre-wrap text-xs text-rose-500">{stderr}</pre>
                </div>
              )}

              {outputStatus === 'stopped' && (
                <p className="text-amber-700 font-mono font-bold">{stderr}</p>
              )}

              {outputStatus === 'error' && (
                <div className="space-y-3">
                  {stdout && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-sans font-bold text-[#666B67] uppercase">Standard Output:</p>
                      <pre className="whitespace-pre-wrap text-[#202321] bg-white p-3 rounded-xl border border-[#EAE7DF]">{stdout}</pre>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-sans font-bold text-rose-600 uppercase">
                        {errorType ? `Python Exception: ${errorType}` : 'Error Traceback:'}
                      </p>
                      {errorLine && (
                        <button
                          onClick={() => handleJumpToErrorLine(errorLine)}
                          className="text-[10px] font-bold text-rose-600 underline hover:text-rose-800 cursor-pointer"
                        >
                          Jump to Line {errorLine}
                        </button>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-rose-600 leading-relaxed select-text font-mono bg-rose-50/50 p-3 rounded-xl border border-rose-200">{stderr}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Output Footer Action: Explain & Fix with Host Agent */}
            {(outputStatus === 'error' || outputStatus === 'timeout') && (
              <div className="p-4 bg-white border-t border-[#EAE7DF] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorType || 'Execution Error'} {errorLine ? `at Line ${errorLine}` : ''}</span>
                </div>

                <button
                  onClick={handleAskHostAgentFix}
                  disabled={loadingAIDebug}
                  className="px-4 py-2.5 rounded-2xl bg-[#0F766E] hover:bg-[#0D9488] text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingAIDebug ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Host Agent Analyzing Error...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5" />
                      <span>Explain & Fix with Host Agent</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* PlaceX Host Agent Structured Advice Card */}
          {aiDebugError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiDebugError}</span>
            </div>
          )}

          {aiDebugResult && (
            <div className="bg-[#FAF8F5] p-6 rounded-3xl border-2 border-[#0D9488] shadow-md space-y-4 transition-all">
              <div className="flex items-center justify-between border-b border-[#EAE7DF] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#202321] tracking-tight">PlaceX Host Agent Guidance</h3>
                    <span className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider">
                      {aiDebugResult.error_type || 'Python Analysis'}
                    </span>
                  </div>
                </div>

                {fixApplied ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#059669] bg-[#E6F4EA] px-2.5 py-1 rounded-full border border-[#BBF7D0]">
                    <CheckCircle2 className="w-3 h-3" /> Fix Applied to Editor
                  </span>
                ) : aiDebugResult.is_valid && (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#047857] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    AST Syntax Verified ✓
                  </span>
                )}
              </div>

              {/* What Went Wrong */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#0D9488]">
                  <HelpCircle className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>WHAT WENT WRONG</span>
                </div>
                <p className="text-[#202321] font-medium leading-relaxed pl-5">
                  {aiDebugResult.what_went_wrong}
                </p>
              </div>

              {/* Why It Happened */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#D97706]">
                  <BookOpen className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>WHY IT HAPPENED</span>
                </div>
                <p className="text-[#525753] font-medium leading-relaxed pl-5">
                  {aiDebugResult.why_it_happened}
                </p>
              </div>

              {/* Suggested Fix Summary & Code */}
              {aiDebugResult.corrected_code && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#059669] uppercase">
                    <Wrench className="w-3.5 h-3.5 text-[#059669]" />
                    <span>SUGGESTED FIX</span>
                  </div>
                  {aiDebugResult.suggested_fix && (
                    <p className="text-xs text-[#202321] font-semibold pl-5 pb-1">
                      {aiDebugResult.suggested_fix}
                    </p>
                  )}
                  <pre className="p-3.5 rounded-2xl bg-[#202321] text-[#6EE7B7] text-xs font-mono overflow-x-auto select-text leading-relaxed border border-[#333]">
                    {aiDebugResult.corrected_code}
                  </pre>
                </div>
              )}

              {/* Action Buttons: Apply Fix, Undo Fix, Copy Code */}
              <div className="flex items-center gap-2.5 pt-2 flex-wrap">
                <button
                  onClick={handleApplyFix}
                  disabled={!aiDebugResult.corrected_code}
                  className="flex-1 py-2.5 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Fix</span>
                </button>

                {fixApplied && previousCodeBeforeFix && (
                  <button
                    onClick={handleUndoFix}
                    className="py-2.5 px-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Restore code before applying fix"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Fix</span>
                  </button>
                )}

                <button
                  onClick={handleCopyFix}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  {copiedFix ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5 text-[#666B67]" />}
                  <span>{copiedFix ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Confirmation Modal for Clear Button */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xl max-w-sm w-full space-y-4 text-center">
            <Trash2 className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-lg font-black text-[#202321]">Clear Code Editor?</h3>
            <p className="text-xs text-[#666B67] font-medium leading-relaxed">
              This will reset the code editor to the default starter code. Any unsaved edits will be cleared.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#666B67] hover:bg-[#F4F1EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearCode}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
              >
                Clear Editor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
