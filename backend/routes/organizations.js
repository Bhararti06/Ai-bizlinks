
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getOrganizations, getSettings, updateSettings, getPublicOrgDetails } = require('../controllers/organizationController');
const { getDashboardStats, exportCSVReport, getVisitors } = require('../controllers/adminDashboardController');

// Get all organizations - Public route for registration dropdown
router.get('/', getOrganizations);

// Get Public branding info
router.get('/public/:identifier', getPublicOrgDetails);

// Organization Settings Routes (Admin Only)
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

// Admin Dashboard Stats & Reports
router.get('/dashboard/stats', authenticate, getDashboardStats);
router.get('/dashboard/export', authenticate, exportCSVReport);
router.get('/dashboard/visitors', authenticate, getVisitors);

module.exports = router;
