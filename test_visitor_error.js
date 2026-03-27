const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });
const { pool } = require('./backend/config/database');
const Visitor = require('./backend/models/Visitor');

async function test() {
    try {
        console.log('Testing visitor creation...');
        const visitorData = {
            organizationId: 1, // Assume org 1 exists
            name: 'Test Visitor',
            email: 'test@example.com',
            contactNumber: '1234567890',
            companyName: 'Test Co',
            chapterName: 'Test Chapter',
            createdBy: 1
        };

        const visitorId = await Visitor.create(visitorData);
        console.log('✓ Visitor created with ID:', visitorId);

        // Try to create again to see if it fails (unique constraint)
        try {
            console.log('Testing duplicate visitor creation...');
            await Visitor.create(visitorData);
            console.log('Warning: Duplicate visitor created without error');
        } catch (err) {
            console.log('✓ Caught expected error for duplicate:', err.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Test failed with error:', error);
        process.exit(1);
    }
}

test();
