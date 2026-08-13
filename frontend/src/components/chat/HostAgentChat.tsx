import React, { useState } from 'react';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  recommendations?: string[];
  timestamp: string;
}

interface HostAgentChatProps {
  token: string;
  activeFeature: string;
}

export const HostAgentChat: React.FC<HostAgentChatProps> = ({ token, activeFeature }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: "Welcome to PlaceX. What career direction are you currently interested in?",
      recommendations: [
        'Data Analyst',
        'Software Engineer',
        'Product Analyst',
        "I'm not sure yet"
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend: string, isQuickAction: boolean = false) => {
    if (!textToSend.trim() || loading) return;

    // Only append user message to chat transcript if typed by user (not UI button clicks)
    if (!isQuickAction) {
      const userMsg: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
    }

    setLoading(true);

    try {
      const res = await axios.post(
        '/api/v1/agent/chat',
        { message: textToSend, active_feature: activeFeature },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: res.data.reply,
        recommendations: res.data.recommendations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: 'I encountered a temporary connection issue. Please try again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] glass-card rounded-2xl border border-darkBorder overflow-hidden">
      {/* Agent Header */}
      <div className="px-6 py-3.5 bg-slate-900/80 border-b border-darkBorder flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Host Agent Career Mentor</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Personalized AI Career Operating System</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-5">
        {messages.map((msg, index) => {
          const isLatestAgentMessage = msg.sender === 'agent' && index === messages.length - 1;

          return (
            <div key={msg.id} className="space-y-3">
              <div
                className={`flex gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-blue-400 border border-slate-700'
                  }`}
                >
                  {msg.sender === 'user' ? 'You' : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div className="prose prose-invert text-sm max-w-none whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 px-1">{msg.timestamp}</div>
                </div>
              </div>

              {/* Contextual UI Action Buttons (Displayed only for latest agent message) */}
              {isLatestAgentMessage && msg.recommendations && msg.recommendations.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-11 pt-1">
                  {msg.recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(rec, true)}
                      className="text-xs bg-slate-900/80 hover:bg-blue-950/70 text-slate-300 hover:text-blue-300 px-3.5 py-1.5 rounded-xl border border-slate-800 hover:border-blue-500/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      <span>{rec}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-xs py-2 pl-11">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Host Agent reasoning...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900/90 border-t border-darkBorder">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input, false);
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to your Host Agent career mentor..."
            className="flex-1 bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
