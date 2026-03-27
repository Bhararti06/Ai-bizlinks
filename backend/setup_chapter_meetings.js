const { pool } = require('./config/database');

async function createTables() {
    try {
        const createMeetingsTable = `
      CREATE TABLE IF NOT EXISTS chapter_meetings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        chapter_name VARCHAR(255) NOT NULL,
        created_by INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        meeting_date DATE NOT NULL,
        cutoff_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        mode ENUM('Virtual', 'In-Person') NOT NULL DEFAULT 'In-Person',
        meeting_link VARCHAR(500),
        location VARCHAR(500),
        charges DECIMAL(10, 2) DEFAULT 0.00,
        payment_link VARCHAR(500),
        status ENUM('Scheduled', 'Completed', 'Not Completed') NOT NULL DEFAULT 'Scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_org_chapter (organization_id, chapter_name),
        INDEX idx_date (meeting_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

        const createRegistrationsTable = `
      CREATE TABLE IF NOT EXISTS chapter_meeting_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        user_id INT NOT NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meeting_id) REFERENCES chapter_meetings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_meeting_user (meeting_id, user_id),
        INDEX idx_meeting (meeting_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

        await pool.execute(createMeetingsTable);
        console.log('chapter_meetings table created or already exists');

        await pool.execute(createRegistrationsTable);
        console.log('chapter_meeting_registrations table created or already exists');

    } catch (error) {
        console.error('Error creating tables:', error);
    } finally {
        process.exit(0);
    }
}

createTables();
