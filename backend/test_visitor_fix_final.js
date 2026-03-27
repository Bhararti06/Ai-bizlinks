const path = require('path');
require('dotenv').config();
const { pool } = require('./config/database');
const Visitor = require('./models/Visitor');
const ChapterMeeting = require('./models/ChapterMeeting');

async function test() {
    try {
        console.log('--- Final Visitor Registration Verification ---');

        const testEmail = 'final_test_visitor@example.com';
        const organizationId = 1;
        const meetingId = 1;
        const userId = 1;

        // Cleanup previous test data if any
        await pool.execute('DELETE FROM chapter_meeting_registrations WHERE meeting_id = ? AND visitor_id IN (SELECT id FROM visitors WHERE email = ?)', [meetingId, testEmail]);
        await pool.execute('DELETE FROM visitors WHERE email = ?', [testEmail]);
        console.log('✓ Cleanup complete');

        // 1. Test New Visitor Creation
        console.log('\nStep 1: Creating new visitor...');
        const visitorData = {
            organizationId,
            name: 'Final Test Visitor',
            email: testEmail,
            contactNumber: '1122334455',
            companyName: 'Final Test Co',
            chapter: 'Final Test Chapter',
            createdBy: userId
        };

        const newVisitorId = await Visitor.create(visitorData);
        console.log('✓ Visitor created with ID:', newVisitorId);

        // 2. Test Linking to Meeting
        console.log('\nStep 2: Linking visitor to meeting...');
        await Visitor.addToMeeting(newVisitorId, meetingId);
        const isReg = await ChapterMeeting.isVisitorRegistered(meetingId, newVisitorId);
        console.log('✓ Visitor registered for meeting:', isReg);

        // 3. Test Find or Create (Duplicate Email)
        console.log('\nStep 3: Testing find-or-create with same email...');
        const existingVisitor = await Visitor.findByEmail(testEmail, organizationId);
        console.log('✓ Found existing visitor ID:', existingVisitor?.id);
        if (existingVisitor?.id === newVisitorId) {
            console.log('✓ Find logic working correctly');
        } else {
            throw new Error('Find logic failed - ID mismatch');
        }

        // 4. Test Duplicate Meeting Registration Prevention
        console.log('\nStep 4: Testing duplicate meeting registration prevention...');
        const isRegAgain = await ChapterMeeting.isVisitorRegistered(meetingId, newVisitorId);
        console.log('✓ Check before re-registering:', isRegAgain);
        if (isRegAgain) {
            console.log('✓ Correctly identified already registered');
        } else {
            throw new Error('Registration check failed');
        }

        console.log('\n--- VERIFICATION SUCCESSFUL ---');
        process.exit(0);
    } catch (error) {
        console.error('\n--- VERIFICATION FAILED ---');
        console.error(error);
        process.exit(1);
    }
}

test();
