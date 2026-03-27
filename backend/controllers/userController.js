const User = require('../models/User');
const Chapter = require('../models/Chapter');
const Organization = require('../models/Organization');
const Notification = require('../models/Notification');
const { sendReferenceNotification } = require('./referenceController');
const { sendEmail, emailTemplates } = require('../services/emailService');

// Get pending users for organization (Admin only)
const getPendingUsers = async (req, res, next) => {
    try {
        const { organizationId } = req.user;

        const pendingUsers = await User.getPendingByOrganization(organizationId);

        res.status(200).json({
            success: true,
            data: pendingUsers
        });
    } catch (error) {
        next(error);
    }
};

// Approve user (Admin only)
const approveUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId, role } = req.user;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        // Check if Chapter Admin has onboarding authority
        if (role === 'chapter_admin' && settings.memberOnboarding === false) {
            return res.status(403).json({
                success: false,
                message: 'Chapter Admins do not have authority to onboard members for this organization'
            });
        }

        // Get user to verify they belong to the same organization
        const user = await User.findByIdAndOrganization(id, organizationId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found or does not belong to your organization'
            });
        }

        if (user.status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'User is already approved'
            });
        }

        // Update status to approved and assign details
        const { name, mobile, chapter, categoryId, planId, referredById, referredByOther } = req.body;

        // Sanitize IDs (ensure they are null or valid integers)
        const sanitizedData = {
            name: name || user.name,
            mobile: mobile || user.contact_number,
            chapter,
            categoryId: categoryId ? parseInt(categoryId) : null,
            planId: planId ? parseInt(planId) : null,
            referredById: (referredById && referredById !== 'other') ? parseInt(referredById) : null,
            referredByOther: referredById === 'other' ? referredByOther : null
        };

        console.log('--- USER APPROVAL DEBUG ---');
        console.log('User ID:', id);
        console.log('Sanitized Data:', sanitizedData);

        await User.updateApprovalDetails(id, organizationId, sanitizedData);
        console.log('User approval details updated in DB');

        // Send chapter admin notification if chapter assigned
        if (sanitizedData.chapter) {
            try {
                console.log(`Sending notification to admins of chapter: ${sanitizedData.chapter}`);
                await Notification.notifyChapterAdmins(
                    organizationId,
                    sanitizedData.chapter,
                    `New member added to your chapter: ${sanitizedData.name || user.name}`,
                    'member',
                    { path: '/admin/users', name: sanitizedData.name || user.name }
                );
                console.log('Chapter admin notification sent successfully');
            } catch (notifError) {
                console.error('Failed to notify chapter admins:', notifError);
            }
        }

        // Send email notification
        try {
            const emailData = emailTemplates.accountApproved(user.name, user.organization_name || 'Community Portal');
            sendEmail(user.email, emailData.subject, emailData.html).catch(console.error);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.status(200).json({
            success: true,
            message: 'User approved and member record created successfully',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                status: 'approved'
            }
        });
    } catch (error) {
        next(error);
    }
};

