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
      text: "Welcome to PlaceX. What career direction or role are you currently preparing for?",
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
    <div className="flex flex-col h-[600px] bg-white rounded-3xl border border-[#EAE7DF] shadow-xs overflow-hidden text-[#202321]">
      {/* Header */}
      <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EAE7DF] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#059669] flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#202321]">Host AI Career Companion</h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span> Active
              </span>
            </div>
            <p className="text-[11px] text-[#666B67] font-medium">Personalized Student Mentorship Engine</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#FAF8F5]/50">
        {messages.map((msg, index) => {
          const isLatestAgentMessage = msg.sender === 'agent' && index === messages.length - 1;

          return (
            <div key={msg.id} className="space-y-3">
              <div
                className={`flex gap-3.5 max-w-2xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#059669] text-white'
                      : 'bg-white text-[#059669] border border-[#EAE7DF]'
                  }`}
                >
                  {msg.sender === 'user' ? 'You' : <Bot className="w-4.5 h-4.5" />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#059669] text-white rounded-tr-none shadow-sm font-medium'
                        : 'bg-white border border-[#EAE7DF] text-[#202321] rounded-tl-none shadow-xs font-medium'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <div className="text-[10px] text-[#949A95] font-bold px-1">{msg.timestamp}</div>
                </div>
              </div>

              {/* Contextual Action Buttons */}
              {isLatestAgentMessage && msg.recommendations && msg.recommendations.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-12 pt-1">
                  {msg.recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(rec, true)}
                      className="text-xs bg-white hover:bg-[#E6F4EA] text-[#047857] hover:text-[#064E3B] px-4 py-2 rounded-2xl border border-[#BBF7D0] flex items-center gap-2 transition-all cursor-pointer font-extrabold shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                      <span>{rec}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3 text-[#666B67] text-xs font-bold py-2 pl-12">
            <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
            <span>Host AI is reasoning...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-[#EAE7DF]">
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
            placeholder="Ask your AI Career Companion anything..."
            className="flex-1 bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-5 py-3 text-xs sm:text-sm text-[#202321] font-semibold placeholder-[#949A95] focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
