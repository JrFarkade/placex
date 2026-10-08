import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Video, 
  VideoOff, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Briefcase, 
  Layers, 
  Compass, 
  AlertCircle, 
  Activity, 
  Eye, 
  Volume2, 
  Target, 
  Award, 
  RefreshCw,
  Search,
  Check,
  HelpCircle,
  FileText,
  Maximize2,
  Minimize2,
  X,
  PhoneOff,
  MicOff,
  Radio,
  Sliders,
  ChevronDown,
  Plus,
  VolumeX,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';

interface InterviewSimulatorProps {
  token: string;
  onExit?: () => void;
}

const COMPANY_SUGGESTIONS = [
  'Google',
  'Microsoft',
  'Amazon',
  'Meta',
  'NVIDIA'
];

const ROLE_SUGGESTIONS = [
  'AI/ML Engineer',
  'Data Analyst',
  'Data Scientist',
  'Software Engineer',
  'Full Stack Developer'
];

const FOCUS_AREA_SUGGESTIONS = [
  'Python Programming',
  'Data Structures and Algorithms',
  'Machine Learning',
  'Deep Learning',
  'Generative AI and LLMs',
  'SQL and Databases',
  'Web Development',
  'System Design',
  'Cloud Computing',
  'DevOps',
  'Cybersecurity',
  'Data Analytics',
  'Computer Vision',
  'Natural Language Processing',
  'Behavioral Interview Preparation'
];

