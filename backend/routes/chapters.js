const express = require('express');
const router = express.Router();
const { getChapters, createChapter, updateChapter, deleteChapter } = require('../controllers/chapterController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, getChapters);
router.post('/', authenticate, requireAdmin, createChapter);
router.put('/:id', authenticate, requireAdmin, updateChapter);
router.delete('/:id', authenticate, requireAdmin, deleteChapter);

module.exports = router;
