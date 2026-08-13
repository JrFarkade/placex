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
    <header className="h-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Search Bar */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search preparation modules, roadmap, ATS rules..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Target Goal & Placement Readiness Badges */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-900">
          <Target className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-slate-500">Target Goal:</span>
          <span className="font-bold text-indigo-700">{targetCompany || 'Not set'}</span>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-100 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-900">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-slate-500">Readiness:</span>
          <span className="font-bold text-emerald-700">
            {readinessScore !== null && readinessScore !== undefined ? `${readinessScore}/100` : 'Not calculated'}
          </span>
        </div>

        <button className="relative p-2.5 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></span>
        </button>

        {/* User Info Avatar & Logout */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900">{user?.full_name || 'Student Account'}</div>
            <div className="text-[10px] font-semibold text-slate-500 capitalize">{user?.role || 'Student'}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ml-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
