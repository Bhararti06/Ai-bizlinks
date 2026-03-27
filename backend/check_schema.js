const { pool } = require('./config/database');

async function checkSchema() {
    try {
        console.log("Checking 'chapter_meetings' table schema...");
        const [rows] = await pool.execute("DESCRIBE chapter_meetings");
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error("Error checking schema:", error);
        process.exit(1);
    }
}

checkSchema();
