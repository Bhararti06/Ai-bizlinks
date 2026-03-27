const express = require('express');
const router = express.Router();
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const {
    getDashboardStats,
    getAllOrganizations,
    createOrganization
} = require('../controllers/superAdminController');

// All routes require authentication and Super Admin privileges
router.use(authenticate);
router.use(requireSuperAdmin);

// Dashboard Stats
router.get('/dashboard-stats', getDashboardStats);

// Organizations
router.get('/organizations', getAllOrganizations);
router.post('/organizations', createOrganization);

module.exports = router;
