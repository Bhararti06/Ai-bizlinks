const { pool } = require('./config/database');
const chapterMeetingController = require('./controllers/chapterMeetingController');
const userController = require('./controllers/userController');

// Mock Request and Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

const mockNext = (err) => {
    console.error("Middleware Next called with error:", err);
};

async function testControllers() {
    try {
        console.log("--- FINDING ADMIN USER ---");
        const [users] = await pool.execute("SELECT * FROM users WHERE role = 'admin' LIMIT 1");

        if (users.length === 0) {
            console.error("No admin user found!");
            process.exit(1);
        }

        const user = users[0];
        console.log(`Testing with User: ID=${user.id}, Org=${user.organization_id}, Role=${user.role}`);

        const req = {
            user: {
                userId: user.id,
                organizationId: user.organization_id,
                role: user.role,
                email: user.email
            },
            params: {},
            query: {}
        };

        console.log("\n--- TESTING getChapterMeetings ---");
        const res1 = mockRes();
        await chapterMeetingController.getMeetings(req, res1, mockNext);
        console.log("Status:", res1.statusCode);
        if (res1.body) console.log("Data count:", Array.isArray(res1.body.data) ? res1.body.data.length : res1.body);

        console.log("\n--- TESTING getPendingUsers ---");
        const res2 = mockRes();
        await userController.getPendingUsers(req, res2, mockNext);
        console.log("Status:", res2.statusCode);
        if (res2.body) console.log("Data count:", Array.isArray(res2.body.data) ? res2.body.data.length : res2.body);

        process.exit(0);

    } catch (error) {
        console.error("Test Script Crash:", error);
        process.exit(1);
    }
}

testControllers();
