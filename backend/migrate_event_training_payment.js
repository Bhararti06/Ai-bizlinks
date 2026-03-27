const { pool } = require('./config/database');

async function migrateEventTrainingPaymentFields() {
    const connection = await pool.getConnection();

    try {
        console.log('Starting Event & Training Payment Fields Migration...\n');

        // 1. Add payment fields to event_registrations table
        console.log('1. Updating event_registrations table...');

        // Check existing columns
        const [eventRegCols] = await connection.execute(`SHOW COLUMNS FROM event_registrations`);
        const eventRegColNames = eventRegCols.map(col => col.Field);

        const eventRegColumnsToAdd = [];
        if (!eventRegColNames.includes('payment_status')) {
            eventRegColumnsToAdd.push("ADD COLUMN payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending'");
        }
        if (!eventRegColNames.includes('payment_link')) {
            eventRegColumnsToAdd.push("ADD COLUMN payment_link VARCHAR(500)");
        }
        if (!eventRegColNames.includes('payment_confirmed')) {
            eventRegColumnsToAdd.push("ADD COLUMN payment_confirmed BOOLEAN DEFAULT FALSE");
        }
        if (!eventRegColNames.includes('registered_at')) {
            eventRegColumnsToAdd.push("ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        }

        if (eventRegColumnsToAdd.length > 0) {
            await connection.execute(`
                ALTER TABLE event_registrations 
                ${eventRegColumnsToAdd.join(', ')}
            `);
            console.log('   ✓ event_registrations table updated successfully');
        } else {
            console.log('   ℹ Payment fields already exist in event_registrations');
        }

        // 2. Add payment fields to training_registrations table
        console.log('2. Updating training_registrations table...');

        // Check existing columns
        const [trainingRegCols] = await connection.execute(`SHOW COLUMNS FROM training_registrations`);
        const trainingRegColNames = trainingRegCols.map(col => col.Field);

        const trainingRegColumnsToAdd = [];
        if (!trainingRegColNames.includes('payment_status')) {
            trainingRegColumnsToAdd.push("ADD COLUMN payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending'");
        }
        if (!trainingRegColNames.includes('payment_link')) {
            trainingRegColumnsToAdd.push("ADD COLUMN payment_link VARCHAR(500)");
        }
        if (!trainingRegColNames.includes('payment_confirmed')) {
            trainingRegColumnsToAdd.push("ADD COLUMN payment_confirmed BOOLEAN DEFAULT FALSE");
        }
        if (!trainingRegColNames.includes('registered_at')) {
            trainingRegColumnsToAdd.push("ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        }

        if (trainingRegColumnsToAdd.length > 0) {
            await connection.execute(`
                ALTER TABLE training_registrations 
                ${trainingRegColumnsToAdd.join(', ')}
            `);
            console.log('   ✓ training_registrations table updated successfully');
        } else {
            console.log('   ℹ Payment fields already exist in training_registrations');
        }

        // 3. Check if visitors table exists
        console.log('3. Checking visitors table...');
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE 'visitors'
        `);

        if (tables.length === 0) {
            // Create visitors table
            console.log('   Creating visitors table...');
            await connection.execute(`
                CREATE TABLE visitors (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    organization_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    contact VARCHAR(50),
                    registered_for VARCHAR(255),
                    registration_type ENUM('event', 'training', 'general') DEFAULT 'general',
                    event_id INT,
                    training_id INT,
                    visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                    INDEX idx_org_type (organization_id, registration_type),
                    INDEX idx_event (event_id),
                    INDEX idx_training (training_id)
                )
            `);
            console.log('   ✓ visitors table created successfully');
        } else {
            // Update existing visitors table
            console.log('   Updating existing visitors table...');
            try {
                await connection.execute(`
                    ALTER TABLE visitors 
                    ADD COLUMN IF NOT EXISTS registered_for VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS registration_type ENUM('event', 'training', 'general') DEFAULT 'general',
                    ADD COLUMN IF NOT EXISTS event_id INT,
                    ADD COLUMN IF NOT EXISTS training_id INT
                `);
                console.log('   ✓ visitors table updated successfully');
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log('   ℹ Event/Training fields already exist in visitors table');
                } else {
                    throw err;
                }
            }
        }

        // 4. Verify changes
        console.log('\n4. Verifying changes...');

        const [verifyEventRegCols] = await connection.execute(`
            SHOW COLUMNS FROM event_registrations
        `);
        const hasEventPayment = verifyEventRegCols.some(col => col.Field === 'payment_status');
        console.log(`   event_registrations payment fields: ${hasEventPayment ? '✓' : '✗'}`);

        const [verifyTrainingRegCols] = await connection.execute(`
            SHOW COLUMNS FROM training_registrations
        `);
        const hasTrainingPayment = verifyTrainingRegCols.some(col => col.Field === 'payment_status');
        console.log(`   training_registrations payment fields: ${hasTrainingPayment ? '✓' : '✗'}`);

        const [verifyVisitorsCols] = await connection.execute(`
            SHOW COLUMNS FROM visitors
        `);
        const hasVisitorsEventFields = verifyVisitorsCols.some(col => col.Field === 'registration_type');
        console.log(`   visitors event/training fields: ${hasVisitorsEventFields ? '✓' : '✗'}`);

        console.log('\n✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run migration
migrateEventTrainingPaymentFields()
    .then(() => {
        console.log('Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
