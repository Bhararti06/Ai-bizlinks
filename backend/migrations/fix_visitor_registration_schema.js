const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/database');

async function migrate() {
    console.log('Starting migration: Fix visitor registration in chapter meetings...');
    try {
        // 1. Add visitor_id column
        try {
            await pool.execute('ALTER TABLE chapter_meeting_registrations ADD COLUMN visitor_id INT NULL AFTER user_id');
            console.log('✓ Added visitor_id column to chapter_meeting_registrations');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ visitor_id column already exists');
            } else {
                throw err;
            }
        }

        // 2. Make user_id nullable
        try {
            await pool.execute('ALTER TABLE chapter_meeting_registrations MODIFY COLUMN user_id INT NULL');
            console.log('✓ Made user_id nullable in chapter_meeting_registrations');
        } catch (err) {
            console.error('Error modifying user_id column:', err.message);
            throw err;
        }

        // 3. Add foreign key for visitor_id
        try {
            await pool.execute('ALTER TABLE chapter_meeting_registrations ADD CONSTRAINT fk_meeting_reg_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE');
            console.log('✓ Added foreign key for visitor_id');
        } catch (err) {
            if (err.code === 'ER_DUP_CONSTRAINT_NAME' || err.code === 'ER_FK_DUP_NAME') {
                console.log('ℹ Foreign key for visitor_id already exists');
            } else {
                console.warn('Warning: Could not add foreign key (maybe visitors table has issues):', err.message);
            }
        }

        // 4. Add unique constraint for visitor registration
        try {
            await pool.execute('ALTER TABLE chapter_meeting_registrations ADD UNIQUE INDEX idx_unique_meeting_visitor (meeting_id, visitor_id)');
            console.log('✓ Added unique index for meeting-visitor combination');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ Unique index for meeting-visitor already exists');
            } else {
                throw err;
            }
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
