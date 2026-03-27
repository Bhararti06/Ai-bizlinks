const { pool } = require('../config/database');
const { getEvents } = require('../controllers/eventController');
const { getUsers } = require('../controllers/userController');
// Import User model to ensure it is registered if needed, though controllers usually import it.

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

const runVerification = async () => {
    try {
        console.log('--- Starting Verification ---');

        // 1. Get an Organization
        const [orgs] = await pool.execute('SELECT * FROM organizations LIMIT 1');
        if (orgs.length === 0) throw new Error('No organizations found');
        const orgId = orgs[0].id;
        console.log(`Using Organization: ${orgId}`);

        // 2. Get a Member (not admin) who belongs to a chapter
        // We need someone with a chapter to verify filtering
        const [users] = await pool.execute('SELECT * FROM users WHERE organization_id = ? AND role != "admin" AND chapter IS NOT NULL AND chapter != "" LIMIT 1', [orgId]);

        if (users.length === 0) {
            console.log('WARNING: No test user with chapter found. Skipping strict verification.');
            process.exit(0);
        }
        const user = users[0];
        console.log(`Using User: ${user.name} (Role: ${user.role}), Chapter: ${user.chapter}`);

        // Mock Req
        const req = {
            user: {
                userId: user.id,
                organizationId: orgId,
                role: user.role,
                chapter: user.chapter
            },
            query: {},
            params: {}
        };

        // Save original settings
        const [originalOrg] = await pool.execute('SELECT settings FROM organizations WHERE id = ?', [orgId]);
        const originalSettings = originalOrg[0].settings;

        // --- TEST 1: EVENTS ---
        console.log('\n--- TEST 1: EVENTS (Chapter Only = TRUE) ---');
        // Set setting TRUE
        await pool.execute('UPDATE organizations SET settings = ? WHERE id = ?', [JSON.stringify({ eventsChapterOnly: true }), orgId]);

        let res = mockRes();
        await getEvents(req, res, (err) => console.error(err));

        if (res.body && res.body.data) {
            console.log(`Events Found: ${res.body.data.length}`);
            // Verify chapters
            let violations = res.body.data.filter(e => e.chapter && e.chapter !== user.chapter);
            // Note: Null chapter events might be global, assuming they are allowed.
            // If event has a chapter, it MUST match.
            if (violations.length > 0) {
                console.error('FAIL: Found events from other chapters!', violations.map(e => e.chapter));
            } else {
                console.log('PASS: Only own chapter (or global) events found.');
            }
        } else {
            console.error('FAIL: No data returned for events');
        }

        // --- TEST 2: CREATE MEETING USERS ---
        console.log('\n--- TEST 2: MEETING USERS (Chapter Only = TRUE) ---');
        await pool.execute('UPDATE organizations SET settings = ? WHERE id = ?', [JSON.stringify({ createMeetingsChapterOnly: true }), orgId]);
        req.query.context = 'meeting';

        res = mockRes();
        await getUsers(req, res, (err) => console.error(err));

        if (res.body && res.body.data) {
            console.log(`Users Found: ${res.body.data.length}`);
            let violations = res.body.data.filter(u => u.chapter && u.chapter !== user.chapter);
            if (violations.length > 0) {
                console.error('FAIL: Found users from other chapters!', violations.map(u => u.chapter));
            } else {
                console.log('PASS: Only own chapter users found.');
            }
        } else {
            console.error('FAIL: No data returned for users');
        }

        // Restore Settings
        await pool.execute('UPDATE organizations SET settings = ? WHERE id = ?', [originalSettings, orgId]);
        console.log('\n--- Settings Restored. Verification Complete ---');
        process.exit(0);

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
        process.exit(1);
    }
};

runVerification();
