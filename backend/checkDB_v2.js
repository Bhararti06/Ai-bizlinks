const { pool } = require('./config/database');

async function checkDatabase() {
    try {
        const [tables] = await pool.execute('SHOW TABLES');
        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
            const colDetails = columns.map(c => `${c.Field} (${c.Type})`).join(', ');
            console.log(`Table: ${tableName}`);
            console.log(`Columns: ${colDetails}`);
            console.log('---');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkDatabase();
