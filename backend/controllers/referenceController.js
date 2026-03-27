const Reference = require('../models/Reference');
const ReferralComment = require('../models/ReferralComment');
const Notification = require('../models/Notification');
const User = require('../models/User');

const createReference = async (req, res, next) => {
    try {
        const { organizationId, userId, role } = req.user;
        const {
            referenceName,
            refOrganizationName,
            contactEmail,
            contactPhone,
            description,
            referralFlag,
            referredTo,
            status,
            businessDoneAmount
        } = req.body;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        // Check if referral is restricted to chapter members only
        if (settings.referralChapterOnly === true && role !== 'admin') {
            const creator = await User.findById(userId);
            // referredTo is usually an ID, but let's be safe. If it's a name, we'd need to find by name.
            // Looking at the code, it seems referredTo is likely an ID or name depending on context.
            // In referenceController it's used as an ID in createReference (referredTo).
            if (referredTo) {
                const recipient = await User.findById(referredTo);
                if (recipient && recipient.chapter !== creator.chapter) {
                    return res.status(403).json({
                        success: false,
                        message: `Referrals are restricted to ${creator.chapter} chapter only. Cannot refer to ${recipient.name} from ${recipient.chapter || 'no chapter'}.`
                    });
                }
            }
        }

        if (!referenceName) {
            return res.status(400).json({ success: false, message: 'Reference Name is required' });
        }

        const referenceId = await Reference.create(
            organizationId,
            userId,
            referenceName,
            refOrganizationName,
            contactEmail,
            contactPhone,
            description,
            referralFlag,
            referredTo,
            businessDoneAmount || 0
        );

        if (status) { // If status is provided, update it (since create defaults to 'Open')
            await Reference.update(referenceId, {
                reference_name: referenceName,
                ref_organization_name: refOrganizationName,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                description: description,
                status: status,
                referral_flag: referralFlag,
                referred_to: referredTo,
                business_done_amount: businessDoneAmount || 0
            });
        }

        // Notify Relevant Parties
        await sendReferenceNotification(organizationId, userId, referenceId, referenceName, referralFlag, referredTo);

        res.status(201).json({
            success: true,
            data: { id: referenceId, referenceName }
        });
    } catch (error) {
        next(error);
    }
};

// Helper function for notifications
const sendReferenceNotification = async (organizationId, senderId, referenceId, referenceName, referralFlag, referredTo) => {
    try {
        console.log(`[Notification] Starting for Ref: ${referenceId}, Sender: ${senderId}`);
        const isTYNote = referralFlag === '0';
        const creator = await User.findById(senderId);
        if (!creator) {
            console.error(`[Notification] Creator not found for ID: ${senderId}`);
            return;
        }

        let recipient = null;
        if (referredTo) {
            const orgUsers = await User.getByOrganization(organizationId);
            // Search by ID first
            if (!isNaN(referredTo)) {
                recipient = orgUsers.find(u => u.id == referredTo);
            }
            // If not found by ID, search by Name (case-insensitive)
            if (!recipient) {
                recipient = orgUsers.find(u => u.name.trim().toLowerCase() === String(referredTo).trim().toLowerCase());
            }
        }

        const allUsers = await User.getByOrganization(organizationId);

        // 1. Notify Org Admin (Always)
        const orgAdmins = allUsers.filter(u => u.role === 'admin' && u.status === 'approved');

        // 2. Notify Relevant Chapter Admins
        const chapterAdmins = allUsers.filter(u => {
            if (u.role !== 'chapter_admin' || u.status !== 'approved') return false;
            const isSenderChapter = u.chapter === creator.chapter;
            const isRecipientChapter = recipient && u.chapter === recipient.chapter;
            return isSenderChapter || isRecipientChapter;
        });

        // Unique admins
        const adminRecipients = [...new Map([...orgAdmins, ...chapterAdmins].map(u => [u.id, u])).values()];

        const typeLabel = isTYNote ? 'Thank You Note' : 'Referral';
        const typeKey = isTYNote ? 'reference' : 'referral_received';

        const adminMsg = `New ${typeLabel}: ${referenceName} added by ${creator.name}`;

        for (const admin of adminRecipients) {
            let notificationData = {};

            if (isTYNote) {
                // Thank You Notes always go to /thank-you
                notificationData = { path: '/thank-you' };
            } else if (admin.role === 'chapter_admin' && recipient) {
                // For Chapter Admins, determine the correct path and tab
                const isFromMyChapter = creator.chapter === admin.chapter;
                const isToMyChapter = recipient.chapter === admin.chapter;

                if (isFromMyChapter && !isToMyChapter) {
                    // Chapter member SENT a referral to another chapter
                    notificationData = { path: '/referrals/sent' };
                } else if (isToMyChapter) {
                    // Chapter member RECEIVED a referral
                    const isExternal = creator.chapter !== recipient.chapter;
                    notificationData = {
                        path: '/referrals/received',
                        tab: isExternal ? 'external' : 'internal'
                    };
                } else {
                    // Default fallback
                    notificationData = { path: '/referrals/received' };
                }
            } else {
                // Org Admin - default to received
                notificationData = { path: '/referrals/received' };
            }

            await Notification.create(admin.id, organizationId, adminMsg, typeKey, notificationData);
        }

        // 3. Notify the recipient
        if (recipient && recipient.id != senderId) {
            const recipientMsg = isTYNote
                ? `You received a Thank You Note from ${creator.name}: ${referenceName}`
                : `You received a new referral from ${creator.name}: ${referenceName}`;

            const recipientPath = isTYNote ? '/thank-you' : '/referrals/received';
            await Notification.create(recipient.id, organizationId, recipientMsg, typeKey, { path: recipientPath });
            console.log(`[Notification] Sent to recipient: ${recipient.name} (${recipient.id})`);
        } else {
            console.log(`[Notification] No valid recipient found or recipient is sender. ReferredTo: ${referredTo}`);
        }
    } catch (err) {
        console.error('[Notification] Error in reference notification:', err);
    }
};

