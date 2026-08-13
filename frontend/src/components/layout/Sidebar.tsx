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
    { id: 'agent', label: 'Host AI Mentor', icon: Bot, badge: 'AI OS' },
    { id: 'resume', label: 'Resume Intelligence', icon: FileText },
    { id: 'coding', label: 'Coding Sandbox', icon: Code2 },
    { id: 'interview', label: 'Mock Interview', icon: Mic },
    { id: 'roadmap', label: 'Career Roadmap', icon: Map },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 z-30 shadow-sm">
      {/* Brand Header */}
      <div>
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Place<span className="text-indigo-600">X</span>
              </h1>
              <p className="text-[10px] text-purple-600 font-bold tracking-wider uppercase">Career Operating System</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Core Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFeature === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFeature(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50/80 text-indigo-700 border border-indigo-100 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile & Sign Out */}
      <div className="p-4 border-t border-slate-100 space-y-1.5 bg-slate-50/50">
        <button
          onClick={() => setActiveFeature('profile')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer ${
            activeFeature === 'profile' ? 'bg-white text-indigo-700 border-slate-200 shadow-xs' : ''
          }`}
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>Student Profile</span>
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
