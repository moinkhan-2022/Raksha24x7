import crypto from 'crypto';
import Sos from '../models/sos.model.js';
import User from '../models/user.model.js';
import { createNotification } from '../notifications/services/notification.service.js';
import { sendTemplateEmail } from '../email/services/email.service.js';
import { queuePushDelivery } from './pushProvider.service.js';

const supportedChannels = ['push', 'browser', 'email', 'sms', 'whatsapp'];
const TRACKING_EXPIRE_MS = 6 * 60 * 60 * 1000;
const MAX_LOCATION_UPDATES = 100;

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';
const createRawToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const toNumber = (value) => Number(value);

const isValidCoordinate = ({ latitude, longitude }) => (
  Number.isFinite(toNumber(latitude))
  && Number.isFinite(toNumber(longitude))
  && toNumber(latitude) >= -90
  && toNumber(latitude) <= 90
  && toNumber(longitude) >= -180
  && toNumber(longitude) <= 180
);

const dateTime = (timestamp = new Date()) => new Date(timestamp).toLocaleString('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata'
});

export const buildGoogleMapLinks = ({ latitude, longitude }) => {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  return {
    googleMapLink: `https://maps.google.com/?q=${lat},${lng}`,
    directionsLink: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    coordinates: `${lat},${lng}`
  };
};

export const validateSosRequest = (payload = {}) => {
  const latitude = toNumber(payload.latitude);
  const longitude = toNumber(payload.longitude);
  if (!isValidCoordinate({ latitude, longitude })) {
    const error = new Error('Valid latitude and longitude are required.');
    error.statusCode = 400;
    throw error;
  }
  const accuracy = payload.accuracy === undefined || payload.accuracy === null ? null : Math.max(0, toNumber(payload.accuracy));
  if (accuracy !== null && !Number.isFinite(accuracy)) {
    const error = new Error('Accuracy must be a valid number.');
    error.statusCode = 400;
    throw error;
  }
  return {
    latitude,
    longitude,
    accuracy,
    emergencyType: String(payload.emergencyType || 'sos').slice(0, 40),
    message: String(payload.message || '').slice(0, 1000),
    address: String(payload.address || '').slice(0, 300),
    batteryLevel: payload.batteryLevel === undefined || payload.batteryLevel === null ? null : Math.max(0, Math.min(100, toNumber(payload.batteryLevel))),
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date()
  };
};

const findContactUser = async (contact) => {
  const phone = String(contact.phone || '').replace(/\D/g, '');
  const email = String(contact.email || '').toLowerCase().trim();
  const query = [];
  if (phone) query.push({ phone });
  if (email) query.push({ email });
  if (!query.length) return null;
  return User.findOne({ $or: query, deletedAt: null }).select('_id name email phone').lean();
};

const buildEmergencyMessage = ({ user, payload, googleMapLink, liveTrackingLink }) => {
  const userName = user?.name || 'Raksha24x7 user';
  const phone = user?.phone || 'Unavailable';
  return `SOS Alert from ${userName}\nPhone: ${phone}\nTime: ${dateTime(payload.timestamp)}\nLocation: ${googleMapLink}\nLive tracking: ${liveTrackingLink}\nMessage: ${payload.message || 'I need immediate help. Please contact me now.'}`;
};

export const buildEmergencyContactNotifications = ({ user, contacts, googleMapLink, directionsLink, liveTrackingLink, payload }) => {
  const userName = user?.name || 'Raksha24x7 user';
  const emergencyMessage = buildEmergencyMessage({ user, payload, googleMapLink, liveTrackingLink });

  return (contacts || []).map((contact) => ({
    contactId: contact._id,
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phone,
    email: contact.email || '',
    channels: supportedChannels.map((channel) => {
      const missingEmail = channel === 'email' && !contact.email;
      const futureChannel = ['sms', 'whatsapp'].includes(channel);
      return {
        channel,
        provider: futureChannel ? 'future' : 'raksha24x7',
        status: missingEmail || futureChannel ? 'skipped' : 'queued',
        reason: missingEmail ? 'Contact email unavailable' : futureChannel ? `${channel.toUpperCase()} provider not configured yet` : '',
        payload: {
          userName,
          userPhone: user?.phone || '',
          contactName: contact.name,
          emergencyType: payload.emergencyType,
          emergencyMessage,
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
          address: payload.address,
          batteryLevel: payload.batteryLevel,
          locationLink: googleMapLink,
          directionsLink,
          liveTrackingLink,
          dateTime: dateTime(payload.timestamp),
          emergencyStatus: 'Active'
        }
      };
    })
  }));
};

