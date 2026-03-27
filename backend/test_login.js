const axios = require('axios');

async function testLogin() {
    console.log('Attempting login for superadmin@bizlinks.in...');
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'superadmin@bizlinks.in',
            password: 'SuperAdmin1'
        });

        console.log('✅ Login SUCCESS!');
        console.log('Status:', response.status);
        console.log('User Role:', response.data.user.role);
        console.log('Token:', response.data.token ? 'Present' : 'Missing');
    } catch (error) {
        console.log('❌ Login FAILED');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLogin();
