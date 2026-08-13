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
    <div className="flex flex-col h-[600px] bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Agent Header */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900">Host AI Career Mentor</h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100/80 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Personalized Career Guidance Engine</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#FBFBFE]">
        {messages.map((msg, index) => {
          const isLatestAgentMessage = msg.sender === 'agent' && index === messages.length - 1;

          return (
            <div key={msg.id} className="space-y-3">
              <div
                className={`flex gap-3 max-w-2xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-indigo-600 border border-slate-200'
                  }`}
                >
                  {msg.sender === 'user' ? 'You' : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10 font-medium'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs font-medium'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold px-1">{msg.timestamp}</div>
                </div>
              </div>

              {/* Contextual UI Action Buttons (Displayed only for latest agent message) */}
              {isLatestAgentMessage && msg.recommendations && msg.recommendations.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-12 pt-1">
                  {msg.recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(rec, true)}
                      className="text-xs bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 px-4 py-2 rounded-2xl border border-indigo-100 hover:border-indigo-300 flex items-center gap-2 transition-all cursor-pointer font-bold shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{rec}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold py-2 pl-12">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Host AI is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200/80">
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
            placeholder="Ask your AI Career Mentor anything..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs sm:text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
