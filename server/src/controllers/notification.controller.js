import PushDevice from '../models/pushDevice.model.js';
import { hashPushToken, isNotificationRateLimited, sanitizeNotificationPayload } from '../utils/pushSecurity.js';
import { broadcastPush, queuePushDelivery, sendPushToUsers, sendTopicPush } from '../services/pushProvider.service.js';

const MAX_ANALYTICS = 100;

const isAdmin = (user) => ['admin', 'ADMIN'].includes(user?.role);

const publicDevice = (device) => ({
  id: device._id,
  deviceId: device.deviceId,
  browser: device.browser,
  os: device.os,
  platform: device.platform,
  appVersion: device.appVersion,
  provider: device.provider,
  permission: device.permission,
  tokenStatus: device.tokenStatus,
  isActive: device.isActive,
  lastActiveAt: device.lastActiveAt,
  lastTokenRefreshAt: device.lastTokenRefreshAt,
  createdAt: device.createdAt,
  updatedAt: device.updatedAt
});

export const registerDevice = async (req, res) => {
  try {
    const { deviceId, browser, os, platform, appVersion, pushToken, permission, provider = 'fcm' } = req.body || {};
    if (!deviceId || !pushToken) {
      return res.status(400).json({ success: false, message: 'Device ID and push token are required.' });
    }
    if (!['granted', 'denied', 'default', 'unsupported'].includes(permission || 'default')) {
      return res.status(400).json({ success: false, message: 'Invalid notification permission.' });
    }

    const tokenHash = hashPushToken(pushToken);
    await PushDevice.updateMany(
      { userId: req.user._id, tokenHash, deviceId: { $ne: deviceId } },
      { $set: { isActive: false } }
    );

    const device = await PushDevice.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      {
        $set: {
          browser: browser || 'Unknown',
          os: os || 'Unknown',
          platform: platform || 'web',
          appVersion: appVersion || '1.0.0',
          provider,
          pushToken,
          tokenHash,
          permission: permission || 'default',
          tokenStatus: permission === 'granted' ? 'active' : 'revoked',
          isActive: permission !== 'denied',
          lastActiveAt: new Date(),
          lastTokenRefreshAt: new Date()
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, message: 'Device registered.', device: publicDevice(device) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'Device already registered.' });
    return res.status(500).json({ success: false, message: 'Could not register notification device.' });
  }
};

export const listDevices = async (req, res) => {
  try {
    const devices = await PushDevice.find({ userId: req.user._id }).sort({ lastActiveAt: -1 });
    return res.status(200).json({ success: true, devices: devices.map(publicDevice) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load notification devices.' });
  }
};

export const removeDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    await PushDevice.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      { $set: { isActive: false, permission: 'default' } }
    );
    return res.status(200).json({ success: true, message: 'Device removed.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not remove notification device.' });
  }
};

export const removeCurrentDevice = async (req, res) => {
  try {
    const { deviceId } = req.body || {};
    if (!deviceId) return res.status(400).json({ success: false, message: 'Device ID is required.' });
    await PushDevice.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      { $set: { isActive: false, permission: 'default' } }
    );
    return res.status(200).json({ success: true, message: 'Device unregistered.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not unregister device.' });
  }
};

export const trackNotificationAnalytics = async (req, res) => {
  try {
    if (isNotificationRateLimited(req.user._id, 60, 60_000)) {
      return res.status(429).json({ success: false, message: 'Too many notification events.' });
    }
    const { deviceId, event } = req.body || {};
    if (!deviceId || !event?.status) {
      return res.status(400).json({ success: false, message: 'Device ID and event status are required.' });
    }
    const allowedStatuses = ['queued', 'delivered', 'opened', 'dismissed', 'failed', 'retried'];
    if (!allowedStatuses.includes(event.status)) {
      return res.status(400).json({ success: false, message: 'Invalid notification event status.' });
    }

    const analyticsEvent = {
      ...sanitizeNotificationPayload(event),
      status: event.status,
      actionTaken: String(event.actionTaken || '').slice(0, 80),
      retryCount: Math.max(0, Math.min(Number(event.retryCount || 0), 3)),
      error: String(event.error || '').slice(0, 200),
      occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date()
    };

    const device = await PushDevice.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      {
        $set: { lastActiveAt: new Date() },
        $push: { analytics: { $each: [analyticsEvent], $slice: -MAX_ANALYTICS } }
      },
      { new: true }
    );

    if (!device) return res.status(404).json({ success: false, message: 'Notification device not found.' });
    return res.status(200).json({ success: true, message: 'Notification analytics saved.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not save notification analytics.' });
  }
};

export const sendTestNotification = async (req, res) => {
  try {
    if (isNotificationRateLimited(req.user._id, 10, 60_000)) {
      return res.status(429).json({ success: false, message: 'Too many notification requests.' });
    }
    const payload = sanitizeNotificationPayload({
      notificationId: `test-${Date.now()}`,
      type: 'system',
      title: 'Raksha24x7 Notifications Ready',
      message: 'Push notifications are configured for this device.',
      actionPath: '/settings/notifications',
      priority: 'normal',
      actions: [{ action: 'open-app', title: 'Open App' }]
    });
    const result = await queuePushDelivery({ userId: req.user._id, payload });
    return res.status(200).json({ success: true, message: 'Test notification processed.', result });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not send test notification.' });
  }
};

export const sendPushToCurrentUser = async (req, res) => {
  try {
    if (isNotificationRateLimited(req.user._id, 20, 60_000)) {
      return res.status(429).json({ success: false, message: 'Too many notification requests.' });
    }
    const payload = sanitizeNotificationPayload({
      notificationId: req.body?.notificationId || `push-${Date.now()}`,
      type: req.body?.type || 'general',
      title: req.body?.title || 'Raksha24x7',
      message: req.body?.message || '',
      actionPath: req.body?.actionPath || '/dashboard',
      priority: req.body?.priority || 'normal',
      actions: req.body?.actions || [{ action: 'open-app', title: 'Open App' }],
      metadata: req.body?.metadata || {}
    });
    const result = await queuePushDelivery({ userId: req.user._id, payload });
    return res.status(200).json({ success: true, message: 'Push notification processed.', result });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not process push notification.' });
  }
};

export const sendPushToManyUsers = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Admin access required.' });
    const result = await sendPushToUsers({ userIds: req.body?.userIds || [], payload: req.body || {} });
    return res.status(200).json({ success: true, message: 'Multi-user push processed.', result });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not process multi-user push.' });
  }
};

export const broadcastPushNotification = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Admin access required.' });
    const result = await broadcastPush({ payload: req.body || {} });
    return res.status(200).json({ success: true, message: 'Broadcast push processed.', result });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not process broadcast push.' });
  }
};

export const sendTopicPushNotification = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Admin access required.' });
    const { topic } = req.body || {};
    if (!topic || !/^[a-zA-Z0-9_-]+$/.test(topic)) return res.status(400).json({ success: false, message: 'Valid topic is required.' });
    const result = await sendTopicPush({ topic, payload: req.body || {} });
    return res.status(200).json({ success: true, message: 'Topic push processed.', result });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not process topic push.' });
  }
};
