const User = require('./backend/models/User');
const { pool } = require('./backend/config/database');

async function verifyFetch() {
    try {
        console.log('--- Verifying Data Fetch (Controller Simulation) ---');

        // 1. Get a valid user to act as the requester
        const [users] = await pool.execute('SELECT id, organization_id, role, chapter FROM users WHERE status = "approved" AND role IN ("admin", "member") LIMIT 1');
        if (users.length === 0) {
            console.error('No approved users found to test with.');
            process.exit(0);
        }
        const currentUser = users[0];
        console.log(`Simulating request from User ID: ${currentUser.id}, Role: ${currentUser.role}, Org: ${currentUser.organization_id}`);

        // 2. Simulate User.findByIdAndOrganization
        const fetchedUser = await User.findByIdAndOrganization(currentUser.id, currentUser.organization_id);
        if (!fetchedUser) {
            console.error('User.findByIdAndOrganization returned null!');
        } else {
            console.log('User.findByIdAndOrganization success.');
        }

        // 3. Simulate getApprovedByOrganization
        const chapterFilter = currentUser.role === 'chapter_admin' ? currentUser.chapter : null;
        console.log(`Fetching approved users with filter: ${chapterFilter}`);

        const approvedUsers = await User.getApprovedByOrganization(currentUser.organization_id, chapterFilter);
        console.log(`Success! Found ${approvedUsers.length} approved users.`);

        if (approvedUsers.length > 0) {
            // Verify structure
            const u = approvedUsers[0];
            console.log('Sample user keys:', Object.keys(u));
            if (u.category_name === undefined || u.plan_name === undefined) {
                console.warn('WARNING: Joined fields are undefined!');
            } else {
                console.log('Joined fields present.');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Fetch Failed:', error);
        process.exit(1);
    }
}

verifyFetch();
