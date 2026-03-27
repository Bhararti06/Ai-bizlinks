const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authenticate } = require('../middleware/auth');

router.get('/vapidPublicKey', authenticate, pushController.getVapidPublicKey);
router.post('/subscribe', authenticate, pushController.subscribe);
router.post('/unsubscribe', authenticate, pushController.unsubscribe);

module.exports = router;
