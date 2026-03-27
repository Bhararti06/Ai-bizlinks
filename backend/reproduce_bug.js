const { pool } = require('./config/database');
const Meeting = require('./models/Meeting');
const MeetingRSVP = require('./models/MeetingRSVP');
const Notification = require('./models/Notification');

async function reproduce() {
    try {
        const organizationId = 1; // Assume first org
        const userId = 1; // Assume admin
        const title = "Discussion on Bizlinks Project.";
        const description = "Agenda test";
        const date = "2026-01-29";
        const startTime = "15:43";
        const dateStr = `${date}T${startTime}:00`;
        const meetingDateObj = new Date(dateStr);
        const meetingDate = meetingDateObj.toISOString();

        const formatMySQLDate = (isoString) => {
            if (!isoString) return null;
            return isoString.replace('T', ' ').substring(0, 19);
        };

        const formattedMeetingDate = formatMySQLDate(meetingDate);

        console.log('Attempting to create meeting with formatted date:', formattedMeetingDate);
        const meetingId = await Meeting.create(
            organizationId,
            userId,
            title,
            description,
            formattedMeetingDate,
            null, // endTime
            'In-Person',
            null, // meetingLink
            'BoardRoom B, 4th floor'
        );
        console.log('Meeting created with ID:', meetingId);

        console.log('Attempting to create RSVP...');
        const inviteeId = 2; // Assume some other user
        await MeetingRSVP.upsert(meetingId, inviteeId, 'invited');
        console.log('RSVP created');

        console.log('Attempting to create notification...');
        await Notification.create(
            inviteeId,
            organizationId,
            `New Meeting Scheduled: ${title}`,
            'meeting',
            { path: '/meetings' }
        );
        console.log('Notification created');

        process.exit(0);
    } catch (error) {
        console.error('Reproduction failed:', error);
        process.exit(1);
    }
}

reproduce();
