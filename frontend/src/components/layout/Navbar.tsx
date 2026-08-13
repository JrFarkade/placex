import React from 'react';
import { Bell, Search, ShieldCheck, Target, LogOut } from 'lucide-react';

interface NavbarProps {
  user: any;
  targetCompany?: string | null;
  readinessScore?: number | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, targetCompany = null, readinessScore = null, onLogout }) => {
  return (
    <header className="h-16 border-b border-darkBorder bg-darkCard/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions, companies, ATS rules..."
            className="w-full bg-darkBg border border-darkBorder rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Target & Placement Readiness Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs">
          <Target className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Target Goal:</span>
          <span className="font-semibold text-slate-200">{targetCompany || 'Not set'}</span>
        </div>

        <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-800/40 px-3 py-1 rounded-full text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Readiness:</span>
          <span className="font-bold text-emerald-400">
            {readinessScore !== null && readinessScore !== undefined ? `${readinessScore}/100` : 'Not calculated'}
          </span>
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
        </button>

        {/* User Info Avatar & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-darkBorder">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200">{user?.full_name || 'Student Account'}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role || 'Student'}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
