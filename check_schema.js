const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/config/database');

async function checkSchema() {
    try {
        const tables = ['notifications', 'meetings', 'meeting_rsvps', 'chapter_meetings'];
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            try {
                const [columns] = await pool.execute(`DESCRIBE ${table}`);
                console.table(columns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null })));
            } catch (e) {
                console.error(`Failed to describe ${table}: ${e.message}`);
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
