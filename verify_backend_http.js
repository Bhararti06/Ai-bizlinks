const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
    process.exit(1);
});

req.end();
