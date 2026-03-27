const authController = require('./backend/controllers/authController');
const { pool } = require('./backend/config/database');

async function verifyLoginRestriction() {
    try {
        console.log('--- Verifying Login Restrictions ---');

        // We need to mock req, res, next
        const mockRes = () => {
            const res = {};
            res.status = (code) => {
                res.statusCode = code;
                return res;
            };
            res.json = (data) => {
                res.data = data;
                return res;
            };
            return res;
        };

        // 1. Create a dummy user with 'deleted' status
        console.log('Creating deleted user...');
        const [delResult] = await pool.execute(
            'INSERT INTO users (organization_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [1, 'Deleted User', 'deleted@test.com', 'hash', 'member', 'deleted']
        );
        const deletedUserId = delResult.insertId;

        // 2. Create a dummy user with 'inactive' status
        console.log('Creating inactive user...');
        const [inactResult] = await pool.execute(
            'INSERT INTO users (organization_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [1, 'Inactive User', 'inactive@test.com', 'hash', 'member', 'inactive']
        );
        const inactiveUserId = inactResult.insertId;

        // 3. Test Login for Deleted User
        console.log('Testing Login for Deleted User...');
        const reqDeleted = { body: { email: 'deleted@test.com', password: 'password' } }; // Password doesn't match but status check should come first? 
        // Actually looking at authController, password check is AFTER status check.
        // Wait, `login` checks status first.
        const resDeleted = mockRes();
        await authController.login(reqDeleted, resDeleted, console.error);

        console.log('Deleted User Response:', resDeleted.statusCode, resDeleted.data);
        if (resDeleted.statusCode === 403 && resDeleted.data.message.includes('deleted')) {
            console.log('SUCCESS: Deleted user restricted.');
        } else {
            console.error('FAILURE: Deleted user not correctly restricted.');
        }

        // 4. Test Login for Inactive User
        console.log('Testing Login for Inactive User...');
        const reqInactive = { body: { email: 'inactive@test.com', password: 'password' } };
        const resInactive = mockRes();
        await authController.login(reqInactive, resInactive, console.error);

        console.log('Inactive User Response:', resInactive.statusCode, resInactive.data);
        if (resInactive.statusCode === 403 && resInactive.data.message.includes('deactivated')) {
            console.log('SUCCESS: Inactive user restricted.');
        } else {
            console.error('FAILURE: Inactive user not correctly restricted.');
        }

        // Cleanup
        await pool.execute('DELETE FROM users WHERE id IN (?, ?)', [deletedUserId, inactiveUserId]);
        console.log('Cleanup done.');

        process.exit(0);

    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyLoginRestriction();
