const User = require('./models/User');

async function test() {
    try {
        const orgId = 18; // From our check_users.js output for Omkar
        const users = await User.getApprovedByOrganization(orgId);
        console.log(`Approved users for org ${orgId}:`, users.length);
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

test();
