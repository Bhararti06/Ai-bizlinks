const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function simulateRequest() {
    try {
        const token = jwt.sign(
            {
                id: 23, // Omkar Jori
                email: 'onkarj@gmail.com',
                role: 'admin',
                organizationId: 18
            },
            process.env.JWT_SECRET || 'dev_secret_key_change_in_production_12345',
            { expiresIn: '1h' }
        );

        console.log('Simulating request with token for Omkar (Org 18)...');

        const response = await axios.get('http://localhost:5000/api/users/approved', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Request failed:', error.response ? error.response.data : error.message);
    }
}

simulateRequest();
