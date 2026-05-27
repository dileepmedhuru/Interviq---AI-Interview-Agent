const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/password', ctrl.changePassword);
router.get('/stats', ctrl.getStats);

module.exports = router;