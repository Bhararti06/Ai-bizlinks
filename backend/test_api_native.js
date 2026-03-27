const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' });

const JWT_SECRET = process.env.JWT_SECRET;

const payload = {
    id: 1,
    organizationId: 18,
    role: 'admin',
    email: 'admin@greentree.com'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/24/full-profile',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
});

req.end();
