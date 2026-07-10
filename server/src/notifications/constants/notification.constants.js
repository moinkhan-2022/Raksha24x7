export const NOTIFICATION_TYPES = [
  'general',
  'system',
  'security',
  'reminder',
  'emergency',
  'sos',
  'nearby-services',
  'emergency-numbers',
  'profile',
  'authentication',
  'future-updates'
];

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'critical'];
export const NOTIFICATION_STATUSES = ['pending', 'queued', 'processing', 'delivered', 'read', 'failed', 'cancelled'];
export const NOTIFICATION_CHANNELS = ['in-app', 'email', 'push', 'browser', 'sms'];
export const QUEUE_STATUSES = ['pending', 'processing', 'delivered', 'failed', 'cancelled'];

export const DEFAULT_NOTIFICATION_SETTINGS = {
  general: true,
  security: true,
  emergency: true,
  sos: true,
  nearbyServices: true,
  email: false,
  push: false,
  browser: false,
  reminder: true,
  sms: false,
  securityEmails: true,
  welcomeEmails: true,
  passwordEmails: true,
  verificationEmails: true,
  marketingEmails: false
};
