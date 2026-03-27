
const { pool } = require('../config/database');

async function updateOrgTable() {
    console.log('Updating organizations table schema...');
    try {
        // Add sub_domain
        try {
            await pool.execute('ALTER TABLE organizations ADD COLUMN sub_domain VARCHAR(255) UNIQUE');
            console.log('✓ Added sub_domain column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ sub_domain column already exists');
            } else {
                console.warn('⚠ Could not add sub_domain:', err.message);
            }
        }

        // Add contact_number
        try {
            await pool.execute('ALTER TABLE organizations ADD COLUMN contact_number VARCHAR(50)');
            console.log('✓ Added contact_number column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ contact_number column already exists');
            } else {
                console.warn('⚠ Could not add contact_number:', err.message);
            }
        }

        // Add settings (json)
        try {
            await pool.execute('ALTER TABLE organizations ADD COLUMN settings JSON');
            console.log('✓ Added settings column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ settings column already exists');
            } else {
                console.warn('⚠ Could not add settings:', err.message);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

updateOrgTable();
