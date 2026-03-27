const fs = require('fs');
const path = require('path');

// Read token
const tokenPath = path.join(__dirname, 'admin_token.json');
if (!fs.existsSync(tokenPath)) {
    console.error('Token file not found. Run test_admin_login.js first.');
    process.exit(1);
}

const authData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const token = authData.data.token;
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('Starting Admin Functionality Tests...\n');

    // 1. Get Profile
    await testEndpoint('Get Admin Profile', '/users/profile', 'GET');

    // 2. Get Members
    await testEndpoint('Get Members List', '/users', 'GET');

    // 3. Create Category (Master Data)
    const categoryPayload = { name: 'Test Category ' + Date.now() };
    await testEndpoint('Create Category', '/master/categories', 'POST', categoryPayload);

    // 4. Create Chapter (Master Data)
    const chapterPayload = { name: 'Test Chapter ' + Date.now() };
    await testEndpoint('Create Chapter', '/chapters', 'POST', chapterPayload);

    // 5. Create Post
    const postPayload = {
        title: 'Test Post from Admin',
        description: 'This is a test post created via API flow test.'
    };
    await testEndpoint('Create Post', '/posts', 'POST', postPayload);

    // 6. Create Training
    // Need future dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const trainingPayload = {
        training_title: 'API Test Training',
        training_date: tomorrow.toISOString().split('T')[0],
        training_start_date: tomorrow.toISOString().split('T')[0],
        training_end_date: dayAfter.toISOString().split('T')[0],
        training_start_time: '09:00',
        training_end_time: '17:00',
        registration_last_date: tomorrow.toISOString().split('T')[0],
        trainer_name: 'Tester Bot',
        training_mode: 'Virtual',  // Changed from 'Online' to 'Virtual' to match database enum
        meeting_link: 'http://meet.google.com/abc',
        description: 'Automated test training'
    };
    await testEndpoint('Create Training', '/trainings', 'POST', trainingPayload);

    // 7. Create Event
    const eventPayload = {
        title: 'API Test Event',
        description: 'Automated test event',
        eventDate: tomorrow.toISOString().split('T')[0],
        eventEndDate: dayAfter.toISOString().split('T')[0],
        eventTimeIn: '14:00',
        eventTimeOut: '15:00',
        location: 'Virtual',
        eventLink: 'http://meet.google.com/event',
        chapter: null,
        organizerName: 'Admin',
        eventCharges: 0,
        registrationCutoffDate: tomorrow.toISOString().split('T')[0],
        eventMode: 'Virtual',  // Changed from 'Online' to 'Virtual' to match database enum
        paymentLink: null
    };
    await testEndpoint('Create Event', '/events', 'POST', eventPayload);

    // 8. Get References (Referrals)
    await testEndpoint('Get References', '/references', 'GET');

    console.log('\nAll tests completed.');
}

async function testEndpoint(testName, endpoint, method, body = null) {
    console.log(`[TEST] ${testName} (${method} ${endpoint})...`);
    try {
        const options = {
            method: method,
            headers: headers
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();

        if (response.ok) {
            console.log(`   [PASS] Status: ${response.status}`);
            // console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`);
        } else {
            console.error(`   [FAIL] Status: ${response.status}`);
            console.error(`   Error: ${JSON.stringify(data)}`);
            if (method === 'POST') console.error(`   Payload: ${JSON.stringify(body)}`);
        }
    } catch (error) {
        console.error(`   [FAIL] Network/Script Error: ${error.message}`);
    }
    console.log('');
}

runTests();
