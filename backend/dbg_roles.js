const { pool } = require('./config/database');
async function run() {
    try {
        const [rows] = await pool.execute('SELECT id, name, email, role FROM users');
        console.log('=== USERS ===');
        rows.forEach(r => console.log(`${r.id}: ${r.name} (${r.email}) - ${r.role}`));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
run();
