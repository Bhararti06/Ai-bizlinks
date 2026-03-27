const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../utils/validation');
const { authenticate, requireAdmin, requireMember } = require('../middleware/auth');
const {
    createMeeting,
    getMeetings,
    updateMeeting,
    deleteMeeting,
    rsvpMeeting,
    getMeetingRSVPs
} = require('../controllers/meetingController');

// Create meeting
router.post(
    '/',
    authenticate,
    requireMember,
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('meetingDate').notEmpty().withMessage('Meeting date is required'),
        validate
    ],
    createMeeting
);

// Get all meetings
router.get('/', authenticate, getMeetings);

// Update meeting (Admin only)
router.put('/:id', authenticate, requireAdmin, updateMeeting);

// Delete meeting (Admin only)
router.delete('/:id', authenticate, requireAdmin, deleteMeeting);

// RSVP to meeting
router.post(
    '/:id/rsvp',
    authenticate,
    [
        body('status').isIn(['attending', 'not_attending', 'maybe']).withMessage('Invalid RSVP status'),
        validate
    ],
    rsvpMeeting
);

// Get meeting RSVPs
router.get('/:id/rsvps', authenticate, getMeetingRSVPs);

module.exports = router;