export const summarizeNotificationPlan = (contactNotifications = []) => {
  const summary = { contacts: contactNotifications.length, queued: 0, skipped: 0, channels: supportedChannels };
  contactNotifications.forEach((contact) => {
    contact.channels.forEach((channel) => {
      if (channel.status === 'queued') summary.queued += 1;
      if (channel.status === 'skipped') summary.skipped += 1;
    });
  });
  return summary;
};

export const summarizeDelivery = (contactNotifications = []) => {
  const summary = { queued: 0, sent: 0, delivered: 0, failed: 0, skipped: 0, retrying: 0, cancelled: 0 };
  contactNotifications.forEach((contact) => {
    contact.channels.forEach((channel) => {
      if (summary[channel.status] !== undefined) summary[channel.status] += 1;
    });
  });
  return summary;
};

const updateChannel = (contactNotifications, contactIndex, channelName, patch) => {
  const channel = contactNotifications[contactIndex]?.channels?.find((item) => item.channel === channelName);
  if (channel) Object.assign(channel, patch);
};

const sendContactEmail = async ({ sos, user, contact, channel }) => {
  if (!contact.email) return { status: 'skipped', reason: 'Contact email unavailable' };
  await sendTemplateEmail({
    template: 'emergencyAlert',
    to: contact.email,
    userId: user._id,
    data: {
      name: contact.name,
      userName: user.name,
      userPhone: user.phone,
      emergencyTime: channel.payload.dateTime,
      emergencyType: sos.emergencyType,
      address: sos.address || 'Unavailable',
      latitude: sos.latitude,
      longitude: sos.longitude,
      accuracy: sos.accuracy,
      googleMapLink: sos.googleMapLink,
      directionsLink: sos.directionsLink,
      liveTrackingLink: sos.liveTrackingLink,
      emergencyMessage: sos.message,
      batteryLevel: sos.batteryLevel
    },
    metadata: { sosId: String(sos._id), emergencyId: sos.emergencyId, contactId: String(contact.contactId || '') }
  });
  return { status: 'sent', provider: 'email', sentAt: new Date(), deliveredAt: new Date() };
};

const sendContactAppNotifications = async ({ sos, user, contact, contactUser, channel }) => {
  if (!contactUser?._id) return { status: 'skipped', reason: 'Contact is not a Raksha24x7 user' };
  await createNotification({
    actorId: user._id,
    payload: {
      userId: contactUser._id,
      title: 'SOS Emergency Alert',
      message: `${user.name || 'A Raksha24x7 user'} needs help. Tap to view live location.`,
      type: 'sos',
      priority: 'critical',
      channel: 'in-app',
      metadata: {
        sosId: String(sos._id),
        emergencyId: sos.emergencyId,
        googleMapLink: sos.googleMapLink,
        liveTrackingLink: sos.liveTrackingLink,
        latitude: sos.latitude,
        longitude: sos.longitude,
        ...channel.payload
      }
    }
  });
  return { status: 'delivered', provider: 'in-app', sentAt: new Date(), deliveredAt: new Date() };
};

const sendContactPush = async ({ sos, user, contactUser, channel }) => {
  if (!contactUser?._id) return { status: 'skipped', reason: 'Contact is not a Raksha24x7 user' };
  const result = await queuePushDelivery({
    userId: contactUser._id,
    payload: {
      notificationId: `sos-${sos._id}-${contactUser._id}`,
      type: 'sos_activated',
      title: 'SOS Emergency Alert',
      message: `${user.name || 'A Raksha24x7 user'} needs immediate help.`,
      actionPath: `/sos-history?sosId=${sos._id}`,
      priority: 'critical',
      vibration: [200, 100, 200, 100, 300],
      actions: [
        { action: 'open-sos', title: 'View Live Location' },
        { action: 'call-emergency', title: 'Call 112' }
      ],
      metadata: {
        sosId: String(sos._id),
        emergencyId: sos.emergencyId,
        googleMapLink: sos.googleMapLink,
        liveTrackingLink: sos.liveTrackingLink,
        ...channel.payload
      }
    }
  });
  if (result.skipped) return { status: 'skipped', provider: 'fcm', reason: result.reason || 'No active push device' };
  return {
    status: result.success ? 'delivered' : 'failed',
    provider: 'fcm',
    reason: result.success ? '' : 'Push delivery failed',
    sentAt: new Date(),
    deliveredAt: result.success ? new Date() : null,
    retryCount: result.retryCount || 0
  };
};

