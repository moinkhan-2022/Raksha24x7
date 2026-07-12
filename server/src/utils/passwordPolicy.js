const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  'password',
  'password123',
  'admin123',
  'qwerty',
  'qwerty123',
  'letmein',
  'welcome123'
]);

export const validateStrongPassword = (password = '') => {
  const value = String(password);
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 128) return 'Password must be 128 characters or less.';
  if (COMMON_WEAK_PASSWORDS.has(value.toLowerCase())) return 'This password is too common.';
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.';
  if (!/\d/.test(value)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include a special character.';
  return '';
};

export const isStrongPassword = (password = '') => !validateStrongPassword(password);
