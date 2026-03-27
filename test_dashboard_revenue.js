const http = require('http');

async function testDashboardAPI() {
    try {
        // Login first
        const loginData = JSON.stringify({
            email: 'omkar@greentree.com',
            password: 'Omkar@123'
        });

        const loginOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            }
        };

        const token = await new Promise((resolve, reject) => {
            const req = http.request(loginOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed.token);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.write(loginData);
            req.end();
        });

        console.log('✅ Login successful');

        // Test dashboard revenue endpoint
        const dashboardOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/references/dashboard-revenue',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const revenue = await new Promise((resolve, reject) => {
            const req = http.request(dashboardOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        console.log('\n📊 Dashboard API Response:');
                        console.log(JSON.stringify(parsed, null, 2));
                        resolve(parsed.revenue);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });

        console.log(`\nRevenue shown: ₹${revenue}`);
        console.log(`Expected: ₹125000`);
        console.log(`Match: ${revenue == 125000 ? '✅ PASS' : '❌ FAIL - Backend server needs restart'}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testDashboardAPI();
