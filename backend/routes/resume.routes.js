const router = require('express').Router();
const ctrl = require('../controllers/resume.controller');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/upload', upload.single('resume'), ctrl.uploadResume);
router.get('/active', ctrl.getActiveResume);

module.exports = router;