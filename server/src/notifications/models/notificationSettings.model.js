import mongoose from 'mongoose';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../constants/notification.constants.js';

const notificationSettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    general: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.general },
    security: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.security },
    emergency: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.emergency },
    sos: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.sos },
    nearbyServices: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.nearbyServices },
    email: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.email },
    push: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.push },
    browser: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.browser },
    reminder: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.reminder },
    sms: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.sms },
    securityEmails: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.securityEmails },
    welcomeEmails: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.welcomeEmails },
    passwordEmails: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.passwordEmails },
    verificationEmails: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.verificationEmails },
    marketingEmails: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.marketingEmails }
  },
  { timestamps: true }
);

const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);
export default NotificationSettings;