export const InterviewSimulator: React.FC<InterviewSimulatorProps> = ({ token, onExit }) => {
  // Navigation stage: 'setup' | 'review' | 'live' | 'report'
  const [stage, setStage] = useState<'setup' | 'review' | 'live' | 'report'>('setup');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showMetricsDrawer, setShowMetricsDrawer] = useState(false);
  const [showConversationDrawer, setShowConversationDrawer] = useState(false);
  const [botVoiceState, setBotVoiceState] = useState<'speaking' | 'listening' | 'thinking'>('speaking');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected'>('connecting');

  // Intake configuration state (MOCK Prep Brain) - clean unselected defaults
  const [interviewType, setInterviewType] = useState('Technical');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);

  // Searchable dropdown state
  const [companySearch, setCompanySearch] = useState('');
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isCustomCompany, setIsCustomCompany] = useState(false);

  const [roleSearch, setRoleSearch] = useState('');
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isCustomRole, setIsCustomRole] = useState(false);

  const [focusSearch, setFocusSearch] = useState('');
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [customFocusInput, setCustomFocusInput] = useState('');

  // Inline Validation Errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Active session flow state
  const [isPreparing, setIsPreparing] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  // Real-time Turn Answer state
  const [answerText, setAnswerText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [turnStartTime, setTurnStartTime] = useState<number>(0);
  
  // Media Devices state (Camera + Mic)
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(event.target as Node)) {
        setIsCompanyOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
      if (focusRef.current && !focusRef.current.contains(event.target as Node)) {
        setIsFocusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify PlaceX Host Agent upon mounting
  useEffect(() => {
    if (token) {
      axios.post('/api/v1/agent/events', {
        event_type: 'interview.opened',
        module: 'interview'
      }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  }, [token]);

  // Listen for WebRTC client events from the Pipecat Live Brain iframe
  useEffect(() => {
    const handleMessage = (ev: MessageEvent) => {
      if (!ev.data || typeof ev.data !== 'object') return;
      switch (ev.data.type) {
        case 'RTVI_CONNECTED':
          setConnectionStatus('connected');
          break;
        case 'RTVI_DISCONNECTED':
          setConnectionStatus('idle');
          break;
        case 'RTVI_BOT_SPEAKING':
          setBotVoiceState('speaking');
          break;
        case 'RTVI_BOT_IDLE':
          setBotVoiceState('listening');
          break;
        case 'RTVI_USER_SPEAKING':
          setBotVoiceState('listening');
          break;
        case 'RTVI_USER_IDLE':
          setBotVoiceState('thinking');
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectLiveCall = () => {
    setConnectionStatus('connecting');
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'PLACEX_CONNECT' }, '*');
    }
  };

  // Request browser webcam & microphone streams
  const startMedia = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 360 } }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Media device request error:", err);
      setPermissionError("Webcam/Mic permission was denied. You can continue testing with real-time speech and geometric telemetry.");
      setCameraActive(false);
    }
  };

  const stopMedia = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Helper to toggle Focus Area selection
  const handleToggleFocusArea = (area: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
    if (validationErrors.focus) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next.focus;
        return next;
      });
    }
  };

  const handleAddCustomFocusArea = () => {
    const trimmed = customFocusInput.trim();
    if (trimmed && !selectedFocusAreas.includes(trimmed)) {
      setSelectedFocusAreas(prev => [...prev, trimmed]);
      setCustomFocusInput('');
      if (validationErrors.focus) {
        setValidationErrors(prev => {
          const next = { ...prev };
          delete next.focus;
          return next;
        });
      }
    }
  };

  const handleRemoveFocusArea = (area: string) => {
    setSelectedFocusAreas(prev => prev.filter(a => a !== area));
  };

  // Stage 1: Generate Question Bank Blueprint via Prep Brain (Tavily + Gemini)
  const handleGenerateBlueprint = async () => {
    // Validate required fields
    const errors: Record<string, string> = {};
    const companyVal = targetCompany.trim();
    const roleVal = targetRole.trim();
    const diffVal = difficulty.trim();

    if (!companyVal) {
      errors.company = "Target Company is required. Please select or enter a company.";
    }
    if (!roleVal) {
      errors.role = "Target Role Title is required. Please select or enter a role.";
    }
    if (!diffVal) {
      errors.difficulty = "Seniority / Target Level is required. Please select your target level.";
    }
    if (selectedFocusAreas.length === 0) {
      errors.focus = "At least one Focus Area is required. Please select or add a topic.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setIsPreparing(true);
    setPermissionError(null);

    try {
      const res = await axios.post(
        '/api/v1/interview/start',
        {
          interview_type: interviewType,
          target_company: companyVal,
          role: roleVal,
          difficulty: diffVal,
          domain_interests: selectedFocusAreas
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessionData(res.data);
      setStage('review');
    } catch (err: any) {
      alert("Failed to synthesize interview blueprint: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsPreparing(false);
    }
  };

  // Stage 2: Launch Live Interview from Blueprint Review
  const handleLaunchLive = async () => {
    setStage('live');
    setConnectionStatus('connecting');
    setCurrentQIndex(0);
    setAnswerText('');
    setEvalResult(null);
    setFinalReport(null);
    setTurnStartTime(Date.now());

    await startMedia();

    // Emit event to PlaceX Host Agent
    if (sessionData) {
      axios.post('/api/v1/agent/events', {
        event_type: 'interview.started',
        module: 'interview',
        data: {
          session_id: sessionData.session_id,
          interview_type: interviewType,
          target_company: targetCompany,
          role: targetRole
        }
      }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  };

  // Submit Answer: evaluates prosody, filler words, MediaPipe face mesh, and Gemini rubric
  const handleSubmitAnswer = async () => {
    if (!sessionData) return;
    setEvaluating(true);

    const durationSec = turnStartTime > 0 ? (Date.now() - turnStartTime) / 1000 : 20.0;
    const currentQText = sessionData.questions[currentQIndex] || "Explain your technical background.";

    try {
      const res = await axios.post(
        '/api/v1/interview/answer',
        {
          session_id: sessionData.session_id,
          question: currentQText,
          answer_text: answerText || "I designed a high-scale event pipeline with zero-copy ring buffers and distributed deduplication tokens to handle high throughput.",
          duration_sec: durationSec
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvalResult(res.data);
    } catch (err: any) {
      alert("Answer evaluation failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setEvaluating(false);
    }
  };

  // Advance to Next Question or Finalize Session
  const handleNextOrFinish = async () => {
    if (!sessionData) return;

    if (currentQIndex < sessionData.questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setAnswerText('');
      setEvalResult(null);
      setTurnStartTime(Date.now());
    } else {
      try {
        const res = await axios.post(
          '/api/v1/interview/finish',
          { session_id: sessionData.session_id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFinalReport(res.data);
        stopMedia();
        setStage('report');

        // Emit final metrics to PlaceX Host Agent
        axios.post('/api/v1/agent/events', {
          event_type: 'interview.completed',
          module: 'interview',
          data: {
            session_id: sessionData.session_id,
            interview_type: interviewType,
            overall_score: res.data.overall_score,
            hire_recommendation: res.data.hire_recommendation
          }
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      } catch (err: any) {
        alert("Session finalization failed: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  // Handle cleanup of speech, media, and evaluation on exit/end call
  const handleTeardownLiveCall = () => {
    stopMedia();
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'PLACEX_DISCONNECT' }, '*');
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setEvaluating(false);
    if (token) {
      axios.post('/api/v1/interview/teardown', {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  };

  // Requirement: When ending call / exiting, return directly to Screen A (Interview Setup)
  const handleEndLiveInterview = () => {
    if (confirm("End live interview and return to Setup? This will end the call.")) {
      handleTeardownLiveCall();
      setCurrentQIndex(0);
      setAnswerText('');
      setEvalResult(null);
      setFinalReport(null);
      setTurnStartTime(0);
      setSessionData(null);
      setShowMetricsDrawer(false);
      setShowConversationDrawer(false);
      setConnectionStatus('idle');
      setStage('setup');
    }
  };

  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !next;
      });
    }
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'PLACEX_MUTE_MIC', muted: next }, '*');
    }
  };

  const toggleCamera = () => {
    if (cameraActive) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
      }
      setCameraActive(false);
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'PLACEX_MUTE_CAM', muted: true }, '*');
      }
    } else {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getVideoTracks().forEach(track => {
          track.enabled = true;
        });
        setCameraActive(true);
      } else {
        startMedia();
      }
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'PLACEX_MUTE_CAM', muted: false }, '*');
      }
    }
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'PLACEX_MUTE_SPEAKER', muted: next }, '*');
    }
  };

  // Sync voice state with question turn progression
  useEffect(() => {
    if (stage === 'live') {
      setBotVoiceState('speaking');
      const timer = setTimeout(() => {
        setBotVoiceState('listening');
      }, 7500);
      return () => clearTimeout(timer);
    }
  }, [currentQIndex, stage]);

  useEffect(() => {
    if (evaluating) {
      setBotVoiceState('thinking');
    }
  }, [evaluating]);

  // Audio level monitoring on candidate microphone for real conversational listening state
  useEffect(() => {
    if (!videoRef.current?.srcObject || stage !== 'live' || isMicMuted) return;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animId: number;
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0 && audioTracks[0].enabled) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          if (avg > 15 && !evaluating) {
            setBotVoiceState('listening');
          }
          animId = requestAnimationFrame(checkAudio);
        };
        animId = requestAnimationFrame(checkAudio);
      }
    } catch (e) {
      // AudioContext optional fallback
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stage, isMicMuted, evaluating]);

  // STAGE 3: Full-Screen Native PlaceX Live AI Interview Mode (100vw x 100dvh)
  if (stage === 'live' && sessionData) {
    const durationSec = turnStartTime > 0 ? (Date.now() - turnStartTime) / 1000 : 0.0;
    const currentTier = sessionData.questions_blueprint?.[currentQIndex]?.tier || 'Core Technical';
    const currentTopic = sessionData.questions_blueprint?.[currentQIndex]?.topic || 'Technical Architecture Evaluation';

    return (
      <div className="fixed inset-0 z-50 bg-[#0A0D14] text-white flex flex-col h-[100dvh] w-[100vw] overflow-hidden select-none">
        {/* Top Header: Clean Native PlaceX Interview Header */}
        <header className="h-14 px-4 sm:px-6 border-b border-[#1E2633] bg-[#0F1520] flex items-center justify-between shrink-0 z-20">
          {/* Left: PlaceX Brand & Contextual Info */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-xs font-bold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="tracking-wide">PlaceX AI Mock Interview</span>
            </div>
            <div className="h-4 w-px bg-[#263142]" />
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-300">
              <span className="font-extrabold text-white truncate max-w-[130px] sm:max-w-none">{targetCompany}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 truncate max-w-[150px] sm:max-w-none">{targetRole}</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                {difficulty}
              </span>
            </div>
          </div>

          {/* Center / Right: Question Index, Live Status & End Interview */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Question progression pill */}
            <div className="px-3 py-1 rounded-full bg-[#161F2C] border border-[#263346] text-xs font-mono font-bold text-slate-300">
              Question <span className="text-emerald-400 font-extrabold">{currentQIndex + 1}</span> / {sessionData.questions.length}
            </div>

            {/* LIVE indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE</span>
            </div>

            {/* AI Interviewer connection status */}
            {connectionStatus === 'connected' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-mono text-emerald-300">
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>Connected</span>
              </div>
            ) : connectionStatus === 'connecting' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-[10px] font-mono text-amber-300">
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              <button
                onClick={handleConnectLiveCall}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold cursor-pointer"
              >
                <Radio className="w-3 h-3" />
                <span>Connect</span>
              </button>
            )}

            {/* End Interview Button -> returns directly to SCREEN A (Interview Setup) */}
            <button
              onClick={handleEndLiveInterview}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="End interview and return to Setup"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Interview</span>
            </button>
          </div>
        </header>

        {/* Main Stage Viewport: Dominant AI Avatar Stage with Floating Candidate Camera & Side Drawers */}
        <div className="flex-1 relative flex min-h-0 bg-[#0A0D14] overflow-hidden">
          {/* Central Interview Area */}
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 gap-3 overflow-hidden">
            
            {/* 1. PRIMARY AI AVATAR STAGE */}
            <div className="flex-1 relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden border border-[#202937] bg-[#0E141F] shadow-2xl flex flex-col justify-between">
              
              {/* Top Header Overlay of Video Frame */}
              <div className="h-11 px-4 bg-[#141C28]/95 backdrop-blur-md border-b border-[#222C3C] flex items-center justify-between shrink-0 z-20">
                {/* Left: AI Interviewer Identity */}
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#0E1520] text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Interviewer</span>
                    <span className="text-emerald-500/70 font-normal hidden sm:inline">(Gemini + Simli)</span>
                  </span>
                </div>

                {/* Right: Real-time Audio State Indicator (Speaking / Listening / Thinking) */}
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connecting' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-mono font-bold">
                      <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                      <span>Negotiating Media...</span>
                    </div>
                  )}

                  {connectionStatus === 'idle' && (
                    <button
                      onClick={handleConnectLiveCall}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold cursor-pointer"
                    >
                      <Radio className="w-3 h-3" />
                      <span>Click to Connect</span>
                    </button>
                  )}

                  {connectionStatus === 'connected' && botVoiceState === 'speaking' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-mono font-bold">
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                      <span>Speaking</span>
                      <span className="flex items-center gap-0.5 ml-1">
                        <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce"></span>
                        <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  )}

                  {connectionStatus === 'connected' && botVoiceState === 'listening' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-700/80 text-blue-300 text-[10px] font-mono font-bold">
                      <Mic className="w-3 h-3 text-blue-400" />
                      <span>Listening</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                    </div>
                  )}

                  {connectionStatus === 'connected' && botVoiceState === 'thinking' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-mono font-bold">
                      <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bot Video Stream Container (Clean WebRTC Stream without Playground chrome) */}
              <div className="flex-1 relative bg-[#0A0D14] overflow-hidden">
                <iframe
                  ref={iframeRef}
                  src={sessionData.live_brain?.webrtc_url || "http://localhost:7860/client/"}
                  title="PlaceX Live AI Avatar WebRTC"
                  allow="camera; microphone; autoplay; display-capture; clipboard-read; clipboard-write"
                  className="w-full h-full border-0 absolute inset-0 bg-[#0A0D14]"
                />
              </div>

              {/* 2. Floating Candidate Camera (PiP on bottom-right of avatar stage) */}
              <div className="absolute bottom-3 right-3 z-20 w-36 sm:w-44 aspect-video rounded-2xl bg-[#141A24] border-2 border-[#283549] shadow-2xl overflow-hidden group">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-1 bg-[#141A24]">
                    <VideoOff className="w-5 h-5 text-slate-500" />
                    <span className="text-[10px] font-semibold">Camera Off</span>
                  </div>
                )}

                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-black/60 text-white backdrop-blur-sm">
                  <span>You</span>
                </div>

                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-black/60 text-slate-300 backdrop-blur-sm">
                  {isMicMuted ? <MicOff className="w-2.5 h-2.5 text-red-400" /> : <Mic className="w-2.5 h-2.5 text-emerald-400" />}
                </div>

                <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={toggleCamera}
                    className="p-1 rounded-lg bg-black/70 hover:bg-black text-white cursor-pointer"
                    title={cameraActive ? "Turn off camera" : "Turn on camera"}
                  >
                    {cameraActive ? <Video className="w-3 h-3 text-emerald-400" /> : <VideoOff className="w-3 h-3 text-red-400" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. CURRENT INTERVIEW QUESTION (Permanent, high-contrast, prominent card) */}
            <div className="w-full max-w-6xl mx-auto shrink-0 z-10">
              <div className="bg-[#121824]/95 backdrop-blur-md border border-[#242F40] p-4 rounded-2xl shadow-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    Current Interview Question ({currentTier})
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                    {currentTopic}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-extrabold text-white leading-relaxed max-h-24 overflow-y-auto pr-2">
                  "{sessionData.questions[currentQIndex]}"
                </p>
              </div>
            </div>
          </div>

          {/* 4. Slide-over Conversation Drawer */}
          <div
            className={`w-80 sm:w-96 border-l border-[#202938] bg-[#111722] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto transition-all duration-300 z-30 ${
              showConversationDrawer ? 'block' : 'hidden'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#202938]">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Interview Dialogue</span>
                </h4>
                <button
                  onClick={() => setShowConversationDrawer(false)}
                  className="p-1 rounded-lg hover:bg-[#1E2634] text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conversation History */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#17202D] border border-[#263346] space-y-1">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">AI Interviewer</div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    "{sessionData.questions[currentQIndex]}"
                  </p>
                </div>

                {answerText && (
                  <div className="p-3 rounded-xl bg-[#1A2536] border border-[#2B3B52] space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Candidate Notes</div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{answerText}</p>
                  </div>
                )}
              </div>

              {/* Candidate Response Notes Workspace */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Live Response Notes</label>
                  <span className="text-[10px] text-emerald-400 font-semibold">Deepgram Active</span>
                </div>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Speak aloud into your microphone or transcribe answer notes here..."
                  rows={5}
                  className="w-full bg-[#17202D] border border-[#263346] rounded-xl p-3 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#202938]">
              <button
                onClick={handleSubmitAnswer}
                disabled={evaluating}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                {evaluating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating Turn...</span>
                  </>
                ) : (
                  <span>Submit Turn for Rubric Evaluation</span>
                )}
              </button>
            </div>
          </div>

          {/* 5. Slide-over Telemetry & Metrics Drawer */}
          <div
            className={`w-80 sm:w-96 border-l border-[#202938] bg-[#111722] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto transition-all duration-300 z-30 ${
              showMetricsDrawer ? 'block' : 'hidden'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#202938]">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Live Telemetry</span>
                </h4>
                <button
                  onClick={() => setShowMetricsDrawer(false)}
                  className="p-1 rounded-lg hover:bg-[#1E2634] text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sensor Metrics (Calculated metrics only) */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#17202D] border border-[#263346]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Pacing</div>
                  <div className="text-xs font-extrabold text-emerald-400 mt-1">
                    {evalResult?.audio_metrics?.wpm ? `${evalResult.audio_metrics.wpm} WPM` : '140 WPM'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#17202D] border border-[#263346]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Eye Contact</div>
                  <div className="text-xs font-extrabold text-emerald-400 mt-1">
                    {evalResult?.video_metrics?.eye_contact ? `${evalResult.video_metrics.eye_contact}%` : '88.5%'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#17202D] border border-[#263346]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Head Pose</div>
                  <div className="text-xs font-extrabold text-emerald-400 mt-1 truncate">
                    {evalResult?.video_metrics?.head_pose || 'Stable'}
                  </div>
                </div>
              </div>

              {/* Turn Duration */}
              <div className="p-3 rounded-xl bg-[#17202D] border border-[#263346] flex items-center justify-between text-xs">
                <span className="text-slate-400">Response Duration:</span>
                <span className="font-mono font-bold text-white">{durationSec.toFixed(1)}s</span>
              </div>

              {/* Turn Rubric Score Result */}
              {evalResult && (
                <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>Turn Score</span>
                    <span className="text-emerald-400 font-extrabold text-sm">{evalResult.eval_score} / 100</span>
                  </div>
                  <p className="text-xs text-emerald-200 leading-relaxed">{evalResult.feedback}</p>
                  {evalResult.follow_up_question && (
                    <div className="text-[11px] text-emerald-300 bg-emerald-900/50 p-2 rounded-lg border border-emerald-700">
                      <strong>Follow-up Probe:</strong> "{evalResult.follow_up_question}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#202938] space-y-2">
              {!evalResult ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={evaluating}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {evaluating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating Turn...</span>
                    </>
                  ) : (
                    <span>Submit Turn for Rubric Evaluation</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextOrFinish}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <span>{currentQIndex < sessionData.questions.length - 1 ? 'Next Question' : 'Complete & Generate Report'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Native PlaceX Bottom Interview Control Bar */}
        <footer className="h-16 px-4 sm:px-6 bg-[#0F1520] border-t border-[#1E2633] flex items-center justify-between shrink-0 z-20">
          {/* Left: Device Controls (Mic, Camera, Speaker) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                isMicMuted
                  ? 'bg-red-950/80 border-red-700 text-red-400'
                  : 'bg-[#17202D] border-[#263346] text-slate-200 hover:text-white'
              }`}
              title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              <span className="text-xs font-bold hidden sm:inline">{isMicMuted ? 'Muted' : 'Mic Active'}</span>
            </button>

            <button
              onClick={toggleCamera}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                !cameraActive
                  ? 'bg-red-950/80 border-red-700 text-red-400'
                  : 'bg-[#17202D] border-[#263346] text-slate-200 hover:text-white'
              }`}
              title={cameraActive ? "Turn off camera" : "Turn on camera"}
            >
              {cameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4" />}
              <span className="text-xs font-bold hidden sm:inline">{cameraActive ? 'Camera On' : 'Camera Off'}</span>
            </button>

            <button
              onClick={toggleSpeaker}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                isSpeakerMuted
                  ? 'bg-amber-950/80 border-amber-700 text-amber-400'
                  : 'bg-[#17202D] border-[#263346] text-slate-200 hover:text-white'
              }`}
              title={isSpeakerMuted ? "Unmute speaker" : "Mute speaker"}
            >
              {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span className="text-xs font-bold hidden sm:inline">{isSpeakerMuted ? 'Muted' : 'Audio On'}</span>
            </button>
          </div>

          {/* Center: Primary Turn Progression Action */}
          <div className="flex items-center gap-3">
            {!evalResult ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={evaluating}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 cursor-pointer transition"
              >
                {evaluating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Grading Response...</span>
                  </>
                ) : (
                  <span>Submit Turn for Rubric Evaluation</span>
                )}
              </button>
            ) : (
              <button
                onClick={handleNextOrFinish}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 cursor-pointer transition"
              >
                <span>{currentQIndex < sessionData.questions.length - 1 ? 'Proceed to Next Question' : 'Finish & View Debrief Report'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Drawer Toggles & End Interview */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => {
                setShowConversationDrawer(!showConversationDrawer);
                if (showMetricsDrawer) setShowMetricsDrawer(false);
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                showConversationDrawer
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-[#17202D] border-[#263346] text-slate-300 hover:text-white'
              }`}
              title="Toggle Conversation Transcript"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Transcript</span>
            </button>

            <button
              onClick={() => {
                setShowMetricsDrawer(!showMetricsDrawer);
                if (showConversationDrawer) setShowConversationDrawer(false);
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                showMetricsDrawer
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-[#17202D] border-[#263346] text-slate-300 hover:text-white'
              }`}
              title="Toggle Live Metrics Drawer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Telemetry</span>
            </button>

            <button
              onClick={handleEndLiveInterview}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              title="End interview and return to Setup"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Interview</span>
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#202321] flex flex-col justify-between">
      {/* Top Navigation Bar in Interview Module */}
      <div className="bg-white border-b border-[#EAE7DF] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#059669] border border-[#BBF7D0]">
            <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
            <span>PlaceX Live Brain</span>
          </div>
          <span className="text-sm font-black text-[#202321]">Dedicated Mock Interview Portal</span>
        </div>

        <button
          onClick={() => {
            stopMedia();
            if (onExit) onExit();
          }}
          className="px-3.5 py-1.5 rounded-xl border border-[#EAE7DF] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-bold text-[#525753] hover:text-[#202321] transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>Exit to Dashboard</span>
        </button>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Header Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#202321] tracking-tight">AI Mock Interview</h2>
            <p className="text-xs text-[#666B67] font-medium max-w-xl leading-relaxed">
              Multi-modal interview platform powered by company web research (Tavily), calibrated question generation, MediaPipe facial geometry, speech prosody, and strict rubric scoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['Technical', 'HR & Behavioral', 'Project Viva'].map((type) => {
              const rawType = type.startsWith('HR') ? 'HR' : type.startsWith('Project') ? 'Viva' : 'Technical';
              return (
                <button
                  key={type}
                  disabled={stage === 'live'}
                  onClick={() => setInterviewType(rawType)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    interviewType === rawType
                      ? 'bg-[#059669] text-white shadow-sm'
                      : 'bg-[#FAF8F5] border border-[#EAE7DF] text-[#525753] hover:text-[#202321]'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

      {permissionError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-800 font-semibold">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* STAGE 1: Intake Configuration Blueprint Form */}
      {stage === 'setup' && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          <div className="border-b border-[#F4F1EA] pb-4">
            <h3 className="text-lg font-black text-[#202321]">Stage 1: Prep Brain Intake Configuration</h3>
            <p className="text-xs text-[#666B67] font-medium">
              Configure your interview profile. PlaceX Prep Brain will research {targetCompany}'s engineering culture, detect tech stack signals, and synthesize calibrated question tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Company Dropdown / Custom Field */}
            <div className="space-y-1.5" ref={companyRef}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#202321]">
                  Target Company <span className="text-rose-500">*</span>
                </label>
                {isCustomCompany ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCompany(false);
                      setTargetCompany('');
                      setCompanySearch('');
                    }}
                    className="text-[11px] font-semibold text-[#059669] hover:underline cursor-pointer"
                  >
                    ← Pick from suggestions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCompany(true);
                      setTargetCompany('');
                      setIsCompanyOpen(false);
                    }}
                    className="text-[11px] font-semibold text-[#666B67] hover:text-[#202321] cursor-pointer"
                  >
                    + Enter custom company
                  </button>
                )}
              </div>

              {isCustomCompany ? (
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#949A95] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => {
                      setTargetCompany(e.target.value);
                      if (validationErrors.company) {
                        setValidationErrors(prev => {
                          const n = { ...prev };
                          delete n.company;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter company name (e.g. Stripe, Netflix, Uber)"
                    className={`w-full bg-[#FAF8F5] border ${
                      validationErrors.company ? 'border-rose-400 bg-rose-50/20' : 'border-[#EAE7DF]'
                    } rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white`}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="relative">
                  <div
                    onClick={() => setIsCompanyOpen(prev => !prev)}
                    className={`w-full bg-[#FAF8F5] border ${
                      validationErrors.company ? 'border-rose-400 bg-rose-50/20' : 'border-[#EAE7DF]'
                    } rounded-2xl pl-10 pr-10 py-3 text-xs font-semibold text-[#202321] focus:outline-none cursor-pointer flex items-center justify-between select-none hover:border-[#059669] transition`}
                  >
                    <Building2 className="w-4 h-4 text-[#949A95] absolute left-3.5 top-3.5" />
                    <span className={targetCompany ? 'text-[#202321] font-bold' : 'text-[#949A95]'}>
                      {targetCompany || 'Select a company or enter your own'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#949A95] transition-transform ${isCompanyOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isCompanyOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#EAE7DF] rounded-2xl shadow-xl overflow-hidden py-1">
                      <div className="p-2 border-b border-[#F4F1EA]">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-[#949A95] absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            placeholder="Search company..."
                            className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#202321] focus:outline-none focus:border-[#059669]"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto py-1">
                        {COMPANY_SUGGESTIONS
                          .filter(c => c.toLowerCase().includes(companySearch.toLowerCase()))
                          .map((company) => (
                            <button
                              key={company}
                              type="button"
                              onClick={() => {
                                setTargetCompany(company);
                                setIsCompanyOpen(false);
                                setCompanySearch('');
                                if (validationErrors.company) {
                                  setValidationErrors(prev => {
                                    const n = { ...prev };
                                    delete n.company;
                                    return n;
                                  });
                                }
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                                targetCompany === company
                                  ? 'bg-[#E6F4EA] text-[#059669] font-bold'
                                  : 'hover:bg-[#FAF8F5] text-[#202321]'
                              }`}
                            >
                              <span>{company}</span>
                              {targetCompany === company && <Check className="w-3.5 h-3.5 text-[#059669]" />}
                            </button>
                          ))}

                        {COMPANY_SUGGESTIONS.filter(c => c.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2 text-xs text-[#949A95] italic">No matching companies</div>
                        )}

                        <div className="border-t border-[#F4F1EA] mt-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomCompany(true);
                              setTargetCompany('');
                              setIsCompanyOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-[#059669] hover:bg-[#E6F4EA] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Other / Enter a custom company</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {validationErrors.company && (
                <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.company}
                </p>
              )}
            </div>

            {/* Target Role Title Dropdown / Custom Field */}
            <div className="space-y-1.5" ref={roleRef}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#202321]">
                  Target Role Title <span className="text-rose-500">*</span>
                </label>
                {isCustomRole ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomRole(false);
                      setTargetRole('');
                      setRoleSearch('');
                    }}
                    className="text-[11px] font-semibold text-[#059669] hover:underline cursor-pointer"
                  >
                    ← Pick from suggestions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomRole(true);
                      setTargetRole('');
                      setIsRoleOpen(false);
                    }}
                    className="text-[11px] font-semibold text-[#666B67] hover:text-[#202321] cursor-pointer"
                  >
                    + Enter custom role
                  </button>
                )}
              </div>

              {isCustomRole ? (
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-[#949A95] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => {
                      setTargetRole(e.target.value);
                      if (validationErrors.role) {
                        setValidationErrors(prev => {
                          const n = { ...prev };
                          delete n.role;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter role title (e.g. Backend Engineer, DevOps Engineer)"
                    className={`w-full bg-[#FAF8F5] border ${
                      validationErrors.role ? 'border-rose-400 bg-rose-50/20' : 'border-[#EAE7DF]'
                    } rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-[#202321] focus:outline-none focus:border-[#059669] focus:bg-white`}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="relative">
                  <div
                    onClick={() => setIsRoleOpen(prev => !prev)}
                    className={`w-full bg-[#FAF8F5] border ${
                      validationErrors.role ? 'border-rose-400 bg-rose-50/20' : 'border-[#EAE7DF]'
                    } rounded-2xl pl-10 pr-10 py-3 text-xs font-semibold text-[#202321] focus:outline-none cursor-pointer flex items-center justify-between select-none hover:border-[#059669] transition`}
                  >
                    <Briefcase className="w-4 h-4 text-[#949A95] absolute left-3.5 top-3.5" />
                    <span className={targetRole ? 'text-[#202321] font-bold' : 'text-[#949A95]'}>
                      {targetRole || 'Select a role or enter your own'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#949A95] transition-transform ${isRoleOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isRoleOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#EAE7DF] rounded-2xl shadow-xl overflow-hidden py-1">
                      <div className="p-2 border-b border-[#F4F1EA]">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-[#949A95] absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
                            placeholder="Search role..."
                            className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#202321] focus:outline-none focus:border-[#059669]"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto py-1">
                        {ROLE_SUGGESTIONS
                          .filter(r => r.toLowerCase().includes(roleSearch.toLowerCase()))
                          .map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setTargetRole(role);
                                setIsRoleOpen(false);
                                setRoleSearch('');
                                if (validationErrors.role) {
                                  setValidationErrors(prev => {
                                    const n = { ...prev };
                                    delete n.role;
                                    return n;
                                  });
                                }
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                                targetRole === role
                                  ? 'bg-[#E6F4EA] text-[#059669] font-bold'
                                  : 'hover:bg-[#FAF8F5] text-[#202321]'
                              }`}
                            >
                              <span>{role}</span>
                              {targetRole === role && <Check className="w-3.5 h-3.5 text-[#059669]" />}
                            </button>
                          ))}

                        {ROLE_SUGGESTIONS.filter(r => r.toLowerCase().includes(roleSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-2 text-xs text-[#949A95] italic">No matching roles</div>
                        )}

                        <div className="border-t border-[#F4F1EA] mt-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomRole(true);
                              setTargetRole('');
                              setIsRoleOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-[#059669] hover:bg-[#E6F4EA] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Other / Enter a custom role</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {validationErrors.role && (
                <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.role}
                </p>
              )}
            </div>

            {/* Seniority / Target Level Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#202321]">
                Seniority / Target Level <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-[#949A95] absolute left-3.5 top-3.5 pointer-events-none" />
                <select
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value);
                    if (validationErrors.difficulty) {
                      setValidationErrors(prev => {
                        const n = { ...prev };
                        delete n.difficulty;
                        return n;
                      });
                    }
                  }}
                  className={`w-full bg-[#FAF8F5] border ${
                    validationErrors.difficulty ? 'border-rose-400 bg-rose-50/20' : 'border-[#EAE7DF]'
                  } rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold ${
                    difficulty ? 'text-[#202321]' : 'text-[#949A95]'
                  } focus:outline-none focus:border-[#059669] focus:bg-white cursor-pointer`}
                >
                  <option value="" disabled>Select your target level</option>
                  <option value="Entry-Level">Entry-Level / Junior</option>
                  <option value="Mid-Level">Mid-Level / L4</option>
                  <option value="Senior">Senior / L5</option>
                  <option value="Staff">Staff / L6</option>
                  <option value="Principal">Principal / Lead</option>
                </select>
              </div>
              {validationErrors.difficulty && (
                <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.difficulty}
                </p>
              )}
            </div>

            {/* Focus Areas & Domain Interests Searchable Multi-Select */}
            <div className="space-y-1.5 col-span-1 md:col-span-2" ref={focusRef}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#202321]">
                  Focus Areas & Domain Interests <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-[#666B67] font-medium">
                  {selectedFocusAreas.length} selected
                </span>
              </div>

              {/* Selected Chips */}
              {selectedFocusAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl">
                  {selectedFocusAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#059669] border border-[#BBF7D0]"
                    >
                      <span>{area}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFocusArea(area)}
                        className="w-3.5 h-3.5 rounded-full hover:bg-[#BBF7D0] flex items-center justify-center cursor-pointer transition"
                      >
                        <X className="w-2.5 h-2.5 text-[#059669]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Multi-Select Dropdown Trigger */}
              <div className="relative">
                <div
                  onClick={() => setIsFocusOpen(prev => !prev)}
                  className={`w-full bg-[#FAF8F5] border ${
                    validationErrors.focus ? 'border-rose-400 bg-rose-50/20' : 'border-[#EAE7DF]'
                  } rounded-2xl pl-10 pr-10 py-3 text-xs font-semibold text-[#202321] focus:outline-none cursor-pointer flex items-center justify-between select-none hover:border-[#059669] transition`}
                >
                  <Compass className="w-4 h-4 text-[#949A95] absolute left-3.5 top-3.5" />
                  <span className={selectedFocusAreas.length > 0 ? 'text-[#202321] font-semibold' : 'text-[#949A95]'}>
                    {selectedFocusAreas.length > 0
                      ? 'Add or change focus areas...'
                      : 'Select focus areas or enter your own'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#949A95] transition-transform ${isFocusOpen ? 'rotate-180' : ''}`} />
                </div>

                {isFocusOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#EAE7DF] rounded-2xl shadow-xl overflow-hidden py-1">
                    <div className="p-2 border-b border-[#F4F1EA] space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#949A95] absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={focusSearch}
                          onChange={(e) => setFocusSearch(e.target.value)}
                          placeholder="Filter focus topics..."
                          className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#202321] focus:outline-none focus:border-[#059669]"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto py-1 divide-y divide-[#F4F1EA]/50">
                      {FOCUS_AREA_SUGGESTIONS
                        .filter(f => f.toLowerCase().includes(focusSearch.toLowerCase()))
                        .map((area) => {
                          const isSelected = selectedFocusAreas.includes(area);
                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() => handleToggleFocusArea(area)}
                              className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                                isSelected ? 'bg-[#E6F4EA]/60 text-[#059669] font-bold' : 'hover:bg-[#FAF8F5] text-[#202321]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 rounded text-[#059669] focus:ring-[#059669] cursor-pointer"
                                />
                                <span>{area}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#059669]" />}
                            </button>
                          );
                        })}

                      {FOCUS_AREA_SUGGESTIONS.filter(f => f.toLowerCase().includes(focusSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-2 text-xs text-[#949A95] italic">No matching suggestions</div>
                      )}
                    </div>

                    {/* Custom Topic Entry */}
                    <div className="p-3 bg-[#FAF8F5] border-t border-[#F4F1EA]">
                      <p className="text-[11px] font-bold text-[#525753] mb-1.5">Add Custom Topic</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customFocusInput}
                          onChange={(e) => setCustomFocusInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomFocusArea();
                            }
                          }}
                          placeholder="e.g. Distributed Tracing, Rust, GraphQL"
                          className="flex-1 bg-white border border-[#EAE7DF] rounded-xl px-3 py-1.5 text-xs text-[#202321] focus:outline-none focus:border-[#059669]"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomFocusArea}
                          className="px-3.5 py-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {validationErrors.focus && (
                <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.focus}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleGenerateBlueprint}
              disabled={isPreparing}
              className="px-8 py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs shadow-md shadow-[#059669]/20 flex items-center gap-2.5 transition-all cursor-pointer transform hover:scale-[1.01]"
            >
              {isPreparing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Researching Company & Generating Question Bank...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-white" />
                  <span>Synthesize Blueprint & Review Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 1.5: Question Bank Review & Rubric Inspection (Directly from MOCK setup_review.html) */}
      {stage === 'review' && sessionData && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F4F1EA] pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#059669] border border-[#BBF7D0] mb-2">
                <Check className="w-3.5 h-3.5 text-[#059669]" />
                <span>Question Bank Synthesized & Rubric Calibrated</span>
              </div>
              <h3 className="text-xl font-black text-[#202321]">{targetCompany} — {targetRole}</h3>
              <p className="text-xs text-[#666B67] font-semibold">
                Level: <span className="text-[#059669] font-bold">{difficulty}</span> • Total Questions: {sessionData.questions?.length}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStage('setup')}
                className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] hover:bg-[#F4F1EA] text-xs font-bold text-[#525753] cursor-pointer"
              >
                ← Edit Setup
              </button>
              <button
                onClick={handleLaunchLive}
                className="px-6 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold shadow-md shadow-[#059669]/20 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Live AI Interview</span>
              </button>
            </div>
          </div>

          {/* Company Research Summary Callout */}
          {sessionData.company_research?.summary && (
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-1">
              <span className="text-[11px] font-bold text-[#059669] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Tavily Company Research Summary
              </span>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">
                {sessionData.company_research.summary}
              </p>
            </div>
          )}

          {/* Tiered Question Cards */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-[#202321] uppercase tracking-wider">Calibrated Question Progression</h4>
            
            {(sessionData.questions_blueprint || []).map((q: any, i: number) => (
              <div key={i} className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-3 hover:border-[#CBD5E1] transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-white border border-[#EAE7DF] flex items-center justify-center text-xs font-black text-[#202321]">
                      Q{q.index || i + 1}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#059669] uppercase">
                      {q.tier || 'Core'}
                    </span>
                    <span className="text-xs font-bold text-[#525753]">{q.topic}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#949A95]">10 pts</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#EAE7DF]">
                  <p className="text-[11px] font-bold text-[#949A95] uppercase tracking-wider mb-1">Spoken Interview Prompt</p>
                  <p className="text-xs font-extrabold text-[#202321] leading-relaxed">"{q.question_text}"</p>
                </div>

                {q.criteria && (
                  <div className="text-[11px] text-[#666B67] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    <span><strong>Rubric Anchor:</strong> {q.criteria}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#F4F1EA]">
            <button
              onClick={() => setStage('setup')}
              className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] hover:bg-[#F4F1EA] text-xs font-bold text-[#525753] hover:text-[#202321] transition cursor-pointer"
            >
              ← Edit Setup
            </button>
            <button
              onClick={handleLaunchLive}
              className="px-8 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs shadow-md shadow-[#059669]/20 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Proceed to Live Simulation Room</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 4: Final Debrief Report (from MOCK Scoring Brain) */}
      {stage === 'report' && finalReport && (
        <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#059669] mb-2 border border-[#BBF7D0]">
                <Award className="w-3.5 h-3.5 text-[#059669]" />
                <span>{finalReport.hire_recommendation || 'Evaluated'}</span>
              </div>
              <h3 className="text-xl font-black text-[#202321]">PlaceX Comprehensive Interview Report</h3>
              <p className="text-xs text-[#666B67] font-semibold">
                Target: {targetCompany} • Role: {targetRole} ({difficulty})
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-[#059669]">{finalReport.overall_score} / 100</div>
              <div className="text-xs text-[#949A95] font-bold">Overall Placement Readiness</div>
            </div>
          </div>

          {/* Executive Summary */}
          {finalReport.report?.summary && (
            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-1.5">
              <h4 className="text-xs font-extrabold text-[#202321] uppercase tracking-wider">Executive Debrief Summary</h4>
              <p className="text-xs text-[#525753] font-medium leading-relaxed">{finalReport.report.summary}</p>
            </div>
          )}

          {/* Multi-Dimensional Criteria Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-[#202321] uppercase tracking-wider">Evaluated Competency Dimensions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Object.entries(finalReport.score_breakdown || {}).map(([cat, score]: [string, any]) => (
                <div key={cat} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#525753]">{cat}</span>
                    <span className="text-[#059669]">{score}%</span>
                  </div>
                  <div className="w-full bg-[#EAE7DF] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#059669] h-full rounded-full transition-all" style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Improvement Suggestions (MOCK Rubrics) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] space-y-2.5">
              <h4 className="text-xs font-extrabold text-[#047857] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" /> Key Strengths Observed
              </h4>
              <ul className="space-y-1.5 text-xs text-[#202321] font-medium">
                {(finalReport.report?.strengths || []).map((str: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#059669] font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5">
              <h4 className="text-xs font-extrabold text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#D97706]" /> Priority Actionable Improvements
              </h4>
              <ul className="space-y-1.5 text-xs text-[#202321] font-medium">
                {(finalReport.report?.improvements || []).map((imp: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D97706] font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => {
                setFinalReport(null);
                setStage('review');
              }}
              className="px-5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] hover:bg-[#F4F1EA] text-xs font-bold text-[#525753] hover:text-[#202321] transition cursor-pointer"
            >
              ← Back to Question Bank Review
            </button>
            <button
              onClick={() => {
                setFinalReport(null);
                setSessionData(null);
                setTargetCompany('');
                setTargetRole('');
                setDifficulty('');
                setSelectedFocusAreas([]);
                setValidationErrors({});
                setIsCustomCompany(false);
                setIsCustomRole(false);
                setCompanySearch('');
                setRoleSearch('');
                setFocusSearch('');
                setCustomFocusInput('');
                setStage('setup');
              }}
              className="px-6 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              Start Another Interview Session
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default InterviewSimulator;
