const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
    createEvent,
    getEvents,
    deleteEvent,
    registerForEvent,
    getEventRegistrants,
    confirmEventPayment,
    getEventPaymentStatus,
    registerExternalForEvent,
    getPublicEventById
} = require('../controllers/eventController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for event images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/events/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed'));
        }
    }
});

// Create event (Admin only)
// Note: Frontend should handle image upload first or we can mix fields/files. 
// For simplicity assuming JSON payload for data and separate upload or handled by frontend sending image path.
// But CreateEventModal typically sends data. Let's assume frontend handles upload separately if complex, 
// OR we can use upload.single('image') here if form data is sent.
// Based on current patterns, assume simple JSON or separate upload endpoint.
// Let's create an upload endpoint for event images.

router.post('/upload', authenticate, requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({
        success: true,
        imagePath: `/uploads/events/${req.file.filename}`
    });
});

router.post('/', authenticate, requireAdmin, createEvent);

// Get all events
router.get('/', authenticate, getEvents);

// Delete event (Admin only)
router.delete('/:id', authenticate, requireAdmin, deleteEvent);

// Register for event
router.post('/:id/register', authenticate, registerForEvent);

// Get registrants (Admin only)
router.get('/:id/registrants', authenticate, requireAdmin, getEventRegistrants);

// Confirm payment for event registration
router.put('/:id/confirm-payment', authenticate, confirmEventPayment);

// Get payment status for event registration
router.get('/:id/payment-status', authenticate, getEventPaymentStatus);


// Get single event by ID (public - no auth required)
router.get('/:id/public', getPublicEventById);

// External registration (public - no auth required)
router.post('/:id/register-external', registerExternalForEvent);

module.exports = router;