// Reject user (Admin only)
const rejectUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId, role } = req.user;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        // Check if Chapter Admin has onboarding authority
        if (role === 'chapter_admin' && settings.memberOnboarding === false) {
            return res.status(403).json({
                success: false,
                message: 'Chapter Admins do not have authority to reject members for this organization'
            });
        }

        // Get user to verify they belong to the same organization
        const user = await User.findByIdAndOrganization(id, organizationId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found or does not belong to your organization'
            });
        }

        // Update status to rejected
        await User.updateStatus(id, organizationId, 'rejected');

        // Send email notification
        try {
            const { sendEmail, emailTemplates } = require('../services/emailService');
            // Assuming we can get name/email from the 'user' object fetched above
            const emailData = emailTemplates.accountRejected(user.name, user.organization_name || 'Community Portal');
            sendEmail(user.email, emailData.subject, emailData.html).catch(console.error);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.status(200).json({
            success: true,
            message: 'User rejected successfully',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                status: 'rejected'
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get user profile
const getUserProfile = async (req, res, next) => {
    try {
        const { userId } = req.user;
        console.log('--- GET USER PROFILE DEBUG ---');
        console.log('User ID from token:', userId);

        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found in DB');
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        console.log('User found:', user.email);

        // Parse organization settings to get the logo and naming convention
        let organizationLogo = null;
        let namingConvention = {};
        if (user.organization_settings) {
            try {
                const settings = typeof user.organization_settings === 'string'
                    ? JSON.parse(user.organization_settings)
                    : user.organization_settings;
                organizationLogo = settings.logo || null;
                namingConvention = settings.naming_convention || {};
            } catch (e) {
                console.error('Error parsing organization settings:', e);
            }
        }

        // Return user data (without password)
        const userData = {
            ...user, // Include all fields from DB
            organizationId: user.organization_id,
            organizationName: user.organization_name,
            organizationLogo: organizationLogo,
            subDomain: user.organization_sub_domain,
            profileImage: user.profile_image,
            mobile: user.contact_number,
            createdAt: user.created_at,
            namingConvention: namingConvention
        };

        // Remove sensitive fields
        delete userData.password;
        delete userData.password_set;
        delete userData.organization_settings;

        res.status(200).json({
            success: true,
            data: userData
        });
    } catch (error) {
        next(error);
    }
};

// Get all approved users for organization
// Get all approved users for organization
const getApprovedUsers = async (req, res, next) => {
    try {
        const { organizationId, userId } = req.user;

        // Fetch current user details to get accurate role and chapter
        const currentUser = await User.findByIdAndOrganization(userId, organizationId);

        if (!currentUser) {
            return res.status(401).json({ message: 'User not found' });
        }

        console.log('--- GET APPROVED USERS DEBUG ---');
        console.log('User Role:', currentUser.role);
        console.log('User Chapter:', currentUser.chapter);

        // If Chapter Admin, filter by their chapter
        const chapterFilter = currentUser.role === 'chapter_admin' ? currentUser.chapter : null;

        const users = await User.getApprovedByOrganization(organizationId, chapterFilter);

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('getApprovedUsers error:', error);
        next(error);
    }
};

// Get all rejected users for organization
const getRejectedUsers = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const users = await User.getRejectedByOrganization(organizationId);
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// Get all approved users for organization (Legacy/General)
// Get all approved users for organization (Legacy/General)
const getUsers = async (req, res, next) => {
    try {
        const { organizationId, role, chapter } = req.user;
        const { context } = req.query;

        // Fetch Organization Settings
        const organization = await Organization.findById(organizationId);
        let settings = {};
        if (organization && organization.settings) {
            settings = typeof organization.settings === 'string'
                ? JSON.parse(organization.settings)
                : organization.settings;
        }

        // Strict Filtering Logic
        let shouldFilterByChapter = false;

        // Apply "Create Meetings Within Chapter Members Only" restriction
        if (context === 'meeting' && settings.createMeetingsChapterOnly) {
            // When setting is ON, filter by chapter for both chapter_admin and regular members
            shouldFilterByChapter = true;
        }

        const chapterFilter = shouldFilterByChapter ? (chapter || req.user.chapter) : null;

        // Use getApprovedByOrganization directly
        // This implicitly filters out 'deleted', 'inactive', 'rejected', 'pending'
        const users = await User.getApprovedByOrganization(organizationId, chapterFilter);

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// Update user role and chapter (Admin only)
const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;
        const { role, chapter } = req.body;

        const validRoles = ['admin', 'chapter_admin', 'member'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const success = await User.updateRoleAndChapter(id, organizationId, role, chapter);
        if (!success) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Get member count for organization (Admin only)
const getMemberCount = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const count = await User.countByOrganization(organizationId);

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        next(error);
    }
};

// Create Organization Admin (Admin only)
const createOrgAdmin = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { name, email, mobile } = req.body;

        console.log('--- CREATE ORG ADMIN DEBUG ---');
        console.log('User from token:', req.user);
        console.log('Body:', req.body);

        // Validation
        if (!name || !email || !mobile) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and mobile are required'
            });
        }

        // Check if email already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists in the system'
            });
        }

        // Generate a default password (you can customize this)
        const bcrypt = require('bcryptjs');
        const defaultPassword = 'Admin@123'; // Default password
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Create the organization admin
        const newAdminId = await User.create(
            organizationId,
            name,
            email,
            hashedPassword,
            'admin',
            'approved',
            null, // chapter
            name.split(' ')[0], // first_name
            name.split(' ').slice(1).join(' '), // last_name
            mobile // contact_number
        );

        // Send credentials email
        try {
            const orgRes = await require('../models/Organization').findById(organizationId);
            const orgName = orgRes ? orgRes.name : 'Your Organization';
            const template = emailTemplates.adminCredentials(name, email, defaultPassword, orgName);
            await sendEmail(email, template.subject, template.html);
        } catch (emailError) {
            console.error('Failed to send admin credentials email:', emailError);
            // Don't fail the whole request if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Organization admin created successfully',
            data: {
                id: newAdminId,
                name,
                email,
                mobile,
                role: 'admin',
                status: 'approved'
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get all organization admins (Admin only)
const getOrgAdmins = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        console.log('--- GET ORG ADMINS DEBUG ---');
        console.log('Organization ID from token:', organizationId);

        // Get all admins for this organization
        const admins = await User.getAdminsByOrganization(organizationId);
        console.log('Admins found in DB:', admins.length);

        res.status(200).json({
            success: true,
            data: admins
        });
    } catch (error) {
        next(error);
    }
};

