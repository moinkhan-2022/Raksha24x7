import { notificationApi } from './api';

const DEVICE_ID_KEY = 'raksha_push_device_id';
const TOKEN_KEY = 'raksha_fcm_token';
const QUEUE_KEY = 'raksha_push_retry_queue';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseConfig = () => Boolean(
  firebaseConfig.apiKey
  && firebaseConfig.projectId
  && firebaseConfig.messagingSenderId
  && firebaseConfig.appId
  && import.meta.env.VITE_FIREBASE_VAPID_KEY
);

const safeJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage quota should not break safety workflows.
  }
};

export const getPushDeviceId = () => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

export const getDeviceInfo = () => {
  const ua = navigator.userAgent || '';
  const browser = /Edg/i.test(ua) ? 'Edge'
    : /Chrome/i.test(ua) ? 'Chrome'
      : /Firefox/i.test(ua) ? 'Firefox'
        : /Safari/i.test(ua) ? 'Safari'
          : 'Unknown';
  const os = /Windows/i.test(ua) ? 'Windows'
    : /Android/i.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
        : /Mac OS/i.test(ua) ? 'macOS'
          : /Linux/i.test(ua) ? 'Linux'
            : 'Unknown';
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  return { browser, os, platform: standalone ? 'pwa' : 'web', appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0' };
};

const getFirebaseMessaging = async () => {
  if (!hasFirebaseConfig()) return { supported: false, reason: 'Firebase push configuration is missing.' };
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'Service workers are not supported.' };
  const [{ initializeApp, getApps }, { getMessaging, isSupported }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging')
  ]);
  if (!await isSupported()) return { supported: false, reason: 'Firebase messaging is not supported in this browser.' };
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return { supported: true, messaging: getMessaging(app) };
};

const getPushServiceWorkerRegistration = async () => {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
};

export const queuePushRequest = (request) => {
  const queue = safeJson(QUEUE_KEY, []);
  writeJson(QUEUE_KEY, [...queue, { ...request, attempts: request.attempts || 0, queuedAt: new Date().toISOString() }].slice(-50));
};

export const flushPushQueue = async () => {
  const queue = safeJson(QUEUE_KEY, []);
  if (!queue.length || !navigator.onLine) return;
  const remaining = [];
  for (const item of queue) {
    try {
      if (item.type === 'analytics') await notificationApi.trackAnalytics(item.payload);
      if (item.type === 'register') await notificationApi.registerDevice(item.payload);
    } catch {
      if ((item.attempts || 0) < 3) remaining.push({ ...item, attempts: (item.attempts || 0) + 1 });
    }
  }
  writeJson(QUEUE_KEY, remaining);
};

export const registerPushDevice = async ({ permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission || 'default' } = {}) => {
  const basePayload = {
    deviceId: getPushDeviceId(),
    ...getDeviceInfo(),
    provider: 'fcm',
    permission
  };

  const setup = await getFirebaseMessaging();
  if (!setup.supported) return { success: false, permission, reason: setup.reason, device: basePayload };
  if (permission !== 'granted') return { success: false, permission, reason: 'Notification permission is not granted.', device: basePayload };

  const registration = await getPushServiceWorkerRegistration();
  const { getToken } = await import('firebase/messaging');
  const pushToken = await getToken(setup.messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  });
  if (!pushToken) return { success: false, permission, reason: 'FCM did not return a push token.', device: basePayload };

  localStorage.setItem(TOKEN_KEY, pushToken);
  const payload = { ...basePayload, pushToken };
  try {
    const { data } = await notificationApi.registerDevice(payload);
    return { success: true, token: pushToken, device: data.device };
  } catch (error) {
    queuePushRequest({ type: 'register', payload });
    return { success: false, token: pushToken, queued: true, reason: error.response?.data?.message || 'Device registration queued.' };
  }
};

export const unregisterPushDevice = async () => {
  const deviceId = getPushDeviceId();
  try {
    const setup = await getFirebaseMessaging();
    if (setup.supported) {
      const { deleteToken } = await import('firebase/messaging');
      await deleteToken(setup.messaging).catch(() => undefined);
    }
  } catch {
    // Token deletion can fail if Firebase is unavailable; server unregister still runs.
  }
  localStorage.removeItem(TOKEN_KEY);
  try {
    await notificationApi.unregisterDevice(deviceId);
  } catch {
    queuePushRequest({ type: 'analytics', payload: { deviceId, event: { status: 'failed', type: 'token_unregister', title: 'Token unregister failed' } } });
  }
};

export const trackPushAnalytics = async (event) => {
  const payload = { deviceId: getPushDeviceId(), event };
  try {
    await notificationApi.trackAnalytics(payload);
  } catch {
    queuePushRequest({ type: 'analytics', payload });
  }
};

export const subscribeForegroundMessages = async (handler) => {
  const setup = await getFirebaseMessaging();
  if (!setup.supported || typeof handler !== 'function') return () => {};
  const { onMessage } = await import('firebase/messaging');
  return onMessage(setup.messaging, (payload) => {
    handler(payload);
    trackPushAnalytics({
      notificationId: payload?.data?.notificationId || payload?.messageId,
      type: payload?.data?.type || 'push',
      title: payload?.notification?.title || 'Push Notification',
      status: 'delivered'
    });
  });
};

export const isPushConfigured = hasFirebaseConfig;