export const processSosDeliveries = async (sos, user) => {
  const contactNotifications = sos.contactNotifications.map((contact) => contact.toObject?.() || contact);

  await Promise.all(contactNotifications.map(async (contact, contactIndex) => {
    const contactUser = await findContactUser(contact).catch(() => null);
    const emailChannel = contact.channels.find((channel) => channel.channel === 'email');
    const browserChannel = contact.channels.find((channel) => channel.channel === 'browser');
    const pushChannel = contact.channels.find((channel) => channel.channel === 'push');

    if (emailChannel?.status === 'queued') {
      try {
        updateChannel(contactNotifications, contactIndex, 'email', await sendContactEmail({ sos, user, contact, channel: emailChannel }));
      } catch (error) {
        updateChannel(contactNotifications, contactIndex, 'email', { status: 'failed', provider: 'email', reason: error.message, lastAttemptAt: new Date() });
      }
    }

    if (browserChannel?.status === 'queued') {
      try {
        updateChannel(contactNotifications, contactIndex, 'browser', await sendContactAppNotifications({ sos, user, contact, contactUser, channel: browserChannel }));
      } catch (error) {
        updateChannel(contactNotifications, contactIndex, 'browser', { status: 'failed', provider: 'in-app', reason: error.message, lastAttemptAt: new Date() });
      }
    }

    if (pushChannel?.status === 'queued') {
      try {
        updateChannel(contactNotifications, contactIndex, 'push', await sendContactPush({ sos, user, contactUser, channel: pushChannel }));
      } catch (error) {
        updateChannel(contactNotifications, contactIndex, 'push', { status: 'failed', provider: 'fcm', reason: error.message, lastAttemptAt: new Date() });
      }
    }
  }));

  sos.contactNotifications = contactNotifications;
  sos.deliverySummary = summarizeDelivery(contactNotifications);
  sos.status = sos.deliverySummary.failed > 0 && sos.deliverySummary.delivered + sos.deliverySummary.sent === 0 ? 'failed' : 'active';
  sos.statusTimeline.push({
    status: sos.status,
    message: sos.status === 'failed' ? 'Some emergency communications failed.' : 'Emergency contacts notified.',
    at: new Date()
  });
  await sos.save();
  return sos;
};

export const createEmergencyEvent = async ({ userId, payload }) => {
  const safePayload = validateSosRequest(payload);
  const user = await User.findById(userId).select('name email phone contacts');
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }
  if (!user.contacts?.length) {
    const error = new Error('No emergency contacts found. Please add at least one contact.');
    error.statusCode = 400;
    throw error;
  }

  const token = createRawToken();
  const links = buildGoogleMapLinks(safePayload);
  const liveTrackingLink = `${clientUrl()}/sos-tracking/${token}`;
  const message = safePayload.message || buildEmergencyMessage({ user, payload: safePayload, googleMapLink: links.googleMapLink, liveTrackingLink });
  const contactNotifications = buildEmergencyContactNotifications({
    user,
    contacts: user.contacts,
    googleMapLink: links.googleMapLink,
    directionsLink: links.directionsLink,
    liveTrackingLink,
    payload: { ...safePayload, message }
  });

  const sos = await Sos.create({
    userId,
    emergencyType: safePayload.emergencyType,
    latitude: safePayload.latitude,
    longitude: safePayload.longitude,
    accuracy: safePayload.accuracy,
    address: safePayload.address,
    googleMapLink: links.googleMapLink,
    directionsLink: links.directionsLink,
    liveTrackingLink,
    trackingTokenHash: hashToken(token),
    trackingExpiresAt: new Date(Date.now() + TRACKING_EXPIRE_MS),
    trackingActive: true,
    locationUpdates: [{ latitude: safePayload.latitude, longitude: safePayload.longitude, accuracy: safePayload.accuracy, timestamp: safePayload.timestamp }],
    message,
    batteryLevel: safePayload.batteryLevel,
    contacts: user.contacts.map((contact) => `${contact.name} (${contact.phone})`),
    contactNotifications,
    notificationPlan: summarizeNotificationPlan(contactNotifications),
    deliverySummary: summarizeDelivery(contactNotifications),
    status: 'sending',
    statusTimeline: [
      { status: 'preparing', message: 'Preparing emergency notifications.', at: new Date() },
      { status: 'sending', message: 'Sending notifications to emergency contacts.', at: new Date() }
    ]
  });

  await createNotification({
    actorId: userId,
    payload: {
      userId,
      title: 'SOS Activated',
      message: 'Emergency mode has started. Location is being shared.',
      type: 'sos',
      priority: 'critical',
      channel: 'in-app',
      metadata: { sosId: String(sos._id), emergencyId: sos.emergencyId, googleMapLink: sos.googleMapLink, liveTrackingLink: sos.liveTrackingLink }
    }
  }).catch(() => null);

  const processed = await processSosDeliveries(sos, user);
  return { sos: processed, trackingToken: token };
};