const getReferences = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const references = await Reference.findByOrganization(organizationId);

        res.status(200).json({
            success: true,
            data: references
        });
    } catch (error) {
        next(error);
    }
};

const updateReference = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const reference = await Reference.findById(id);
        if (!reference || reference.organization_id !== organizationId) {
            return res.status(404).json({ success: false, message: 'Reference not found' });
        }

        // Check permission: Admin or Owner
        console.log(`[Update Ref] UserRole: ${req.user.role}, UserID: ${req.user.userId}, OwnerID: ${reference.user_id}`);

        // Use != for loose comparison to handle String vs Number discrepancies
        if (req.user.role !== 'admin' && reference.user_id != req.user.userId && reference.referred_to != req.user.userName) {
            // Check if user is the recipient (referred_to stores the name)
            const currentUser = await User.findById(req.user.userId);
            if (reference.referred_to !== currentUser.name) {
                console.log('[Update Ref] Permission denied: ID and Name mismatch');
                return res.status(403).json({
                    success: false,
                    message: `Permission denied. You are not the owner or the recipient of this referral.`
                });
            }
        }

        const { status, business_done_amount } = req.body;

        // Auto Thank You Note Creation Logic
        if (status === 'Business Done' && reference.status !== 'Business Done') {
            if (!business_done_amount || parseFloat(business_done_amount) <= 0) {
                return res.status(400).json({ success: false, message: 'Business Done Amount is required and must be greater than 0' });
            }

            // Create Auto Thank You Note
            // Sender: Current User (who received the referral)
            // Receiver: Original Sender of the referral
            const originalSender = await User.findById(reference.user_id);
            if (originalSender) {
                const tyNoteId = await Reference.create(
                    organizationId,
                    req.user.userId,
                    `Thank You Note for ${reference.reference_name}`, // Reference Name
                    'Auto Generated', // Ref Org
                    '', // Email
                    '', // Phone
                    `Automatically generated Thank You Note for reference: ${reference.reference_name}`, // Description
                    '0', // referral_flag ('0' = TY Note)
                    originalSender.name, // referred_to (Recipient Name)
                    business_done_amount // Amount
                );

                // Ensure the status is 'Business Done' for the TY record
                await Reference.update(tyNoteId, {
                    reference_name: `Thank You Note for ${reference.reference_name}`,
                    ref_organization_name: 'Auto Generated',
                    contact_email: '',
                    contact_phone: '',
                    description: `Automatically generated Thank You Note for reference: ${reference.reference_name}`,
                    status: 'Business Done',
                    referral_flag: '0',
                    referred_to: originalSender.name,
                    business_done_amount: business_done_amount
                });

                // Send notifications for the auto-generated TY note
                await sendReferenceNotification(
                    organizationId,
                    req.user.userId,
                    tyNoteId,
                    `Thank You Note for ${reference.reference_name}`,
                    '0',
                    originalSender.name
                );
            }
        }

        await Reference.update(id, req.body);

        res.status(200).json({ success: true, message: 'Reference updated successfully' });
    } catch (error) {
        console.error('[Update Ref] Error:', error);
        next(error);
    }
};

const getDashboardRevenue = async (req, res, next) => {
    try {
        const { organizationId, role, userId } = req.user;
        let revenue = 0;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        if (role === 'chapter_admin') {
            if (settings.referralDataChapterAdmin === false) {
                // Setting is OFF -> Hide data (return 0)
                revenue = 0;
            } else {
                const user = await User.findById(userId);
                revenue = await Reference.getChapterRevenue(organizationId, user.chapter);
            }
        } else if (role === 'admin') {
            revenue = await Reference.getRevenue(organizationId);
        }

        res.status(200).json({ success: true, revenue });
    } catch (error) {
        next(error);
    }
};

