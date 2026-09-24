const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/appointmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

router.use(requireAuth, requireRole('patient'));

router.get('/slots', ctrl.availableSlots);
router.get('/', ctrl.myAppointments);

router.post(
  '/',
  [
    body('hospitalId').isInt().withMessage('Select a hospital.'),
    body('service').trim().notEmpty().withMessage('Select a service.'),
    body('date').isISO8601().withMessage('Select a valid date.'),
    body('time').trim().notEmpty().withMessage('Select a time slot.'),
    body('mode').isIn(['In-Person Visit', 'Telehealth / Video Call', 'Phone Consultation']).withMessage('Select an appointment mode.'),
    body('reason').trim().notEmpty().withMessage('Describe the reason for your appointment.'),
  ],
  validateRequest,
  ctrl.book
);

router.delete('/:id', ctrl.cancel);

module.exports = router;
