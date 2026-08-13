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
  Settings, 
  LogOut,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeFeature: string;
  setActiveFeature: (feature: string) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agent', label: 'Host Agent', icon: Bot, badge: 'AI OS' },
    { id: 'resume', label: 'Resume Intelligence', icon: FileText },
    { id: 'coding', label: 'Coding Sandbox', icon: Code2 },
    { id: 'interview', label: 'Mock Interview', icon: Mic },
    { id: 'roadmap', label: 'Learning Roadmap', icon: Map },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-darkCard border-r border-darkBorder flex flex-col justify-between h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-darkBorder">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
                PlaceX
              </h1>
              <p className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Career AI OS</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Core Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFeature === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFeature(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile / Settings / Sign Out */}
      <div className="p-3 border-t border-darkBorder space-y-1">
        <button
          onClick={() => setActiveFeature('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 ${
            activeFeature === 'profile' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          <User className="w-4 h-4" />
          <span>Student Profile</span>
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
