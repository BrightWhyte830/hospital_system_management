const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/serviceRequestController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

router.use(requireAuth, requireRole('patient'));

router.get('/', ctrl.myRequests);

router.post(
  '/',
  [
    body('hospitalId').isInt().withMessage('Select a hospital.'),
    body('service').trim().notEmpty().withMessage('Select a service.'),
    body('urgency').isIn(['Routine', 'Semi-Urgent', 'Urgent', 'Emergency']).withMessage('Select an urgency level.'),
    body('symptoms').trim().notEmpty().withMessage('Describe your symptoms or reason for this request.'),
    body('emergencyContactName').trim().notEmpty().withMessage('Emergency contact name is required.'),
    body('emergencyContactPhone').trim().notEmpty().withMessage('Emergency contact phone is required.'),
  ],
  validateRequest,
  ctrl.create
);

module.exports = router;
