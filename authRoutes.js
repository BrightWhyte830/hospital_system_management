const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const GHANA_CARD_RE = /^GHA-\d{9}-\d$/;

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Enter a valid email address.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('firstName').trim().notEmpty().withMessage('First name is required.'),
    body('lastName').trim().notEmpty().withMessage('Last name is required.'),
    body('phone').trim().notEmpty().withMessage('Phone number is required.'),
    body('ghanaCard').matches(GHANA_CARD_RE).withMessage('Ghana Card number must look like GHA-000000000-0.'),
    body('dob').isISO8601().withMessage('Enter a valid date of birth.'),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Select a gender.'),
  ],
  validateRequest,
  ctrl.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validateRequest,
  ctrl.login
);

router.get('/me', requireAuth, ctrl.me);

router.post(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  ],
  validateRequest,
  ctrl.changePassword
);

module.exports = router;
