const axios = require('axios');

async function testOrgIsolation() {
    console.log('--- TESTING ORGANIZATION ISOLATION ---');
    const API_URL = 'http://localhost:5000/api';

    // Test Case 1: Valid User, Correct Org
    // Assuming user 'testmember@example.com' belongs to 'GT' (sub_domain)
    try {
        console.log('\nTest Case 1: Logging in with correct organization context');
        const res1 = await axios.post(`${API_URL}/auth/login`, {
            email: 'testmember@example.com',
            password: 'password123',
            org: 'GT'
        });
        console.log('Result:', res1.data.success ? 'SUCCESS (Allowed)' : 'FAILED');
    } catch (error) {
        console.log('Result: FAILED', error.response?.data?.message || error.message);
    }

    // Test Case 2: Valid User, Incorrect Org
    try {
        console.log('\nTest Case 2: Logging in with incorrect organization context (INFOSYS)');
        const res2 = await axios.post(`${API_URL}/auth/login`, {
            email: 'testmember@example.com',
            password: 'password123',
            org: 'INFOSYS'
        });
        console.log('Result: FAILED (Should have been rejected)');
    } catch (error) {
        if (error.response?.status === 403) {
            console.log('Result: SUCCESS (Correctly rejected with 403)');
            console.log('Message:', error.response.data.message);
        } else {
            console.log('Result: FAILED', error.response?.data?.message || error.message);
        }
    }

    // Test Case 3: Public registration should still work (checking if I broke unrelated flows)
    try {
        console.log('\nTest Case 3: Validating public email check (unrelated flow)');
        const res3 = await axios.post(`${API_URL}/auth/validate-email`, {
            email: 'newuser@example.com'
        });
        console.log('Result:', res3.data.success ? 'SUCCESS' : 'FAILED');
    } catch (error) {
        console.log('Result: FAILED', error.response?.data?.message || error.message);
    }

    console.log('\n--- VERIFICATION FINISHED ---');
}

testOrgIsolation();
