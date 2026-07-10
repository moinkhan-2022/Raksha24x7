import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Bell, CheckCheck, Info, MapPin, Megaphone, Search, ShieldAlert,
  Siren, Trash2, Wifi, X, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext';
import {
  createNotificationRecord,
  dismissNotificationPermissionPrompt,
  getNotificationPermissionStatus,
  NOTIFICATION_CATEGORIES,
  readNotificationHistory,
  readNotificationPreferences,
  requestBrowserNotificationPermission,
  setNotificationPermissionStatus,
  shouldShowNotificationPermissionPrompt,
  showDesktopNotification,
  writeNotificationHistory,
  writeNotificationPreferences
} from '../services/notificationService';
import {
  buildLiveLocationNotification,
  buildNearbyServiceNotification,
  buildReminderNotifications,
  buildSosNotification,
  dispatchEmergencyNotification,
  replayOfflineNotifications
} from '../services/emergencyNotificationService';
import {
  flushPushQueue,
  registerPushDevice,
  subscribeForegroundMessages,
  trackPushAnalytics
} from '../services/pushNotificationService';
import { restoreLocalReminders, scheduleLocalReminder, cancelLocalReminder, snoozeLocalReminder } from '../services/localNotificationService';

const NotificationContext = createContext(null);

const categoryMeta = {
  general: { label: 'General', icon: Bell, color: 'text-blue-300 bg-blue-500/10' },
  system: { label: 'System', icon: Zap, color: 'text-slate-300 bg-slate-500/10' },
  sos: { label: 'SOS', icon: Siren, color: 'text-red-300 bg-red-500/10' },
  emergency: { label: 'Emergency', icon: ShieldAlert, color: 'text-orange-300 bg-orange-500/10' },
  nearby: { label: 'Nearby Services', icon: MapPin, color: 'text-emerald-300 bg-emerald-500/10' },
  numbers: { label: 'Emergency Numbers', icon: Megaphone, color: 'text-amber-300 bg-amber-500/10' },
  updates: { label: 'Updates', icon: Wifi, color: 'text-cyan-300 bg-cyan-500/10' },
  security: { label: 'Security', icon: AlertTriangle, color: 'text-violet-300 bg-violet-500/10' },
  weather: { label: 'Weather', icon: Info, color: 'text-sky-300 bg-sky-500/10' }
  ,
  reminder: { label: 'Reminder', icon: Bell, color: 'text-purple-300 bg-purple-500/10' }
};

