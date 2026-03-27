const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
    createTraining,
    getTrainings,
    getTrainingById,
    deleteTraining,
    registerForTraining,
    getTrainingRegistrants,
    confirmTrainingPayment,
    getTrainingPaymentStatus,
    registerExternalForTraining,
    getPublicTrainingById
} = require('../controllers/trainingController');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/trainings/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'training-' + uniqueSuffix + path.extname(file.originalname));
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
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Training routes
router.post('/', authenticate, requireAdmin, upload.single('image'), createTraining);
router.get('/', authenticate, getTrainings);
router.get('/:id', authenticate, getTrainingById);
router.delete('/:id', authenticate, requireAdmin, deleteTraining);

// Register for training
router.post('/:id/register', authenticate, registerForTraining);

// Get registrants (Admin only)
router.get('/:id/registrants', authenticate, requireAdmin, getTrainingRegistrants);

// Confirm payment for training registration
router.put('/:id/confirm-payment', authenticate, confirmTrainingPayment);

// Get payment status for training registration
router.get('/:id/payment-status', authenticate, getTrainingPaymentStatus);


// Get single training by ID (public - no auth required)
router.get('/:id/public', getPublicTrainingById);

// External registration (public - no auth required)
router.post('/:id/register-external', registerExternalForTraining);

module.exports = router;
