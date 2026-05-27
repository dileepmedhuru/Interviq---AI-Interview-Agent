const router = require('express').Router();
const ctrl = require('../controllers/interview.controller');
const { protect } = require('../middleware/authMiddleware');
const { claudeLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.post('/setup', claudeLimiter, ctrl.setupInterview);
router.post('/:id/answer', claudeLimiter, ctrl.submitAnswer);
router.post('/:id/evaluate', claudeLimiter, ctrl.evaluateInterview);
router.get('/history', ctrl.getHistory);
router.get('/:id', ctrl.getInterview);

module.exports = router;