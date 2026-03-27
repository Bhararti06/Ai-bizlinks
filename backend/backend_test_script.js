const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testApi() {
    try {
        console.log('--- Testing API ---');

        // 1. Forge Token
        const token = jwt.sign(
            {
                userId: 20, // Pratiksha's ID
                organizationId: 1, // Tech corp
                role: 'admin',
                email: 'pratiksha.mali@bitwiseglobal.com'
            },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1h' }
        );

        console.log('Forged Token:', token);

        // 2. Call API
        const url = 'http://localhost:5000/api/users/approved';
        console.log(`Calling ${url}...`);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testApi();
