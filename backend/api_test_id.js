const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const JWT_SECRET = process.env.JWT_SECRET;
const API_URL = 'http://localhost:5000/api';

async function test() {
    // Generate a mock token for an admin of org 18
    const payload = {
        id: 1,
        organizationId: 18,
        role: 'admin',
        email: 'admin@greentree.com'
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('Using Token for Org 18');

    try {
        console.log('Testing /api/users/24/full-profile...');
        const res = await axios.get(`${API_URL}/users/24/full-profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Result:', res.status, res.data.success);
    } catch (err) {
        console.error('Error:', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
    }
}

test();