// Remove/Deactivate organization admin (Admin only)
const removeOrgAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        // Get admin to verify they belong to the same organization
        const admin = await User.findByIdAndOrganization(id, organizationId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found or does not belong to your organization'
            });
        }

        // Verify the user is actually an admin
        if (admin.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'User is not an organization admin'
            });
        }

        // Deactivate the admin (soft delete)
        await User.updateStatus(id, organizationId, 'inactive');

        res.status(200).json({
            success: true,
            message: 'Organization admin removed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Update organization admin details (Admin only)
const updateOrgAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;
        const { name, mobile, email } = req.body;

        if (!name || !mobile || !email) {
            return res.status(400).json({ success: false, message: 'Name, mobile, and email are required' });
        }

        // Verify user exists, belongs to organization, and is an admin
        const admin = await User.findByIdAndOrganization(id, organizationId);
        if (!admin || admin.role !== 'admin') {
            return res.status(404).json({
                success: false,
                message: 'Organization admin not found'
            });
        }

        // Check if email is already taken by another user
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id != id) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists in the system'
            });
        }

        const data = {
            name,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' '),
            contactNumber: mobile,
            email
        };

        const success = await User.updateAdminDetails(id, data);
        if (!success) {
            return res.status(400).json({ success: false, message: 'Update failed' });
        }

        res.status(200).json({
            success: true,
            message: 'Organization admin updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Update profile details
const updateProfile = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { name, mobile } = req.body;

        if (!name || !mobile) {
            return res.status(400).json({ success: false, message: 'Name and mobile are required' });
        }

        const data = {
            name,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' '),
            contactNumber: mobile
        };

        const success = await User.updateProfile(userId, data);
        if (!success) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Change password
const changePassword = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(userId, hashedPassword);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Upload profile image
const uploadProfileImage = async (req, res, next) => {
    try {
        const { userId } = req.user;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        await User.updateProfileImage(userId, imageUrl);

        res.status(200).json({
            success: true,
            message: 'Profile image updated successfully',
            imageUrl
        });
    } catch (error) {
        next(error);
    }
};

// Get users by chapter
const getUsersByChapter = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { chapterName } = req.params;
        const users = await User.getByChapter(organizationId, chapterName);
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

// Get admins by chapter
const getChapterAdmins = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { chapterName } = req.params;
        const admins = await User.getAdminsByChapter(organizationId, chapterName);
        res.status(200).json({ success: true, data: admins });
    } catch (error) {
        next(error);
    }
};

// Activate user
const activateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;
        await User.updateStatus(id, organizationId, 'approved');
        res.status(200).json({ success: true, message: 'User activated successfully' });
    } catch (error) {
        next(error);
    }
};

