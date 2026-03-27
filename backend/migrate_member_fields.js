const { pool } = require('./config/database');

async function migrate() {
    try {
        console.log('Starting migration: Adding comprehensive member management fields...');

        // Get existing columns
        const [columns] = await pool.query('SHOW COLUMNS FROM users');
        const columnNames = columns.map(col => col.Field);

        // Define all columns to add
        const columnsToAdd = [
            // Personal Information
            { name: 'dob', type: 'DATE DEFAULT NULL', description: 'Date of Birth' },
            { name: 'gender', type: 'VARCHAR(20) DEFAULT NULL', description: 'Gender' },
            { name: 'address', type: 'TEXT DEFAULT NULL', description: 'Address' },
            { name: 'city', type: 'VARCHAR(100) DEFAULT NULL', description: 'City' },
            { name: 'state', type: 'VARCHAR(100) DEFAULT NULL', description: 'State' },
            { name: 'country', type: 'VARCHAR(100) DEFAULT NULL', description: 'Country' },
            { name: 'zip_code', type: 'VARCHAR(20) DEFAULT NULL', description: 'Zip Code' },

            // Corporate Information
            { name: 'company_name', type: 'VARCHAR(255) DEFAULT NULL', description: 'Company Name' },
            { name: 'company_title', type: 'VARCHAR(255) DEFAULT NULL', description: 'Job Title/Position' },
            { name: 'company_logo', type: 'VARCHAR(500) DEFAULT NULL', description: 'Company Logo Path' },
            { name: 'company_linkedin', type: 'VARCHAR(500) DEFAULT NULL', description: 'Company LinkedIn URL' },
            { name: 'company_email', type: 'VARCHAR(255) DEFAULT NULL', description: 'Company Email' },
            { name: 'company_website', type: 'VARCHAR(500) DEFAULT NULL', description: 'Company Website' },
            { name: 'company_size', type: 'VARCHAR(50) DEFAULT NULL', description: 'Company Size' },
            { name: 'company_contact', type: 'VARCHAR(20) DEFAULT NULL', description: 'Company Contact Number' },
            { name: 'company_address', type: 'TEXT DEFAULT NULL', description: 'Company Address' },
            { name: 'company_city', type: 'VARCHAR(100) DEFAULT NULL', description: 'Company City' },
            { name: 'company_state', type: 'VARCHAR(100) DEFAULT NULL', description: 'Company State' },
            { name: 'company_country', type: 'VARCHAR(100) DEFAULT NULL', description: 'Company Country' },
            { name: 'company_zip', type: 'VARCHAR(20) DEFAULT NULL', description: 'Company Zip Code' },

            // Membership Information
            { name: 'member_type', type: 'VARCHAR(50) DEFAULT NULL', description: 'Member Type' },
            { name: 'membership_start_date', type: 'DATE DEFAULT NULL', description: 'Membership Start Date' },
            { name: 'membership_end_date', type: 'DATE DEFAULT NULL', description: 'Membership End Date' },
            { name: 'membership_renewal_date', type: 'DATE DEFAULT NULL', description: 'Membership Renewal Date' }
        ];

        // Add each column if it doesn't exist
        for (const col of columnsToAdd) {
            if (!columnNames.includes(col.name)) {
                console.log(`Adding ${col.name} column (${col.description})...`);
                await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✓ ${col.name} column added`);
            } else {
                console.log(`✓ ${col.name} column already exists`);
            }
        }

        // Update status ENUM to include 'inactive' and 'deleted'
        console.log('Updating status ENUM...');
        try {
            await pool.query(`
                ALTER TABLE users 
                MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'inactive', 'deleted') 
                NOT NULL DEFAULT 'pending'
            `);
            console.log('✓ Status ENUM updated');
        } catch (e) {
            if (e.code === 'ER_PARSE_ERROR') {
                console.log('! Status ENUM already includes all values');
            } else {
                throw e;
            }
        }

        console.log('\n✓ Migration completed successfully!');
        console.log('All required fields for comprehensive member management are now available.');

        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

migrate();
