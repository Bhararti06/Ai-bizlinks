const Meeting = require('../models/Meeting');
const MeetingRSVP = require('../models/MeetingRSVP');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail, emailTemplates } = require('../services/emailService');

// Create a new meeting (Admin only)
const createMeeting = async (req, res, next) => {
    try {
        const { title, description, meetingDate, startTime, endTime, mode, meetingLink, location, invitees } = req.body;
        const { userId, organizationId, role } = req.user;

        console.log('--- Meeting Creation Request ---');
        console.log('User:', userId, 'Org:', organizationId);
        console.log('Payload:', { title, meetingDate, mode, location });

        // Validation
        if (!title || !meetingDate) {
            return res.status(400).json({
                success: false,
                message: 'Title and meeting date are required'
            });
        }

        if (mode === 'Virtual' && !meetingLink) {
            return res.status(400).json({
                success: false,
                message: 'Meeting link is required for virtual meetings'
            });
        }
        if (mode === 'In-Person' && !location) {
            return res.status(400).json({
                success: false,
                message: 'Location is required for in-person meetings'
            });
        }

        // Format Date for MySQL
        const formatMySQLDate = (isoString) => {
            if (!isoString) return null;
            return isoString.replace('T', ' ').substring(0, 19);
        };

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        // If restriction is ON and user is NOT Admin
        if (settings.createMeetingsChapterOnly === true && role !== 'admin') {

            if (invitees && Array.isArray(invitees) && invitees.length > 0) {
                const User = require('../models/User');
                const creator = await User.findById(userId);

                // Check each invitee
                for (const inviteeId of invitees) {
                    const invitee = await User.findById(inviteeId);
                    if (invitee && invitee.chapter !== creator.chapter) {
                        return res.status(403).json({
                            success: false,
                            message: `Meetings are restricted to ${creator.chapter} chapter only. Cannot invite ${invitee.name} from ${invitee.chapter || 'no chapter'}.`
                        });
                    }
                }
            }
        }

        const formattedMeetingDate = formatMySQLDate(meetingDate);
        const formattedEndTime = formatMySQLDate(endTime);

        // Determine Privacy
        // If invitees are present, mark as Private using invisible zero-width space
        let finalDescription = description || '';

        const isPrivate = invitees && Array.isArray(invitees) && invitees.length > 0;

        if (isPrivate) {
            finalDescription += '\u200B';
        }

        // Create meeting
        let meetingId;
        try {
            meetingId = await Meeting.create(
                organizationId,
                userId,
                title,
                finalDescription,
                formattedMeetingDate,
                formattedEndTime,
                mode,
                meetingLink,
                location
            );
        } catch (createError) {
            console.error('Meeting.create failed:', createError);
            throw createError;
        }

        // Handle Invitees

        let notifiedUserIds = [];

        try {
            if (invitees && Array.isArray(invitees) && invitees.length > 0) {
                // Create RSVPs for specific invitees
                for (const inviteeId of invitees) {
                    await MeetingRSVP.upsert(meetingId, inviteeId, 'invited');
                    notifiedUserIds.push(inviteeId);
                }
            } else {
                // Public meeting: notify all approved members and admins
                const allUsers = await User.getByOrganization(organizationId);

                let eligibleUsers = allUsers.filter(u => u.id !== userId && u.status === 'approved');

                if (settings.createMeetingsChapterOnly) {
                    const User = require('../models/User');
                    const creator = await User.findById(userId);
                    if (creator && creator.chapter) {
                        eligibleUsers = eligibleUsers.filter(u => u.chapter === creator.chapter);
                    }
                }

                notifiedUserIds = eligibleUsers.map(u => u.id);
            }
        } catch (rsvpError) {
            console.error('RSVP handling failed:', rsvpError);
            throw rsvpError;
        }

        // Get the created meeting
        const meeting = await Meeting.findById(meetingId);

        // Notify members
        try {
            // 1. In-App Notification (Broadcast to specific users)
            for (const recipientId of notifiedUserIds) {
                await Notification.create(
                    recipientId,
                    organizationId,
                    `New Meeting Scheduled: ${title}`,
                    'meeting',
                    { path: '/meetings' }
                ).catch(e => console.error(`Failed to notify ${recipientId}:`, e.message));
            }

            // 2. Email Notification (Blast)
            const allUsers = await User.getByOrganization(organizationId);
            const emails = allUsers
                .filter(u => notifiedUserIds.includes(u.id) && u.status === 'approved')
                .map(u => u.email);

            if (emails.length > 0) {
                const emailData = emailTemplates.meetingScheduled(title, meetingDate, meetingLink);
                emails.forEach(email => {
                    sendEmail(email, emailData.subject, emailData.html).catch(e => console.error(`Failed to email ${email}:`, e.message));
                });
            }
        } catch (notifyError) {
            console.error('Meeting notification failed:', notifyError);
        }

        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            data: meeting
        });
    } catch (error) {
        console.error('Full CreateMeeting Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error during meeting creation'
        });
    }
};