// Get deactivated users for organization (Admin only)
const getDeactivatedUsers = async (req, res, next) => {
    try {
        const { organizationId, role, chapter } = req.user;
        // chapterFilter unused in model currently, but kept for future use if model updates
        const users = await User.getDeactivatedByOrganization(organizationId);
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// Get deleted users for organization (Admin only)
const getDeletedUsers = async (req, res, next) => {
    try {
        const { organizationId, role, chapter } = req.user;
        const users = await User.getDeletedByOrganization(organizationId);
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// Deactivate user (Admin only)
const deactivateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId, role, userId: requestedBy } = req.user;
        const { reason } = req.body;

        // If Chapter Admin, create a pending deactivation request
        if (role === 'chapter_admin') {
            const DeactivationRequest = require('../models/DeactivationRequest');

            // Check if user exists and belongs to same organization
            const targetUser = await User.findByIdAndOrganization(id, organizationId);
            if (!targetUser) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Check if user is already inactive
            if (targetUser.status === 'inactive') {
                return res.status(400).json({
                    success: false,
                    message: 'User is already deactivated'
                });
            }

            // Check if there's already a pending request
            const hasPending = await DeactivationRequest.hasPendingRequest(id);
            if (hasPending) {
                return res.status(400).json({
                    success: false,
                    message: 'A deactivation request for this user is already pending'
                });
            }

            // Create the deactivation request
            await DeactivationRequest.create(organizationId, id, requestedBy, reason);

            // Notify Org Admins
            try {
                await Notification.notifyAdmins(
                    organizationId,
                    `New Deactivation Request: ${targetUser.name} requested by ${req.user.name}`,
                    'deactivation_request',
                    { path: '/admin/users', defaultTab: 'deactivation-pending' }
                );
            } catch (notifErr) {
                console.error('Failed to send deactivation notification:', notifErr);
            }

            return res.status(200).json({
                success: true,
                message: 'Deactivation request submitted for admin approval',
                isPending: true
            });
        }

        // If Org Admin, deactivate directly
        await User.updateStatus(id, organizationId, 'inactive');

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Soft delete user (Admin only)
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        // Verify user exists and belongs to organization
        const user = await User.findByIdAndOrganization(id, organizationId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await User.softDelete(id, organizationId);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Admin update user details
const adminUpdateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;
        const { name, mobile, chapter, categoryId, planId } = req.body;

        const success = await User.adminUpdateMember(id, organizationId, {
            name,
            mobile,
            chapter,
            categoryId,
            planId
        });

        if (!success) {
            return res.status(404).json({ success: false, message: 'User not found or update failed' });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Assign chapter admin
const assignChapterAdmin = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { userId, chapterName } = req.body;

        if (!userId || !chapterName) {
            return res.status(400).json({ success: false, message: 'User ID and Chapter Name are required' });
        }

        const success = await User.updateRoleAndChapter(userId, organizationId, 'chapter_admin', chapterName);
        if (!success) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'Chapter Admin assigned successfully' });
    } catch (error) {
        next(error);
    }
};


const getMemberDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        // Verify user belongs to organization
        const user = await User.findByIdAndOrganization(id, organizationId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Parallel fetch for efficiency
        const [
            referralsSent,
            referralsReceived,
            meetings
        ] = await Promise.all([
            require('../models/Reference').getSentByMember(id),
            require('../models/Reference').getReceivedByMember(user.name),
            require('../models/Meeting').getMemberMeetings(id)
        ]);

        res.status(200).json({
            success: true,
            data: {
                profile: user,
                referrals: {
                    sent: referralsSent,
                    received: referralsReceived
                },
                meetings: meetings
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin send referral to member
const adminSendReferral = async (req, res, next) => {
    try {
        const { id } = req.params; // Member ID (Recipient)
        const { organizationId, userId: adminId } = req.user;
        const {
            referralName,
            contactEmail,
            contactPhone,
            companyName,
            referralFlag,
            description
        } = req.body;

        const Reference = require('../models/Reference');

        // Admin (userId) refers 'referralName' TO 'id' (Member)
        // Reference.create args: orgId, userId (creator), refName, refOrg, email, phone, desc, flag, referredTo

        const referenceId = await Reference.create(
            organizationId,
            adminId,
            referralName,
            companyName,
            contactEmail,
            contactPhone,
            description,
            referralFlag,
            id // referredTo (The member receiving the referral)
        );

        // Send Notifications
        await sendReferenceNotification(
            organizationId,
            adminId,
            referenceId,
            referralName,
            referralFlag,
            id
        );

        res.status(201).json({
            success: true,
            message: 'Referral sent successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Admin schedule meeting with member
const adminScheduleMeeting = async (req, res, next) => {
    try {
        const { id } = req.params; // Member ID
        const { organizationId, userId: adminId } = req.user;
        const {
            meetingDate,
            startTime,
            endTime,
            subject,
            description,
            mode,
            meetingLink,
            meetingLocation
        } = req.body;

        const Meeting = require('../models/Meeting');

        // Combine Date and Time
        const fullMeetingDate = new Date(`${meetingDate}T${startTime}`).toISOString();
        let fullEndTime = null;
        if (endTime) {
            fullEndTime = new Date(`${meetingDate}T${endTime}`).toISOString();
        }

        // Create Meeting
        const meetingId = await Meeting.create(
            organizationId,
            adminId, // Created by Admin/User
            subject,
            description,
            fullMeetingDate,
            fullEndTime,
            mode,
            meetingLink,
            meetingLocation
        );

        // Link to Member via RSVP
        const { pool } = require('../config/database');
        await pool.execute(
            'INSERT INTO meeting_rsvps (meeting_id, user_id, status) VALUES (?, ?, ?)',
            [meetingId, id, 'accepted']
        );

        // Send Notification to Member
        try {
            await Notification.create(
                id,
                organizationId,
                `New Meeting Scheduled: ${subject} on ${meetingDate}`,
                'meeting',
                { path: '/meetings' }
            );
        } catch (notifErr) {
            console.error('Failed to send meeting notification:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: 'Meeting scheduled successfully'
        });

    } catch (error) {
        next(error);
    }
};

// Get full member profile with all fields (Admin only)
const getFullMemberProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const { pool } = require('../config/database');

        // Get complete user profile with all fields
        const [users] = await pool.execute(`
            SELECT u.*, 
                   mc.name as category_name,
                   mp.name as plan_name,
                   o.name as organization_name
            FROM users u
            LEFT JOIN member_categories mc ON u.category_id = mc.id
            LEFT JOIN membership_plans mp ON u.plan_id = mp.id
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.id = ? AND u.organization_id = ?
        `, [id, organizationId]);

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.status(200).json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        next(error);
    }
};

// Get member's posts (Admin only)
const getMemberPosts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const { pool } = require('../config/database');

        // Verify member belongs to organization
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND organization_id = ?',
            [id, organizationId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Get all posts by this member
        const [posts] = await pool.execute(`
            SELECT p.*, 
                   u.name as author_name,
                   u.profile_image as author_image,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ? AND p.organization_id = ?
            ORDER BY p.created_at DESC
        `, [id, organizationId]);

        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        next(error);
    }
};

// Get member's uploaded files (Admin only)
const getMemberFiles = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const { pool } = require('../config/database');

        // Verify member belongs to organization
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND organization_id = ?',
            [id, organizationId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Check if files table exists, if not return empty array
        try {
            const [files] = await pool.execute(`
                SELECT f.*, u.name as uploaded_by_name
                FROM files f
                LEFT JOIN users u ON f.user_id = u.id
                WHERE f.user_id = ? AND f.organization_id = ?
                ORDER BY f.created_at DESC
            `, [id, organizationId]);

            res.status(200).json({
                success: true,
                data: files
            });
        } catch (tableError) {
            // If files table doesn't exist, return empty array
            res.status(200).json({
                success: true,
                data: []
            });
        }
    } catch (error) {
        next(error);
    }
};

// Get member's referrals (sent and received) (Admin only)
const getMemberReferrals = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const { pool } = require('../config/database');

        // Get member details
        const [users] = await pool.execute(
            'SELECT id, name FROM users WHERE id = ? AND organization_id = ?',
            [id, organizationId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        const memberName = users[0].name;

        // Get referrals sent by this member
        const [sentReferrals] = await pool.execute(`
            SELECT r.*, u.name as referrer_name
            FROM business_references r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.user_id = ? AND r.organization_id = ?
            AND (r.referral_flag != '0' OR r.referral_flag IS NULL)
            ORDER BY r.created_at DESC
        `, [id, organizationId]);

        // Get referrals received by this member (where referred_to matches member name)
        const [receivedReferrals] = await pool.execute(`
            SELECT r.*, u.name as referrer_name
            FROM business_references r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.referred_to = ? AND r.organization_id = ?
            AND (r.referral_flag != '0' OR r.referral_flag IS NULL)
            ORDER BY r.created_at DESC
        `, [memberName, organizationId]);

        res.status(200).json({
            success: true,
            data: {
                sent: sentReferrals,
                received: receivedReferrals
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get member's meetings (Admin only)
const getMemberMeetings = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const { pool } = require('../config/database');

        // Get member details
        const [users] = await pool.execute(
            'SELECT id, name, chapter FROM users WHERE id = ? AND organization_id = ?',
            [id, organizationId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        const member = users[0];

        // Get meetings created by or involving this member
        const [memberMeetings] = await pool.execute(`
            SELECT DISTINCT m.*, u.name as creator_name
            FROM meetings m
            LEFT JOIN users u ON m.created_by = u.id
            LEFT JOIN meeting_rsvps r ON m.id = r.meeting_id
            WHERE (m.created_by = ? OR r.user_id = ?) 
            AND m.organization_id = ?
            ORDER BY m.meeting_date DESC
        `, [id, id, organizationId]);

        // Get chapter meetings - Note: meetings table doesn't have chapter field
        // So we'll return empty array for now
        let chapterMeetings = [];

        res.status(200).json({
            success: true,
            data: {
                member_meetings: memberMeetings,
                chapter_meetings: chapterMeetings
            }
        });
    } catch (error) {
        next(error);
    }
};

// Comprehensive admin update for member (Admin only)
const adminUpdateMemberFull = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const { pool } = require('../config/database');

        // Verify member belongs to organization
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND organization_id = ?',
            [id, organizationId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Extract all fields from request body
        const {
            // Personal Information
            first_name, last_name, dob, gender, email, contact_number,
            country, state, city, zip_code, address,

            // Corporate Information
            company_name, company_title, company_linkedin, company_email,
            company_website, company_size, company_contact,
            company_country, company_state, company_city, company_zip, company_address,

            // Membership Information
            category_id, plan_id, member_type, chapter,
            membership_start_date, membership_end_date, membership_renewal_date,
            status, profile_image, company_logo
        } = req.body;

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];

        // Personal fields
        if (first_name !== undefined) { updateFields.push('first_name = ?'); updateValues.push(first_name); }
        if (last_name !== undefined) { updateFields.push('last_name = ?'); updateValues.push(last_name); }
        if (dob !== undefined) { updateFields.push('dob = ?'); updateValues.push(dob === '' ? null : dob); }
        if (gender !== undefined) { updateFields.push('gender = ?'); updateValues.push(gender); }
        if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
        if (contact_number !== undefined) { updateFields.push('contact_number = ?'); updateValues.push(contact_number); }
        if (country !== undefined) { updateFields.push('country = ?'); updateValues.push(country); }
        if (state !== undefined) { updateFields.push('state = ?'); updateValues.push(state); }
        if (city !== undefined) { updateFields.push('city = ?'); updateValues.push(city); }
        if (zip_code !== undefined) { updateFields.push('zip_code = ?'); updateValues.push(zip_code); }
        if (address !== undefined) { updateFields.push('address = ?'); updateValues.push(address); }

        // Corporate fields
        if (company_name !== undefined) { updateFields.push('company_name = ?'); updateValues.push(company_name); }
        if (company_title !== undefined) { updateFields.push('company_title = ?'); updateValues.push(company_title); }
        if (company_linkedin !== undefined) { updateFields.push('company_linkedin = ?'); updateValues.push(company_linkedin); }
        if (company_email !== undefined) { updateFields.push('company_email = ?'); updateValues.push(company_email); }
        if (company_website !== undefined) { updateFields.push('company_website = ?'); updateValues.push(company_website); }
        if (company_size !== undefined) { updateFields.push('company_size = ?'); updateValues.push(company_size); }
        if (company_contact !== undefined) { updateFields.push('company_contact = ?'); updateValues.push(company_contact); }
        if (company_country !== undefined) { updateFields.push('company_country = ?'); updateValues.push(company_country); }
        if (company_state !== undefined) { updateFields.push('company_state = ?'); updateValues.push(company_state); }
        if (company_city !== undefined) { updateFields.push('company_city = ?'); updateValues.push(company_city); }
        if (company_zip !== undefined) { updateFields.push('company_zip = ?'); updateValues.push(company_zip); }
        if (company_address !== undefined) { updateFields.push('company_address = ?'); updateValues.push(company_address); }

        // Membership fields
        if (category_id !== undefined) { updateFields.push('category_id = ?'); updateValues.push(category_id); }
        if (plan_id !== undefined) { updateFields.push('plan_id = ?'); updateValues.push(plan_id); }
        if (member_type !== undefined) { updateFields.push('member_type = ?'); updateValues.push(member_type); }
        if (chapter !== undefined) { updateFields.push('chapter = ?'); updateValues.push(chapter); }
        if (membership_start_date !== undefined) { updateFields.push('membership_start_date = ?'); updateValues.push(membership_start_date === '' ? null : membership_start_date); }
        if (membership_end_date !== undefined) { updateFields.push('membership_end_date = ?'); updateValues.push(membership_end_date === '' ? null : membership_end_date); }
        if (membership_renewal_date !== undefined) { updateFields.push('membership_renewal_date = ?'); updateValues.push(membership_renewal_date === '' ? null : membership_renewal_date); }
        if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }
        if (profile_image !== undefined) { updateFields.push('profile_image = ?'); updateValues.push(profile_image); }
        if (company_logo !== undefined) { updateFields.push('company_logo = ?'); updateValues.push(company_logo); }

        // Update name if first_name or last_name changed
        if (first_name !== undefined || last_name !== undefined) {
            const fullName = `${first_name || ''} ${last_name || ''}`.trim();
            if (fullName) {
                updateFields.push('name = ?');
                updateValues.push(fullName);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        // Add ID to values
        updateValues.push(id);
        updateValues.push(organizationId);

        const query = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = ? AND organization_id = ?
        `;

        await pool.execute(query, updateValues);

        // Get updated user data
        const [updatedUsers] = await pool.execute(`
            SELECT u.*, 
                   mc.name as category_name,
                   mp.name as plan_name
            FROM users u
            LEFT JOIN member_categories mc ON u.category_id = mc.id
            LEFT JOIN membership_plans mp ON u.plan_id = mp.id
            WHERE u.id = ? AND u.organization_id = ?
        `, [id, organizationId]);

        res.status(200).json({
            success: true,
            message: 'Member updated successfully',
            data: updatedUsers[0]
        });
    } catch (error) {
        next(error);
    }
};

// Admin upload member photo (Admin only)
const adminUploadMemberPhoto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Verify member belongs to organization
        const User = require('../models/User');
        const user = await User.findByIdAndOrganization(id, organizationId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        console.log('--- UPLOAD MEMBER PHOTO DEBUG ---');
        console.log('Member ID:', id);
        console.log('File:', req.file);

        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        console.log('Saving imageUrl to DB:', imageUrl);

        await User.updateProfileImage(id, imageUrl);
        console.log('DB Update complete');

        res.status(200).json({
            success: true,
            message: 'Member photo updated successfully',
            imageUrl
        });
    } catch (error) {
        next(error);
    }
};

// Upload company logo (Admin only)
const uploadCompanyLogo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Verify member belongs to organization
        const { pool } = require('../config/database');
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND organization_id = ?',
            [id, organizationId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        const logoUrl = `/uploads/logos/${req.file.filename}`;

        await pool.execute(
            'UPDATE users SET company_logo = ? WHERE id = ?',
            [logoUrl, id]
        );

        res.status(200).json({
            success: true,
            message: 'Company logo updated successfully',
            imageUrl: logoUrl
        });
    } catch (error) {
        next(error);
    }
};

// Update own profile (Member self-edit)
const updateOwnProfile = async (req, res, next) => {
    try {
        const { userId, organizationId } = req.user;
        const { pool } = require('../config/database');

        // Verify user exists
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND organization_id = ?',
            [userId, organizationId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Extract only personal and corporate fields (NOT membership fields)
        const {
            // Personal Information
            first_name, last_name, dob, gender, email, contact_number,
            country, state, city, zip_code, address,

            // Corporate Information
            company_name, company_title, company_linkedin, company_email,
            company_website, company_size, company_contact,
            company_country, company_state, company_city, company_zip, company_address
        } = req.body;

        // Build dynamic update query (only allow personal and corporate fields)
        const updateFields = [];
        const updateValues = [];

        // Personal fields
        if (first_name !== undefined) { updateFields.push('first_name = ?'); updateValues.push(first_name); }
        if (last_name !== undefined) { updateFields.push('last_name = ?'); updateValues.push(last_name); }
        if (dob !== undefined) { updateFields.push('dob = ?'); updateValues.push(dob === '' ? null : dob); }
        if (gender !== undefined) { updateFields.push('gender = ?'); updateValues.push(gender); }
        if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
        if (contact_number !== undefined) { updateFields.push('contact_number = ?'); updateValues.push(contact_number); }
        if (country !== undefined) { updateFields.push('country = ?'); updateValues.push(country); }
        if (state !== undefined) { updateFields.push('state = ?'); updateValues.push(state); }
        if (city !== undefined) { updateFields.push('city = ?'); updateValues.push(city); }
        if (zip_code !== undefined) { updateFields.push('zip_code = ?'); updateValues.push(zip_code); }
        if (address !== undefined) { updateFields.push('address = ?'); updateValues.push(address); }

        // Corporate fields
        if (company_name !== undefined) { updateFields.push('company_name = ?'); updateValues.push(company_name); }
        if (company_title !== undefined) { updateFields.push('company_title = ?'); updateValues.push(company_title); }
        if (company_linkedin !== undefined) { updateFields.push('company_linkedin = ?'); updateValues.push(company_linkedin); }
        if (company_email !== undefined) { updateFields.push('company_email = ?'); updateValues.push(company_email); }
        if (company_website !== undefined) { updateFields.push('company_website = ?'); updateValues.push(company_website); }
        if (company_size !== undefined) { updateFields.push('company_size = ?'); updateValues.push(company_size); }
        if (company_contact !== undefined) { updateFields.push('company_contact = ?'); updateValues.push(company_contact); }
        if (company_country !== undefined) { updateFields.push('company_country = ?'); updateValues.push(company_country); }
        if (company_state !== undefined) { updateFields.push('company_state = ?'); updateValues.push(company_state); }
        if (company_city !== undefined) { updateFields.push('company_city = ?'); updateValues.push(company_city); }
        if (company_zip !== undefined) { updateFields.push('company_zip = ?'); updateValues.push(company_zip); }
        if (company_address !== undefined) { updateFields.push('company_address = ?'); updateValues.push(company_address); }

        // Update name if first_name or last_name changed
        if (first_name !== undefined || last_name !== undefined) {
            const fullName = `${first_name || ''} ${last_name || ''}`.trim();
            if (fullName) {
                updateFields.push('name = ?');
                updateValues.push(fullName);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        // Execute update
        updateValues.push(userId, organizationId);
        const query = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = ? AND organization_id = ?
        `;

        await pool.execute(query, updateValues);

        // Fetch updated user data
        const [updatedUser] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser[0]
        });
    } catch (error) {
        next(error);
    }
};

// Get members with renewal dates in current year (Admin only)
const getRenewMembers = async (req, res, next) => {
    try {
        const { organizationId, userId } = req.user;

        // Fetch current user details to get accurate role and chapter
        const currentUser = await User.findByIdAndOrganization(userId, organizationId);

        if (!currentUser) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Apply chapter filter if Chapter Admin
        const chapterFilter = currentUser.role === 'chapter_admin' ? currentUser.chapter : null;

        // Query fields using Model method
        const members = await User.getRenewMembersByOrganization(organizationId, chapterFilter);

        res.status(200).json({
            success: true,
            data: members
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
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
    getMemberDetails,
    adminSendReferral,
    adminScheduleMeeting,
    adminUploadMemberPhoto,
    uploadCompanyLogo,

    // New comprehensive member management endpoints
    getFullMemberProfile,
    getMemberPosts,
    getMemberFiles,
    getMemberReferrals,
    getMemberMeetings,
    adminUpdateMemberFull,
    adminUploadMemberPhoto,
    uploadCompanyLogo,

    getMembersSummary: async (req, res, next) => {
        try {
            const { organizationId, userId } = req.user;

            // Fetch current user details to get accurate role and chapter
            const currentUser = await User.findByIdAndOrganization(userId, organizationId);

            if (!currentUser) {
                return res.status(401).json({ message: 'User not found' });
            }

            // If Chapter Admin, filter by their chapter
            const chapterFilter = currentUser.role === 'chapter_admin' ? currentUser.chapter : null;

            const members = await User.getMembersSummary(organizationId, chapterFilter);
            res.status(200).json({
                success: true,
                data: members
            });
        } catch (error) {
            next(error);
        }
    },

    updateOwnProfile,
    getRenewMembers,
    activateUser,
    updateOrgAdmin
};