const filterOptions = ['all', 'unread', 'read', 'sos', 'emergency', 'nearby', 'reminder', 'general', 'system'];

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const badgeText = (count) => (count > 99 ? '99+' : String(count));

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState(() => readNotificationHistory());
  const [preferences, setPreferences] = useState(() => readNotificationPreferences());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(() => getNotificationPermissionStatus());
  const [pushStatus, setPushStatus] = useState('idle');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!user || user.isGuest) return;
    if (location.pathname === '/dashboard' && shouldShowNotificationPermissionPrompt()) {
      const timer = window.setTimeout(() => setPermissionOpen(true), 900);
      return () => window.clearTimeout(timer);
    }
  }, [location.pathname, user]);

  useEffect(() => {
    const syncPermission = () => setPermissionStatus(getNotificationPermissionStatus());
    window.addEventListener('focus', syncPermission);
    return () => window.removeEventListener('focus', syncPermission);
  }, []);

  const persistNotifications = useCallback((updater) => {
    setNotifications((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return writeNotificationHistory(next);
    });
  }, []);

  const toast = useCallback((message, type = 'info') => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, message, type }].slice(-4));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3200);
  }, []);

  const addNotification = useCallback((payload) => {
    const record = createNotificationRecord(payload);
    persistNotifications((current) => [record, ...current]);
    showDesktopNotification(record, preferences);
    return record;
  }, [persistNotifications, preferences]);

  const emergencyNotify = useCallback((payload) => dispatchEmergencyNotification({
    payload,
    addNotification,
    toast,
    preferences
  }), [addNotification, preferences, toast]);

  const markAllRead = useCallback(() => {
    persistNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, [persistNotifications]);

  const markRead = useCallback((id) => {
    persistNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, [persistNotifications]);

  const deleteNotification = useCallback((id) => {
    persistNotifications((current) => current.filter((item) => item.id !== id));
  }, [persistNotifications]);

  const clearAll = useCallback(() => persistNotifications([]), [persistNotifications]);

  const updatePreferences = useCallback((nextPrefs) => {
    const next = writeNotificationPreferences(nextPrefs);
    setPreferences(next);
    return next;
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestBrowserNotificationPermission();
    setPermissionStatus(result);
    setPermissionOpen(false);
    if (result === 'granted') {
      updatePreferences({ ...preferences, desktop: true, pushNotifications: true });
      registerPushDevice({ permission: result })
        .then((response) => setPushStatus(response.success ? 'registered' : response.reason || 'not-configured'))
        .catch(() => setPushStatus('registration-failed'));
      addNotification({
        title: 'Notification Enabled',
        message: 'Raksha24x7 notifications are now enabled.',
        category: 'system'
      });
      toast('Notification Enabled', 'success');
    } else if (result === 'denied') {
      toast('Notifications blocked. You can enable them later from browser settings.', 'warning');
    }
    return result;
  }, [addNotification, preferences, toast, updatePreferences]);

  useEffect(() => {
    if (!user || user.isGuest || permissionStatus !== 'granted' || preferences.pushNotifications === false) return undefined;
    let cancelled = false;
    registerPushDevice({ permission: permissionStatus })
      .then((response) => { if (!cancelled) setPushStatus(response.success ? 'registered' : response.reason || 'not-configured'); })
      .catch(() => { if (!cancelled) setPushStatus('registration-failed'); });
    return () => { cancelled = true; };
  }, [permissionStatus, preferences.pushNotifications, user]);

  useEffect(() => {
    if (!user || user.isGuest) return undefined;
    let unsubscribe = () => {};
    subscribeForegroundMessages((payload) => {
      let actions = [{ action: 'open-app', title: 'Open App' }];
      try {
        if (payload?.data?.actions) actions = JSON.parse(payload.data.actions);
      } catch {
        actions = [{ action: 'open-app', title: 'Open App' }];
      }
      const notificationPayload = {
        title: payload?.notification?.title || payload?.data?.title || 'Raksha24x7',
        message: payload?.notification?.body || payload?.data?.message || 'You have a new safety notification.',
        category: payload?.data?.type === 'sos_activated' ? 'sos' : payload?.data?.category || 'updates',
        type: payload?.data?.type || 'push',
        priority: payload?.data?.priority || 'normal',
        actionPath: payload?.data?.actionPath || '/dashboard',
        actions
      };
      emergencyNotify(notificationPayload);
    }).then((cleanup) => { unsubscribe = cleanup; }).catch(() => undefined);
    return () => unsubscribe();
  }, [emergencyNotify, user]);

  const dismissPermission = useCallback(() => {
    dismissNotificationPermissionPrompt();
    setPermissionStatus('later');
    setPermissionOpen(false);
  }, []);

  useEffect(() => {
    const handleInstalled = () => addNotification({
      title: 'App installed',
      message: 'Raksha24x7 is ready for faster emergency access.',
      category: 'updates',
      actionPath: '/dashboard'
    });
    const handleOffline = () => addNotification({
      title: 'Offline mode',
      message: 'You are offline. Some emergency features remain available.',
      category: 'system'
    });
    const handleOnline = () => addNotification({
      title: 'Online restored',
      message: 'Connection restored. Cached safety data will refresh quietly.',
      category: 'system'
    });

    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [addNotification]);

  useEffect(() => {
    const handleSosActivated = (event) => emergencyNotify(buildSosNotification(event.detail || {}));
    const handleLiveStarted = () => emergencyNotify(buildLiveLocationNotification(true));
    const handleLiveStopped = () => emergencyNotify(buildLiveLocationNotification(false));
    const handleNearbyFound = (event) => emergencyNotify(buildNearbyServiceNotification(event.detail?.service));

    window.addEventListener('raksha:sos-activated', handleSosActivated);
    window.addEventListener('raksha:live-location-started', handleLiveStarted);
    window.addEventListener('raksha:live-location-stopped', handleLiveStopped);
    window.addEventListener('raksha:nearby-service-found', handleNearbyFound);
    return () => {
      window.removeEventListener('raksha:sos-activated', handleSosActivated);
      window.removeEventListener('raksha:live-location-started', handleLiveStarted);
      window.removeEventListener('raksha:live-location-stopped', handleLiveStopped);
      window.removeEventListener('raksha:nearby-service-found', handleNearbyFound);
    };
  }, [emergencyNotify]);

  useEffect(() => {
    if (!user || user.isGuest) return undefined;
    const timer = window.setTimeout(() => {
      buildReminderNotifications({
        user,
        permissionStatus,
        hasLocation: typeof navigator !== 'undefined' && Boolean(navigator.geolocation),
        contactCount: user.contacts?.length || 0
      }).forEach((payload) => emergencyNotify(payload));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [emergencyNotify, permissionStatus, user]);

  useEffect(() => {
    const replay = () => replayOfflineNotifications({ emergencyNotify });
    const flush = () => {
      replay();
      flushPushQueue().catch(() => undefined);
    };
    window.addEventListener('online', flush);
    flushPushQueue().catch(() => undefined);
    return () => window.removeEventListener('online', flush);
  }, [emergencyNotify]);

  useEffect(() => {
    restoreLocalReminders((record) => {
      persistNotifications((current) => [record, ...current]);
      toast(record.title, record.priority === 'critical' ? 'warning' : 'info');
    });
  }, [persistNotifications, toast]);

  const value = useMemo(() => {
    const unreadCount = notifications.filter((item) => !item.read).length;
    return {
      notifications,
      unreadCount,
      unreadBadge: unreadCount ? badgeText(unreadCount) : '',
      preferences,
      permissionStatus,
      pushStatus,
      drawerOpen,
      addNotification,
      emergencyNotify,
      markAllRead,
      markRead,
      deleteNotification,
      clearAll,
      updatePreferences,
      requestPermission,
      scheduleLocalReminder: (reminder) => scheduleLocalReminder(reminder, (record) => persistNotifications((current) => [record, ...current])),
      cancelLocalReminder,
      snoozeLocalReminder,
      trackPushAnalytics,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      toast
    };
  }, [addNotification, clearAll, deleteNotification, drawerOpen, emergencyNotify, markAllRead, markRead, notifications, persistNotifications, permissionStatus, preferences, pushStatus, requestPermission, toast, updatePreferences]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationDrawer
        open={drawerOpen}
        notifications={notifications}
        onClose={() => setDrawerOpen(false)}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
        onMarkRead={markRead}
        onDelete={deleteNotification}
        onNavigate={(path) => { setDrawerOpen(false); if (path) navigate(path); }}
      />
      <NotificationPermissionDialog open={permissionOpen} onAllow={requestPermission} onLater={dismissPermission} />
      <ToastCenter toasts={toasts} />
    </NotificationContext.Provider>
  );
}

function NotificationPermissionDialog({ open, onAllow, onLater }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="notification-permission-title">
      <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/15 text-red-300">
          <Bell className="h-6 w-6" />
        </div>
        <h2 id="notification-permission-title" className="mt-4 text-xl font-bold">Enable Notifications</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">Receive SOS alerts, important emergency updates, and safety reminders.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAllow} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500">Allow</button>
          <button type="button" onClick={onLater} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Maybe Later</button>
        </div>
      </motion.section>
    </div>
  );
}

function NotificationDrawer({ open, notifications, onClose, onMarkAllRead, onClearAll, onMarkRead, onDelete, onNavigate }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const isLight = localStorage.getItem('raksha_theme') === 'light';

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return notifications.filter((item) => {
      const matchesFilter = filter === 'all'
        || (filter === 'unread' && !item.read)
        || (filter === 'read' && item.read)
        || item.category === filter;
      const matchesSearch = !search || [item.title, item.message, item.category].join(' ').toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [filter, notifications, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-labelledby="notification-drawer-title">
      <button type="button" aria-label="Close notifications" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside initial={{ opacity: 0, x: 28, y: 10 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} className={`absolute bottom-0 right-0 top-auto flex max-h-[88vh] w-full flex-col rounded-t-3xl border p-4 shadow-2xl md:top-3 md:right-3 md:h-[calc(100vh-1.5rem)] md:max-h-none md:max-w-md md:rounded-3xl ${isLight ? 'border-slate-200 bg-white text-slate-950 shadow-slate-900/15' : 'border-white/10 bg-slate-950 text-white shadow-black/40'}`}>
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 id="notification-drawer-title" className="text-xl font-bold">Notifications</h2>
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{notifications.filter((item) => !item.read).length} unread</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close notifications" className={`grid h-10 w-10 place-items-center rounded-full ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}><X className="h-5 w-5" /></button>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onMarkAllRead} className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${isLight ? 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100' : 'border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15'}`}><CheckCheck className="mr-1 inline h-4 w-4" />Mark all as read</button>
          <button type="button" onClick={() => onNavigate('/notifications')} className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}>View all notifications</button>
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Search Notifications</span>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Notifications" className={`h-12 w-full rounded-2xl border px-11 text-sm outline-none focus:border-red-400 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`} />
        </label>

        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {filterOptions.map((option) => (
              <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === option ? 'border-red-400/50 bg-red-500/15 text-red-200' : isLight ? 'border-slate-200 bg-white text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                {option}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-4 flex-1 overflow-y-auto pr-1" aria-label="Notification history">
          {filtered.length ? (
            <div className="space-y-3">
              {filtered.slice(0, 100).map((notification) => (
                <NotificationCard key={notification.id} notification={notification} isLight={isLight} onRead={onMarkRead} onDelete={onDelete} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <div className={`grid min-h-72 place-items-center rounded-3xl border border-dashed p-8 text-center ${isLight ? 'border-slate-300 bg-slate-50' : 'border-white/10 bg-slate-900/60'}`}>
              <div>
                <div className="text-4xl" aria-hidden="true">🔔</div>
                <h3 className="mt-3 text-lg font-semibold">No notifications yet.</h3>
                <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Important updates will appear here.</p>
              </div>
            </div>
          )}
        </section>
        {notifications.length > 0 && (
          <button type="button" onClick={onClearAll} className={`mt-3 rounded-2xl px-3 py-2 text-xs font-semibold transition ${isLight ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
            Clear notification history
          </button>
        )}
      </motion.aside>
    </div>
  );
}

function NotificationCard({ notification, isLight, onRead, onDelete, onNavigate }) {
  const meta = categoryMeta[notification.category] || categoryMeta.general;
  const Icon = meta.icon;
  const handleOpen = () => {
    onRead(notification.id);
    if (notification.actionPath) onNavigate(notification.actionPath);
  };
  const runAction = (action) => {
    onRead(notification.id);
    if (action === 'call-emergency') {
      window.location.href = 'tel:112';
      return;
    }
    if (action === 'open-nearby') {
      onNavigate('/nearby-services');
      return;
    }
    if (action === 'open-sos') {
      onNavigate('/dashboard?sos=true');
      return;
    }
    if (action === 'open-app') {
      onNavigate(notification.actionPath || '/dashboard');
      return;
    }
    if (action !== 'dismiss' && notification.actionPath) onNavigate(notification.actionPath);
  };

  return (
    <article className={`rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 ${notification.read ? '' : 'ring-1 ring-red-400/20'} ${isLight ? notification.read ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-red-100 bg-red-50/70 hover:bg-red-50' : notification.read ? 'border-white/10 bg-slate-900 hover:bg-slate-800' : 'border-red-400/15 bg-red-500/[0.08] hover:bg-red-500/[0.11]'}`}>
      <div className="flex gap-3">
        <div role="button" tabIndex={0} onClick={handleOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleOpen(); }} className="flex min-w-0 flex-1 cursor-pointer gap-3 text-left">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.color}`}><Icon className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              {!notification.read && <span className="h-2 w-2 rounded-full bg-red-500/90 shadow-sm shadow-red-950/20" aria-label="Unread" />}
              <span className="truncate font-semibold">{notification.title}</span>
            </span>
            <span className={`mt-1 line-clamp-2 block text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{notification.message}</span>
            <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${meta.color}`}>{meta.label}</span>
              {notification.priority && <span className={`rounded-full px-2 py-0.5 capitalize ${notification.priority === 'critical' ? 'bg-red-500/15 text-red-300' : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-400'}`}>{notification.priority}</span>}
              <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>{formatTime(notification.createdAt)}</span>
            </span>
            {Array.isArray(notification.actions) && notification.actions.length > 0 ? (
              <span className="mt-3 flex flex-wrap gap-2">
                {notification.actions.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); runAction(item.action); }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.action === 'dismiss' ? isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-300' : 'bg-red-600 text-white hover:bg-red-500'}`}
                  >
                    {item.title}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
        </div>
        <button type="button" onClick={() => onDelete(notification.id)} aria-label={`Delete ${notification.title}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-red-500/10 hover:text-red-300">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function ToastCenter({ toasts }) {
  const colors = {
    success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
    error: 'border-rose-400/30 bg-rose-500/15 text-rose-100',
    warning: 'border-amber-400/30 bg-amber-500/15 text-amber-100',
    info: 'border-blue-400/30 bg-blue-500/15 text-blue-100'
  };
  return (
    <div className="fixed right-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[90] grid w-[min(24rem,calc(100vw-2rem))] gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <motion.div key={toast.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-xl ${colors[toast.type] || colors.info}`}>
          {toast.message}
        </motion.div>
      ))}
    </div>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

export { categoryMeta, NOTIFICATION_CATEGORIES };
