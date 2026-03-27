const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../utils/validation');
const {
    registerOrganization,
    registerUser,
    login,
    createPassword,
    validateEmail
} = require('../controllers/authController');

// Register organization
router.post(
    '/register-organization',
    [
        body('organizationName').trim().notEmpty().withMessage('Organization name is required'),
        body('adminName').trim().notEmpty().withMessage('Admin name is required'),
        body('adminEmail').isEmail().withMessage('Valid email is required'),
        // Password no longer required - admin will set on first login
        validate
    ],
    registerOrganization
);

// Register user
router.post(
    '/register-user',
    [
        body('organizationName').trim().notEmpty().withMessage('Organization name is required'),
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        // Password is no longer required during registration
        validate
    ],
    registerUser
);

// Validate email (Step 1 of two-step login)
router.post(
    '/validate-email',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        validate
    ],
    validateEmail
);

// Login
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
        validate
    ],
    login
);

// Create password (first-time setup after approval)
router.post(
    '/create-password',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        validate
    ],
    createPassword
);

module.exports = router;
