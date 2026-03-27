const { pool } = require('./config/database');
const Meeting = require('./models/Meeting');
const ChapterMeeting = require('./models/ChapterMeeting');

async function verifyDashboardCounts() {
    try {
        console.log('--- DASHBOARD COUNT VERIFICATION START ---');

        const organizationId = 18; // GreenTree
        const adminId = 31; // Omkar Jori

        // 1. Check current meetings in DB
        const [meetingsDB] = await pool.execute('SELECT COUNT(*) as count FROM meetings WHERE organization_id = ?', [organizationId]);
        const [chapterMeetingsDB] = await pool.execute('SELECT COUNT(*) as count FROM chapter_meetings WHERE organization_id = ?', [organizationId]);

        console.log(`Meetings in 'meetings' table: ${meetingsDB[0].count}`);
        console.log(`Meetings in 'chapter_meetings' table: ${chapterMeetingsDB[0].count}`);

        // 2. Mocking the final logic in adminDashboardController.js
        const meetings = await Meeting.getByOrganization(organizationId, adminId, 'admin');
        const chapterMeetingsData = await ChapterMeeting.getByOrganization(organizationId);

        const memberMeetingsCount = meetings.length;
        const chapterMeetingsCount = chapterMeetingsData.length;

        console.log(`Dashboard Count (Member Meetings): ${memberMeetingsCount}`);
        console.log(`Dashboard Count (Chapter Meetings): ${chapterMeetingsCount}`);

        if (memberMeetingsCount === meetingsDB[0].count && chapterMeetingsCount === chapterMeetingsDB[0].count) {
            console.log('✓ SUCCESS: Dashboard counts match total DB records (Upcoming + History)');
        } else {
            console.log('✗ FAILURE: Counts do not match DB records');
            process.exit(1);
        }

        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION ERROR:', err);
        process.exit(1);
    }
}

verifyDashboardCounts();
