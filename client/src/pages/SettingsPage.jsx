import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Bell, CheckCircle2, Globe2, HelpCircle, Info,
  Languages, LayoutDashboard, LockKeyhole, LogOut, Palette, Search, Shield,
  SlidersHorizontal, Sparkles, UserRound, Volume2, X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../context/AuthContext';

const RECENT_KEY = 'raksha_recent_settings';

const SETTINGS = [
  { id: 'account', title: 'Account', icon: UserRound, route: '/settings/account', description: 'Profile, personal details and account basics.', keywords: ['profile', 'email', 'phone', 'name'] },
  { id: 'security', title: 'Security', icon: LockKeyhole, route: '/settings/security', description: 'Password, login safety and secure access.', keywords: ['pass', 'password', 'login', '2fa'] },
  { id: 'notifications', title: 'Notifications', icon: Bell, route: '/settings/notifications', description: 'Alerts, reminders and emergency updates.', keywords: ['push', 'alert', 'sound'] },
  { id: 'appearance', title: 'Appearance', icon: Palette, route: '/settings/appearance', description: 'Theme, display style and visual preferences.', keywords: ['dark', 'theme', 'color', 'mode'] },
  { id: 'language', title: 'Language', icon: Languages, route: '/settings/language', description: 'App language and regional formats.', keywords: ['lang', 'translate', 'locale'] },
  { id: 'permissions', title: 'Permissions', icon: Globe2, route: '/settings/permissions', description: 'Location, camera and browser permissions.', keywords: ['location', 'gps', 'camera', 'microphone'] },
  { id: 'privacy', title: 'Privacy', icon: Shield, route: '/settings/privacy', description: 'Data sharing, visibility and privacy choices.', keywords: ['data', 'sharing', 'private'] },
  { id: 'accessibility', title: 'Accessibility', icon: Volume2, route: '/settings/accessibility', description: 'Readable, keyboard-friendly and assisted use.', keywords: ['a11y', 'large', 'text', 'contrast'] },
  { id: 'support', title: 'Help & Support', icon: HelpCircle, route: '/settings/support', description: 'FAQs, support channels and guidance.', keywords: ['help', 'contact', 'faq'] },
  { id: 'about', title: 'About', icon: Info, route: '/settings/about', description: 'Version, policies and app information.', keywords: ['info', 'version', 'terms'] },
  { id: 'logout', title: 'Logout', icon: LogOut, route: 'logout', description: 'Safely sign out from this device.', keywords: ['sign out', 'exit', 'session'], danger: true }
];

const QUICK_ACTIONS = [
  { title: 'Edit Profile', route: '/profile', icon: UserRound },
  { title: 'Change Password', route: '/settings/security', icon: LockKeyhole },
  { title: 'Notification Settings', route: '/settings/notifications', icon: Bell },
  { title: 'Privacy', route: '/settings/privacy', icon: Shield },
  { title: 'Logout', route: 'logout', icon: LogOut, danger: true }
];

const readRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
};

const saveRecent = (items) => localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 5)));

const getSectionId = (pathname) => pathname.replace(/^\/settings\/?/, '').split('/')[0];

function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sectionId = getSectionId(location.pathname);
  const activeSection = sectionId ? SETTINGS.find((item) => item.id === sectionId) : null;
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readRecent);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [toast, setToast] = useState('');

  const filteredSettings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return SETTINGS;
    return SETTINGS.filter((item) => [
      item.title,
      item.description,
      item.id,
      ...(item.keywords || [])
    ].join(' ').toLowerCase().includes(needle));
  }, [query]);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    const fields = [user.name, user.email, user.phone, user.avatar || user.profileImage, user.role, user.createdAt || user.memberSince];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [user]);

  const recentCards = useMemo(() => recent
    .map((id) => SETTINGS.find((item) => item.id === id))
    .filter(Boolean), [recent]);

  const remember = (item) => {
    if (!item?.id || item.id === 'logout') return;
    const next = [item.id, ...recent.filter((id) => id !== item.id)].slice(0, 5);
    setRecent(next);
    saveRecent(next);
  };

  const openSetting = (item) => {
    if (item.route === 'logout') {
      setConfirmLogout(true);
      return;
    }
    const matchedSetting = item.id ? item : SETTINGS.find((setting) => setting.route === item.route);
    remember(matchedSetting);
    navigate(item.route);
  };

  const doLogout = async () => {
    await logout();
    setConfirmLogout(false);
    navigate('/');
  };

  if (activeSection) {
    return (
      <SettingsShell toast={toast}>
        <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <Link to="/settings" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-300/20">
                  <activeSection.icon className="h-7 w-7" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Coming soon</p>
                  <h1 className="mt-1 text-2xl font-bold text-white">{activeSection.title} Settings</h1>
                  <p className="mt-1 text-sm text-slate-400">{activeSection.description}</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">Placeholder</span>
            </div>
            <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-slate-950/35 p-6 text-sm leading-relaxed text-slate-300">
              This page is reserved for the future {activeSection.title.toLowerCase()} module. Module 11A only creates the settings dashboard and navigation hub.
            </div>
          </motion.section>
        </main>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell toast={toast}>
      <main className="mx-auto max-w-[1440px] px-3 py-5 sm:px-4 md:px-6">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Raksha24x7 Control Center</p>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
                <SlidersHorizontal className="h-7 w-7 text-red-300" />
                Settings
              </h1>
              <p className="mt-2 text-sm text-slate-400">Manage your account, privacy, preferences and application settings.</p>
            </div>
            <label className="relative w-full lg:w-80">
              <span className="sr-only">Search Settings</span>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search Settings"
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-300/50 focus:ring-4 focus:ring-red-500/10"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear settings search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>
          </div>
        </motion.header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <ProfileSummary user={user} loading={loading || !user} completion={profileCompletion} />
            <SideMenu onOpen={openSetting} />
          </aside>

          <div className="space-y-5">
            <QuickActions actions={QUICK_ACTIONS} onOpen={openSetting} />

            <section aria-labelledby="settings-categories">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 id="settings-categories" className="text-lg font-semibold text-white">Settings Categories</h2>
                  <p className="text-xs text-slate-500">{filteredSettings.length} option{filteredSettings.length === 1 ? '' : 's'} available</p>
                </div>
              </div>

              {loading ? (
                <SettingsSkeleton />
              ) : filteredSettings.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredSettings.map((item) => (
                    <SettingCard key={item.id} item={item} onOpen={openSetting} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
                  <Search className="mx-auto h-9 w-9 text-slate-500" />
                  <h3 className="mt-3 font-semibold text-white">No settings found.</h3>
                  <p className="mt-1 text-sm text-slate-500">Try searching for account, pass, lang, dark, or privacy.</p>
                </div>
              )}
            </section>

            <RecentSettings items={recentCards} onOpen={openSetting} />
          </div>
        </div>
      </main>

      <LogoutDialog open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={doLogout} />
    </SettingsShell>
  );
}

function SettingsShell({ children, toast }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <Navbar dashboard />
      <Toast message={toast} type="success" />
      {children}
    </div>
  );
}

