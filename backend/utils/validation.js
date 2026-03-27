const { validationResult } = require('express-validator');

// Validation helper functions
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path || err.param,
                message: err.msg
            }))
        });
    }

    next();
};

// Email validation regex
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Password strength validation
const isStrongPassword = (password) => {
    // At least 8 characters
    if (password.length < 8) {
        return {
            valid: false,
            message: 'Password must be at least 8 characters long'
        };
    }

    return {
        valid: true,
        message: 'Password is valid'
    };
};

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    return input
        .trim()
        .replace(/[<>]/g, ''); // Remove < and > characters
};

module.exports = {
    validate,
    isValidEmail,
    isStrongPassword,
    sanitizeInput
};
