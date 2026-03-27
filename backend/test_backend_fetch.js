const { pool } = require('./config/database');
const ChapterMeeting = require('./models/ChapterMeeting');
const User = require('./models/User');

async function testFetch() {
    try {
        // 1. Simulate finding a user (Assuming ID 1 exists, replace if needed)
        // We need to know a valid user ID and Org ID.
        // Let's first pick a user.
        const [users] = await pool.execute("SELECT * FROM users LIMIT 1");
        if (users.length === 0) {
            console.log("No users found to test with.");
            process.exit(0);
        }
        const user = users[0];
        console.log("Testing with User:", user.id, user.role, user.organization_id);

        const organizationId = user.organization_id;
        const userId = user.id;
        const role = user.role;

        // 2. Simulate Controller Logic
        console.log("--- Simulating getMeetings ---");

        let meetings;
        if (role === 'admin') {
            console.log("Role is admin, getting by Org");
            meetings = await ChapterMeeting.getByOrganization(organizationId);
        } else {
            console.log("Role is " + role + ", getting by Chapter");
            meetings = await ChapterMeeting.getByChapter(organizationId, user.chapter);
        }

        console.log(`Found ${meetings.length} meetings.`);

        // 3. Simulate Map logic (This is where I suspect it might fail if bad data)
        const meetingsWithReg = await Promise.all(meetings.map(async (m) => {
            console.log(`Checking registration for meeting ${m.id}`);
            const isRegistered = await ChapterMeeting.isMemberRegistered(m.id, userId);
            return { ...m, isRegistered };
        }));

        console.log("Success! Data:", meetingsWithReg);
        process.exit(0);

    } catch (error) {
        console.error("CRASHED:", error);
        process.exit(1);
    }
}

testFetch();
