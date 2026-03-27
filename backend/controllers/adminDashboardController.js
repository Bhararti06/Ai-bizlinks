const MemberCategoryModel = require('../models/MemberCategory');
const UserModel = require('../models/User');
const MeetingModel = require('../models/Meeting');
const ReferenceModel = require('../models/Reference');
const EventModel = require('../models/Event');
const TrainingModel = require('../models/Training');
const ChapterModel = require('../models/Chapter');
const ChapterMeetingModel = require('../models/ChapterMeeting');
const { pool } = require('../config/database');

// Get Dashboard Stats
const getDashboardStats = async (req, res, next) => {
    try {
        const { organizationId, userId } = req.user;

        const isAdmin = req.user.role === 'admin';
        const isChapterAdmin = req.user.role === 'chapter_admin';

        const userDetails = isChapterAdmin ? await UserModel.findById(userId) : null;
        const chapterName = userDetails ? userDetails.chapter : null;

        // Run queries in parallel for performance
        const [
            usersCount,
            meetings,
            referrals,
            events,
            trainings,
            chapterCounts,
            categoryCounts,
            chapters,
            allCategories,
            chapterMeetingsData
        ] = await Promise.all([
            isChapterAdmin ? UserModel.getByChapter(organizationId, chapterName).then(u => u.length) : UserModel.countByOrganization(organizationId),
            MeetingModel.getByOrganization(organizationId, userId),
            isChapterAdmin ? ReferenceModel.getByChapter(organizationId, chapterName) : ReferenceModel.findByOrganization(organizationId),
            EventModel.findByOrganization(organizationId),
            TrainingModel.getByOrganization(organizationId),
            UserModel.getChapterCounts(organizationId),
            UserModel.getCategoryCounts(organizationId),
            ChapterModel.getAllByOrganization(organizationId),
            MemberCategoryModel.getByOrg(organizationId),
            isChapterAdmin ? ChapterMeetingModel.getByChapter(organizationId, chapterName) : ChapterMeetingModel.getByOrganization(organizationId)
        ]);

        // Process Meeting Counts (Total counts: Upcoming + History)
        const memberMeetingsCount = meetings.length;
        const chapterMeetingsCount = chapterMeetingsData.length;

        // Calculate category percentages
        const totalCategorized = categoryCounts.reduce((acc, curr) => acc + curr.count, 0);

        const categoryStats = allCategories.map(cat => {
            const found = categoryCounts.find(c => c.name === cat.name);
            const count = found ? found.count : 0;
            return {
                name: cat.name,
                count: count,
                percent: totalCategorized > 0 && usersCount > 0 ? Math.round((count / usersCount) * 100) : 0,
            };
        });

        // Chapter Summary
        const chapterStats = chapters.map(ch => {
            const found = chapterCounts.find(c => c.chapter === ch.name);
            return {
                name: ch.name,
                count: found ? found.count : 0
            };
        });

        // Aggregated Calendar Events
        const calendarEvents = [
            ...events.map(e => ({
                id: `evt-${e.id}`,
                title: e.title,
                start: e.event_date,
                type: 'event',
                details: e
            })),
            ...trainings.map(t => ({
                id: `trn-${t.id}`,
                title: t.training_title,
                start: t.training_start_date,
                type: 'training',
                details: t
            })),
            ...meetings.map(m => ({
                id: `mtg-${m.id}`,
                title: m.title,
                start: m.meeting_date,
                type: 'meeting',
                details: m
            })),
            ...chapterMeetingsData.map(m => ({
                id: `cmtg-${m.id}`,
                title: m.title,
                start: m.meeting_date,
                type: 'meeting',
                details: m,
                isChapterMeeting: true
            }))
        ];

        let actualReferrals = referrals.filter(r => r.referral_flag !== '0');
        let receivedReferralsCount = actualReferrals.length;
        let sentReferralsCount = 0;
        let memberReferralStats = [];

        if (isChapterAdmin) {
            receivedReferralsCount = actualReferrals.filter(r => r.receiver_chapter === chapterName).length;
            sentReferralsCount = actualReferrals.filter(r => r.sender_chapter === chapterName).length;

            const statsMap = {};
            actualReferrals.forEach(r => {
                if (r.sender_chapter === chapterName && r.user_id) {
                    if (!statsMap[r.user_id]) statsMap[r.user_id] = { id: r.user_id, name: r.created_by_name, profile_image: r.created_by_image, sent: 0, received: 0 };
                    statsMap[r.user_id].sent++;
                }
                const receiverId = r.referred_to || r.receiver_id;
                if (r.receiver_chapter === chapterName && receiverId) {
                    if (!statsMap[receiverId]) statsMap[receiverId] = { id: receiverId, name: r.receiver_name, profile_image: r.receiver_image, sent: 0, received: 0 };
                    statsMap[receiverId].received++;
                }
            });
            memberReferralStats = Object.values(statsMap).sort((a, b) => (b.sent + b.received) - (a.sent + a.received));
        }

        res.status(200).json({
            success: true,
            data: {
                memberReferralStats,
                counts: {
                    approvedMembers: usersCount,
                    memberMeetings: memberMeetingsCount,
                    chapterMeetings: chapterMeetingsCount,
                    referrals: actualReferrals.length,
                    receivedReferrals: receivedReferralsCount,
                    sentReferrals: sentReferralsCount,
                    businessDone: referrals
                        .filter(r => {
                            // Only count Thank You Notes (referral_flag = '0')
                            if (r.referral_flag !== '0') return false;
                            if (r.status !== 'Business Done') return false;
                            if (isChapterAdmin) {
                                // Include thank you notes where EITHER sender OR receiver is from this chapter
                                return r.sender_chapter === chapterName || r.receiver_chapter === chapterName;
                            }
                            return true;
                        })
                        .reduce((acc, curr) => acc + (parseFloat(curr.business_done_amount) || 0), 0)
                },
                chapters: chapterStats,
                categories: categoryStats,
                calendar: calendarEvents
            }
        });

    } catch (error) {
        next(error);
    }
};

