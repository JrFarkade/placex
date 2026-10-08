import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Search, ShieldCheck, Target, Building2, LogOut, Compass, 
  Check, X, Edit2, ExternalLink, CheckCheck, BookOpen, Code2, Milestone, FileText 
} from 'lucide-react';
import axios from 'axios';

interface NavbarProps {
  user: any;
  token?: string | null;
  targetRole?: string | null;
  targetCompany?: string | null;
  readinessScore?: number | null;
  onUpdateTargetCompany?: (newCompany: string | null) => Promise<void>;
  onLogout?: () => void;
  onToggleAgent?: () => void;
  isAgentOpen?: boolean;
  setActiveFeature?: (feature: string) => void;
}

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: string;
  read: boolean;
  action_url?: string | null;
  created_at: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  token,
  targetRole = null,
  targetCompany = null, 
  readinessScore = null, 
  onUpdateTargetCompany,
  onLogout,
  onToggleAgent,
  isAgentOpen = false,
  setActiveFeature
}) => {
  // Target Company editing state
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyInput, setCompanyInput] = useState(targetCompany || '');
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const companyModalRef = useRef<HTMLDivElement>(null);

  // Sync company input if prop updates
  useEffect(() => {
    setCompanyInput(targetCompany || '');
  }, [targetCompany]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setIsLoadingNotifs(true);
      const res = await axios.get('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setNotifications(res.data.items || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleRefreshNotifs = () => fetchNotifications();
    window.addEventListener('placex:quiz-completed', handleRefreshNotifs);
    window.addEventListener('placex:profile-updated', handleRefreshNotifs);

    return () => {
      window.removeEventListener('placex:quiz-completed', handleRefreshNotifs);
      window.removeEventListener('placex:profile-updated', handleRefreshNotifs);
    };
  }, [token]);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (companyModalRef.current && !companyModalRef.current.contains(event.target as Node)) {
        setIsEditingCompany(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveCompany = async () => {
    if (!onUpdateTargetCompany) return;
    setIsSavingCompany(true);
    try {
      const trimmed = companyInput.trim();
      await onUpdateTargetCompany(trimmed.length > 0 ? trimmed : null);
      setIsEditingCompany(false);
    } catch (err) {
      console.error('Failed saving target company', err);
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleClearCompany = async () => {
    if (!onUpdateTargetCompany) return;
    setIsSavingCompany(true);
    try {
      setCompanyInput('');
      await onUpdateTargetCompany(null);
      setIsEditingCompany(false);
    } catch (err) {
      console.error('Failed clearing target company', err);
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;
    try {
      await axios.patch(`/api/v1/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await axios.post('/api/v1/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.action_url && setActiveFeature) {
      // Map url paths like /quiz, /coding, /roadmap, /resume to feature keys
      let target = notif.action_url.replace('/', '').toLowerCase();
      if (target === 'quiz') target = 'knowledge';
      setActiveFeature(target);
      setIsNotifOpen(false);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return <BookOpen className="w-4 h-4 text-sky-600" />;
      case 'coding':
        return <Code2 className="w-4 h-4 text-emerald-600" />;
      case 'roadmap':
        return <Milestone className="w-4 h-4 text-amber-600" />;
      case 'resume':
      case 'ats':
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <header className="h-20 border-b border-[#EAE7DF] bg-[#FFFFFF] px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Search Bar */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949A95]" />
          <input
            type="text"
            placeholder="Search PlaceX modules & skills..."
            className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#202321] placeholder-[#949A95] focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Target Goal, Target Company & Placement Readiness Badges */}
      <div className="flex items-center gap-3">
        {/* Target Role Badge */}
        <div className="flex items-center gap-2 bg-[#E6F4EA] border border-[#BBF7D0] px-3.5 py-2 rounded-full text-xs font-bold text-[#064E3B]">
          <Target className="w-4 h-4 text-[#059669]" />
          <span className="text-[#525753] font-medium">Target Role:</span>
          <span className="font-extrabold text-[#047857]">{targetRole || 'Not set'}</span>
        </div>

        {/* Target Company Badge (Separate & Editable) */}
        <div className="relative" ref={companyModalRef}>
          <button
            onClick={() => setIsEditingCompany(!isEditingCompany)}
            className="flex items-center gap-2 bg-[#F7F4EE] hover:bg-[#EAE7DF] border border-[#D5D0C5] px-3.5 py-2 rounded-full text-xs font-bold text-[#202321] transition-all cursor-pointer"
            title="Click to change target company"
          >
            <Building2 className="w-4 h-4 text-[#666B67]" />
            <span className="text-[#666B67] font-medium">Company:</span>
            <span className="font-extrabold text-[#202321]">{targetCompany || 'Not set'}</span>
            <Edit2 className="w-3 h-3 text-[#949A95] ml-1" />
          </button>

          {/* Target Company Edit Popover */}
          {isEditingCompany && (
            <div className="absolute top-12 left-0 w-72 bg-white rounded-2xl shadow-xl border border-[#EAE7DF] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-xs font-black text-[#202321] mb-2 flex items-center justify-between">
                <span>Set Target Company</span>
                <button 
                  onClick={() => setIsEditingCompany(false)}
                  className="p-1 text-[#949A95] hover:text-[#202321] rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-[#666B67] mb-3 leading-relaxed">
                Specify your dream employer or leave blank for general role preparation.
              </p>
              <input
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="e.g. Google, Microsoft, Startup"
                className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-xl px-3 py-2 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] mb-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCompany();
                  if (e.key === 'Escape') setIsEditingCompany(false);
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleClearCompany}
                  disabled={isSavingCompany}
                  className="px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                >
                  Clear
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingCompany(false)}
                    disabled={isSavingCompany}
                    className="px-3 py-1.5 text-[11px] font-bold text-[#666B67] hover:bg-[#FAF8F5] rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCompany}
                    disabled={isSavingCompany}
                    className="px-3 py-1.5 text-[11px] font-black text-white bg-[#059669] hover:bg-[#047857] rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingCompany ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Readiness Score Badge */}
        <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-2 rounded-full text-xs font-bold text-[#065F46]">
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          <span className="text-[#525753] font-medium">Readiness:</span>
          <span className="font-extrabold text-[#047857]">
            {readinessScore !== null && readinessScore !== undefined ? `${readinessScore}/100` : 'Not calculated'}
          </span>
        </div>

        {/* Host Agent Switcher Button */}
        {onToggleAgent && (
          <button
            onClick={onToggleAgent}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer border ${
              isAgentOpen
                ? 'bg-[#059669] text-white border-[#059669] shadow-xs'
                : 'bg-[#FAF8F5] hover:bg-[#E6F4EA] text-[#202321] hover:text-[#064E3B] border-[#EAE7DF]'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${isAgentOpen ? 'text-white' : 'text-[#059669]'}`} />
            <span>HOST AGENT</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isAgentOpen ? 'bg-white' : 'bg-[#059669] animate-pulse'}`}></span>
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2.5 text-[#666B67] hover:text-[#202321] rounded-2xl hover:bg-[#FAF8F5] transition-all cursor-pointer"
            title="Placement Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-96 bg-white rounded-3xl shadow-2xl border border-[#EAE7DF] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF] mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-[#202321]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-[#047857] hover:underline cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {isLoadingNotifs && notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-[#949A95]">
                    Loading updates...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs font-medium text-[#666B67]">
                    You have no notifications right now.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        item.read 
                          ? 'bg-[#FAF8F5]/60 border-[#EAE7DF] opacity-75 hover:opacity-100 hover:bg-[#FAF8F5]' 
                          : 'bg-white border-[#BBF7D0] shadow-xs hover:border-[#059669]'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-[#F0FDF4] shrink-0 mt-0.5">
                        {getNotifIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs font-black text-[#202321] truncate">
                            {item.title}
                          </h4>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#666B67] line-clamp-2 leading-relaxed mb-1.5 font-medium">
                          {item.message}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-[#949A95] font-semibold">
                          <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {item.action_url && (
                            <span className="text-[#059669] font-bold flex items-center gap-0.5 hover:underline">
                              <span>Open module</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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

export default Navbar;
