const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    createDeactivationRequest,
    getPendingRequests,
    getAllRequests,
    approveRequest,
    rejectRequest,
    getPendingCount
} = require('../controllers/deactivationRequestController');

// Get pending count
router.get('/count', authenticate, getPendingCount);

// Get all requests (with optional status filter)
router.get('/', authenticate, getAllRequests);

// Get pending requests
router.get('/pending', authenticate, getPendingRequests);

// Create new deactivation request
router.post('/', authenticate, createDeactivationRequest);

// Approve request (admin only)
router.put('/:id/approve', authenticate, approveRequest);

// Reject request (admin only)
router.put('/:id/reject', authenticate, rejectRequest);

module.exports = router;
