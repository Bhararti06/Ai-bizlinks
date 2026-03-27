const { pool } = require('./config/database');

async function fixPasswordColumn() {
    console.log('🔧 Fixing password column to allow NULL values...');
    try {
        // Check current schema
        const [columns] = await pool.execute('DESCRIBE users');
        const passwordCol = columns.find(c => c.Field === 'password');

        console.log('Current password column:', passwordCol);

        if (passwordCol && passwordCol.Null === 'NO') {
            console.log('⚠️  Password column is NOT NULL - fixing...');

            // Alter the password column to allow NULL
            await pool.execute('ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL');

            console.log('✅ Password column is now nullable');
        } else {
            console.log('✓ Password column already allows NULL');
        }

        // Verify the change
        const [updatedColumns] = await pool.execute('DESCRIBE users');
        const updatedPasswordCol = updatedColumns.find(c => c.Field === 'password');
        console.log('Updated password column:', updatedPasswordCol);

        console.log('\n✨ Database migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

fixPasswordColumn();
