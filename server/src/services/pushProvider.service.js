import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import PushDevice from '../models/pushDevice.model.js';
import { sanitizeNotificationPayload } from '../utils/pushSecurity.js';

let appReady = false;

const getPrivateKey = () => {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  return key ? key.replace(/\\n/g, '\n') : '';
};

export const initializePushProvider = () => {
  if (appReady || getApps().length) {
    appReady = true;
    return true;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();
  if (!projectId || !clientEmail || !privateKey) return false;

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });
  appReady = true;
  return true;
};

const buildMessage = (token, payload) => ({
  token,
  ...(payload.silent ? {} : { notification: {
    title: payload.title,
    body: payload.message
  } }),
  webpush: {
    notification: {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      requireInteraction: payload.priority === 'critical',
      timestamp: Date.now(),
      vibrate: payload.vibration || [120],
      actions: payload.actions
    },
    fcmOptions: {
      link: payload.actionPath || '/dashboard'
    }
  },
  data: {
    notificationId: payload.notificationId,
    type: payload.type,
    actionPath: payload.actionPath,
    priority: payload.priority,
    silent: String(Boolean(payload.silent)),
    metadata: JSON.stringify(payload.metadata || {})
  }
});

const buildTopicMessage = (topic, payload) => {
  const message = buildMessage('__topic__', payload);
  delete message.token;
  message.topic = topic;
  return message;
};

export const sendPushToUser = async ({ userId, payload }) => {
  const safePayload = sanitizeNotificationPayload(payload);
  const devices = await PushDevice.find({ userId, isActive: true, permission: 'granted', tokenStatus: 'active' }).select('+pushToken');
  if (!devices.length) return { success: true, delivered: 0, failed: 0, skipped: true, reason: 'No active push devices.' };
  if (!initializePushProvider()) {
    return { success: false, delivered: 0, failed: 0, skipped: true, reason: 'Firebase Admin is not configured.' };
  }

  let delivered = 0;
  let failed = 0;
  const failures = [];

  await Promise.all(devices.map(async (device) => {
    try {
      await getMessaging().send(buildMessage(device.pushToken, safePayload));
      delivered += 1;
      device.lastActiveAt = new Date();
      device.analytics.push({
        notificationId: safePayload.notificationId,
        type: safePayload.type,
        title: safePayload.title,
        status: 'delivered',
        occurredAt: new Date()
      });
      if (device.analytics.length > 100) device.analytics = device.analytics.slice(-100);
      await device.save();
    } catch (error) {
      failed += 1;
      const code = error?.errorInfo?.code || error?.code || '';
      failures.push({ deviceId: device.deviceId, code });
      if (/registration-token-not-registered|invalid-registration-token|invalid-argument/i.test(code)) {
        device.isActive = false;
        device.tokenStatus = 'invalid';
      }
      device.analytics.push({
        notificationId: safePayload.notificationId,
        type: safePayload.type,
        title: safePayload.title,
        status: 'failed',
        error: String(code || error?.message || 'Push delivery failed').slice(0, 200),
        occurredAt: new Date()
      });
      if (device.analytics.length > 100) device.analytics = device.analytics.slice(-100);
      await device.save();
    }
  }));

  return { success: failed === 0, delivered, failed, failures };
};

export const queuePushDelivery = async ({ userId, payload, maxRetries = 3 }) => {
  let attempt = 0;
  let lastResult = null;
  while (attempt <= maxRetries) {
    lastResult = await sendPushToUser({ userId, payload: { ...payload, retryCount: attempt } });
    if (lastResult.success || lastResult.skipped) return { ...lastResult, retryCount: attempt };
    await new Promise((resolve) => setTimeout(resolve, Math.min(250 * (2 ** attempt), 2000)));
    attempt += 1;
  }
  return { ...(lastResult || {}), success: false, retryCount: maxRetries };
};

export const sendPushToUsers = async ({ userIds = [], payload }) => {
  const uniqueIds = [...new Set(userIds.map(String).filter(Boolean))];
  const results = await Promise.all(uniqueIds.map((userId) => queuePushDelivery({ userId, payload })));
  return {
    success: results.every((item) => item.success || item.skipped),
    totalUsers: uniqueIds.length,
    delivered: results.reduce((sum, item) => sum + Number(item.delivered || 0), 0),
    failed: results.reduce((sum, item) => sum + Number(item.failed || 0), 0),
    results
  };
};

export const broadcastPush = async ({ payload }) => {
  const userIds = await PushDevice.distinct('userId', { isActive: true, permission: 'granted', tokenStatus: 'active' });
  return sendPushToUsers({ userIds, payload });
};

export const sendTopicPush = async ({ topic, payload }) => {
  const safePayload = sanitizeNotificationPayload(payload);
  if (!initializePushProvider()) {
    return { success: false, skipped: true, reason: 'Firebase Admin is not configured.' };
  }
  const response = await getMessaging().send(buildTopicMessage(topic, safePayload));
  return { success: true, messageId: response, topic };
};
