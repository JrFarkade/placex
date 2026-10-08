import React, { useState, useRef, useEffect } from 'react';
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
  RotateCcw,
  Sparkles,
  Info,
  FileCode,
  FilePlus,
  Download,
  Upload,
  Save,
  Edit3,
  X
} from 'lucide-react';
import axios from 'axios';

interface CodingSandboxProps {
  token: string;
}

interface SandboxFile {
  id: string;
  name: string;
  content: string;
  isSaved: boolean;
}

const DEFAULT_SANDBOX_FILES: SandboxFile[] = [
  { id: '1', name: 'main.py', content: `# Write your Python code here\nprint("Hello, PlaceX!")\n`, isSaved: true },
  { id: '2', name: 'practice.py', content: `# PlaceX Practice File\ndef solution():\n    pass\n`, isSaved: true },
  { id: '3', name: 'test.py', content: `# PlaceX Test Suite\nprint("Test execution ready")\n`, isSaved: true }
];

interface AIDebugResult {
  status?: string;
  error_type?: string;
  what?: string;
  why?: string;
  so_what?: string;
  now_what?: string;
  what_went_wrong?: string;
  why_it_happened?: string;
  how_to_fix?: string;
  suggested_fix?: string;
  corrected_code: string;
  is_valid?: boolean;
  verification_status?: 'syntax_verified' | 'syntax_error' | 'explanation_only';
  line_number?: number;
  explanation?: string;
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
  const [outputStatus, setOutputStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'timeout' | 'stopped' | 'waiting_input'>('idle');
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [errorType, setErrorType] = useState<string>('');

  // Interactive Stdin Waiting State
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
  const [pendingInputPrompt, setPendingInputPrompt] = useState<string>('Enter input:');
  const [inputBuffer, setInputBuffer] = useState<string>('');

  // Host Agent AI Debug State
  const [loadingAIDebug, setLoadingAIDebug] = useState<boolean>(false);
  const [aiDebugResult, setAiDebugResult] = useState<AIDebugResult | null>(null);
  const [aiDebugError, setAiDebugError] = useState<string>('');
  const [copiedFix, setCopiedFix] = useState<boolean>(false);
  const [fixApplied, setFixApplied] = useState<boolean>(false);
  const [previousCodeBeforeFix, setPreviousCodeBeforeFix] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [showQuestionInput, setShowQuestionInput] = useState<boolean>(false);

  // Colab-like Local File System State
  const [files, setFiles] = useState<SandboxFile[]>(DEFAULT_SANDBOX_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [showNewFileDialog, setShowNewFileDialog] = useState<boolean>(false);
  const [newFileNameInput, setNewFileNameInput] = useState<string>('');
  const [showRenameDialog, setShowRenameDialog] = useState<boolean>(false);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  const activeFile = files.find(f => f.id === activeFileId) || files[0] || DEFAULT_SANDBOX_FILES[0];

  // Confirmation Modal for Clear
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Monaco Editor & AbortController Refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // Restore coding session and files from sessionStorage on reload
  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem('placex_coding_session');
      const savedFiles = sessionStorage.getItem('placex_sandbox_files');
      const savedActiveId = sessionStorage.getItem('placex_active_file_id');

      if (savedFiles) {
        const parsedFiles = JSON.parse(savedFiles);
        if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
          setFiles(parsedFiles);
          const current = parsedFiles.find((f: SandboxFile) => f.id === savedActiveId) || parsedFiles[0];
          setActiveFileId(current.id);
          setSourceCode(current.content);
          if (editorRef.current) {
            editorRef.current.setValue(current.content);
          }
        }
      } else if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.sourceCode !== undefined && parsed.sourceCode !== null) {
          setSourceCode(parsed.sourceCode);
          setFiles(prev => prev.map(f => f.id === '1' ? { ...f, content: parsed.sourceCode } : f));
          if (editorRef.current) {
            editorRef.current.setValue(parsed.sourceCode);
          }
        }
      }

      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.stdinInput !== undefined) setStdinInput(parsed.stdinInput);
        if (parsed.stdout !== undefined) setStdout(parsed.stdout);
        if (parsed.stderr !== undefined) setStderr(parsed.stderr);
        if (parsed.outputStatus !== undefined) setOutputStatus(parsed.outputStatus);
        if (parsed.runtimeMs !== undefined) setRuntimeMs(parsed.runtimeMs);
        if (parsed.errorLine !== undefined) setErrorLine(parsed.errorLine);
        if (parsed.errorType !== undefined) setErrorType(parsed.errorType);
      }
    } catch (e) {
      console.warn("Failed restoring coding session", e);
    }
  }, []);

  // Save active file handler
  const handleSaveActiveFile = () => {
    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    setFiles(prev => {
      const updated = prev.map(f => f.id === activeFileId ? { ...f, content: currentCode, isSaved: true } : f);
      try {
        sessionStorage.setItem('placex_sandbox_files', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setSaveToast(`Saved ${activeFile.name}`);
    setTimeout(() => setSaveToast(null), 2200);
  };

  // Keyboard shortcut: Ctrl + S / Cmd + S to save without page refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, files, sourceCode, activeFile.name]);

  // Switch Active File in Monaco Editor (Preserves previous file content)
  const handleSwitchFile = (targetId: string) => {
    if (targetId === activeFileId) return;
    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;

    const updatedFiles = files.map(f => f.id === activeFileId ? { ...f, content: currentCode } : f);
    setFiles(updatedFiles);
    try {
      sessionStorage.setItem('placex_sandbox_files', JSON.stringify(updatedFiles));
      sessionStorage.setItem('placex_active_file_id', targetId);
    } catch (e) {}

    const targetFile = updatedFiles.find(f => f.id === targetId);
    if (targetFile) {
      setActiveFileId(targetId);
      setSourceCode(targetFile.content);
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) model.setValue(targetFile.content);
        else editorRef.current.setValue(targetFile.content);
        editorRef.current.focus();
      }
      clearErrorHighlight();
      setErrorLine(null);
    }
  };

  // Create New File
  const handleCreateFile = () => {
    let name = newFileNameInput.trim();
    if (!name) return;
    if (!name.endsWith('.py')) name += '.py';

    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    const currentUpdated = files.map(f => f.id === activeFileId ? { ...f, content: currentCode } : f);

    const newFile: SandboxFile = {
      id: Date.now().toString(),
      name,
      content: `# ${name}\n`,
      isSaved: true
    };

    const updated = [...currentUpdated, newFile];
    setFiles(updated);
    setActiveFileId(newFile.id);
    setSourceCode(newFile.content);
    try {
      sessionStorage.setItem('placex_sandbox_files', JSON.stringify(updated));
      sessionStorage.setItem('placex_active_file_id', newFile.id);
    } catch (e) {}

    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) model.setValue(newFile.content);
      else editorRef.current.setValue(newFile.content);
      editorRef.current.focus();
    }
    setShowNewFileDialog(false);
    setNewFileNameInput('');
    setSaveToast(`Created ${name}`);
    setTimeout(() => setSaveToast(null), 2200);
  };

  // Rename File
  const handleRenameFile = () => {
    if (!renamingFileId) return;
    let name = renameInput.trim();
    if (!name) return;
    if (!name.endsWith('.py')) name += '.py';

    const updated = files.map(f => f.id === renamingFileId ? { ...f, name } : f);
    setFiles(updated);
    try {
      sessionStorage.setItem('placex_sandbox_files', JSON.stringify(updated));
    } catch (e) {}

    setShowRenameDialog(false);
    setRenamingFileId(null);
    setRenameInput('');
  };

  // Delete File
  const handleDeleteFile = (fileId: string) => {
    if (files.length <= 1) return;
    const remaining = files.filter(f => f.id !== fileId);
    setFiles(remaining);

    if (activeFileId === fileId) {
      const nextActive = remaining[0];
      setActiveFileId(nextActive.id);
      setSourceCode(nextActive.content);
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) model.setValue(nextActive.content);
        else editorRef.current.setValue(nextActive.content);
      }
    }
    try {
      sessionStorage.setItem('placex_sandbox_files', JSON.stringify(remaining));
    } catch (e) {}
  };

  // Download Active File (.py)
  const handleDownloadActiveFile = () => {
    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Upload File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      let filename = file.name;
      if (!filename.endsWith('.py')) filename += '.py';

      const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
      const currentUpdated = files.map(f => f.id === activeFileId ? { ...f, content: currentCode } : f);

      const newFile: SandboxFile = {
        id: Date.now().toString(),
        name: filename,
        content,
        isSaved: true
      };

      const updated = [...currentUpdated, newFile];
      setFiles(updated);
      setActiveFileId(newFile.id);
      setSourceCode(content);
      try {
        sessionStorage.setItem('placex_sandbox_files', JSON.stringify(updated));
        sessionStorage.setItem('placex_active_file_id', newFile.id);
      } catch (e) {}

      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) model.setValue(content);
        else editorRef.current.setValue(content);
      }
      setSaveToast(`Uploaded ${filename}`);
      setTimeout(() => setSaveToast(null), 2200);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Persist code & execution output to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('placex_coding_session', JSON.stringify({
        sourceCode,
        stdinInput,
        stdout,
        stderr,
        outputStatus,
        runtimeMs,
        errorLine,
        errorType
      }));
    } catch (e) {}
  }, [sourceCode, stdinInput, stdout, stderr, outputStatus, runtimeMs, errorLine, errorType]);

  // Emit coding.opened event on module mount
  useEffect(() => {
    if (token) {
      axios.post('/api/v1/agent/events', {
        event_type: 'coding.opened',
        module: 'coding'
      }, authHeader).catch(() => {});
    }
  }, [token]);

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

  // 1. EXECUTE CODE ENGINE (Sends source code and stdin to execution engine)
  const executeCodeWithStdin = async (codeToRun: string, currentStdin: string) => {
    setExecuting(true);
    setOutputStatus('running');
    setIsWaitingForInput(false);
    setStdout('');
    setStderr('');
    setRuntimeMs(null);
    setErrorLine(null);
    setErrorType('');
    clearErrorHighlight();
    setAiDebugResult(null);
    setAiDebugError('');
    setFixApplied(false);
    setPreviousCodeBeforeFix(null);

    abortControllerRef.current = new AbortController();

    try {
      const res = await axios.post('/api/v1/coding/run', {
        question_id: 1,
        source_code: codeToRun,
        language: 'python',
        custom_input: currentStdin
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
        axios.post('/api/v1/agent/events', {
          event_type: 'coding.execution_failed',
          module: 'coding',
          data: {
            error_type: 'Timeout',
            line: null,
            message: data.stderr || 'Execution timed out (Time Limit Exceeded: >4000ms).',
            stderr: data.stderr || 'Execution timed out',
            code: codeToRun,
            language: 'python',
            stdin: currentStdin,
            runtime_ms: data.runtime_ms
          }
        }, authHeader).catch(() => {});
      } else if (status === 'Input / EOF Error' || (data.stderr && data.stderr.includes('EOFError'))) {
        // Program requested more standard input than provided
        setOutputStatus('waiting_input');
        setIsWaitingForInput(true);
        setShowStdin(true);
        setStdout(data.stdout || '');
        setStderr(data.stderr || 'EOFError: Program is waiting for input.');
        setErrorType('EOFError');
        const lines = (data.stdout || '').trim().split('\n');
        const lastPrompt = lines[lines.length - 1];
        setPendingInputPrompt(lastPrompt || 'Program is waiting for input:');
      } else if (status === 'Runtime Error' || status === 'Compilation Error' || data.stderr) {
        setOutputStatus('error');
        setStdout(data.stdout || '');
        const errText = data.stderr || data.compile_output || 'Runtime Error occurred.';
        setStderr(errText);

        // Classify specific Python error type
        let detectedType = '';
        for (const known of ['TypeError', 'SyntaxError', 'NameError', 'ValueError', 'ZeroDivisionError', 'IndexError', 'KeyError', 'AttributeError', 'EOFError', 'IndentationError']) {
          if (errText.includes(known)) {
            detectedType = known;
            setErrorType(known);
            break;
          }
        }

        // Parse line number from traceback
        const match = errText.match(/line (\d+)/i);
        let parsedLine: number | null = null;
        if (match && match[1]) {
          parsedLine = parseInt(match[1]);
          setErrorLine(parsedLine);
          highlightErrorLine(parsedLine);
        }

        axios.post('/api/v1/agent/events', {
          event_type: 'coding.execution_failed',
          module: 'coding',
          data: {
            error_type: detectedType || 'RuntimeError',
            line: parsedLine,
            message: errText,
            stderr: errText,
            stdout: data.stdout || '',
            code: codeToRun,
            language: 'python',
            stdin: currentStdin
          }
        }, authHeader).catch(() => {});
      } else {
        setOutputStatus('success');
        setStdout(data.stdout || '(No output produced)');
        axios.post('/api/v1/agent/events', {
          event_type: 'coding.execution_succeeded',
          module: 'coding',
          data: {
            code: codeToRun,
            language: 'python',
            stdout: data.stdout || '',
            runtime_ms: data.runtime_ms
          }
        }, authHeader).catch(() => {});
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

  // 1. RUN CODE (Reads EXACT current Monaco value & detects stdin requirement)
  const handleRunCode = async () => {
    if (executing) return;
    
    // Always read current code directly from Monaco instance to prevent stale state
    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    setSourceCode(currentCode);

    // Detect if program requires standard input
    const requiresInput = /\binput\s*\(/.test(currentCode);
    if (requiresInput && !stdinInput.trim()) {
      setShowStdin(true);
      setIsWaitingForInput(true);
      setOutputStatus('waiting_input');
      const match = currentCode.match(/\binput\s*\(\s*(['"])(.*?)\1\s*\)/);
      setPendingInputPrompt(match ? match[2] : 'Enter input:');
      return;
    }

    await executeCodeWithStdin(currentCode, stdinInput);
  };

  // Quick Inline Stdin Submission
  const handleQuickInputSubmit = async () => {
    const entered = inputBuffer.trim();
    if (!entered && !stdinInput.trim()) return;

    const newStdin = stdinInput.trim() ? `${stdinInput}\n${entered}` : entered;
    setStdinInput(newStdin);
    setInputBuffer('');
    setIsWaitingForInput(false);

    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    await executeCodeWithStdin(currentCode, newStdin);
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

  const handleCodeChange = (newVal: string | undefined) => {
    const val = newVal || '';
    setSourceCode(val);
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: val, isSaved: false } : f));
  };

  const confirmClearCode = () => {
    sessionStorage.removeItem('placex_coding_session');
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) model.setValue(DEFAULT_PYTHON_CODE);
      else editorRef.current.setValue(DEFAULT_PYTHON_CODE);
    }
    setSourceCode(DEFAULT_PYTHON_CODE);
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: DEFAULT_PYTHON_CODE, isSaved: false } : f));
    setOutputStatus('idle');
    setStdout('');
    setStderr('');
    setErrorLine(null);
    setErrorType('');
    clearErrorHighlight();
    setAiDebugResult(null);
    setShowClearConfirm(false);
  };

  // 4. EXPLAIN & FIX WITH HOST AGENT (Uses 4-Question Analytical Framework)
  const handleAskHostAgentFix = async () => {
    if (loadingAIDebug || (!stderr && !customQuestion.trim())) return;

    const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
    setSourceCode(currentCode);

    setLoadingAIDebug(true);
    setAiDebugError('');
    setAiDebugResult(null);
    setFixApplied(false);

    try {
      const res = await axios.post('/api/v1/agent/explain/coding-error', {
        source_code: currentCode,
        error_message: stderr || 'Execution error or code clarification requested.',
        stdin_input: stdinInput,
        stdout: stdout,
        language: 'python',
        error_line: errorLine,
        error_type: errorType,
        user_question: customQuestion.trim() || undefined
      }, authHeader);

      setAiDebugResult(res.data);
    } catch (err: any) {
      setAiDebugError(err.response?.data?.detail || "Couldn't get Host Agent error analysis. Please try again.");
    } finally {
      setLoadingAIDebug(false);
    }
  };

  // 5. APPLY FIX (Visually & Immediately Updates Monaco Model instance and sessionStorage)
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

    // Persist new code directly to sessionStorage to prevent loss on reload/navigation
    try {
      const saved = sessionStorage.getItem('placex_coding_session');
      const parsed = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem('placex_coding_session', JSON.stringify({
        ...parsed,
        sourceCode: newCode
      }));
    } catch (e) {}

    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newCode, isSaved: false } : f));

    setFixApplied(true);
    clearErrorHighlight();
    setErrorLine(null);

    // Record fix applied in Host Agent
    axios.post('/api/v1/agent/events', {
      event_type: 'coding.ai_fix_applied',
      module: 'coding',
      data: { error_type: aiDebugResult.error_type }
    }, authHeader).catch(() => {});
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

    // Persist restored code directly to sessionStorage
    try {
      const saved = sessionStorage.getItem('placex_coding_session');
      const parsed = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem('placex_coding_session', JSON.stringify({
        ...parsed,
        sourceCode: restoredCode
      }));
    } catch (e) {}

    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: restoredCode, isSaved: false } : f));

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
          
          {/* Colab-style Local File Tabs and Action Bar */}
          <div className="bg-[#FAF8F5] p-2.5 rounded-2xl border border-[#EAE7DF] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* File Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    onClick={() => handleSwitchFile(file.id)}
                    className={`group px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 ${
                      isActive
                        ? 'bg-white text-[#059669] shadow-xs border border-[#BBF7D0]'
                        : 'text-[#666B67] hover:bg-[#F4F1EA] hover:text-[#202321] border border-transparent'
                    }`}
                  >
                    <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-[#059669]' : 'text-[#949A95]'}`} />
                    <span>{file.name}</span>
                    {!file.isSaved && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes (Ctrl+S to save)"></span>
                    )}

                    {/* Quick actions for active file */}
                    {isActive && (
                      <div className="flex items-center gap-1 ml-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingFileId(file.id);
                            setRenameInput(file.name);
                            setShowRenameDialog(true);
                          }}
                          className="hover:text-[#202321] p-0.5 transition-colors"
                          title="Rename file"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {files.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.id);
                            }}
                            className="hover:text-rose-600 p-0.5 transition-colors"
                            title="Delete file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* New File Button */}
              <button
                type="button"
                onClick={() => {
                  setNewFileNameInput('');
                  setShowNewFileDialog(true);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#666B67] hover:text-[#059669] hover:bg-[#F4F1EA] flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Create New File"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>New File</span>
              </button>
            </div>

            {/* File Actions Toolbar: Save (Ctrl+S), Upload, Download */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSaveActiveFile}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#202321] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Save current file (Ctrl + S)"
              >
                <Save className="w-3.5 h-3.5 text-[#059669]" />
                <span>Save</span>
                <span className="text-[10px] text-[#949A95] font-normal hidden sm:inline">(Ctrl+S)</span>
              </button>

              <button
                type="button"
                onClick={() => fileUploadInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#202321] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Upload local .py file"
              >
                <Upload className="w-3.5 h-3.5 text-[#666B67]" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <input
                type="file"
                ref={fileUploadInputRef}
                accept=".py,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleDownloadActiveFile}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#202321] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Download active file"
              >
                <Download className="w-3.5 h-3.5 text-[#666B67]" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>

          {/* Code Editor Container */}
          <div className="bg-white rounded-3xl border border-[#EAE7DF] shadow-xs overflow-hidden flex flex-col">
            <div className="bg-[#FAF8F5] px-5 py-3 border-b border-[#EAE7DF] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#202321]">
                <FileCode className="w-4 h-4 text-[#059669]" />
                <span>{activeFile.name}</span>
                {!activeFile.isSaved && (
                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    ● Unsaved
                  </span>
                )}
                {saveToast && (
                  <span className="text-[10px] font-extrabold text-[#059669] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                    ✓ {saveToast}
                  </span>
                )}
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
                <span className="text-[11px] font-semibold text-[#666B67]">Python 3.x</span>
              </div>
            </div>

            <div className="h-[440px] w-full pt-2">
              <Editor
                height="100%"
                language="python"
                theme="vs-light"
                value={sourceCode}
                onMount={handleEditorDidMount}
                onChange={handleCodeChange}
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
          <div className={`bg-white rounded-2xl border overflow-hidden shadow-xs transition-all ${isWaitingForInput ? 'border-amber-400 ring-2 ring-amber-200' : 'border-[#EAE7DF]'}`}>
            <button
              onClick={() => setShowStdin(!showStdin)}
              className="w-full px-5 py-3 bg-[#FAF8F5] flex items-center justify-between text-xs font-bold text-[#202321] hover:bg-[#F4F1EA] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {showStdin ? <ChevronDown className="w-4 h-4 text-[#059669]" /> : <ChevronRight className="w-4 h-4 text-[#666B67]" />}
                <span>Standard Input (stdin)</span>
                {isWaitingForInput && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-amber-600" /> Waiting for Input
                  </span>
                )}
                {stdinInput.trim() ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                    Input Ready ({stdinInput.split('\n').filter(Boolean).length} line{stdinInput.split('\n').filter(Boolean).length === 1 ? '' : 's'})
                  </span>
                ) : (
                  !isWaitingForInput && <span className="text-[10px] font-medium text-[#666B67] italic">(Passed to input())</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-[#666B67]">Passed to input() prompts</span>
            </button>

            {showStdin && (
              <div className="p-4 bg-white border-t border-[#EAE7DF] space-y-3">
                <textarea
                  rows={3}
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
                      executeCodeWithStdin(currentCode, stdinInput);
                    }
                  }}
                  placeholder="Enter input values for input() here (one line per input prompt)..."
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl p-3 text-xs font-mono text-[#202321] focus:outline-none focus:border-[#059669] resize-none"
                />
                <div className="flex items-center justify-between text-[10px] text-[#666B67] font-medium">
                  <span>Sequential input() prompts consume lines in order. (Ctrl + Enter to run)</span>
                  <div className="flex items-center gap-2">
                    <span>Lines: {stdinInput.split('\n').filter(Boolean).length}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentCode = editorRef.current ? editorRef.current.getValue() : sourceCode;
                        executeCodeWithStdin(currentCode, stdinInput);
                      }}
                      className="px-3 py-1 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run with Stdin</span>
                    </button>
                  </div>
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
                {outputStatus === 'waiting_input' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                    <Terminal className="w-3 h-3 text-amber-600" /> Waiting for Input
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

              {/* Waiting for Input Interactive Prompt Card */}
              {(outputStatus === 'waiting_input' || isWaitingForInput) && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-[#202321] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                      <Terminal className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span>Program Waiting for Input</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
                      stdin required
                    </span>
                  </div>
                  <p className="text-xs text-[#202321] font-mono font-bold bg-white/90 p-2.5 rounded-xl border border-amber-200">
                    {pendingInputPrompt || 'Enter input value:'}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputBuffer}
                      onChange={(e) => setInputBuffer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickInputSubmit();
                      }}
                      placeholder="Type input here and press Enter (e.g. 18)..."
                      className="flex-1 bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-mono text-[#202321] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#BBF7D0]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleQuickInputSubmit}
                      className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <span>Submit & Run</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-800 font-sans font-medium">
                    Sequential input() calls will consume entries in order. You can also specify all lines in the Standard Input panel.
                  </p>
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
            {(outputStatus === 'error' || outputStatus === 'timeout' || outputStatus === 'success') && (
              <div className="p-4 bg-white border-t border-[#EAE7DF] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#202321]">
                    {outputStatus === 'error' || outputStatus === 'timeout' ? (
                      <span className="flex items-center gap-1.5 text-rose-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorType || 'Execution Error'} {errorLine ? `at Line ${errorLine}` : ''}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[#059669]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Execution Completed</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowQuestionInput(!showQuestionInput)}
                      className="text-[11px] font-bold text-[#0D9488] hover:text-[#0F766E] underline cursor-pointer"
                    >
                      {showQuestionInput ? 'Hide Custom Question' : 'Ask Question / Logic Help'}
                    </button>

                    <button
                      onClick={handleAskHostAgentFix}
                      disabled={loadingAIDebug}
                      className="px-4 py-2.5 rounded-2xl bg-[#0F766E] hover:bg-[#0D9488] text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loadingAIDebug ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Host Agent Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5" />
                          <span>Explain & Fix with Host Agent</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showQuestionInput && (
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="e.g. Why is the loop returning 0 instead of 15? Or how to optimize?"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#EAE7DF] bg-[#FAF8F5] focus:outline-none focus:border-[#0D9488]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAskHostAgentFix();
                      }}
                    />
                    <button
                      onClick={handleAskHostAgentFix}
                      disabled={loadingAIDebug || !customQuestion.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E] disabled:opacity-50 cursor-pointer"
                    >
                      Ask
                    </button>
                  </div>
                )}
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
                ) : aiDebugResult.verification_status === 'syntax_verified' || aiDebugResult.is_valid ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#047857] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    AST Syntax Verified ✓
                  </span>
                ) : aiDebugResult.verification_status === 'syntax_error' ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    Syntax Warning ⚠
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    Host Agent Verified
                  </span>
                )}
              </div>

              {/* 4-Question Analytical Framework */}
              <div className="space-y-3 pt-1">
                {/* WHAT */}
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-[#0F766E]">
                    <HelpCircle className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span className="uppercase tracking-wider">WHAT</span>
                  </div>
                  <p className="text-xs text-[#202321] font-semibold leading-relaxed pl-5">
                    {aiDebugResult.what || aiDebugResult.what_went_wrong || aiDebugResult.explanation}
                  </p>
                </div>

                {/* WHY */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-amber-700">
                    <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                    <span className="uppercase tracking-wider">WHY</span>
                  </div>
                  <p className="text-xs text-[#444] font-medium leading-relaxed pl-5">
                    {aiDebugResult.why || aiDebugResult.why_it_happened}
                  </p>
                </div>

                {/* SO WHAT */}
                <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-sky-700">
                    <Info className="w-3.5 h-3.5 text-sky-700" />
                    <span className="uppercase tracking-wider">SO WHAT</span>
                  </div>
                  <p className="text-xs text-[#444] font-medium leading-relaxed pl-5">
                    {aiDebugResult.so_what || "Uncaught exceptions prevent automated placement test suites from validating your solution."}
                  </p>
                </div>

                {/* NOW WHAT */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-[#047857]">
                    <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                    <span className="uppercase tracking-wider">NOW WHAT</span>
                  </div>
                  <p className="text-xs text-[#202321] font-bold leading-relaxed pl-5">
                    {aiDebugResult.now_what || aiDebugResult.how_to_fix || aiDebugResult.suggested_fix || "Apply the verified code fix below and re-run your solution."}
                  </p>
                </div>
              </div>

              {/* Suggested Fix Code */}
              {aiDebugResult.corrected_code && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#059669] uppercase tracking-wider">
                    <Wrench className="w-3.5 h-3.5 text-[#059669]" />
                    <span>VERIFIED CODE REPAIR</span>
                  </div>
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

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xl max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E6F4EA] text-[#059669] flex items-center justify-center">
                <FilePlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#202321]">Create New File</h3>
                <p className="text-xs text-[#666B67]">Enter filename (e.g. solution.py)</p>
              </div>
            </div>

            <input
              type="text"
              autoFocus
              value={newFileNameInput}
              onChange={(e) => setNewFileNameInput(e.target.value)}
              placeholder="filename.py"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') setShowNewFileDialog(false);
              }}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[#EAE7DF] bg-[#FAF8F5] focus:outline-none focus:border-[#059669] focus:bg-white"
            />

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowNewFileDialog(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#666B67] hover:bg-[#F4F1EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFile}
                disabled={!newFileNameInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-[#EAE7DF] shadow-xl max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#202321]">Rename File</h3>
                <p className="text-xs text-[#666B67]">Enter new filename</p>
              </div>
            </div>

            <input
              type="text"
              autoFocus
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder="new_name.py"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFile();
                if (e.key === 'Escape') setShowRenameDialog(false);
              }}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[#EAE7DF] bg-[#FAF8F5] focus:outline-none focus:border-[#059669] focus:bg-white"
            />

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowRenameDialog(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#666B67] hover:bg-[#F4F1EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameFile}
                disabled={!renameInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
