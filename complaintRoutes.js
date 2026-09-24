const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/complaintController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { requirePermission } = require('../utils/staffRoles');

router.get('/', requireAuth, requireRole('patient'), ctrl.myComplaints);

router.post(
  '/',
  requireAuth,
  requireRole('patient'),
  [
    body('hospitalId').isInt().withMessage('Select the hospital involved.'),
    body('complaintType').trim().notEmpty().withMessage('Select the nature of your complaint.'),
    body('incidentDate').isISO8601().withMessage('Enter a valid incident date.'),
    body('description').trim().notEmpty().withMessage('Provide a detailed description.'),
    body('rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  ],
  validateRequest,
  ctrl.create
);

// Staff/admin triage
router.get('/queue', requireAuth, requireRole('staff', 'admin'), requirePermission('manage_complaints'), ctrl.queue);
router.patch(
  '/:id/resolve',
  requireAuth,
  requireRole('staff', 'admin'),
  [body('status').isIn(['received', 'under_review', 'resolved', 'dismissed'])],
  validateRequest,
  requirePermission('manage_complaints'),
  ctrl.resolve
);

module.exports = router;
