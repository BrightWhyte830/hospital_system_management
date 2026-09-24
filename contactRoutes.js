const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/contactController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

router.get('/faqs', ctrl.faqs);
router.get('/settings', ctrl.publicSettings);

router.post(
  '/messages',
  requireAuth,
  requireRole('patient'),
  [
    body('hospitalId').isInt().withMessage('Select a hospital.'),
    body('subject').trim().notEmpty().withMessage('Select a subject.'),
    body('message').trim().notEmpty().withMessage('Enter your message.'),
  ],
  validateRequest,
  ctrl.send
);

module.exports = router;
