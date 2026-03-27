const express = require('express');
const router = express.Router();
const { authenticate, requireMember } = require('../middleware/auth'); // Files allow members? Yes.
const { uploadFile, getFiles, deleteFile } = require('../controllers/fileController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/files/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/upload', authenticate, requireMember, upload.single('file'), uploadFile);
router.get('/', authenticate, requireMember, getFiles);
router.delete('/:id', authenticate, requireMember, deleteFile);

module.exports = router;
