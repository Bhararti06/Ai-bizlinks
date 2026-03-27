const { pool } = require('./config/database');

async function check() {
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM visitors');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
check();
