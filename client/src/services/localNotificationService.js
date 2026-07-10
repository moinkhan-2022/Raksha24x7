import {
  createNotificationRecord,
  readNotificationPreferences,
  showDesktopNotification
} from './notificationService';

const LOCAL_REMINDERS_KEY = 'raksha_local_notification_reminders';
const timers = new Map();

const safeRead = (fallback = []) => {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (value) => {
  try {
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(value));
  } catch {
    // Local reminders are an enhancement; quota errors should not break app flows.
  }
};

const nextOccurrence = (reminder) => {
  const scheduledAt = new Date(reminder.scheduledAt).getTime();
  if (!reminder.recurring || scheduledAt > Date.now()) return scheduledAt;
  const interval = Number(reminder.intervalMs || 24 * 60 * 60_000);
  const missed = Math.max(Math.ceil((Date.now() - scheduledAt) / interval), 1);
  return scheduledAt + missed * interval;
};

const showLocalNotification = (reminder, onNotify) => {
  const record = createNotificationRecord({
    title: reminder.title,
    message: reminder.message,
    category: reminder.category || 'reminder',
    type: reminder.type || 'local-reminder',
    priority: reminder.priority || 'normal',
    actionPath: reminder.actionPath || '/dashboard',
    actions: reminder.actions || [{ action: 'open-app', title: 'Open App' }]
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: 'RAKSHA_SHOW_LOCAL_NOTIFICATION', payload: record }))
      .catch(() => showDesktopNotification(record, readNotificationPreferences()));
  } else {
    showDesktopNotification(record, readNotificationPreferences());
  }
  if (typeof onNotify === 'function') onNotify(record);
  return record;
};

export const readLocalReminders = () => safeRead([]);

export const saveLocalReminder = (reminder) => {
  const reminders = readLocalReminders();
  const id = reminder.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = [{ ...reminder, id, updatedAt: new Date().toISOString() }, ...reminders.filter((item) => item.id !== id)].slice(0, 100);
  safeWrite(next);
  return next.find((item) => item.id === id);
};

export const cancelLocalReminder = (id) => {
  if (timers.has(id)) window.clearTimeout(timers.get(id));
  timers.delete(id);
  const next = readLocalReminders().filter((item) => item.id !== id);
  safeWrite(next);
  return next;
};

export const snoozeLocalReminder = (id, minutes = 10) => {
  const reminders = readLocalReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder) return null;
  return saveLocalReminder({ ...reminder, scheduledAt: new Date(Date.now() + minutes * 60_000).toISOString() });
};

export const scheduleLocalReminder = (reminder, onNotify) => {
  const saved = saveLocalReminder(reminder);
  if (timers.has(saved.id)) window.clearTimeout(timers.get(saved.id));
  const runAt = nextOccurrence(saved);
  const delay = Math.max(runAt - Date.now(), 0);
  const timer = window.setTimeout(() => {
    showLocalNotification(saved, onNotify);
    if (saved.recurring) {
      scheduleLocalReminder({ ...saved, scheduledAt: new Date(runAt + Number(saved.intervalMs || 24 * 60 * 60_000)).toISOString() }, onNotify);
    } else {
      cancelLocalReminder(saved.id);
    }
  }, Math.min(delay, 2_147_483_647));
  timers.set(saved.id, timer);
  return saved;
};

export const restoreLocalReminders = (onNotify) => {
  readLocalReminders().forEach((reminder) => scheduleLocalReminder(reminder, onNotify));
};
