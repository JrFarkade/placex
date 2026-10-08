import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Compass,
  CheckSquare,
  Square,
  Map,
  Code2,
  FileText,
  Mic,
  BookOpen,
  User,
  Activity,
  Layers,
  ChevronRight,
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';

interface HostAgentWorkspaceProps {
  token: string;
  setActiveFeature: (feature: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface ConversationItem {
  id: string | number;
  title: string;
  created_at: string;
  updated_at: string;
}

export const HostAgentWorkspace: React.FC<HostAgentWorkspaceProps> = ({
  token,
  setActiveFeature
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentState, setStudentState] = useState<any>(null);
  const [nextAction, setNextAction] = useState<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Conversation history & multi-chat state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | number | null>(null);
  const [isConvDropdownOpen, setIsConvDropdownOpen] = useState(false);
  const convDropdownRef = useRef<HTMLDivElement>(null);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchHostData = async () => {
    try {
      const [stateRes, nextRes] = await Promise.all([
        axios.get('/api/v1/agent/state', authHeaders),
        axios.get('/api/v1/agent/next-action', authHeaders)
      ]);
      setStudentState(stateRes.data);
      setNextAction(nextRes.data);
    } catch (err) {
      console.warn("Failed fetching Host Agent state");
    }
  };

  const fetchConversations = async (autoSelectFirst = false) => {
    try {
      const res = await axios.get('/api/v1/agent/conversations', authHeaders);
      const list = Array.isArray(res.data) ? res.data : (res.data?.conversations || []);
      setConversations(list);
      if (autoSelectFirst && list.length > 0 && currentConversationId === null) {
        loadConversation(list[0].id);
      }
    } catch (e) {
      console.warn("Failed fetching conversations", e);
    }
  };

  const loadConversation = async (convId: string | number) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/agent/conversations/${convId}`, authHeaders);
      if (res.data) {
        setCurrentConversationId(convId);
        const mapped: ChatMessage[] = (res.data.messages || []).map((m: any) => ({
          id: String(m.id),
          sender: m.sender,
          text: m.text,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(mapped);
      }
    } catch (e) {
      console.warn("Failed loading conversation", e);
    } finally {
      setLoading(false);
      setIsConvDropdownOpen(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await axios.post('/api/v1/agent/conversations', {}, authHeaders);
      const newConv = res.data.conversation || res.data;
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setMessages([]);
      setIsConvDropdownOpen(false);
    } catch (e) {
      console.warn("Failed creating new chat", e);
      setCurrentConversationId(null);
      setMessages([]);
    }
  };

  const handleDeleteConversation = async (convId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/v1/agent/conversations/${convId}`, authHeaders);
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      if (currentConversationId === convId) {
        if (remaining.length > 0) {
          loadConversation(remaining[0].id);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.warn("Failed deleting conversation", e);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (convDropdownRef.current && !convDropdownRef.current.contains(event.target as Node)) {
        setIsConvDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchHostData();
    fetchConversations(true);
    // Record workspace opened
    axios.post('/api/v1/agent/events', {
      event_type: 'dashboard.opened',
      module: 'agent'
    }, authHeaders).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/v1/agent/chat', {
        message: textToSend,
        active_module: 'agent',
        conversation_id: currentConversationId || undefined
      }, authHeaders);

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: res.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, agentMsg]);
      if (res.data.conversation_id && res.data.conversation_id !== currentConversationId) {
        setCurrentConversationId(res.data.conversation_id);
      }
      fetchConversations(false);
      if (res.data.next_action) {
        setNextAction(res.data.next_action);
      }
      fetchHostData();
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: 'Temporary connection delay with PlaceX Host Intelligence. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await axios.patch(`/api/v1/agent/tasks/${taskId}`, { status: nextStatus }, authHeaders);
      fetchHostData();
    } catch (err) {
      console.warn("Failed updating task");
    }
  };

  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('**WHAT:**') || trimmed.startsWith('WHAT:')) {
        return (
          <div key={idx} className="my-2 p-3 rounded-2xl bg-[#FAF8F5] border-l-4 border-[#059669] text-xs sm:text-sm">
            <strong className="text-[#047857] block text-[11px] uppercase font-black tracking-wide">WHAT OCCURRED</strong>
            <span className="text-[#202321]">{trimmed.replace(/^\*\*(WHAT:?)\*\*\s*/i, '').replace(/^(WHAT:?)\s*/i, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('**WHY:**') || trimmed.startsWith('WHY:')) {
        return (
          <div key={idx} className="my-2 p-3 rounded-2xl bg-[#FAF8F5] border-l-4 border-[#D97706] text-xs sm:text-sm">
            <strong className="text-[#B45309] block text-[11px] uppercase font-black tracking-wide">WHY IT HAPPENED</strong>
            <span className="text-[#202321]">{trimmed.replace(/^\*\*(WHY:?)\*\*\s*/i, '').replace(/^(WHY:?)\s*/i, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('**SO WHAT:**') || trimmed.startsWith('SO WHAT:')) {
        return (
          <div key={idx} className="my-2 p-3 rounded-2xl bg-[#FAF8F5] border-l-4 border-[#0284C7] text-xs sm:text-sm">
            <strong className="text-[#0369A1] block text-[11px] uppercase font-black tracking-wide">SO WHAT (IMPACT)</strong>
            <span className="text-[#202321]">{trimmed.replace(/^\*\*(SO WHAT:?)\*\*\s*/i, '').replace(/^(SO WHAT:?)\s*/i, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('**NOW WHAT:**') || trimmed.startsWith('NOW WHAT:')) {
        return (
          <div key={idx} className="my-2 p-3 rounded-2xl bg-[#E6F4EA] border-l-4 border-[#059669] text-xs sm:text-sm">
            <strong className="text-[#047857] block text-[11px] uppercase font-black tracking-wide">NOW WHAT (ACTIONABLE NEXT STEP)</strong>
            <span className="text-[#064E3B] font-semibold">{trimmed.replace(/^\*\*(NOW WHAT:?)\*\*\s*/i, '').replace(/^(NOW WHAT:?)\s*/i, '')}</span>
          </div>
        );
      }

      if (trimmed.startsWith('### ')) {
        return <h5 key={idx} className="font-black text-sm text-[#202321] mt-3 mb-1">{trimmed.replace('### ', '')}</h5>;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        return <h4 key={idx} className="font-black text-base text-[#202321] mt-3 mb-1">{trimmed.replace(/#+\s*/, '')}</h4>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-xs sm:text-sm text-[#202321] my-1">
            {trimmed.replace(/^[-*]\s*/, '')}
          </li>
        );
      }
      const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#202321] my-1 ml-1">
            <span className="font-bold text-[#059669] shrink-0">{numMatch[1]}.</span>
            <span>{numMatch[2]}</span>
          </div>
        );
      }
      if (!trimmed) {
        return <div key={idx} className="h-2"></div>;
      }
      return <p key={idx} className="text-xs sm:text-sm text-[#202321] leading-relaxed my-1">{line}</p>;
    });
  };

  const suggestedPrompts = [
    "What should I do today?",
    "What are my weak areas?",
    "Give me a coding challenge based on my current roadmap",
    "Why is my ATS score low?",
    "Am I ready for this roadmap week?"
  ];

  const targetRole = studentState?.profile?.target_role || "Not set yet";
  const activeRoadmap = studentState?.active_roadmap;
  const currentWeek = activeRoadmap?.current_week || 1;
  const branch = activeRoadmap?.branch || "Data Science";
  const level = activeRoadmap?.level || "Beginner";
  const solvedCount = studentState?.coding?.unique_solved_count || 0;
  const resumeScore = studentState?.resume?.latest_score;
  const readinessScore = studentState?.readiness?.score;
  const quizAvg = studentState?.quiz?.average_score;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[#202321]">
      
      {/* 1. Header Banner */}
      <div className="p-8 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
            <Compass className="w-4 h-4 text-[#059669]" />
            <span>CENTRAL INTELLIGENCE LAYER</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#202321]">
            PlaceX Host Agent
          </h1>
          <p className="text-sm text-[#666B67] font-medium max-w-2xl leading-relaxed">
            The central intelligence layer sitting between PlaceX modules and your placement milestones. 
            Orchestrates roadmap progression, coding evaluations, ATS scoring, and technical interviews.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setActiveFeature(nextAction?.target_route || 'roadmap')}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
          >
            <span>{nextAction?.cta_label || 'Execute Next Action'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. 360-Degree Real Student State Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#EAE7DF] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#949A95] uppercase">Target Role</span>
          <div className="text-sm font-black text-[#202321] truncate">{targetRole}</div>
          <div className="text-[10px] text-[#666B67] font-semibold">{studentState?.profile?.branch || 'General Track'}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE7DF] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#949A95] uppercase">Roadmap Week</span>
          <div className="text-sm font-black text-[#059669]">Week {currentWeek} / 24</div>
          <div className="text-[10px] text-[#666B67] font-semibold truncate">{branch} ({level})</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE7DF] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#949A95] uppercase">Readiness</span>
          <div className="text-sm font-black text-[#202321]">{readinessScore !== null && readinessScore !== undefined ? `${readinessScore}%` : 'Not evaluated'}</div>
          <div className="text-[10px] text-[#666B67] font-semibold">{studentState?.readiness?.level || 'Beginner Tier'}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE7DF] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#949A95] uppercase">ATS Score</span>
          <div className="text-sm font-black text-[#202321]">{resumeScore !== null && resumeScore !== undefined ? `${resumeScore} / 100` : 'No Resume'}</div>
          <div className="text-[10px] text-[#666B67] font-semibold">{studentState?.resume?.total_uploads || 0} uploads</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE7DF] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#949A95] uppercase">Coding Solved</span>
          <div className="text-sm font-black text-[#202321]">{solvedCount} Problems</div>
          <div className="text-[10px] text-[#666B67] font-semibold">{studentState?.coding?.total_submissions || 0} submissions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE7DF] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#949A95] uppercase">Quiz Average</span>
          <div className="text-sm font-black text-[#202321]">{quizAvg ? `${quizAvg}%` : 'No attempts'}</div>
          <div className="text-[10px] text-[#666B67] font-semibold">{studentState?.quiz?.total_attempts || 0} attempts</div>
        </div>
      </div>

      {/* 3. Next Best Action Callout Banner */}
      {nextAction && (
        <div className="p-6 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#059669] uppercase tracking-wider">
                SYNTHESIZED NEXT BEST ACTION
              </span>
              <span className="text-[10px] font-bold text-[#666B67] px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EAE7DF]">
                {nextAction.relevant_module?.toUpperCase()} MODULE
              </span>
            </div>
            <h3 className="text-lg font-black text-[#202321]">
              {nextAction.current_priority}
            </h3>
            <p className="text-xs text-[#666B67] font-medium leading-relaxed">
              {nextAction.reason}
            </p>
          </div>

          <button
            onClick={() => setActiveFeature(nextAction.target_route)}
            className="px-6 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <span>{nextAction.cta_label || 'Start Practice'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Split Workstation View: Dialogue on Left, Intel Panels on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Direct Host Agent Dialogue (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col h-[650px] overflow-hidden">
          <div className="px-6 py-3.5 border-b border-[#EAE7DF] bg-[#FAF8F5] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#059669] flex items-center justify-center text-white shadow-xs shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              
              {/* Conversation Selector Popover */}
              <div className="relative" ref={convDropdownRef}>
                <button
                  onClick={() => setIsConvDropdownOpen(!isConvDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-bold text-[#202321] transition-all cursor-pointer max-w-[220px]"
                  title="Switch conversation"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                  <span className="truncate">
                    {conversations.find(c => c.id === currentConversationId)?.title || "Active Chat"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#949A95] shrink-0" />
                </button>

                {isConvDropdownOpen && (
                  <div className="absolute top-10 left-0 w-72 bg-white rounded-2xl shadow-xl border border-[#EAE7DF] p-2 z-50 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#EAE7DF] mb-1">
                      <span className="text-[11px] font-black text-[#202321] uppercase tracking-wider">Saved Chats</span>
                      <button
                        onClick={handleNewChat}
                        className="text-[11px] font-extrabold text-[#059669] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New Chat</span>
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {conversations.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[#949A95] font-medium">No previous chats</div>
                      ) : (
                        conversations.map((conv) => (
                          <div
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            className={`group flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                              currentConversationId === conv.id
                                ? 'bg-[#E6F4EA] text-[#064E3B] font-bold'
                                : 'hover:bg-[#FAF8F5] text-[#202321]'
                            }`}
                          >
                            <div className="truncate flex-1 pr-2">
                              <div className="truncate">{conv.title}</div>
                              <div className="text-[10px] text-[#949A95] font-normal">
                                {new Date(conv.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              className="p-1 text-[#949A95] hover:text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E6F4EA] border border-[#EAE7DF] hover:border-[#BBF7D0] text-[#059669] text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                title="Start a new conversation thread"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
              <span className="hidden sm:inline-flex text-[10px] font-extrabold text-[#059669] bg-[#E6F4EA] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
                LIVE ORCHESTRATION
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FAF8F5]/30" ref={chatScrollRef}>
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#EAE7DF] flex items-center justify-center mx-auto text-[#059669] shadow-xs">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-[#202321]">Host Agent Intelligence Active</h4>
                <p className="text-xs text-[#666B67] max-w-sm mx-auto font-medium leading-relaxed">
                  I monitor your real PlaceX milestones across your 24-week roadmap, coding submissions, quiz results, and resume checks. Ask any question to analyze your preparation.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm font-medium max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#059669] text-white rounded-tr-none shadow-xs'
                      : 'bg-white border border-[#EAE7DF] text-[#202321] rounded-tl-none shadow-xs whitespace-pre-wrap'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-[#949A95] font-bold px-1 pt-1">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-[#666B67] p-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
                <span>Host Agent synthesizing module context...</span>
              </div>
            )}
          </div>

          {/* Suggested Prompts */}
          <div className="px-5 py-2.5 border-t border-[#EAE7DF] bg-[#FAF8F5]/80 overflow-x-auto flex gap-2 no-scrollbar">
            {suggestedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                className="shrink-0 text-[11px] font-bold px-3 py-1 rounded-full bg-white hover:bg-[#E6F4EA] border border-[#EAE7DF] text-[#059669] transition-all cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-[#EAE7DF] bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Host Agent about roadmap, coding errors, quiz mistakes, or ATS..."
                className="flex-1 bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-[#202321] placeholder-[#949A95] focus:outline-none focus:border-[#059669] focus:bg-white"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-3 rounded-2xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Tasks, Gaps & Module Jumpers (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Active Tasks Panel */}
          <div className="p-6 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-black text-[#202321]">Proactive Learning Tasks</h3>
              </div>
              <span className="text-[10px] font-bold text-[#666B67] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#EAE7DF]">
                {studentState?.tasks?.length || 0} Active
              </span>
            </div>

            {studentState?.tasks && studentState.tasks.length > 0 ? (
              <div className="space-y-2.5">
                {studentState.tasks.map((task: any) => (
                  <div 
                    key={task.id}
                    className="p-3 rounded-2xl border border-[#EAE7DF] hover:border-[#BBF7D0] hover:bg-[#FAF8F5] transition-all flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className="mt-0.5 text-[#059669] cursor-pointer"
                      >
                        {task.status === 'completed' ? (
                          <CheckSquare className="w-4 h-4 text-[#059669]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#949A95]" />
                        )}
                      </button>
                      <div className="space-y-0.5 min-w-0">
                        <div className={`text-xs font-bold truncate ${task.status === 'completed' ? 'line-through text-[#949A95]' : 'text-[#202321]'}`}>
                          {task.title}
                        </div>
                        <p className="text-[11px] text-[#666B67] line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveFeature(task.target_route || task.module)}
                      className="text-[10px] font-extrabold text-[#059669] hover:text-[#047857] shrink-0 mt-0.5 cursor-pointer"
                    >
                      Open →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#666B67] font-medium py-3 text-center">
                No pending tasks. Ask Host Agent "What should I do today?" to generate tasks from your roadmap.
              </p>
            )}
          </div>

          {/* Strengths & Focus Areas */}
          <div className="p-6 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#202321]">Objective Learning State</h3>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-extrabold text-[#047857] uppercase tracking-wider block mb-1.5">
                  Verified Strengths
                </span>
                {studentState?.strengths && studentState.strengths.length > 0 ? (
                  <div className="space-y-1.5">
                    {studentState.strengths.slice(0, 3).map((st: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-[#202321] bg-[#FAF8F5] p-2 rounded-xl border border-[#EAE7DF]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                        <span className="truncate">{st}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#949A95] font-medium">Complete coding challenges and quizzes to verify strengths.</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-[#D97706] uppercase tracking-wider block mb-1.5">
                  Prioritized Gaps
                </span>
                {studentState?.weak_areas && studentState.weak_areas.length > 0 ? (
                  <div className="space-y-1.5">
                    {studentState.weak_areas.slice(0, 3).map((wa: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-[#202321] bg-[#FAF8F5] p-2 rounded-xl border border-[#EAE7DF]">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                        <span className="truncate">{wa}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#949A95] font-medium">No major technical hurdles detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Module Navigation Jumpers */}
          <div className="p-6 rounded-3xl bg-white border border-[#EAE7DF] shadow-xs space-y-3">
            <h3 className="text-sm font-black text-[#202321]">Orchestrated Modules</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setActiveFeature('roadmap')}
                className="p-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] font-bold text-left flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-[#059669]" />
                  <span>Roadmap</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#666B67]" />
              </button>

              <button
                onClick={() => setActiveFeature('coding')}
                className="p-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] font-bold text-left flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#D97706]" />
                  <span>Coding</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#666B67]" />
              </button>

              <button
                onClick={() => setActiveFeature('knowledge')}
                className="p-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] font-bold text-left flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#0284C7]" />
                  <span>Knowledge</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#666B67]" />
              </button>

              <button
                onClick={() => setActiveFeature('resume')}
                className="p-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] font-bold text-left flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#059669]" />
                  <span>Resume ATS</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#666B67]" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
