const { pool } = require('./config/database');

async function checkUser37() {
    try {
        const [rows] = await pool.execute('SELECT * FROM notifications WHERE user_id = 37 ORDER BY created_at DESC');
        console.log(`User 37 has ${rows.length} notifications.`);
        rows.slice(0, 5).forEach(r => {
            console.log(`- [${r.type}] ${r.message} (${r.created_at})`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkUser37();
