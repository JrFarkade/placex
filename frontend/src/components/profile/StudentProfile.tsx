import React, { useState, useEffect, useMemo } from 'react';
import { 
  ExternalLink, 
  Trash2, 
  Edit3, 
  X, 
  AlertCircle, 
  Loader2,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Flame,
  Trophy,
  Activity,
  FolderGit2,
  Star,
  GitFork,
  Search,
  SlidersHorizontal,
  Code2
} from 'lucide-react';
import axios from 'axios';

interface StudentProfileProps {
  token: string;
  user: any;
}

interface ContributionDay {
  date: string;
  contributionCount: number;
  contributionLevel: string;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface ContributionsData {
  username: string;
  totalContributions: number;
  weeks: ContributionWeek[];
}

interface GithubRepo {
  id: number;
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updated_at: string;
  html_url: string;
  is_private: boolean;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ token, user }) => {
  const [connectedProfiles, setConnectedProfiles] = useState<Record<string, any>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // GitHub Contributions State
  const [contributionsData, setContributionsData] = useState<ContributionsData | null>(null);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [contributionsError, setContributionsError] = useState('');
  const [refreshingContributions, setRefreshingContributions] = useState(false);

  // GitHub Repositories State
  const [reposList, setReposList] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState('');

  // View All Repositories Modal State
  const [showViewAllReposModal, setShowViewAllReposModal] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoSort, setRepoSort] = useState<'updated' | 'stars' | 'forks' | 'name'>('updated');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');

  // Active Tooltip State for Heatmap Cell
  const [hoveredDay, setHoveredDay] = useState<{ day: ContributionDay; x: number; y: number } | null>(null);

  // Modal States for Add/Edit LinkedIn or LeetCode URL
  const [urlModalPlatform, setUrlModalPlatform] = useState<'linkedin' | 'leetcode' | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  // GitHub Edit Account Settings Modal
  const [showGitHubEditModal, setShowGitHubEditModal] = useState(false);

  // Disconnect Confirmation Modal
  const [disconnectPlatform, setDisconnectPlatform] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // Utility function to extract display username formatted as @username
  const formatDisplayUsername = (platform: string, rawUsername?: string, profileUrl?: string): string => {
    if (rawUsername && rawUsername.trim() && !rawUsername.includes('://')) {
      const clean = rawUsername.replace(/^@/, '');
      return `@${clean}`;
    }
    if (!profileUrl) return '@profile';

    try {
      const cleanUrl = profileUrl.split('?')[0].split('#')[0].replace(/\/+$/, '');
      const parts = cleanUrl.split('/');
      const lastPart = parts[parts.length - 1];

      if (platform === 'linkedin') {
        const inIdx = parts.indexOf('in');
        if (inIdx !== -1 && inIdx + 1 < parts.length) {
          return `@${parts[inIdx + 1]}`;
        }
      } else if (platform === 'leetcode') {
        const uIdx = parts.indexOf('u');
        if (uIdx !== -1 && uIdx + 1 < parts.length) {
          return `@${parts[uIdx + 1]}`;
        }
      }
      return `@${lastPart || 'profile'}`;
    } catch (e) {
      return '@profile';
    }
  };

  const fetchConnectedProfiles = async () => {
    try {
      const res = await axios.get('/api/v1/auth/profiles/connected', authHeader);
      const data = res.data || {};
      setConnectedProfiles(data);

      if (data.github) {
        fetchGitHubContributions();
        fetchGitHubRepos();
      }
    } catch (e) {
      console.warn("Failed fetching connected profiles");
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchGitHubContributions = async (isRefresh = false) => {
    if (isRefresh) setRefreshingContributions(true);
    else setLoadingContributions(true);
    setContributionsError('');

    try {
      const res = await axios.get('/api/v1/auth/github/contributions', authHeader);
      setContributionsData(res.data);
    } catch (e: any) {
      setContributionsError(
        e.response?.data?.detail || "Unable to load GitHub contribution activity right now."
      );
    } finally {
      setLoadingContributions(false);
      setRefreshingContributions(false);
    }
  };

  const fetchGitHubRepos = async () => {
    setLoadingRepos(true);
    setReposError('');

    try {
      const res = await axios.get('/api/v1/auth/github/repos', authHeader);
      setReposList(res.data?.repositories || []);
    } catch (e: any) {
      setReposError(
        e.response?.data?.detail || "Unable to load repositories right now."
      );
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchConnectedProfiles();

    // Check query params for OAuth status (e.g. ?connected=github or ?error=...)
    const params = new URLSearchParams(window.location.search);
    const connectedParam = params.get('connected');
    const errorParam = params.get('error');

    if (connectedParam === 'github') {
      setSuccessMsg("GitHub connected successfully.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorParam) {
      setErrorMsg(decodeURIComponent(errorParam));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle GitHub OAuth Connect
  const handleConnectGitHub = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setShowGitHubEditModal(false);
    try {
      const res = await axios.get('/api/v1/auth/github/login', authHeader);
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || "Couldn't connect to GitHub. Please try again.");
    }
  };

  // Open Modal to Add/Edit Profile URL for LinkedIn or LeetCode
  const handleOpenUrlModal = (platform: 'linkedin' | 'leetcode') => {
    setUrlModalPlatform(platform);
    setInputUrl(connectedProfiles[platform]?.profile_url || '');
    setUrlError('');
  };

  // Save Profile URL (LinkedIn / LeetCode)
  const handleSaveProfileUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlModalPlatform) return;
    setUrlError('');
    setSavingUrl(true);

    try {
      await axios.post(
        '/api/v1/auth/profiles/connected/url',
        { platform: urlModalPlatform, url: inputUrl },
        authHeader
      );

      setSuccessMsg(urlModalPlatform === 'linkedin' ? "LinkedIn profile updated." : "LeetCode profile updated.");
      setUrlModalPlatform(null);
      fetchConnectedProfiles();
    } catch (err: any) {
      setUrlError(err.response?.data?.detail || `Enter a valid ${urlModalPlatform === 'linkedin' ? 'LinkedIn' : 'LeetCode'} profile URL.`);
    } finally {
      setSavingUrl(false);
    }
  };

  // Disconnect Profile
  const handleConfirmDisconnect = async () => {
    if (!disconnectPlatform) return;
    setDisconnecting(true);

    try {
      await axios.delete(`/api/v1/auth/profiles/connected/${disconnectPlatform}`, authHeader);
      setSuccessMsg(`${disconnectPlatform.charAt(0).toUpperCase() + disconnectPlatform.slice(1)} disconnected.`);
      if (disconnectPlatform === 'github') {
        setContributionsData(null);
        setReposList([]);
      }
      setDisconnectPlatform(null);
      setShowGitHubEditModal(false);
      fetchConnectedProfiles();
    } catch (e) {
      setErrorMsg("Failed to disconnect profile. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  // Calculate Heatmap Metrics
  const calculatedMetrics = useMemo(() => {
    if (!contributionsData || !contributionsData.weeks) {
      return { longestStreak: 0, currentStreak: 0, maxDay: null };
    }

    let allDays: ContributionDay[] = [];
    contributionsData.weeks.forEach(w => {
      if (w.contributionDays) {
        allDays.push(...w.contributionDays);
      }
    });

    let longestStreak = 0;
    let tempStreak = 0;
    let maxDay: ContributionDay | null = null;

    allDays.forEach(d => {
      if (d.contributionCount > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }

      if (!maxDay || d.contributionCount > maxDay.contributionCount) {
        maxDay = d;
      }
    });

    // Calculate current streak backward from latest day
    let currentStreak = 0;
    for (let i = allDays.length - 1; i >= 0; i--) {
      if (allDays[i].contributionCount > 0) {
        currentStreak++;
      } else if (i === allDays.length - 1) {
        continue;
      } else {
        break;
      }
    }

    return { longestStreak, currentStreak, maxDay };
  }, [contributionsData]);

  // Compute month headers over week columns
  const monthHeaders = useMemo(() => {
    if (!contributionsData || !contributionsData.weeks) return [];
    const headers: { monthName: string; colIndex: number }[] = [];
    let lastMonth = '';

    contributionsData.weeks.forEach((week, idx) => {
      const firstDay = week.contributionDays?.[0];
      if (firstDay && firstDay.date) {
        const d = new Date(firstDay.date);
        const monthName = d.toLocaleString('en-US', { month: 'short' });
        if (monthName !== lastMonth) {
          headers.push({ monthName, colIndex: idx });
          lastMonth = monthName;
        }
      }
    });
    return headers;
  }, [contributionsData]);

  // Dynamic Languages list extracted from repositories
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    reposList.forEach(r => {
      if (r.language && r.language !== 'Other') {
        langs.add(r.language);
      }
    });
    return ['All', ...Array.from(langs).sort()];
  }, [reposList]);

  // Filtered & Sorted Repositories
  const filteredAndSortedRepos = useMemo(() => {
    let result = [...reposList];

    // Filter by Language
    if (selectedLanguage !== 'All') {
      result = result.filter(r => r.language === selectedLanguage);
    }

    // Search by Name or Description
    if (repoSearch.trim()) {
      const q = repoSearch.toLowerCase().trim();
      result = result.filter(
        r => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (repoSort === 'stars') return b.stars - a.stars;
      if (repoSort === 'forks') return b.forks - a.forks;
      if (repoSort === 'name') return a.name.localeCompare(b.name);
      // default: updated
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  }, [reposList, selectedLanguage, repoSearch, repoSort]);

  // Get color for contribution level
  const getCellColorClass = (level: string, count: number) => {
    if (count === 0 || level === 'NONE') return 'bg-[#FAF8F5] border-[#EAE7DF]';
    if (level === 'FIRST_QUARTILE') return 'bg-[#D1FAE5] border-[#A7F3D0]';
    if (level === 'SECOND_QUARTILE') return 'bg-[#6EE7B7] border-[#34D399]';
    if (level === 'THIRD_QUARTILE') return 'bg-[#10B981] border-[#059669]';
    return 'bg-[#047857] border-[#064E3B]';
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Human-readable time ago helper
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Updated recently';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Updated today';
      if (diffDays === 1) return 'Updated yesterday';
      if (diffDays < 7) return `Updated ${diffDays} days ago`;
      if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      return `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return 'Updated recently';
    }
  };

  // Color dot helper for programming languages
  const getLanguageColor = (lang: string) => {
    const map: Record<string, string> = {
      Python: '#3572A5',
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Java: '#b07219',
      'C++': '#f34b7d',
      C: '#555555',
      Go: '#00ADD8',
      Rust: '#dea584',
      PHP: '#4F5D95',
      Ruby: '#701516',
      Shell: '#89e051'
    };
    return map[lang] || '#059669';
  };

  const gh = connectedProfiles.github;
  const li = connectedProfiles.linkedin;
  const lc = connectedProfiles.leetcode;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 text-[#202321]">
      
      {/* 1. Student Profile Header */}
      <div className="bg-white p-8 rounded-3xl border border-[#EAE7DF] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center text-2xl font-black shadow-xs">
            {user?.full_name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#202321]">{user?.full_name || 'Student Profile'}</h1>
            <p className="text-xs text-[#666B67] font-medium">{user?.email}</p>
            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF8F5] text-[#059669] border border-[#EAE7DF] uppercase">
              {user?.role || 'Student'}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#047857] text-xs font-extrabold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-[#047857] hover:text-[#064E3B]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-extrabold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. CONNECTED PROFILES SECTION */}
      <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#202321]">CONNECTED PROFILES</h2>
          <p className="text-xs text-[#666B67] font-medium">Connect your professional and coding profiles.</p>
        </div>

        {loadingProfiles ? (
          <div className="py-8 text-center text-xs text-[#666B67] font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
            <span>Loading connected profiles...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            
            {/* --- GITHUB CARD --- */}
            <div className="p-5 sm:p-6 rounded-3xl border border-[#EAE7DF] bg-[#FAF8F5]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-white">
              <div className="flex items-center gap-4 min-w-0">
                {/* Official GitHub Logo */}
                <div className="w-11 h-11 rounded-2xl bg-[#24292e] text-white flex items-center justify-center shadow-xs shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>

                <div className="space-y-1">
                  {/* FIRST LINE: Platform Name + Connected ✓ */}
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-black text-[#202321]">GitHub</h3>
                    {gh ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                        Connected ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF8F5] text-[#949A95] border border-[#EAE7DF]">
                        Not connected
                      </span>
                    )}
                  </div>

                  {/* SECOND LINE: @username */}
                  {gh ? (
                    <p className="text-xs font-black text-[#059669]">
                      {formatDisplayUsername('github', gh.username, gh.profile_url)}
                    </p>
                  ) : (
                    <p className="text-xs text-[#666B67] font-medium">Connect your GitHub account</p>
                  )}
                </div>
              </div>

              {/* Actions: Open Platform ↗ -> Edit Icon ✎ */}
              <div className="flex items-center gap-2.5 shrink-0 sm:self-center">
                {gh ? (
                  <>
                    <a
                      href={gh.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
                    >
                      <span>Open GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => setShowGitHubEditModal(true)}
                      aria-label="Manage GitHub connection"
                      title="Manage GitHub connection"
                      className="p-2.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnectGitHub}
                    className="px-5 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
                  >
                    <span>Connect GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* --- LINKEDIN CARD --- */}
            <div className="p-5 sm:p-6 rounded-3xl border border-[#EAE7DF] bg-[#FAF8F5]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-white">
              <div className="flex items-center gap-4 min-w-0">
                {/* Official LinkedIn Logo */}
                <div className="w-11 h-11 rounded-2xl bg-[#0A66C2] text-white flex items-center justify-center shadow-xs shrink-0 font-bold text-xl">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.64a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z" />
                  </svg>
                </div>

                <div className="space-y-1">
                  {/* FIRST LINE: Platform Name + Connected ✓ */}
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-black text-[#202321]">LinkedIn</h3>
                    {li ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                        Connected ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF8F5] text-[#949A95] border border-[#EAE7DF]">
                        Not connected
                      </span>
                    )}
                  </div>

                  {/* SECOND LINE: @username */}
                  {li ? (
                    <p className="text-xs font-black text-[#0A66C2]">
                      {formatDisplayUsername('linkedin', li.username, li.profile_url)}
                    </p>
                  ) : (
                    <p className="text-xs text-[#666B67] font-medium">Add your LinkedIn profile</p>
                  )}
                </div>
              </div>

              {/* Actions: Open Platform ↗ -> Edit Icon ✎ */}
              <div className="flex items-center gap-2.5 shrink-0 sm:self-center">
                {li ? (
                  <>
                    <a
                      href={li.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-2xl bg-[#0A66C2] hover:bg-[#084e96] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#0A66C2]/20 transition-all cursor-pointer"
                    >
                      <span>Open LinkedIn</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleOpenUrlModal('linkedin')}
                      aria-label="Edit LinkedIn profile"
                      title="Edit LinkedIn profile URL"
                      className="p-2.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenUrlModal('linkedin')}
                    className="px-5 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <span>Add Profile</span>
                  </button>
                )}
              </div>
            </div>

            {/* --- LEETCODE CARD --- */}
            <div className="p-5 sm:p-6 rounded-3xl border border-[#EAE7DF] bg-[#FAF8F5]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-white">
              <div className="flex items-center gap-4 min-w-0">
                {/* Official LeetCode Logo */}
                <div className="w-11 h-11 rounded-2xl bg-[#FFA116] text-white flex items-center justify-center shadow-xs shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863 0-.713.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.645 1.837-.645s1.357.178 1.823.645l2.697 2.607c.236.236.63.236.866 0l1.41-1.41c.236-.236.236-.63 0-.866L15.688 6.04c-.958-.958-2.316-1.54-3.791-1.54-1.474 0-2.832.582-3.79 1.54L3.788 10.38c-.958.958-1.54 2.316-1.54 3.79 0 1.474.582 2.832 1.54 3.79l4.319 4.363c.958.958 2.316 1.54 3.79 1.54 1.475 0 2.833-.582 3.791-1.54l2.697-2.607c.236-.236.236-.63 0-.866l-1.41-1.41c-.236-.236-.63-.236-.866 0z" />
                  </svg>
                </div>

                <div className="space-y-1">
                  {/* FIRST LINE: Platform Name + Connected ✓ */}
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-black text-[#202321]">LeetCode</h3>
                    {lc ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E6F4EA] text-[#047857] border border-[#BBF7D0]">
                        Connected ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF8F5] text-[#949A95] border border-[#EAE7DF]">
                        Not connected
                      </span>
                    )}
                  </div>

                  {/* SECOND LINE: @username */}
                  {lc ? (
                    <p className="text-xs font-black text-[#FFA116]">
                      {formatDisplayUsername('leetcode', lc.username, lc.profile_url)}
                    </p>
                  ) : (
                    <p className="text-xs text-[#666B67] font-medium">Add your coding profile</p>
                  )}
                </div>
              </div>

              {/* Actions: Open Platform ↗ -> Edit Icon ✎ */}
              <div className="flex items-center gap-2.5 shrink-0 sm:self-center">
                {lc ? (
                  <>
                    <a
                      href={lc.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-2xl bg-[#FFA116] hover:bg-[#e58f0e] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#FFA116]/20 transition-all cursor-pointer"
                    >
                      <span>Open LeetCode</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleOpenUrlModal('leetcode')}
                      aria-label="Edit LeetCode profile"
                      title="Edit LeetCode profile URL"
                      className="p-2.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-[#666B67] hover:text-[#202321] transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenUrlModal('leetcode')}
                    className="px-5 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <span>Add Profile</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 3. NATIVE GITHUB CONTRIBUTION ACTIVITY SECTION */}
      <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#F4F1EA] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#059669]" />
              <h2 className="text-xl font-black text-[#202321]">GitHub Activity</h2>
            </div>
            {gh && contributionsData && !loadingContributions && !contributionsError && (
              <p className="text-xs text-[#666B67] font-extrabold">
                <span className="text-[#059669] font-black">{contributionsData.totalContributions}</span> contributions in the last year
              </p>
            )}
          </div>

          {gh && (
            <button
              onClick={() => fetchGitHubContributions(true)}
              disabled={loadingContributions || refreshingContributions}
              className="px-4 py-2 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#059669] ${refreshingContributions ? 'animate-spin' : ''}`} />
              <span>{refreshingContributions ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>

        {/* STATE A: Disconnected */}
        {!gh && (
          <div className="py-12 text-center space-y-4 bg-[#FAF8F5]/50 rounded-3xl border border-dashed border-[#EAE7DF] p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center mx-auto shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-black text-[#202321]">Connect GitHub to see your contribution activity</h3>
              <p className="text-xs text-[#666B67] font-medium">Link your GitHub account to showcase your real development activity heatmap inside PlaceX.</p>
            </div>
            <button
              onClick={handleConnectGitHub}
              className="px-5 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
            >
              <span>Connect GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STATE B: Loading */}
        {gh && loadingContributions && (
          <div className="py-12 text-center text-xs text-[#666B67] font-bold flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
            <span>Loading GitHub contribution activity...</span>
          </div>
        )}

        {/* STATE C: Error */}
        {gh && !loadingContributions && contributionsError && (
          <div className="py-10 text-center space-y-4 bg-rose-50/50 rounded-3xl border border-rose-200 p-6">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-sm font-black text-rose-900">Unable to load contribution activity right now</h3>
              <p className="text-xs text-rose-600 font-medium">{contributionsError}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fetchGitHubContributions()}
                className="px-4 py-2 rounded-2xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={handleConnectGitHub}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              >
                Reconnect GitHub
              </button>
            </div>
          </div>
        )}

        {/* STATE D: Contribution Calendar Heatmap */}
        {gh && !loadingContributions && !contributionsError && contributionsData && (
          <div className="space-y-6">
            
            {/* Scrollable Heatmap Box */}
            <div className="relative overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-gray-300">
              <div className="min-w-[720px] select-none">
                
                {/* Month Labels Row */}
                <div className="flex text-[10px] font-extrabold text-[#666B67] mb-2 pl-7">
                  {monthHeaders.map((m, idx) => (
                    <div
                      key={idx}
                      className="truncate"
                      style={{
                        width: `${(100 / Math.max(contributionsData.weeks.length, 1)) * 4.3}%`,
                        marginLeft: idx === 0 ? 0 : undefined
                      }}
                    >
                      {m.monthName}
                    </div>
                  ))}
                </div>

                {/* Heatmap Grid & Day Labels */}
                <div className="flex gap-2 items-start">
                  
                  {/* Day Labels (Mon, Wed, Fri) */}
                  <div className="flex flex-col justify-between h-[104px] text-[9px] font-bold text-[#949A95] pr-1 pt-1.5">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                  </div>

                  {/* Weeks Columns Grid */}
                  <div className="flex gap-[3px] flex-1">
                    {contributionsData.weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-[3px]">
                        {week.contributionDays?.map((day, dIdx) => (
                          <div
                            key={dIdx}
                            tabIndex={0}
                            aria-label={`${day.contributionCount} contributions on ${formatDateLabel(day.date)}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredDay({
                                day,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8
                              });
                            }}
                            onMouseLeave={() => setHoveredDay(null)}
                            className={`w-3 h-3 rounded-[3px] border transition-all cursor-pointer hover:scale-125 hover:z-20 ${getCellColorClass(day.contributionLevel, day.contributionCount)}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center justify-end gap-2 pt-4 text-[10px] font-bold text-[#666B67]">
                  <span>Less</span>
                  <div className="flex items-center gap-[3px]">
                    <div className="w-3 h-3 rounded-[3px] bg-[#FAF8F5] border border-[#EAE7DF]" />
                    <div className="w-3 h-3 rounded-[3px] bg-[#D1FAE5] border border-[#A7F3D0]" />
                    <div className="w-3 h-3 rounded-[3px] bg-[#6EE7B7] border border-[#34D399]" />
                    <div className="w-3 h-3 rounded-[3px] bg-[#10B981] border border-[#059669]" />
                    <div className="w-3 h-3 rounded-[3px] bg-[#047857] border border-[#064E3B]" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Hover Tooltip Overlay */}
            {hoveredDay && (
              <div
                className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-[#202321] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xl space-y-0.5 border border-[#333734]"
                style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
              >
                <p className="text-[#6EE7B7]">
                  {hoveredDay.day.contributionCount === 0
                    ? 'No contributions'
                    : `${hoveredDay.day.contributionCount} contribution${hoveredDay.day.contributionCount === 1 ? '' : 's'}`}
                </p>
                <p className="text-gray-300 text-[10px] font-medium">{formatDateLabel(hoveredDay.day.date)}</p>
              </div>
            )}

            {/* Contribution Activity Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4EA] text-[#059669] flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#666B67] uppercase">Longest Streak</p>
                  <p className="text-sm font-black text-[#202321]">{calculatedMetrics.longestStreak} days</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4EA] text-[#059669] flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#666B67] uppercase">Current Streak</p>
                  <p className="text-sm font-black text-[#202321]">{calculatedMetrics.currentStreak} days</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4EA] text-[#059669] flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-[#666B67] uppercase">Most Active Day</p>
                  <p className="text-sm font-black text-[#202321] truncate">
                    {calculatedMetrics.maxDay && calculatedMetrics.maxDay.contributionCount > 0
                      ? `${calculatedMetrics.maxDay.contributionCount} on ${formatDateLabel(calculatedMetrics.maxDay.date)}`
                      : 'None'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 4. NATIVE GITHUB REPOSITORIES SECTION */}
      <div className="bg-white p-7 rounded-3xl border border-[#EAE7DF] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#F4F1EA] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <FolderGit2 className="w-5 h-5 text-[#059669]" />
              <h2 className="text-xl font-black text-[#202321]">GitHub Repositories</h2>
            </div>
            <p className="text-xs text-[#666B67] font-medium">Your public repositories</p>
          </div>

          {gh && reposList.length > 6 && (
            <button
              onClick={() => setShowViewAllReposModal(true)}
              className="px-4 py-2 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span>View All Repositories ({reposList.length})</span>
            </button>
          )}
        </div>

        {/* STATE A: Disconnected */}
        {!gh && (
          <div className="py-12 text-center space-y-4 bg-[#FAF8F5]/50 rounded-3xl border border-dashed border-[#EAE7DF] p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#BBF7D0] text-[#059669] flex items-center justify-center mx-auto shadow-xs">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-black text-[#202321]">Connect GitHub to see your repositories</h3>
              <p className="text-xs text-[#666B67] font-medium">Link your GitHub account to showcase your public repositories natively inside PlaceX.</p>
            </div>
            <button
              onClick={handleConnectGitHub}
              className="px-5 py-2.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
            >
              <span>Connect GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STATE B: Loading Skeleton */}
        {gh && loadingRepos && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-5 rounded-3xl border border-[#EAE7DF] bg-[#FAF8F5]/50 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-200 rounded-md w-3/4" />
                <div className="h-3 bg-gray-200 rounded-md w-full" />
                <div className="h-3 bg-gray-200 rounded-md w-1/2" />
                <div className="flex justify-between pt-2">
                  <div className="h-3 bg-gray-200 rounded-md w-1/4" />
                  <div className="h-3 bg-gray-200 rounded-md w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATE C: Error */}
        {gh && !loadingRepos && reposError && (
          <div className="py-10 text-center space-y-4 bg-rose-50/50 rounded-3xl border border-rose-200 p-6">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-sm font-black text-rose-900">Unable to load repositories right now</h3>
              <p className="text-xs text-rose-600 font-medium">{reposError}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={fetchGitHubRepos}
                className="px-4 py-2 rounded-2xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={handleConnectGitHub}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              >
                Reconnect GitHub
              </button>
            </div>
          </div>
        )}

        {/* STATE D: Empty Public Repositories */}
        {gh && !loadingRepos && !reposError && reposList.length === 0 && (
          <div className="py-10 text-center space-y-4 bg-[#FAF8F5]/50 rounded-3xl border border-[#EAE7DF] p-6">
            <FolderGit2 className="w-8 h-8 text-[#949A95] mx-auto" />
            <p className="text-xs font-bold text-[#666B67]">No public repositories found.</p>
            <a
              href={gh.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Open GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* STATE E: Display Initial 6 Repositories Grid */}
        {gh && !loadingRepos && !reposError && reposList.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reposList.slice(0, 6).map(repo => (
                <div
                  key={repo.id}
                  className="p-5 sm:p-6 rounded-3xl border border-[#EAE7DF] bg-[#FAF8F5]/50 flex flex-col justify-between gap-4 transition-all hover:bg-white hover:border-[#059669]/30 hover:shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-[#202321] truncate" title={repo.name}>
                        {repo.name}
                      </h3>
                      {repo.is_private && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Private
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#666B67] font-medium line-clamp-2 leading-relaxed">
                      {repo.description || 'No description'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#F4F1EA]">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#666B67]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getLanguageColor(repo.language) }}
                          />
                          <span>{repo.language}</span>
                        </span>

                        <span className="flex items-center gap-1 text-[#202321]">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{repo.stars}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <GitFork className="w-3.5 h-3.5 text-[#666B67]" />
                          <span>{repo.forks}</span>
                        </span>
                      </div>

                      <span className="text-[10px] text-[#949A95] font-semibold">
                        {formatTimeAgo(repo.updated_at)}
                      </span>
                    </div>

                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-[#202321] hover:text-[#059669] font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <span>Open Repository</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {reposList.length > 6 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowViewAllReposModal(true)}
                  className="px-6 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-md shadow-[#059669]/20 transition-all cursor-pointer"
                >
                  <span>View All Repositories ({reposList.length})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL: VIEW ALL REPOSITORIES --- */}
      {showViewAllReposModal && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-4">
              <div>
                <h3 className="text-xl font-black text-[#202321]">GitHub Repositories</h3>
                <p className="text-xs text-[#666B67] font-medium">{filteredAndSortedRepos.length} repositories shown</p>
              </div>
              <button onClick={() => setShowViewAllReposModal(false)} className="p-1 text-[#666B67] hover:text-[#202321]">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Controls Toolbar: Search, Sort, Language Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#949A95] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={e => setRepoSearch(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#202321] focus:outline-none focus:border-[#059669]"
                />
                {repoSearch && (
                  <button onClick={() => setRepoSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949A95] hover:text-[#202321]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-[#666B67]" />
                <select
                  value={repoSort}
                  onChange={e => setRepoSort(e.target.value as any)}
                  className="bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-3 py-2.5 text-xs font-bold text-[#202321] focus:outline-none focus:border-[#059669] cursor-pointer"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="stars">Most Stars</option>
                  <option value="forks">Most Forked</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Dynamic Language Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-extrabold text-[#949A95] uppercase shrink-0">Language:</span>
              {availableLanguages.map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
                    selectedLanguage === lang
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-[#666B67] hover:bg-[#F4F1EA] border border-[#EAE7DF]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Repositories Scrollable Modal List */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4 max-h-[55vh]">
              {filteredAndSortedRepos.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#666B67] font-bold">
                  No repositories match your search or filter criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredAndSortedRepos.map(repo => (
                    <div
                      key={repo.id}
                      className="p-5 rounded-3xl border border-[#EAE7DF] bg-[#FAF8F5]/50 flex flex-col justify-between gap-4 transition-all hover:bg-white hover:border-[#059669]/30"
                    >
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-[#202321] truncate" title={repo.name}>
                          {repo.name}
                        </h4>
                        <p className="text-xs text-[#666B67] font-medium line-clamp-2 leading-relaxed">
                          {repo.description || 'No description'}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-[#F4F1EA]">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#666B67]">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: getLanguageColor(repo.language) }}
                              />
                              <span>{repo.language}</span>
                            </span>

                            <span className="flex items-center gap-1 text-[#202321]">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span>{repo.stars}</span>
                            </span>

                            <span className="flex items-center gap-1">
                              <GitFork className="w-3.5 h-3.5 text-[#666B67]" />
                              <span>{repo.forks}</span>
                            </span>
                          </div>

                          <span className="text-[10px] text-[#949A95] font-semibold">
                            {formatTimeAgo(repo.updated_at)}
                          </span>
                        </div>

                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EAE7DF] text-[#202321] hover:text-[#059669] font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                        >
                          <span>Open Repository</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#F4F1EA] pt-4 flex justify-end">
              <button
                onClick={() => setShowViewAllReposModal(false)}
                className="px-6 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL: ADD / EDIT PROFILE URL (LinkedIn & LeetCode) --- */}
      {urlModalPlatform && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xl max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#202321]">
                {urlModalPlatform === 'linkedin' ? 'Edit LinkedIn Profile URL' : 'Edit LeetCode Profile URL'}
              </h3>
              <button onClick={() => setUrlModalPlatform(null)} className="p-1 text-[#666B67] hover:text-[#202321]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {urlError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold text-center">
                {urlError}
              </div>
            )}

            <form onSubmit={handleSaveProfileUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202321] mb-1.5">
                  {urlModalPlatform === 'linkedin' ? 'LinkedIn Profile URL' : 'LeetCode Profile URL'}
                </label>
                <input
                  type="text"
                  required
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={
                    urlModalPlatform === 'linkedin'
                      ? 'https://www.linkedin.com/in/username/'
                      : 'https://leetcode.com/u/username/'
                  }
                  className="w-full bg-[#FAF8F5] border border-[#EAE7DF] rounded-2xl px-4 py-3 text-xs font-semibold text-[#202321] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUrlModalPlatform(null)}
                  className="flex-1 py-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#666B67] hover:bg-[#F4F1EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUrl}
                  className="flex-1 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold shadow-md shadow-[#059669]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingUrl ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: GITHUB ACCOUNT SETTINGS (OAuth Management) --- */}
      {showGitHubEditModal && gh && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xl max-w-md w-full space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#24292e] text-white flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#202321]">GitHub Account Settings</h3>
                  <p className="text-xs text-[#059669] font-bold">Connected as @{gh.username}</p>
                </div>
              </div>
              <button onClick={() => setShowGitHubEditModal(false)} className="p-1 text-[#666B67] hover:text-[#202321]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#666B67] font-medium leading-relaxed bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EAE7DF]">
              Your GitHub identity is verified securely via official OAuth 2.0 authorization. Manual editing of your OAuth identity is disabled for security.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleConnectGitHub}
                className="w-full py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#EAE7DF] text-[#202321] font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#059669]" />
                <span>Reconnect GitHub Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowGitHubEditModal(false);
                  setDisconnectPlatform('github');
                }}
                className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Disconnect GitHub</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: DISCONNECT CONFIRMATION --- */}
      {disconnectPlatform && (
        <div className="fixed inset-0 z-50 bg-[#202321]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAE7DF] shadow-xl max-w-sm w-full space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-lg font-black text-[#202321]">
              Disconnect {disconnectPlatform.charAt(0).toUpperCase() + disconnectPlatform.slice(1)}?
            </h3>
            <p className="text-xs text-[#666B67] font-medium leading-relaxed">
              Disconnect your {disconnectPlatform.charAt(0).toUpperCase() + disconnectPlatform.slice(1)} account from PlaceX? This will remove the connection association from your student profile.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisconnectPlatform(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7DF] text-xs font-bold text-[#666B67] hover:bg-[#F4F1EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
