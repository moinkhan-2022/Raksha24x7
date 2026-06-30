import { validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // temporary debug logs
  // eslint-disable-next-line no-console
  console.log('validation errors:', errors.array());

  const first = errors.array()[0];
  return res.status(400).json({
    success: false,
    message: first?.msg || 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
  });
};
