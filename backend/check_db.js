const { pool } = require('./config/database');

async function checkSchema() {
    try {
        console.log('--- Meetings Table ---');
        const [meetingCols] = await pool.execute("DESCRIBE meetings");
        console.table(meetingCols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Default: c.Default })));

        console.log('\n--- Meeting RSVPs Table ---');
        const [rsvpCols] = await pool.execute("DESCRIBE meeting_rsvps");
        console.table(rsvpCols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Default: c.Default })));

        console.log('\n--- Notifications Table ---');
        const [notifCols] = await pool.execute("DESCRIBE notifications");
        console.table(notifCols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Default: c.Default })));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
