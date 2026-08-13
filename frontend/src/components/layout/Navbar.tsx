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
    <header className="h-20 border-b border-[#EAE7DF] bg-[#FFFFFF] px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Search Bar */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949A95]" />
          <input
            type="text"
            placeholder="Search career modules, ATS rules, roadmap..."
            className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#202321] placeholder-[#949A95] focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Target Goal & Placement Readiness Badges */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#E6F4EA] border border-[#BBF7D0] px-4 py-2 rounded-full text-xs font-bold text-[#064E3B]">
          <Target className="w-4 h-4 text-[#059669]" />
          <span className="text-[#525753] font-medium">Target Role:</span>
          <span className="font-extrabold text-[#047857]">{targetCompany || 'Not set'}</span>
        </div>

        <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-2 rounded-full text-xs font-bold text-[#065F46]">
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          <span className="text-[#525753] font-medium">Readiness:</span>
          <span className="font-extrabold text-[#047857]">
            {readinessScore !== null && readinessScore !== undefined ? `${readinessScore}/100` : 'Not calculated'}
          </span>
        </div>

        <button className="relative p-2.5 text-[#666B67] hover:text-[#202321] rounded-2xl hover:bg-[#FAF8F5] transition-all cursor-pointer">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#059669] rounded-full"></span>
        </button>

        {/* User Info Avatar & Logout */}
        <div className="flex items-center gap-3.5 pl-4 border-l border-[#EAE7DF]">
          <div className="w-10 h-10 rounded-2xl bg-[#059669] flex items-center justify-center font-black text-sm text-white shadow-xs">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-extrabold text-[#202321]">{user?.full_name || 'Student Account'}</div>
            <div className="text-[10px] font-bold text-[#666B67] capitalize">{user?.role || 'Student'}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 text-[#666B67] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ml-1 cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