const exportCSVReport = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const isAdmin = req.user.role === 'admin' || req.user.role === 'chapter_admin';

        if (!isAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const members = await UserModel.getByOrganization(organizationId);

        // Define CSV headers
        const headers = ['Name', 'Email', 'Role', 'Status', 'Chapter', 'Category', 'Contact Number', 'Years in Business', 'Joined Date'];

        // Convert members to CSV rows
        const rows = members.map(m => [
            `"${m.name || ''}"`,
            `"${m.email || ''}"`,
            `"${m.role || ''}"`,
            `"${m.status || ''}"`,
            `"${m.chapter || ''}"`,
            `"${m.category || ''}"`,
            `"${m.contact_number || ''}"`,
            `"${m.years_in_business || ''}"`,
            `"${m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=members_report_${organizationId}.csv`);
        res.status(200).send(csvContent);

    } catch (error) {
        next(error);
    }
};

const getVisitors = async (req, res, next) => {
    try {
        const { organizationId, userId } = req.user;
        const UserModel = require('../models/User');

        // Fetch current user details for accurate role/chapter
        const currentUser = await UserModel.findByIdAndOrganization(userId, organizationId);

        let chapterFilter = null;
        if (currentUser && currentUser.role === 'chapter_admin') {
            chapterFilter = currentUser.chapter;
        }

        // Query 1: Cross-org users from event registrations
        let eventVisitorsQuery = `
            SELECT 
                u.id as visitor_id, u.name, u.email, u.contact_number, u.company_name, u.chapter,
                e.title as registered_for, 'event' as type, er.created_at as registration_date
            FROM event_registrations er
            JOIN users u ON er.user_id = u.id
            JOIN events e ON er.event_id = e.id
            WHERE e.organization_id = ? AND (u.organization_id != ? OR u.organization_id IS NULL)
        `;
        const eventParams = [organizationId, organizationId];

        if (chapterFilter) {
            // User requirement: "chapter admin will see visitors details in visitors tab if only that visitor is related to his chapter"
            // So we strictly filter by visitor's chapter
            eventVisitorsQuery += ` AND u.chapter = ?`;
            eventParams.push(chapterFilter);
        }

        // Query 2: Cross-org users from training registrations
        let trainingVisitorsQuery = `
            SELECT 
                u.id as visitor_id, u.name, u.email, u.contact_number, u.company_name, u.chapter,
                t.training_title as registered_for, 'training' as type, tr.created_at as registration_date
            FROM training_registrations tr
            JOIN users u ON tr.user_id = u.id
            JOIN trainings t ON tr.training_id = t.id
            WHERE t.organization_id = ? AND (u.organization_id != ? OR u.organization_id IS NULL)
        `;
        const trainingParams = [organizationId, organizationId];

        if (chapterFilter) {
            trainingVisitorsQuery += ` AND u.chapter = ?`;
            trainingParams.push(chapterFilter);
        }

        // Query 3: External visitors from visitors table
        let externalVisitorsQuery = `
            SELECT 
                id as visitor_id, name, email, COALESCE(contact_number, contact) as contact_number, company_name, chapter,
                registered_for, registration_type as type, visit_date as registration_date,
                payment_status, payment_confirmed
            FROM visitors
            WHERE organization_id = ?
        `;
        const externalParams = [organizationId];

        if (chapterFilter) {
            externalVisitorsQuery += ` AND chapter = ?`;
            externalParams.push(chapterFilter);
        }

        const [eventVisitors, trainingVisitors, externalVisitors] = await Promise.all([
            pool.execute(eventVisitorsQuery, eventParams),
            pool.execute(trainingVisitorsQuery, trainingParams),
            pool.execute(externalVisitorsQuery, externalParams)
        ]);

        const allVisitors = [
            ...eventVisitors[0],
            ...trainingVisitors[0],
            ...externalVisitors[0]
        ].sort((a, b) => new Date(b.registration_date) - new Date(a.registration_date));

        res.status(200).json({
            success: true,
            data: allVisitors
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats,
    exportCSVReport,
    getVisitors
};
