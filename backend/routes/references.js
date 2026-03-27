const express = require('express');
const router = express.Router();
const {
    createReference,
    getReferences,
    updateReference,
    deleteReference,
    getSentReferrals,
    getReceivedReferrals,
    getReferralComments,
    addReferralComment,
    getThankYouNotes,
    getDashboardRevenue
} = require('../controllers/referenceController');
const { authenticate, requireAdmin, requireMember } = require('../middleware/auth');

router.post('/', authenticate, requireMember, createReference);
router.get('/', authenticate, requireMember, getReferences);
router.get('/sent', authenticate, requireMember, getSentReferrals);
router.get('/received', authenticate, requireMember, getReceivedReferrals);
router.get('/:id/comments', authenticate, requireMember, getReferralComments);
router.post('/:id/comments', authenticate, requireMember, addReferralComment);
router.get('/thank-you', authenticate, getThankYouNotes);
router.get('/revenue', authenticate, getDashboardRevenue);
router.put('/:id', authenticate, requireMember, updateReference);
router.delete('/:id', authenticate, requireMember, deleteReference);

module.exports = router;
