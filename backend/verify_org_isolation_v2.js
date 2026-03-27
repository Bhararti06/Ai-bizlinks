const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const authController = require('./controllers/authController');

async function verifyLogic() {
    console.log('--- VERIFYING BACKEND ORG ISOLATION LOGIC ---');

    // Mock Response Object
    const res = {
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this.body = data;
            return this;
        }
    };

    // Test Case 1: GT Member logging in via GT link (Success)
    const req1 = {
        body: {
            email: 'testmember@example.com',
            password: 'password123',
            org: 'GT'
        }
    };

    console.log('\nTC1: GT Member -> GT Org');
    await authController.login(req1, res);
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 200) {
        console.log('RESULT: PASSED (Allowed)');
    } else {
        console.log('RESULT: FAILED', res.body?.message);
    }

    // Test Case 2: GT Member logging in via INFOSYS link (Rejected)
    const req2 = {
        body: {
            email: 'testmember@example.com',
            password: 'password123',
            org: 'INFOSYS'
        }
    };

    console.log('\nTC2: GT Member -> INFOSYS Org');
    await authController.login(req2, res);
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 403) {
        console.log('RESULT: PASSED (Correctly Rejected)');
        console.log('Message:', res.body.message);
    } else {
        console.log('RESULT: FAILED (Should have been 403, got ' + res.statusCode + ')');
    }

    process.exit(0);
}

verifyLogic().catch(err => {
    console.error(err);
    process.exit(1);
});