// Get all meetings for organization
const getMeetings = async (req, res, next) => {
    try {
        const { organizationId, userId, role } = req.user;

        const meetings = await Meeting.getByOrganization(organizationId, userId, role);

        res.status(200).json({
            success: true,
            data: meetings
        });
    } catch (error) {
        next(error);
    }
};

// Update meeting (Admin only)
const updateMeeting = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, meetingDate, endTime, mode, meetingLink, location } = req.body;
        const { organizationId } = req.user;

        // Check if meeting exists and belongs to organization
        const meeting = await Meeting.findByIdAndOrganization(id, organizationId);
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Update meeting
        await Meeting.update(
            id,
            organizationId,
            title || meeting.title,
            description !== undefined ? description : meeting.description,
            meetingDate || meeting.meeting_date,
            endTime !== undefined ? endTime : meeting.end_time,
            mode !== undefined ? mode : meeting.mode,
            meetingLink !== undefined ? meetingLink : meeting.meeting_link,
            location !== undefined ? location : meeting.location
        );

        // Get updated meeting
        const updatedMeeting = await Meeting.findById(id);

        res.status(200).json({
            success: true,
            message: 'Meeting updated successfully',
            data: updatedMeeting
        });
    } catch (error) {
        next(error);
    }
};

// Delete meeting (Admin only)
const deleteMeeting = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        // Check if meeting exists and belongs to organization
        const meeting = await Meeting.findByIdAndOrganization(id, organizationId);
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Delete meeting
        await Meeting.delete(id, organizationId);

        res.status(200).json({
            success: true,
            message: 'Meeting deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// RSVP to meeting
const rsvpMeeting = async (req, res, next) => {
    try {
        const { id } = req.params; // meeting ID
        const { status } = req.body;
        const { userId, organizationId } = req.user;

        // Validation
        const validStatuses = ['attending', 'not_attending', 'maybe'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid RSVP status. Must be: attending, not_attending, or maybe'
            });
        }

        // Check if meeting exists and belongs to organization
        const meeting = await Meeting.findByIdAndOrganization(id, organizationId);
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Create or update RSVP
        await MeetingRSVP.upsert(id, userId, status);

        // Notify Meeting Creator (if not self-RSVP)
        if (meeting.created_by && meeting.created_by !== userId) {
            const responder = await User.findById(userId);
            const responderName = responder ? responder.name : 'A member';

            await Notification.create(
                meeting.created_by,
                organizationId,

                `${responderName} has responded "${status}" to your meeting: "${meeting.title}"`,
                'meeting',
                { meetingId: id }
            );
        }

        res.status(200).json({
            success: true,
            message: 'RSVP recorded successfully',
            data: {
                meetingId: parseInt(id),
                userId,
                status
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get RSVPs for a meeting
const getMeetingRSVPs = async (req, res, next) => {
    try {
        const { id } = req.params; // meeting ID
        const { organizationId } = req.user;

        // Check if meeting exists and belongs to organization
        const meeting = await Meeting.findByIdAndOrganization(id, organizationId);
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Get RSVPs
        const rsvps = await MeetingRSVP.getByMeeting(id);
        const summary = await MeetingRSVP.getSummary(id);

        res.status(200).json({
            success: true,
            data: {
                meetingId: parseInt(id),
                meetingTitle: meeting.title,
                rsvps,
                summary
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createMeeting,
    getMeetings,
    updateMeeting,
    deleteMeeting,
    rsvpMeeting,
    getMeetingRSVPs
};
