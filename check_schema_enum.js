const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/config/database');

async function checkEnum() {
    try {
        console.log('Checking status ENUM for meeting_rsvps...');
        const [rows] = await pool.execute("SHOW COLUMNS FROM meeting_rsvps LIKE 'status'");
        console.log('Column Type:', rows[0].Type);

        console.log('\nChecking notifications columns...');
        const [notifCols] = await pool.execute("SHOW COLUMNS FROM notifications");
        console.table(notifCols.map(c => ({ Field: c.Field, Type: c.Type })));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkEnum();
