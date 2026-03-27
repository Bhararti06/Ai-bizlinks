const DeactivationRequest = require('../models/DeactivationRequest');
const User = require('../models/User');

/**
 * Create a new deactivation request (Chapter Admin)
 */
const createDeactivationRequest = async (req, res, next) => {
    try {
        const { userId, reason } = req.body;
        const { organizationId, userId: requestedBy, role } = req.user;

        // Validation
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Check if user exists and belongs to same organization
        const targetUser = await User.findById(userId);
        if (!targetUser || targetUser.organization_id !== organizationId) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is already inactive
        if (targetUser.status === 'inactive') {
            return res.status(400).json({
                success: false,
                message: 'User is already deactivated'
            });
        }

        // Check if there's already a pending request
        const hasPending = await DeactivationRequest.hasPendingRequest(userId);
        if (hasPending) {
            return res.status(400).json({
                success: false,
                message: 'A deactivation request for this user is already pending'
            });
        }

        // Create the request
        const requestId = await DeactivationRequest.create(
            organizationId,
            userId,
            requestedBy,
            reason
        );

        res.status(201).json({
            success: true,
            message: role === 'chapter_admin'
                ? 'Deactivation request submitted for admin approval'
                : 'Deactivation request created',
            data: { requestId }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all pending deactivation requests (Admin & Chapter Admin)
 */
const getPendingRequests = async (req, res, next) => {
    try {
        const { organizationId } = req.user;

        const requests = await DeactivationRequest.getPending(organizationId);

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all deactivation requests (with optional status filter)
 */
const getAllRequests = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { status } = req.query;

        const requests = await DeactivationRequest.findByOrganization(organizationId, status);

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Approve a deactivation request (Admin only)
 */
const approveRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId: reviewedBy, role } = req.user;

        // Only org admin can approve
        if (role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can approve deactivation requests'
            });
        }

        await DeactivationRequest.approve(id, reviewedBy);

        res.status(200).json({
            success: true,
            message: 'Deactivation request approved and user deactivated'
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

/**
 * Reject a deactivation request (Admin only)
 */
const rejectRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId: reviewedBy, role } = req.user;

        // Only org admin can reject
        if (role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can reject deactivation requests'
            });
        }

        await DeactivationRequest.reject(id, reviewedBy);

        res.status(200).json({
            success: true,
            message: 'Deactivation request rejected'
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

/**
 * Get pending request count
 */
const getPendingCount = async (req, res, next) => {
    try {
        const { organizationId } = req.user;

        const count = await DeactivationRequest.getPendingCount(organizationId);

        res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createDeactivationRequest,
    getPendingRequests,
    getAllRequests,
    approveRequest,
    rejectRequest,
    getPendingCount
};
