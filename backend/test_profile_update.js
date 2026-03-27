const { pool } = require('./config/database');
const User = require('./models/User');

async function testUpdate() {
    try {
        // Find an existing user
        const [users] = await pool.query('SELECT id FROM users LIMIT 1');
        if (users.length === 0) {
            console.log('No users found to test with');
            process.exit(0);
        }

        const testId = users[0].id;
        console.log(`Testing update for user ID: ${testId}`);

        const testData = {
            name: 'Test User',
            firstName: 'Test',
            lastName: 'User',
            contactNumber: '1234567890'
        };

        const success = await User.updateProfile(testId, testData);
        console.log(`Update success: ${success}`);

        const [updatedUser] = await pool.query('SELECT * FROM users WHERE id = ?', [testId]);
        console.log('Updated user data:', JSON.stringify(updatedUser[0], null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Update test failed:', error);
        process.exit(1);
    }
}

testUpdate();
