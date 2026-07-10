import { body } from 'express-validator';

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const registerValidator = [
  body('email')
    .notEmpty().withMessage('All fields are required')
    .bail()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('All fields are required')
    .bail()
    .matches(strongPasswordRegex)
    .withMessage('Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number'),
  body('confirmPassword')
    .notEmpty().withMessage('All fields are required')
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
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
