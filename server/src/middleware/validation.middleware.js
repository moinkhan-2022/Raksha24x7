import mongoose from 'mongoose';
import { validateStrongPassword } from '../utils/passwordPolicy.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9\s-]{7,15}$/;

const normalizeValue = (value) => (typeof value === 'string'
  ? value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ')
  : value);

const validators = {
  string: (value) => typeof value === 'string',
  boolean: (value) => typeof value === 'boolean',
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  email: (value) => typeof value === 'string' && emailRegex.test(value),
  phone: (value) => typeof value === 'string' && phoneRegex.test(value),
  password: (value) => typeof value === 'string' && !validateStrongPassword(value),
  objectId: (value) => mongoose.Types.ObjectId.isValid(String(value || '')),
  array: (value) => Array.isArray(value),
  date: (value) => !Number.isNaN(new Date(value).getTime()),
  coordinates: (value) => value && typeof value === 'object'
    && typeof value.latitude === 'number'
    && typeof value.longitude === 'number'
    && value.latitude >= -90
    && value.latitude <= 90
    && value.longitude >= -180
    && value.longitude <= 180
};

const tenDigitPhone = /^\d{10}$/;

const getSource = (req, source) => {
  if (source === 'body') return req.body || {};
  if (source === 'query') return req.query || {};
  if (source === 'params') return req.params || {};
  if (source === 'headers') return req.headers || {};
  return {};
};

const validateSource = ({ req, source, schema, allowUnknown = false }) => {
  const target = getSource(req, source);
  const errors = [];
  const allowedFields = new Set(Object.keys(schema || {}));

  if (!allowUnknown) {
    Object.keys(target).forEach((field) => {
      if (!allowedFields.has(field)) errors.push({ field, message: `${field} is not allowed.` });
    });
  }

  Object.entries(schema || {}).forEach(([field, rule]) => {
    const raw = target[field];
    const value = normalizeValue(raw);
    if (raw !== value) target[field] = value;

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: rule.message || `${field} is required.` });
      return;
    }
    if ((value === undefined || value === null || value === '') && !rule.required) return;

    if (rule.type && !validators[rule.type]?.(value)) {
      errors.push({ field, message: rule.typeMessage || `${field} is invalid.` });
      return;
    }
    if (rule.min !== undefined && String(value).length < rule.min) errors.push({ field, message: `${field} is too short.` });
    if (rule.max !== undefined && String(value).length > rule.max) errors.push({ field, message: `${field} is too long.` });
    if (rule.enum && !rule.enum.includes(value)) errors.push({ field, message: `${field} must be one of: ${rule.enum.join(', ')}.` });
    if (rule.pattern && !rule.pattern.test(String(value))) errors.push({ field, message: rule.patternMessage || `${field} format is invalid.` });
    if (rule.custom) {
      const customResult = rule.custom(value, target, req);
      if (customResult) errors.push({ field, message: customResult });
    }
  });

  return errors;
};

export const validateSchema = ({ body, query, params, headers, allowUnknownBody = false, allowUnknownQuery = true, allowUnknownParams = true, allowUnknownHeaders = true } = {}) => (req, res, next) => {
  const errors = [
    ...validateSource({ req, source: 'body', schema: body, allowUnknown: allowUnknownBody }),
    ...validateSource({ req, source: 'query', schema: query, allowUnknown: allowUnknownQuery }),
    ...validateSource({ req, source: 'params', schema: params, allowUnknown: allowUnknownParams }),
    ...validateSource({ req, source: 'headers', schema: headers, allowUnknown: allowUnknownHeaders })
  ];

  if (errors.length) {
    return res.status(400).json({ success: false, message: 'Validation failed.', errors });
  }
  return next();
};

export const authSchemas = {
  register: {
    email: { required: true, type: 'email', typeMessage: 'Valid email is required.' },
    password: { required: true, type: 'password', typeMessage: 'Password does not meet security requirements.' },
    confirmPassword: { required: true, type: 'string', custom: (value, body) => (value !== body.password ? 'Passwords do not match.' : '') }
  },
  login: {
    email: { required: true, type: 'email', typeMessage: 'Valid email is required.' },
    password: { required: true, type: 'string', min: 1, max: 128 }
  },
  adminLogin: {
    email: { required: true, type: 'email', typeMessage: 'Valid admin email is required.' },
    password: { required: true, type: 'string', min: 1, max: 128 },
    remember: { type: 'boolean' }
  },
  googleLogin: {
    idToken: { required: true, type: 'string', min: 20, max: 5000 }
  },
  forgotPassword: {
    email: { required: true, type: 'email', typeMessage: 'Valid email is required.' }
  },
  resetPassword: {
    token: { type: 'string', min: 20, max: 256 },
    password: { required: true, type: 'password', typeMessage: 'Password does not meet security requirements.' },
    confirmPassword: { required: true, type: 'string', custom: (value, body) => (value !== body.password ? 'Passwords do not match.' : '') }
  },
  verifyEmail: {
    token: { type: 'string', min: 20, max: 256 }
  },
  changePassword: {
    currentPassword: { required: true, type: 'string', min: 1, max: 128 },
    newPassword: { required: true, type: 'password', typeMessage: 'Password does not meet security requirements.' },
    confirmPassword: { required: true, type: 'string', custom: (value, body) => (value !== body.newPassword ? 'Passwords do not match.' : '') }
  }
};

export const profileSchemas = {
  update: {
    name: { required: true, type: 'string', min: 2, max: 80 },
    phone: { required: true, type: 'string', pattern: tenDigitPhone, patternMessage: 'Phone number must be 10 digits.' },
    dateOfBirth: { type: 'date' },
    gender: { type: 'string', max: 30 },
    bloodGroup: { type: 'string', max: 10 },
    medicalNotes: { type: 'string', max: 1000 }
  },
  contact: {
    name: { required: true, type: 'string', min: 2, max: 80 },
    relationship: { required: true, type: 'string', min: 2, max: 50 },
    phone: { required: true, type: 'string', pattern: tenDigitPhone, patternMessage: 'Phone number must be 10 digits.' }
  },
  deleteAccount: {
    password: { required: true, type: 'string', min: 1, max: 128 }
  }
};

export const locationSchemas = {
  save: {
    latitude: { required: true, type: 'number', custom: (value) => (value < -90 || value > 90 ? 'Latitude must be between -90 and 90.' : '') },
    longitude: { required: true, type: 'number', custom: (value) => (value < -180 || value > 180 ? 'Longitude must be between -180 and 180.' : '') },
    accuracy: { type: 'number' },
    googleMapLink: { type: 'string', max: 500 },
    timestamp: { type: 'date' },
    trackingMode: { enum: ['current', 'live'] }
  }
};

export const sosSchemas = {
  create: {
    latitude: { required: true, type: 'number', custom: (value) => (value < -90 || value > 90 ? 'Latitude must be between -90 and 90.' : '') },
    longitude: { required: true, type: 'number', custom: (value) => (value < -180 || value > 180 ? 'Longitude must be between -180 and 180.' : '') },
    accuracy: { type: 'number' },
    address: { type: 'string', max: 500 },
    message: { type: 'string', max: 1000 },
    emergencyType: { type: 'string', max: 60 },
    batteryLevel: { type: 'number' },
    contacts: { type: 'array' }
  },
  idParam: {
    id: { required: true, type: 'objectId', typeMessage: 'Valid id is required.' }
  }
};
