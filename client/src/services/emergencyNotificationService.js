import {
  flushOfflineNotificationQueue,
  queueOfflineNotification,
  readReminderPreferences,
  shouldThrottleNotification
} from './notificationService';

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const categoryPreferenceKey = {
  sos: 'sos',
  nearby: 'nearby',
  reminder: 'reminders',
  emergency: 'appUpdates'
};

const vibrationPatterns = {
  low: [80],
  normal: [120],
  high: [160, 80, 160],
  critical: [300, 120, 300, 120, 500]
};

const soundFrequency = {
  Default: 660,
  Emergency: 880
};

const playNotificationSound = (sound = 'Default') => {
  if (sound === 'Silent' || typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = soundFrequency[sound] || soundFrequency.Default;
    oscillator.type = sound === 'Emergency' ? 'sawtooth' : 'sine';
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.38);
  } catch {
    // Sound is an enhancement and may be blocked until the user interacts with the page.
  }
};

const vibrate = (pattern, enabled) => {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration support varies by browser and device.
  }
};

export const canSendEmergencyNotification = (payload, preferences = {}) => {
  if (!preferences.general && payload.category !== 'sos') return false;
  const key = categoryPreferenceKey[payload.category];
  if (key && preferences[key] === false) return false;
  if (payload.category === 'sos' && (preferences.sos === false || preferences.sosAlerts === false)) return false;
  if (payload.category === 'nearby' && (preferences.nearby === false || preferences.nearbyAlerts === false)) return false;
  return true;
};

export const dispatchEmergencyNotification = ({
  payload,
  addNotification,
  toast,
  preferences
}) => {
  if (!payload || !addNotification) return null;
  if (!canSendEmergencyNotification(payload, preferences)) return null;

  const priority = payload.priority || NOTIFICATION_PRIORITIES.NORMAL;
  const throttleKey = payload.throttleKey || `${payload.category || 'general'}:${payload.type || payload.title}`;
  if (shouldThrottleNotification(throttleKey, payload.throttleMs ?? 45_000)) return null;

  const sound = payload.sound || preferences.notificationSound || (priority === 'critical' ? 'Emergency' : 'Default');
  const vibrationPattern = payload.vibrationPattern || vibrationPatterns[priority] || vibrationPatterns.normal;
  const record = addNotification({
    ...payload,
    priority,
    sound,
    vibrationPattern,
    requireInteraction: payload.requireInteraction ?? priority === 'critical'
  });

  if (!navigator.onLine) queueOfflineNotification({ ...payload, queuedAt: new Date().toISOString() });
  if (preferences.sound !== false) playNotificationSound(sound);
  vibrate(vibrationPattern, preferences.vibration !== false);
  if (toast && payload.toast !== false) toast(payload.title, priority === 'critical' ? 'warning' : 'info');
  return record;
};

export const buildSosNotification = ({ userName = 'Raksha user', locationLink = '', emergencyStatus = 'Active' } = {}) => ({
  type: 'sos_activated',
  title: '🚨 SOS Activated',
  message: `Emergency mode has started. Location is being shared.${locationLink ? ` ${locationLink}` : ''}`,
  category: 'sos',
  priority: NOTIFICATION_PRIORITIES.CRITICAL,
  actionPath: '/dashboard?sos=true',
  status: emergencyStatus,
  requireInteraction: true,
  throttleKey: 'sos:activated',
  throttleMs: 10_000,
  actions: [
    { action: 'open-sos', title: 'View SOS' },
    { action: 'call-emergency', title: 'Call 112' }
  ],
  metadata: { userName, locationLink, emergencyStatus }
});

export const buildLiveLocationNotification = (started = true) => ({
  type: started ? 'live_location_started' : 'live_location_stopped',
  title: started ? '📍 Live Location Sharing Started' : '📍 Live Location Sharing Stopped',
  message: started ? 'Your live location is ready to share.' : 'Live location sharing has stopped.',
  category: 'emergency',
  priority: NOTIFICATION_PRIORITIES.HIGH,
  actionPath: '/live-location',
  throttleKey: `live-location:${started ? 'started' : 'stopped'}`,
  actions: [
    { action: 'open-app', title: 'Open App' },
    { action: 'dismiss', title: 'Dismiss' }
  ]
});

export const buildNearbyServiceNotification = (service) => {
  const category = service?.categoryLabel || service?.category || 'Emergency Service';
  return {
    type: 'nearby_service_found',
    title: `Nearest ${category} Found`,
    message: service?.name ? `${service.name} is nearby. Tap to view nearby services.` : 'Emergency services were found near you.',
    category: 'nearby',
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    actionPath: '/nearby-services',
    throttleKey: `nearby:${service?.filterId || category}`,
    throttleMs: 10 * 60_000,
    actions: [
      { action: 'open-nearby', title: 'Open Nearby Services' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
};

export const buildReminderNotifications = ({ user, permissionStatus, hasLocation, contactCount = 0 } = {}) => {
  const prefs = readReminderPreferences();
  if (!prefs.enabled) return [];
  const reminders = [];

  if (prefs.updateContacts && contactCount === 0) {
    reminders.push({
      type: 'reminder_contacts',
      title: 'Update Emergency Contacts',
      message: 'Add at least one trusted contact for faster SOS support.',
      category: 'reminder',
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      actionPath: '/settings/profile',
      throttleKey: 'reminder:update-contacts',
      throttleMs: 24 * 60 * 60_000
    });
  }
  if (prefs.verifyEmail && user && !user.isEmailVerified) {
    reminders.push({
      type: 'reminder_verify_email',
      title: 'Verify Email',
      message: 'Verify your email to keep account recovery and safety alerts reliable.',
      category: 'reminder',
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionPath: '/profile',
      throttleKey: 'reminder:verify-email',
      throttleMs: 24 * 60 * 60_000
    });
  }
  if (prefs.enableNotifications && permissionStatus !== 'granted') {
    reminders.push({
      type: 'reminder_enable_notifications',
      title: 'Enable Notifications',
      message: 'Allow browser notifications for SOS and emergency updates.',
      category: 'reminder',
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      actionPath: '/settings/notifications',
      throttleKey: 'reminder:enable-notifications',
      throttleMs: 24 * 60 * 60_000
    });
  }
  if (prefs.enableLocation && hasLocation === false) {
    reminders.push({
      type: 'reminder_enable_location',
      title: 'Enable Location',
      message: 'Location access helps SOS and nearby services work faster.',
      category: 'reminder',
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      actionPath: '/settings/privacy',
      throttleKey: 'reminder:enable-location',
      throttleMs: 24 * 60 * 60_000
    });
  }
  if (prefs.reviewSafetySettings) {
    reminders.push({
      type: 'reminder_review_safety',
      title: 'Review Safety Settings',
      message: 'Take a moment to review SOS alerts and notification preferences.',
      category: 'reminder',
      priority: NOTIFICATION_PRIORITIES.LOW,
      actionPath: '/settings',
      throttleKey: 'reminder:review-safety',
      throttleMs: 7 * 24 * 60 * 60_000
    });
  }

  return reminders;
};

export const replayOfflineNotifications = ({ emergencyNotify }) => {
  if (!emergencyNotify) return;
  flushOfflineNotificationQueue().forEach((payload) => emergencyNotify({
    ...payload,
    title: payload.title || 'Queued Notification',
    message: payload.message || 'This notification was queued while offline.',
    throttleKey: `${payload.throttleKey || payload.type || payload.title}:replayed:${payload.queuedAt || Date.now()}`
  }));
};
