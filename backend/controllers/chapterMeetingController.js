const ChapterMeeting = require('../models/ChapterMeeting');
const User = require('../models/User');
const Notification = require('../models/Notification');

const createMeeting = async (req, res, next) => {
    try {
        const { organizationId, userId, role } = req.user;

        if (role !== 'chapter_admin') {
            return res.status(403).json({ success: false, message: 'Only chapter admins can schedule chapter meetings' });
        }

        const user = await User.findById(userId);

        // Format Dates for MySQL
        const formatMySQLDate = (isoString) => {
            if (!isoString) return null;
            return isoString.replace('T', ' ').substring(0, 19);
        };

        const meetingData = {
            ...req.body,
            organizationId,
            createdBy: userId,
            chapterName: user.chapter,
            meetingDate: formatMySQLDate(req.body.meetingDate),
            cutoffDate: formatMySQLDate(req.body.cutoffDate),
            endTime: formatMySQLDate(req.body.endTime),
            status: req.body.status || 'Scheduled'
        };

        const meetingId = await ChapterMeeting.create(meetingData);

        // Notify all members of the chapter
        try {
            const allUsers = await User.getByOrganization(organizationId);
            // Notify chapter members
            const chapterMembers = allUsers.filter(m => m.chapter === user.chapter && m.role === 'member' && m.status === 'approved');
            // Notify ALL organization admins (as requested: "admin can see every meeting and every notification")
            const orgAdmins = allUsers.filter(u => u.role === 'admin' && u.status === 'approved');

            // Unique recipients
            const notifiedUsers = [...new Map([...chapterMembers, ...orgAdmins].map(u => [u.id, u])).values()];

            for (const member of notifiedUsers) {
                await Notification.create(
                    member.id,
                    organizationId,
                    `New Chapter Meeting: ${req.body.title} scheduled for ${req.body.meetingDate}. Register now!`,
                    'chapter_meeting',
                    { path: '/meetings/chapter' }
                );
            }
        } catch (err) {
            console.error('Failed to send chapter meeting notifications', err);
        }

        res.status(201).json({ success: true, message: 'Chapter meeting scheduled successfully', data: { id: meetingId } });
    } catch (error) {
        next(error);
    }
};

const getMeetings = async (req, res, next) => {
    try {
        const { organizationId, userId, role } = req.user;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let meetings = [];
        if (role === 'admin') {
            meetings = await ChapterMeeting.getByOrganization(organizationId);
        } else {
            meetings = await ChapterMeeting.getByChapter(organizationId, user.chapter);
        }

        // Add registration status for the user
        // Ensure meetings is an array (handle potential DB driver quirks)
        const meetingsList = Array.isArray(meetings) ? meetings : [];

        const meetingsWithReg = await Promise.all(meetingsList.map(async (m) => {
            try {
                const isRegistered = await ChapterMeeting.isMemberRegistered(m.id, userId);
                return { ...m, isRegistered };
            } catch (err) {
                console.error(`Error checking registration for meeting ${m.id}:`, err);
                return { ...m, isRegistered: false };
            }
        }));

        res.status(200).json({ success: true, data: meetingsWithReg });
    } catch (error) {
        console.error('Error in getMeetings:', error);
        next(error);
    }
};

const updateMeeting = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.user;

        if (role !== 'chapter_admin') {
            return res.status(403).json({ success: false, message: 'Only chapter admins can edit chapter meetings' });
        }

        const meeting = await ChapterMeeting.findById(id);

        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        if (meeting.status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Completed meetings cannot be edited' });
        }

        await ChapterMeeting.update(id, req.body);
        res.status(200).json({ success: true, message: 'Meeting updated successfully' });
    } catch (error) {
        next(error);
    }
};

const deleteMeeting = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.user;

        if (role !== 'chapter_admin') {
            return res.status(403).json({ success: false, message: 'Only chapter admins can delete chapter meetings' });
        }

        await ChapterMeeting.delete(id);
        res.status(200).json({ success: true, message: 'Meeting deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const registerForMeeting = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;

        const isRegistered = await ChapterMeeting.isMemberRegistered(id, userId);
        if (isRegistered) {
            return res.status(400).json({ success: false, message: 'Already registered' });
        }

        await ChapterMeeting.registerMember(id, userId);
        res.status(200).json({ success: true, message: 'Registered successfully' });
    } catch (error) {
        next(error);
    }
};

const getRegistrations = async (req, res, next) => {
    try {
        const { id } = req.params;
        const registrations = await ChapterMeeting.getRegistrations(id);
        res.status(200).json({ success: true, data: registrations });
    } catch (error) {
        next(error);
    }
};

const addVisitorToMeeting = async (req, res, next) => {
    try {
        const { id } = req.params; // meetingId
        const { organizationId, userId, role } = req.user;

        if (role !== 'chapter_admin') {
            return res.status(403).json({ success: false, message: 'Only chapter admins can add visitors to chapter meetings' });
        }

        const { name, email, contact_number, company_name, chapter } = req.body;

        const Visitor = require('../models/Visitor');
        const ChapterMeeting = require('../models/ChapterMeeting');

        // 1. Find or Create Visitor
        let visitorId;
        const existingVisitor = await Visitor.findByEmail(email, organizationId);

        if (existingVisitor) {
            visitorId = existingVisitor.id;
            console.log('✓ Found existing visitor:', visitorId);
        } else {
            const visitorData = {
                organizationId,
                name,
                email,
                contactNumber: contact_number,
                companyName: company_name,
                chapter: chapter, // matches model updated field
                createdBy: userId
            };
            visitorId = await Visitor.create(visitorData);
            console.log('✓ Created new visitor:', visitorId);
        }

        // 2. Link to Meeting (if not already linked)
        const isRegistered = await ChapterMeeting.isVisitorRegistered(id, visitorId);
        if (isRegistered) {
            return res.status(200).json({ success: true, message: 'Visitor already registered for this meeting' });
        }

        await Visitor.addToMeeting(visitorId, id);

        res.status(201).json({ success: true, message: 'Visitor added successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createMeeting,
    getMeetings,
    updateMeeting,
    deleteMeeting,
    registerForMeeting,
    getRegistrations,
    addVisitorToMeeting
};
