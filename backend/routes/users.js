const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireMember } = require('../middleware/auth');
const {
    getPendingUsers,
    getApprovedUsers,
    getRejectedUsers,
    approveUser,
    rejectUser,
    getUserProfile,
    getUsers,
    updateUserRole,
    getMemberCount,
    createOrgAdmin,
    getOrgAdmins,
    removeOrgAdmin,
    updateProfile,
    changePassword,
    uploadProfileImage,
    getUsersByChapter,
    getChapterAdmins,
    assignChapterAdmin,
    getDeactivatedUsers,
    getDeletedUsers,
    deactivateUser,
    deleteUser,
    adminUpdateUser,
    getMembersSummary,
    getMemberDetails,
    adminSendReferral,
    adminScheduleMeeting,
    // New comprehensive member management
    getFullMemberProfile,
    getMemberPosts,
    getMemberFiles,
    getMemberReferrals,
    getMemberMeetings,
    adminUpdateMemberFull,
    adminUploadMemberPhoto,
    uploadCompanyLogo,
    updateOwnProfile,
    getRenewMembers,
    activateUser,
    updateOrgAdmin
} = require('../controllers/userController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile image upload
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/profiles/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, jpeg, png) are allowed'));
        }
    }
});

// Configure multer for company logo upload
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/logos/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadLogo = multer({
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, jpeg, png) are allowed'));
        }
    }
});

// Get member count (Admin only)
router.get('/members-count', authenticate, requireAdmin, getMemberCount);

// Get members summary stats (Admin only)
router.get('/summary', authenticate, requireAdmin, getMembersSummary);

// Get members with renewal dates in current year (Admin only)
router.get('/renew-members', authenticate, requireAdmin, getRenewMembers);

// Get pending users (Admin only)
router.get('/pending', authenticate, requireAdmin, getPendingUsers);

// Get approved users (Admin only)
router.get('/approved', authenticate, requireAdmin, getApprovedUsers);

// Get rejected users (Admin only)
router.get('/rejected', authenticate, requireAdmin, getRejectedUsers);

// Approve user (Admin only)
router.put('/:id/approve', authenticate, requireAdmin, approveUser);

// Reject user (Admin only)
router.put('/:id/reject', authenticate, requireAdmin, rejectUser);

// Update user role (Admin only)
router.put('/:id/role', authenticate, requireAdmin, updateUserRole);

// Get user profile
router.get('/profile', authenticate, getUserProfile);

// Get all users (for meeting selection)
router.get('/', authenticate, requireMember, getUsers);

// Organization Admin Management (Admin only)
router.post('/org-admin', authenticate, requireAdmin, createOrgAdmin);
router.get('/org-admins', authenticate, requireAdmin, getOrgAdmins);
router.put('/org-admin/:id', authenticate, requireAdmin, updateOrgAdmin);
router.delete('/org-admin/:id', authenticate, requireAdmin, removeOrgAdmin);

// Profile Management (Admin/Super Admin only - role check inside or middleware)
// For now, let's keep it consistent with the user's role
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.put('/me', authenticate, updateOwnProfile); // Member self-update
router.post('/profile-image', authenticate, uploadProfile.single('image'), uploadProfileImage);

// Chapter Admin Management
router.get('/chapter/:chapterName', authenticate, requireAdmin, getUsersByChapter);
router.get('/chapter-admins/:chapterName', authenticate, requireAdmin, getChapterAdmins);
// Member Management (Admin only)
router.get('/deactivated', authenticate, requireAdmin, getDeactivatedUsers);
router.get('/deleted', authenticate, requireAdmin, getDeletedUsers);
router.put('/:id/update', authenticate, requireAdmin, adminUpdateUser);
router.put('/:id/deactivate', authenticate, requireAdmin, deactivateUser);
router.put('/:id/activate', authenticate, requireAdmin, activateUser); // Added this line
router.delete('/:id', authenticate, requireAdmin, deleteUser);

router.post('/assign-chapter-admin', authenticate, requireAdmin, assignChapterAdmin);

// Admin Member View & Actions
// Admin Member View & Actions - Now accessible to Members too (for same org)
router.get('/:id/details', authenticate, requireMember, getMemberDetails);
router.post('/:id/referral', authenticate, requireMember, adminSendReferral);
router.post('/:id/meeting', authenticate, requireMember, adminScheduleMeeting);

// Comprehensive Member Management (Admin only)
router.get('/:id/full-profile', authenticate, requireMember, getFullMemberProfile);
router.get('/:id/posts', authenticate, requireMember, getMemberPosts);
router.get('/:id/files', authenticate, requireAdmin, getMemberFiles);
router.get('/:id/referrals', authenticate, requireAdmin, getMemberReferrals);
router.get('/:id/meetings', authenticate, requireAdmin, getMemberMeetings);
router.put('/:id/admin-update', authenticate, requireAdmin, adminUpdateMemberFull);
router.post('/:id/photo', authenticate, requireAdmin, uploadProfile.single('image'), adminUploadMemberPhoto);
router.post('/:id/company-logo', authenticate, requireAdmin, uploadLogo.single('image'), uploadCompanyLogo);

module.exports = router;
