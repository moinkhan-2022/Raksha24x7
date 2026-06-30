import { body } from 'express-validator';

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => !value || value === req.body.password)
    .withMessage('Confirm Password must match Password')
];

export const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

export const updateProfileValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
  body('avatar').optional().isString().withMessage('Avatar must be a string')
];