function ProfileSummary({ user, loading, completion }) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl" aria-label="Loading profile summary">
        <div className="flex animate-pulse items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-white/10" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
          </div>
        </div>
      </section>
    );
  }

  const memberSince = user?.createdAt || user?.memberSince || user?.updatedAt;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <ProfileAvatar src={user?.profileImage || user?.avatar} name={user?.name} />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">{user?.name || 'Raksha User'}</h2>
          <p className="truncate text-sm text-slate-400">{user?.email || 'Email unavailable'}</p>
          <p className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold capitalize text-emerald-200">{user?.role || 'user'}</p>
        </div>
      </div>
      <dl className="mt-5 grid gap-2 text-sm">
        <InfoRow label="Member Since" value={memberSince ? new Date(memberSince).toLocaleDateString() : 'Recently joined'} />
        <InfoRow label="Account Status" value={user?.isGuest ? 'Guest' : 'Active'} />
      </dl>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Profile Completion</span>
          <span>{completion}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-400" style={{ width: `${completion}%` }} />
        </div>
      </div>
      <Link to="/profile" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        Edit Profile
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/40 px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function SideMenu({ onOpen }) {
  return (
    <nav className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl" aria-label="Settings menu">
      <button type="button" onClick={() => {}} className="mb-2 flex w-full items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-left text-sm font-semibold text-white">
        <LayoutDashboard className="h-4 w-4 text-red-300" />
        Settings Home
      </button>
      <div className="space-y-1">
        {SETTINGS.filter((item) => item.id !== 'logout').map((item) => (
          <button key={item.id} type="button" onClick={() => onOpen(item)} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            <item.icon className="h-4 w-4" />
            {item.title}
          </button>
        ))}
      </div>
    </nav>
  );
}

function QuickActions({ actions, onOpen }) {
  return (
    <section className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl" aria-label="Quick actions">
      <div className="flex gap-3">
        {actions.map((item) => (
          <button key={item.title} type="button" onClick={() => onOpen(item)} className={`flex min-h-20 min-w-40 flex-col justify-between rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${item.danger ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-white/10 bg-slate-950/35 text-white hover:bg-white/10'}`}>
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-semibold">{item.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingCard({ item, onOpen }) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(item)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative min-h-44 overflow-hidden rounded-3xl border p-5 text-left shadow-xl shadow-black/10 backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${item.danger ? 'border-red-400/25 bg-red-500/10' : 'border-white/10 bg-white/[0.055] hover:bg-white/[0.08]'}`}
      aria-label={`Open ${item.title} settings`}
    >
      <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-400/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${item.danger ? 'bg-red-500/15 text-red-200' : 'bg-blue-500/10 text-blue-200'} ring-1 ring-white/10`}>
        <item.icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
        Open
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </motion.button>
  );
}

function RecentSettings({ items, onOpen }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-300" />
        <h2 className="font-semibold text-white">Recent Settings</h2>
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
              <item.icon className="h-4 w-4" />
              {item.title}
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Last opened settings will appear here.</p>
      )}
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid animate-pulse gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Loading settings">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-44 rounded-3xl bg-white/[0.06]" />
      ))}
    </div>
  );
}

function LogoutDialog({ open, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logout-title">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/15 text-red-200">
            <LogOut className="h-5 w-5" />
          </span>
          <div>
            <h2 id="logout-title" className="text-lg font-semibold text-white">Logout?</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">You will be signed out from this device. You can log in again anytime.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default SettingsPage;
