const { pool } = require('./config/database');

async function migrate() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM users');
        const columnNames = columns.map(col => col.Field);

        const columnsToAdd = [
            { name: 'first_name', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'last_name', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'contact_number', type: 'VARCHAR(20) DEFAULT NULL' }
        ];

        for (const col of columnsToAdd) {
            if (!columnNames.includes(col.name)) {
                console.log(`Adding ${col.name} column to users table...`);
                await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✓ ${col.name} column added`);
            } else {
                console.log(`${col.name} column already exists`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
