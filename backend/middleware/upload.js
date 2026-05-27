const multer = require('multer');
const { UPLOAD_MAX_SIZE, ALLOWED_FILE_TYPES } = require('../config/constants');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and plain text files are allowed'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: UPLOAD_MAX_SIZE },
    fileFilter,
});

module.exports = upload;