const deleteReference = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const reference = await Reference.findById(id);
        if (!reference || reference.organization_id !== organizationId) {
            return res.status(404).json({ success: false, message: 'Reference not found' });
        }

        // Check permission: Admin or Owner
        if (req.user.role !== 'admin' && reference.user_id !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        await Reference.delete(id);

        res.status(200).json({ success: true, message: 'Reference deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getSentReferrals = async (req, res, next) => {
    try {
        console.log(`\n--- [getSentReferrals] START ---`);
        console.log(`[getSentReferrals] Request from User ID: ${req.user?.userId}, Role: ${req.user?.role}`);
        const { userId, organizationId, role } = req.user;
        let referrals;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});
        console.log(`[getSentReferrals] Org setting 'referralDataChapterAdmin':`, settings.referralDataChapterAdmin);

        if (role === 'chapter_admin') {
            const user = await User.findById(userId);
            console.log(`[getSentReferrals] Chapter Admin's chapter is: '${user.chapter}'`);
            console.log(`[getSentReferrals] Querying DB with Reference.getSentByChapter...`);
            referrals = await Reference.getSentByChapter(organizationId, user.chapter);
            console.log(`[getSentReferrals] Database successfully returned ${referrals?.length} records.`);
        } else {
            console.log(`[getSentReferrals] Executing normal Member query...`);
            referrals = await Reference.getSentByMember(userId);
            console.log(`[getSentReferrals] Database successfully returned ${referrals?.length} records.`);
        }

        console.log(`[getSentReferrals] Sending JSON response with ${referrals?.length || 0} items.`);
        console.log(`--- [getSentReferrals] END ---\n`);
        res.status(200).json({
            success: true,
            data: referrals
        });
    } catch (error) {
        console.error(`[getSentReferrals] Error:`, error);
        next(error);
    }
};

const getReceivedReferrals = async (req, res, next) => {
    try {
        console.log(`\n--- [getReceivedReferrals] START ---`);
        console.log(`[getReceivedReferrals] Request from User ID: ${req.user?.userId}, Role: ${req.user?.role}`);
        const { userId, organizationId, role } = req.user;
        const user = await User.findById(userId);

        if (!user) {
            console.error(`[getReceivedReferrals] User not found in DB!`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});
        console.log(`[getReceivedReferrals] Org setting 'referralDataChapterAdmin':`, settings.referralDataChapterAdmin);

        let referrals;
        if (role === 'chapter_admin') {
            console.log(`[getReceivedReferrals] Chapter Admin's chapter is: '${user.chapter}'`);
            console.log(`[getReceivedReferrals] Querying DB with Reference.getReceivedByChapterName...`);
            referrals = await Reference.getReceivedByChapterName(organizationId, user.chapter);
            console.log(`[getReceivedReferrals] Database successfully returned ${referrals?.length} records.`);
        } else {
            console.log(`[getReceivedReferrals] Executing normal Member query...`);
            referrals = await Reference.getReceivedByMember(user.name);
            console.log(`[getReceivedReferrals] Database successfully returned ${referrals?.length} records.`);
        }

        console.log(`[getReceivedReferrals] Sending JSON response with ${referrals?.length || 0} items.`);
        console.log(`--- [getReceivedReferrals] END ---\n`);
        res.status(200).json({
            success: true,
            data: referrals
        });
    } catch (error) {
        console.error(`[getReceivedReferrals] Error:`, error);
        next(error);
    }
};

const getReferralComments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const comments = await ReferralComment.getByReferralId(id);

        res.status(200).json({
            success: true,
            data: comments
        });
    } catch (error) {
        next(error);
    }
};

const addReferralComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;
        const { comment } = req.body;

        if (!comment) {
            return res.status(400).json({ success: false, message: 'Comment is required' });
        }

        await ReferralComment.create(id, userId, comment);

        res.status(201).json({ success: true, message: 'Comment added successfully' });
    } catch (error) {
        next(error);
    }
};

const getThankYouNotes = async (req, res, next) => {
    try {
        const { organizationId, role, userId } = req.user;
        let notes;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        if (role === 'chapter_admin') {
            const user = await User.findById(userId);
            notes = await Reference.getThankYouNotesByChapter(organizationId, user.chapter);
        } else {
            notes = await Reference.getThankYouNotes(organizationId);
        }

        res.status(200).json({
            success: true,
            data: notes
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReference,
    getReferences,
    updateReference,
    deleteReference,
    getSentReferrals,
    getReceivedReferrals,
    getReferralComments,
    addReferralComment,
    getThankYouNotes,
    getDashboardRevenue,
    sendReferenceNotification
};
