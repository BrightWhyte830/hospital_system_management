const router = require('express').Router();
const ctrl = require('../controllers/patientController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('patient'));

router.get('/me/profile', ctrl.profile);
router.get('/me/summary', ctrl.summary);
router.get('/me/qr', ctrl.qrCode);

module.exports = router;
