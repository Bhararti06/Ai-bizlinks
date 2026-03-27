const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    getNotifications,
    markAsRead,
    markAllAsRead
} = require('../controllers/notificationController');

// Get all notifications for current user
router.get('/', authenticate, getNotifications);

// Mark specific notification as read
router.put('/:id/read', authenticate, markAsRead);

// Mark all as read
router.put('/read-all', authenticate, markAllAsRead);

module.exports = router;
