import NotificationSettings from '../models/notificationSettings.model.js';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../constants/notification.constants.js';

const allowedSettings = Object.keys(DEFAULT_NOTIFICATION_SETTINGS);

export const getOrCreateSettings = async (userId) => NotificationSettings.findOneAndUpdate(
  { userId },
  { $setOnInsert: { userId, ...DEFAULT_NOTIFICATION_SETTINGS } },
  { new: true, upsert: true, setDefaultsOnInsert: true }
).lean();

export const updateSettings = async (userId, payload = {}) => {
  const update = {};
  allowedSettings.forEach((key) => {
    if (typeof payload[key] === 'boolean') update[key] = payload[key];
  });
  return NotificationSettings.findOneAndUpdate(
    { userId },
    { $set: update, $setOnInsert: { userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
};
