const mysql = require('mysql2/promise');
const config = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'community_portal'
};

async function test() {
    try {
        const connection = await mysql.createConnection(config);
        const [rows] = await connection.execute('SELECT id, name, organization_id, status FROM users WHERE id = 24');
        console.log('USER_DATA:' + JSON.stringify(rows));

        const [orgs] = await connection.execute('SELECT id, name FROM organizations');
        console.log('ORGS_DATA:' + JSON.stringify(orgs));

        await connection.end();
    } catch (err) {
        console.error('DB_ERROR:', err);
    }
}
test();
