const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { requirePermission, roleCatalog } = require('../utils/staffRoles');

const STAFF_ROLES = roleCatalog().map((role) => role.value);

// Everything here requires a signed-in staff or admin account.
router.use(requireAuth, requireRole('staff', 'admin'));

// ---- Dashboard (staff + admin) ----
router.get('/dashboard', ctrl.dashboardStats);
router.get('/roles', ctrl.listStaffRoles);
router.get('/it/overview', requirePermission('view_it'), ctrl.itOverview);
router.post('/it/health-check', requirePermission('manage_it'), ctrl.runItHealthCheck);

// ---- Operational queues: staff can triage day-to-day work ----
router.get('/appointments', requirePermission('view_appointments'), ctrl.listAppointments);
router.get('/service-requests', requirePermission('manage_requests'), ctrl.listServiceRequests);
router.patch(
  '/service-requests/:id',
  [body('status').isIn(['pending', 'triaged', 'in_progress', 'completed', 'cancelled'])],
  validateRequest,
  requirePermission('manage_requests'),
  ctrl.updateServiceRequestStatus
);
router.get('/messages', requirePermission('manage_messages'), ctrl.listMessages);
router.patch(
  '/messages/:id',
  [body('status').isIn(['open', 'answered', 'closed'])],
  validateRequest,
  requirePermission('manage_messages'),
  ctrl.updateMessageStatus
);

// ---- Everything below is ministry-admin only: accounts, hospitals, settings, audit ----
router.get('/users', requireRole('admin'), ctrl.listUsers);
router.get('/users/:id', requireRole('admin'), ctrl.getUser);
router.patch('/users/:id/profile', requireRole('admin'), ctrl.updateUserProfile);
router.post(
  '/staff',
  requireRole('admin'),
  [
    body('email').isEmail().withMessage('Enter a valid email address.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('role').isIn(['staff', 'admin']).withMessage('Role must be staff or admin.'),
    body('jobRole').optional({ values: 'falsy' }).isIn(STAFF_ROLES).withMessage('Select a valid hospital staff role.'),
  ],
  validateRequest,
  ctrl.createStaff
);
router.patch('/users/:id/active', requireRole('admin'), [body('isActive').isBoolean()], validateRequest, ctrl.setUserActive);
router.patch('/users/:id/role', requireRole('admin'), [body('role').isIn(['patient', 'staff', 'admin'])], validateRequest, ctrl.updateUserRole);

router.get('/hospitals', requireRole('admin'), ctrl.listHospitals);
router.post(
  '/hospitals',
  requireRole('admin'),
  [body('name').trim().notEmpty(), body('region').trim().notEmpty()],
  validateRequest,
  ctrl.createHospital
);
router.patch('/hospitals/:id', requireRole('admin'), ctrl.updateHospital);

router.get('/audit-log', requireRole('admin'), ctrl.auditLog);
router.get('/settings', requireRole('admin'), ctrl.getSettings);
router.patch('/settings', requireRole('admin'), ctrl.updateSettings);

module.exports = router;
