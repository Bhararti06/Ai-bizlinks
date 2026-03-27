const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

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

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/approved',
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
        console.log('Status code:', res.statusCode);
        console.log('Response body:', data);
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Request failing:', error);
    process.exit(1);
});

req.end();
