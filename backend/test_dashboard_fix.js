
const { pool } = require('./config/database');
const ReferenceModel = require('./models/Reference');
const UserModel = require('./models/User'); // Assuming this exists and works
const adminDashboardController = require('./controllers/adminDashboardController');

async function testReferenceModel() {
    try {
        console.log('Testing Reference Model...');
        // Mock data usually needed, but here we just check if it runs without syntax error
        // and if query executes (even if returns empty)
        const orgId = 1; // Replace with a valid ID if needed, or 0

        console.log('Testing findByOrganization...');
        await ReferenceModel.findByOrganization(orgId);
        console.log('findByOrganization Success');

        console.log('Testing getByChapter...');
        await ReferenceModel.getByChapter(orgId, 'Test Chapter');
        console.log('getByChapter Success');

        console.log('Testing getSentByChapter...');
        await ReferenceModel.getSentByChapter(orgId, 'Test Chapter');
        console.log('getSentByChapter Success');

    } catch (e) {
        console.error('Reference Model Test Failed:', e);
    }
}

testReferenceModel().then(() => {
    console.log('Done');
    process.exit();
});
