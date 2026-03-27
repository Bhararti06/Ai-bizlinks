const express = require('express');
const router = express.Router();
const {
    createMeeting,
    getMeetings,
    updateMeeting,
    deleteMeeting,
    registerForMeeting,
    getRegistrations,
    addVisitorToMeeting
} = require('../controllers/chapterMeetingController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Note: Chapter Admin and Admin are both allowed for these
router.use(authenticate);

router.get('/', getMeetings);
router.post('/', requireAdmin, createMeeting);
router.put('/:id', requireAdmin, updateMeeting);
router.delete('/:id', requireAdmin, deleteMeeting);
router.post('/:id/register', registerForMeeting);
router.get('/:id/registrations', getRegistrations);
router.post('/:id/visitors', requireAdmin, addVisitorToMeeting);

module.exports = router;