export const stopEmergencyEvent = async ({ userId, sosId }) => {
  const sos = await Sos.findOne({ _id: sosId, userId });
  if (!sos) return null;
  sos.status = 'resolved';
  sos.trackingActive = false;
  sos.resolvedAt = new Date();
  sos.resolvedBy = userId;
  sos.statusTimeline.push({ status: 'resolved', message: 'Emergency resolved and live location sharing stopped.', at: new Date() });
  sos.contactNotifications.forEach((contact) => {
    contact.channels.forEach((channel) => {
      if (['queued', 'retrying'].includes(channel.status)) channel.status = 'cancelled';
    });
  });
  sos.deliverySummary = summarizeDelivery(sos.contactNotifications);
  await sos.save();
  return sos;
};

export const appendLocationUpdate = async ({ userId, sosId, payload }) => {
  const safePayload = validateSosRequest(payload);
  const links = buildGoogleMapLinks(safePayload);
  const sos = await Sos.findOne({ _id: sosId, userId });
  if (!sos) return null;
  if (!sos.trackingActive) {
    const error = new Error('Live location sharing is stopped for this SOS event.');
    error.statusCode = 400;
    throw error;
  }
  sos.latitude = safePayload.latitude;
  sos.longitude = safePayload.longitude;
  sos.accuracy = safePayload.accuracy;
  sos.address = safePayload.address || sos.address;
  sos.googleMapLink = links.googleMapLink;
  sos.directionsLink = links.directionsLink;
  sos.locationUpdates.push({ latitude: safePayload.latitude, longitude: safePayload.longitude, accuracy: safePayload.accuracy, timestamp: safePayload.timestamp });
  if (sos.locationUpdates.length > MAX_LOCATION_UPDATES) sos.locationUpdates = sos.locationUpdates.slice(-MAX_LOCATION_UPDATES);
  sos.statusTimeline.push({ status: 'location-shared', message: 'Live location updated.', at: new Date() });
  await sos.save();
  return sos;
};

export const getTrackingEvent = async ({ token }) => {
  const sos = await Sos.findOne({ trackingTokenHash: hashToken(token) }).select('+trackingTokenHash').populate('userId', 'name phone');
  if (!sos || !sos.trackingActive || !sos.trackingExpiresAt || sos.trackingExpiresAt <= new Date()) return null;
  return sos;
};

export const retryEmergencyDeliveries = async ({ userId, sosId }) => {
  const sos = await Sos.findOne({ _id: sosId, userId });
  if (!sos) return null;
  const user = await User.findById(userId).select('name email phone contacts');
  sos.contactNotifications.forEach((contact) => {
    contact.channels.forEach((channel) => {
      if (channel.status === 'failed' && Number(channel.retryCount || 0) < Number(channel.maxAttempts || 3)) {
        channel.status = 'queued';
        channel.retryCount = Number(channel.retryCount || 0) + 1;
        channel.lastAttemptAt = new Date();
      }
    });
  });
  sos.statusTimeline.push({ status: 'retrying', message: 'Retrying failed emergency communications.', at: new Date() });
  await sos.save();
  return processSosDeliveries(sos, user);
};
