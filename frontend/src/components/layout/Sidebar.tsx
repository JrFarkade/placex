import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  FileText, 
  Code2, 
  Mic, 
  Map, 
  BookOpen, 
  BarChart3, 
  User, 
  LogOut,
  Sparkles,
  Compass
} from 'lucide-react';

interface SidebarProps {
  activeFeature: string;
  setActiveFeature: (feature: string) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agent', label: 'Host AI Mentor', icon: Bot, badge: 'AI OS' },
    { id: 'resume', label: 'Resume Intelligence', icon: FileText },
    { id: 'coding', label: 'Coding Sandbox', icon: Code2 },
    { id: 'interview', label: 'Mock Interview', icon: Mic },
    { id: 'roadmap', label: 'Career Roadmap', icon: Map },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-72 bg-[#FFFFFF] border-r border-[#EAE7DF] flex flex-col justify-between h-screen sticky top-0 z-30 shadow-xs">
      <div>
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-[#F4F1EA]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#059669] flex items-center justify-center shadow-sm shadow-[#059669]/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#202321] tracking-tight">
                Place<span className="text-[#059669]">X</span>
              </h1>
              <p className="text-[11px] text-[#666B67] font-bold tracking-wider uppercase">Career Workspace</p>
            </div>
          </div>
        </div>

        {/* Core Modules Section Label & Navigation Items */}
        <div className="p-4 space-y-2">
          <div className="px-4 pt-3 pb-1 text-[11px] font-extrabold text-[#949A95] uppercase tracking-widest">
            CORE MODULES
          </div>
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeFeature === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveFeature(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[15px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#059669] text-white shadow-md shadow-[#059669]/20'
                      : 'text-[#525753] hover:text-[#202321] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#666B67]'}`} />
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#E6F4EA] text-[#047857]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Profile / Sign Out */}
      <div className="p-4 border-t border-[#F4F1EA] space-y-2 bg-[#FAF8F5]">
        <button
          onClick={() => setActiveFeature('profile')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold text-[#525753] hover:text-[#202321] hover:bg-white border border-transparent hover:border-[#EAE7DF] transition-all cursor-pointer ${
            activeFeature === 'profile' ? 'bg-white text-[#059669] border-[#EAE7DF] shadow-xs' : ''
          }`}
        >
          <User className="w-5 h-5 text-[#666B67]" />
          <span>Student Profile</span>
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-rose-500" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
