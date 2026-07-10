export const NOTIFICATION_STORAGE_KEY = 'raksha_notification_history';
export const NOTIFICATION_PREFS_KEY = 'raksha_notification_preferences';
export const NOTIFICATION_PERMISSION_KEY = 'raksha_notification_permission_status';
export const NOTIFICATION_DISMISSED_KEY = 'raksha_notification_permission_dismissed';
export const NOTIFICATION_OFFLINE_QUEUE_KEY = 'raksha_notification_offline_queue';
export const NOTIFICATION_REMINDER_PREFS_KEY = 'raksha_notification_reminders';
export const NOTIFICATION_THROTTLE_KEY = 'raksha_notification_throttle';
export const MAX_NOTIFICATIONS = 100;

export const NOTIFICATION_CATEGORIES = [
  'general',
  'system',
  'sos',
  'emergency',
  'nearby',
  'numbers',
  'updates',
  'security',
  'weather',
  'reminder'
];

export const defaultNotificationPreferences = {
  general: true,
  sos: true,
  nearby: true,
  emergencyNumbers: true,
  appUpdates: true,
  reminders: true,
  nearbyAlerts: true,
  sosAlerts: true,
  pushNotifications: true,
  localNotifications: true,
  browserNotifications: true,
  backgroundNotifications: true,
  securityEmails: true,
  welcomeEmails: true,
  passwordEmails: true,
  verificationEmails: true,
  marketingEmails: false,
  notificationSound: 'Default',
  sound: true,
  vibration: true,
  desktop: false
};

export const defaultReminderPreferences = {
  enabled: true,
  updateContacts: true,
  verifyEmail: true,
  enableLocation: true,
  enableNotifications: true,
  reviewSafetySettings: true,
  frequency: 'weekly'
};

const safeRead = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Notifications are an enhancement; storage quota errors should not break the app.
  }
};

export const readNotificationHistory = () => {
  const history = safeRead(NOTIFICATION_STORAGE_KEY, []);
  return Array.isArray(history) ? history.slice(0, MAX_NOTIFICATIONS) : [];
};

export const writeNotificationHistory = (history) => {
  const next = Array.isArray(history) ? history.slice(0, MAX_NOTIFICATIONS) : [];
  safeWrite(NOTIFICATION_STORAGE_KEY, next);
  return next;
};

export const readNotificationPreferences = () => ({
  ...defaultNotificationPreferences,
  ...safeRead(NOTIFICATION_PREFS_KEY, {})
});

export const writeNotificationPreferences = (preferences) => {
  const next = { ...defaultNotificationPreferences, ...(preferences || {}) };
  safeWrite(NOTIFICATION_PREFS_KEY, next);
  return next;
};

export const readReminderPreferences = () => ({
  ...defaultReminderPreferences,
  ...safeRead(NOTIFICATION_REMINDER_PREFS_KEY, {})
});

export const writeReminderPreferences = (preferences) => {
  const next = { ...defaultReminderPreferences, ...(preferences || {}) };
  safeWrite(NOTIFICATION_REMINDER_PREFS_KEY, next);
  return next;
};

export const getNotificationPermissionStatus = () => {
  if (typeof Notification === 'undefined') return 'unsupported';
  return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) || Notification.permission || 'default';
};

export const setNotificationPermissionStatus = (status) => {
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, status);
  return status;
};

export const shouldShowNotificationPermissionPrompt = () => {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'denied') return false;
  if (localStorage.getItem(NOTIFICATION_DISMISSED_KEY) === '1') return false;
  return getNotificationPermissionStatus() === 'default';
};

export const dismissNotificationPermissionPrompt = () => {
  localStorage.setItem(NOTIFICATION_DISMISSED_KEY, '1');
  setNotificationPermissionStatus('later');
};

export const requestBrowserNotificationPermission = async () => {
  if (typeof Notification === 'undefined') return setNotificationPermissionStatus('unsupported');
  const result = await Notification.requestPermission();
  setNotificationPermissionStatus(result);
  if (result === 'granted') localStorage.removeItem(NOTIFICATION_DISMISSED_KEY);
  return result;
};

export const canShowDesktopNotification = (preferences = readNotificationPreferences()) => (
  typeof Notification !== 'undefined'
  && Notification.permission === 'granted'
  && preferences.desktop
);

export const showDesktopNotification = (notification, preferences = readNotificationPreferences()) => {
  if (!canShowDesktopNotification(preferences)) return;
  try {
    const desktop = new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: notification.id,
      silent: !preferences.sound || notification.sound === 'Silent',
      requireInteraction: Boolean(notification.requireInteraction || notification.priority === 'critical'),
      data: { actionPath: notification.actionPath || '/', id: notification.id },
      actions: Array.isArray(notification.actions) ? notification.actions.slice(0, 2) : undefined,
      vibrate: preferences.vibration ? notification.vibrationPattern : undefined
    });
    desktop.onclick = () => {
      window.focus();
      if (notification.actionPath) window.location.assign(notification.actionPath);
    };
  } catch {
    // Browser notifications can fail in unsupported contexts; keep in-app history working.
  }
};

export const createNotificationRecord = ({
  title,
  message,
  category = 'general',
  actionPath = '',
  icon = '',
  type = category,
  priority = 'normal',
  status = 'unread',
  actionTaken = '',
  actions = [],
  sound = '',
  vibrationPattern = [],
  requireInteraction = false,
  read = false,
  createdAt = new Date().toISOString()
}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  title: title || 'Notification',
  message: message || '',
  type,
  category: NOTIFICATION_CATEGORIES.includes(category) ? category : 'general',
  actionPath,
  icon,
  priority,
  status,
  actionTaken,
  actions,
  sound,
  vibrationPattern,
  requireInteraction,
  read,
  createdAt
});

export const queueOfflineNotification = (payload) => {
  const queue = safeRead(NOTIFICATION_OFFLINE_QUEUE_KEY, []);
  const next = [payload, ...(Array.isArray(queue) ? queue : [])].slice(0, 50);
  safeWrite(NOTIFICATION_OFFLINE_QUEUE_KEY, next);
  return next;
};

export const flushOfflineNotificationQueue = () => {
  const queue = safeRead(NOTIFICATION_OFFLINE_QUEUE_KEY, []);
  localStorage.removeItem(NOTIFICATION_OFFLINE_QUEUE_KEY);
  return Array.isArray(queue) ? queue.reverse() : [];
};

export const shouldThrottleNotification = (key, windowMs = 60_000) => {
  if (!key) return false;
  const throttleMap = safeRead(NOTIFICATION_THROTTLE_KEY, {});
  const last = Number(throttleMap[key] || 0);
  const now = Date.now();
  if (last && now - last < windowMs) return true;
  safeWrite(NOTIFICATION_THROTTLE_KEY, { ...throttleMap, [key]: now });
  return false;
};
