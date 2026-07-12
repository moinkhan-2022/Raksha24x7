import mongoose from 'mongoose';

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true, index: true },
    general: {
      applicationName: { type: String, default: 'Raksha24x7' },
      applicationLogo: { type: String, default: '' },
      supportEmail: { type: String, default: 'support@raksha24x7.com' },
      supportPhone: { type: String, default: '' },
      companyName: { type: String, default: 'Raksha24x7' },
      copyright: { type: String, default: `© ${new Date().getFullYear()} Raksha24x7. All rights reserved.` },
      timezone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD MMM YYYY' },
      timeFormat: { type: String, default: '12h' },
      defaultLanguage: { type: String, default: 'en-IN' },
      defaultCountry: { type: String, default: 'IN' }
    },
    smtp: {
      provider: { type: String, default: 'resend' },
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      username: { type: String, default: '' },
      passwordEncrypted: { type: String, default: '', select: false },
      senderEmail: { type: String, default: 'no-reply@raksha24x7.com' },
      senderName: { type: String, default: 'Raksha24x7' },
      encryption: { type: String, enum: ['none', 'tls', 'ssl', 'starttls'], default: 'tls' },
      connectionTimeout: { type: Number, default: 10000 },
      lastTestedAt: { type: Date, default: null },
      lastTestStatus: { type: String, enum: ['untested', 'success', 'failed'], default: 'untested' },
      lastTestMessage: { type: String, default: '' }
    },
    application: {
      version: { type: String, default: '1.0.0' },
      minimumSupportedVersion: { type: String, default: '1.0.0' },
      sessionTimeout: { type: Number, default: 480 },
      maximumLoginAttempts: { type: Number, default: 5 },
      passwordPolicy: { type: String, default: 'strong' },
      maximumEmergencyContacts: { type: Number, default: 5 },
      maximumFileUploadSize: { type: Number, default: 5 },
      maximumSosDuration: { type: Number, default: 120 },
      notificationExpiry: { type: Number, default: 30 },
      locationAccuracyThreshold: { type: Number, default: 100 },
      offlineQueueLimit: { type: Number, default: 100 },
      rateLimits: { type: String, default: 'standard' }
    },
    theme: {
      defaultTheme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
      primaryColor: { type: String, default: '#FF5A3D' },
      accentColor: { type: String, default: '#EF4444' },
      sidebarStyle: { type: String, enum: ['compact', 'comfortable'], default: 'comfortable' },
      cardRadius: { type: Number, default: 24 },
      animationSpeed: { type: Number, default: 250 }
    },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'Raksha24x7 is undergoing scheduled maintenance.' },
      expectedEndTime: { type: Date, default: null },
      allowedIps: { type: [String], default: [] },
      allowedAdminAccess: { type: Boolean, default: true },
      banner: { type: String, default: '' },
      publicApiBlocking: { type: Boolean, default: false }
    },
    security: {
      jwtExpiration: { type: String, default: '7d' },
      refreshTokenExpiration: { type: String, default: '30d' },
      passwordComplexity: { type: String, default: 'strong' },
      sessionExpiration: { type: Number, default: 480 },
      maximumDevices: { type: Number, default: 5 },
      bruteForceProtection: { type: Boolean, default: true },
      accountLockDuration: { type: Number, default: 15 },
      apiRateLimits: { type: String, default: 'standard' },
      corsOrigins: { type: [String], default: ['http://localhost:5173'] }
    }
  },
  { timestamps: true }
);

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);
export default AdminSettings;
