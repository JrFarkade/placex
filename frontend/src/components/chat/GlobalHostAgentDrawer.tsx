import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader2, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Compass,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';

interface GlobalHostAgentProps {
  token: string;
  activeFeature: string;
  setActiveFeature: (feature: string) => void;
  isOpen: boolean;
  onClose: () => void;
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

export const GlobalHostAgentDrawer: React.FC<GlobalHostAgentProps> = ({
  token,
  activeFeature,
  setActiveFeature,
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextAction, setNextAction] = useState<any>(null);
  const [studentState, setStudentState] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActionCard, setShowActionCard] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Multi-chat conversation state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | number | null>(null);
  const [isConvDropdownOpen, setIsConvDropdownOpen] = useState(false);
  const convDropdownRef = useRef<HTMLDivElement>(null);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch student state and next action when opened or when active feature changes
  const fetchHostState = async () => {
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

  // Record module navigation event whenever activeFeature changes
  useEffect(() => {
    if (!token) return;
    
    const eventMap: { [key: string]: string } = {
      dashboard: 'dashboard.opened',
      roadmap: 'roadmap.opened',
      coding: 'coding.opened',
      knowledge: 'quiz.opened',
      resume: 'ats.resume_uploaded',
      interview: 'interview.opened',
      profile: 'student.profile_updated'
    };

    const evType = eventMap[activeFeature] || `${activeFeature}.opened`;
    axios.post('/api/v1/agent/events', {
      event_type: evType,
      module: activeFeature
    }, authHeaders).catch(() => {});

    fetchHostState();
  }, [activeFeature, token]);

  useEffect(() => {
    if (isOpen) {
      fetchHostState();
      fetchConversations(true);
    }
  }, [isOpen]);

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
        active_module: activeFeature,
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
      fetchHostState();
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: 'Temporary connection delay with PlaceX Host Intelligence. Retrying...',
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
      fetchHostState();
    } catch (err) {
      console.warn("Failed toggling task status");
    }
  };

  // Helper to format structured message text cleanly with 4-Question cards & markdown
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // 4-Question Framework callout formatting
      if (trimmed.startsWith('**WHAT:**') || trimmed.startsWith('WHAT:')) {
        return (
          <div key={idx} className="my-1.5 p-2 rounded-xl bg-[#FAF8F5] border-l-3 border-[#059669] text-xs">
            <strong className="text-[#047857] block text-[10px] uppercase font-black">WHAT OCCURRED</strong>
            <span className="text-[#202321]">{trimmed.replace(/^\*\*(WHAT:?)\*\*\s*/i, '').replace(/^(WHAT:?)\s*/i, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('**WHY:**') || trimmed.startsWith('WHY:')) {
        return (
          <div key={idx} className="my-1.5 p-2 rounded-xl bg-[#FAF8F5] border-l-3 border-[#D97706] text-xs">
            <strong className="text-[#B45309] block text-[10px] uppercase font-black">WHY IT HAPPENED</strong>
            <span className="text-[#202321]">{trimmed.replace(/^\*\*(WHY:?)\*\*\s*/i, '').replace(/^(WHY:?)\s*/i, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('**SO WHAT:**') || trimmed.startsWith('SO WHAT:')) {
        return (
          <div key={idx} className="my-1.5 p-2 rounded-xl bg-[#FAF8F5] border-l-3 border-[#0284C7] text-xs">
            <strong className="text-[#0369A1] block text-[10px] uppercase font-black">SO WHAT (IMPACT)</strong>
            <span className="text-[#202321]">{trimmed.replace(/^\*\*(SO WHAT:?)\*\*\s*/i, '').replace(/^(SO WHAT:?)\s*/i, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('**NOW WHAT:**') || trimmed.startsWith('NOW WHAT:')) {
        return (
          <div key={idx} className="my-1.5 p-2 rounded-xl bg-[#E6F4EA] border-l-3 border-[#059669] text-xs">
            <strong className="text-[#047857] block text-[10px] uppercase font-black">NOW WHAT (ACTION)</strong>
            <span className="text-[#064E3B] font-semibold">{trimmed.replace(/^\*\*(NOW WHAT:?)\*\*\s*/i, '').replace(/^(NOW WHAT:?)\s*/i, '')}</span>
          </div>
        );
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        return <h5 key={idx} className="font-black text-xs text-[#202321] mt-2 mb-1">{trimmed.replace('### ', '')}</h5>;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        return <h4 key={idx} className="font-black text-sm text-[#202321] mt-2 mb-1">{trimmed.replace(/#+\s*/, '')}</h4>;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-[#202321] my-0.5">
            {trimmed.replace(/^[-*]\s*/, '')}
          </li>
        );
      }

      // Numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-[#202321] my-0.5 ml-1">
            <span className="font-bold text-[#059669] shrink-0">{numMatch[1]}.</span>
            <span>{numMatch[2]}</span>
          </div>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-1.5"></div>;
      }

      return <p key={idx} className="text-xs text-[#202321] leading-relaxed my-0.5">{line}</p>;
    });
  };

  const getContextChips = () => {
    const base = ["What should I do today?", "What are my weak areas?"];
    if (activeFeature === 'roadmap') {
      return ["Am I ready for this week?", "Explain current week topic", ...base];
    }
    if (activeFeature === 'coding') {
      return ["Give me a challenge based on roadmap", "Explain my coding errors", ...base];
    }
    if (activeFeature === 'knowledge') {
      return ["Why did I get questions wrong?", "What are my weak concepts?", ...base];
    }
    if (activeFeature === 'resume') {
      return ["Why is my ATS score low?", "What skills should I add?", ...base];
    }
    return base;
  };

  if (!isOpen) return null;

  const currentModuleName = {
    dashboard: 'Dashboard',
    roadmap: 'Career Roadmap',
    coding: 'Coding Sandbox',
    knowledge: 'Knowledge Base',
    resume: 'ATS Resume Intelligence',
    interview: 'AI Mock Interview',
    profile: 'Student Profile',
    agent: 'Host Agent Workstation'
  }[activeFeature] || activeFeature;

  return (
    <div 
      className={`fixed top-0 right-0 h-screen bg-white border-l border-[#EAE7DF] shadow-2xl z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-[740px]' : 'w-[450px]'
      }`}
    >
      {/* 1. Header with OS-Style Agent Status */}
      <div className="px-6 py-4 border-b border-[#EAE7DF] bg-[#FAF8F5] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#059669] flex items-center justify-center text-white shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#202321] tracking-tight">HOST AGENT</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#666B67] font-medium pt-0.5">
              <span>Context:</span>
              <strong className="text-[#059669] font-bold">{currentModuleName}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-xl hover:bg-[#EAE7DF]/60 text-[#666B67] hover:text-rose-600 transition-all cursor-pointer"
              title="Clear dialogue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => fetchHostState()}
            className="p-1.5 rounded-xl hover:bg-[#EAE7DF]/60 text-[#666B67] transition-all cursor-pointer"
            title="Refresh State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl hover:bg-[#EAE7DF]/60 text-[#666B67] transition-all cursor-pointer"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#EAE7DF]/60 text-[#666B67] transition-all cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation Thread Bar */}
      <div className="px-6 py-2.5 border-b border-[#EAE7DF] bg-white flex items-center justify-between gap-2">
        <div className="relative flex-1 min-w-0" ref={convDropdownRef}>
          <button
            onClick={() => setIsConvDropdownOpen(!isConvDropdownOpen)}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-xs font-bold text-[#202321] transition-all cursor-pointer truncate"
            title="Switch conversation"
          >
            <div className="flex items-center gap-2 truncate">
              <MessageSquare className="w-3.5 h-3.5 text-[#059669] shrink-0" />
              <span className="truncate">
                {conversations.find(c => c.id === currentConversationId)?.title || "Active Chat"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#949A95] shrink-0 ml-1" />
          </button>

          {isConvDropdownOpen && (
            <div className="absolute top-9 left-0 w-full bg-white rounded-2xl shadow-xl border border-[#EAE7DF] p-2 z-50 animate-in fade-in duration-100">
              <div className="flex items-center justify-between px-2.5 py-1 border-b border-[#EAE7DF] mb-1">
                <span className="text-[10px] font-black text-[#202321] uppercase tracking-wider">Saved Chats</span>
                <button
                  onClick={handleNewChat}
                  className="text-[10px] font-extrabold text-[#059669] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
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
                        <div className="truncate text-xs">{conv.title}</div>
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

        <button
          onClick={handleNewChat}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#E6F4EA] border border-[#EAE7DF] hover:border-[#BBF7D0] text-[#059669] text-xs font-extrabold transition-all cursor-pointer shadow-xs shrink-0"
          title="Start a new chat thread"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* 2. Collapsible Next Action Bar */}
      {nextAction && (
        <div className="px-5 py-2.5 bg-white border-b border-[#EAE7DF] flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-black uppercase text-[#059669] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-[#BBF7D0] shrink-0">
              NEXT STEP
            </span>
            <span className="font-bold text-[#202321] truncate">{nextAction.current_priority}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={() => setShowActionCard(!showActionCard)}
              className="text-[11px] font-bold text-[#666B67] hover:text-[#059669] px-2 py-0.5 rounded-md hover:bg-[#FAF8F5] cursor-pointer"
            >
              {showActionCard ? 'Hide' : 'Details'}
            </button>
            {nextAction.target_route && (
              <button
                onClick={() => setActiveFeature(nextAction.target_route)}
                className="text-[11px] font-extrabold text-white bg-[#059669] hover:bg-[#047857] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <span>Go</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded Action & Tasks Card */}
      {showActionCard && nextAction && (
        <div className="p-4 bg-[#FAF8F5] border-b border-[#EAE7DF] space-y-3">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-[#202321] leading-tight">
              {nextAction.current_priority}
            </h4>
            <p className="text-[11px] text-[#666B67] font-medium leading-relaxed">
              {nextAction.reason}
            </p>
          </div>

          {studentState?.tasks && studentState.tasks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#EAE7DF]">
              <span className="text-[10px] font-extrabold text-[#525753] uppercase tracking-wider block">
                ACTIVE TASKS ({studentState.tasks.length})
              </span>
              {studentState.tasks.slice(0, 3).map((task: any) => (
                <div 
                  key={task.id}
                  className="flex items-start gap-2 p-1.5 rounded-lg bg-white border border-[#EAE7DF]"
                >
                  <button
                    onClick={() => handleToggleTask(task.id, task.status)}
                    className="mt-0.5 text-[#059669] cursor-pointer"
                  >
                    {task.status === 'completed' ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#059669]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-[#949A95]" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold ${task.status === 'completed' ? 'line-through text-[#949A95]' : 'text-[#202321]'}`}>
                      {task.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Primary Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAF8F5]/40" ref={chatScrollRef}>
        {messages.length === 0 && (
          <div className="py-8 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] text-[#059669] flex items-center justify-center mx-auto shadow-xs">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-[#202321]">PlaceX Host Intelligence</h3>
              <p className="text-xs text-[#666B67] max-w-xs mx-auto">
                Connected to <strong>{currentModuleName}</strong>. Ask about code errors, roadmap milestones, or placement strategies.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 pt-2">
              {getContextChips().map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white hover:bg-[#E6F4EA] border border-[#EAE7DF] text-[#059669] transition-all cursor-pointer shadow-xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="space-y-3 pt-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs font-medium max-w-[92%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#059669] text-white rounded-tr-none shadow-xs'
                    : 'bg-white border border-[#EAE7DF] text-[#202321] rounded-tl-none shadow-xs'
                }`}
              >
                {m.sender === 'user' ? m.text : renderMessageContent(m.text)}
              </div>
              <span className="text-[9px] text-[#949A95] font-bold px-1 pt-0.5">
                {m.timestamp}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#666B67] p-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
              <span>Host Agent analyzing PlaceX context...</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Suggested Prompt Chips */}
      <div className="px-4 py-2 border-t border-[#EAE7DF] bg-[#FAF8F5]/80 overflow-x-auto flex gap-1.5 no-scrollbar">
        {getContextChips().map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white hover:bg-[#E6F4EA] border border-[#EAE7DF] text-[#059669] transition-all cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* 4. Input Area */}
      <div className="p-3.5 border-t border-[#EAE7DF] bg-white">
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
            placeholder={`Ask Host Agent about ${currentModuleName}...`}
            className="flex-1 bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#202321] placeholder-[#949A95] focus:outline-none focus:border-[#059669] focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
