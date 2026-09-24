const router = require('express').Router();
const ctrl = require('../controllers/hospitalController');

router.get('/', ctrl.list);

module.exports = router;
