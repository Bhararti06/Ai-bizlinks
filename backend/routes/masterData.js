const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const masterDataController = require('../controllers/masterDataController');

// Member Categories
router.get('/categories', authenticate, requireAdmin, masterDataController.getCategories);
router.post('/categories', authenticate, requireAdmin, masterDataController.createCategory);
router.put('/categories/:id', authenticate, requireAdmin, masterDataController.updateCategory);
router.delete('/categories/:id', authenticate, requireAdmin, masterDataController.deleteCategory);

// Membership Plans
router.get('/plans', authenticate, requireAdmin, masterDataController.getPlans);
router.post('/plans', authenticate, requireAdmin, masterDataController.createPlan);
router.put('/plans/:id', authenticate, requireAdmin, masterDataController.updatePlan);
router.delete('/plans/:id', authenticate, requireAdmin, masterDataController.deletePlan);

module.exports = router;
