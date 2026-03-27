const { pool } = require('./config/database');
const Meeting = require('./models/Meeting');
const MeetingRSVP = require('./models/MeetingRSVP');
const Notification = require('./models/Notification');
const User = require('./models/User');

async function reproduce() {
    try {
        // 1. Find a valid organization and admin
        const [users] = await pool.execute("SELECT id, organization_id FROM users WHERE role = 'admin' AND status = 'approved' LIMIT 1");
        if (users.length === 0) {
            console.log('No admin found');
            process.exit(1);
        }
        const admin = users[0];
        const organizationId = admin.organization_id;
        const userId = admin.id;

        // 2. Find a valid invitee in the same organization
        const [invitees] = await pool.execute("SELECT id FROM users WHERE organization_id = ? AND id != ? LIMIT 1", [organizationId, userId]);
        if (invitees.length === 0) {
            console.log('No invitee found for organization', organizationId);
            process.exit(1);
        }
        const inviteeId = invitees[0].id;

        console.log(`Using Admin: ${userId}, Invitee: ${inviteeId}, Org: ${organizationId}`);

        const title = "Final Test Meeting";
        const description = "Testing date formatting";
        const meetingDateISO = "2026-01-29T10:13:00.000Z";

        const formatMySQLDate = (isoString) => {
            if (!isoString) return null;
            return isoString.replace('T', ' ').substring(0, 19);
        };

        const formattedMeetingDate = formatMySQLDate(meetingDateISO);

        console.log('Step 1: Creating meeting...');
        const meetingId = await Meeting.create(
            organizationId,
            userId,
            title,
            description,
            formattedMeetingDate,
            null,
            'In-Person',
            null,
            'Office'
        );
        console.log('✓ Meeting created with ID:', meetingId);

        console.log('Step 2: Creating RSVP...');
        await MeetingRSVP.upsert(meetingId, inviteeId, 'invited');
        console.log('✓ RSVP created');

        console.log('Step 3: Creating notification...');
        await Notification.create(
            inviteeId,
            organizationId,
            `New Meeting Scheduled: ${title}`,
            'meeting',
            { path: '/meetings' }
        );
        console.log('✓ Notification created');

        console.log('REPRODUCTION SUCCESSFUL');
        process.exit(0);
    } catch (error) {
        console.error('REPRODUCTION FAILED:', error);
        process.exit(1);
    }
}

reproduce();
