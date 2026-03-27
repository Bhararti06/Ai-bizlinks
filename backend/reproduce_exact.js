const { pool } = require('./config/database');
const Meeting = require('./models/Meeting');
const MeetingRSVP = require('./models/MeetingRSVP');
const Notification = require('./models/Notification');
const User = require('./models/User');

async function reproduce() {
    try {
        const title = "Discussion on Bizlinks Project.";
        const description = "Discussion on Bizlinks Project.";
        const location = "BoardRoom B, 4th floor";
        const meetingDateISO = "2026-01-29T10:13:00.000Z";
        const mode = "In-Person";
        const inviteeIdManual = 2; // Kartik Jadhav?

        const [users] = await pool.execute("SELECT id, organization_id FROM users WHERE role = 'admin' AND status = 'approved' LIMIT 1");
        if (users.length === 0) throw new Error('No admin found');
        const admin = users[0];
        const organizationId = admin.organization_id;
        const userId = admin.id;

        const formatMySQLDate = (isoString) => {
            if (!isoString) return null;
            return isoString.replace('T', ' ').substring(0, 19);
        };

        const formattedMeetingDate = formatMySQLDate(meetingDateISO);

        console.log('Testing createMeeting parameters...');
        console.log({
            organizationId,
            userId,
            title,
            description,
            formattedMeetingDate,
            mode,
            location
        });

        // 1. Create Meeting
        const meetingId = await Meeting.create(
            organizationId,
            userId,
            title,
            description,
            formattedMeetingDate,
            null,
            mode,
            null,
            location
        );
        console.log('✓ Meeting created:', meetingId);

        // 2. RSVP
        await MeetingRSVP.upsert(meetingId, inviteeIdManual, 'invited');
        console.log('✓ RSVP created');

        // 3. Notification
        await Notification.create(
            inviteeIdManual,
            organizationId,
            `New Meeting Scheduled: ${title}`,
            'meeting',
            { path: '/meetings' }
        );
        console.log('✓ Notification created');

        process.exit(0);
    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    }
}

reproduce();
