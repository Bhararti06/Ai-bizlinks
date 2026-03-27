const { pool } = require('../config/database');

class Training {
    // Create a new training
    static async create(organizationId, trainingData) {
        const query = `
            INSERT INTO trainings (
                organization_id, created_by, training_title, trainer_name,
                training_start_date, training_end_date,
                training_start_time, training_end_time,
                training_charges, registration_last_date,
                payment_link, training_link, training_location,
                training_mode, training_description, image_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.execute(query, [
            organizationId,
            trainingData.created_by || null,
            trainingData.training_title || null,
            trainingData.trainer_name || null,
            trainingData.training_start_date || null,
            trainingData.training_end_date || null,
            trainingData.training_start_time || null,
            trainingData.training_end_time || null,
            trainingData.training_charges || 0,
            trainingData.registration_last_date || null,
            trainingData.payment_link || null,
            trainingData.training_link || null,
            trainingData.training_location || null,
            trainingData.training_mode || null,
            trainingData.training_description || null,
            trainingData.image_path || null
        ]);

        return result.insertId;
    }

    // Get all trainings for an organization
    static async getByOrganization(organizationId, chapter = null) {
        let query = `
            SELECT 
                t.*,
                u.name as creator_name,
                u.role as creator_role,
                u.chapter as creator_chapter
            FROM trainings t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.organization_id = ?
        `;
        const params = [organizationId];

        if (chapter) {
            query += ' AND (u.chapter = ? OR u.role = "admin")';
            params.push(chapter);
        }

        query += ' ORDER BY t.training_start_date DESC, t.created_at DESC';

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    // Get training by ID
    static async findById(trainingId, organizationId) {
        const query = `
            SELECT 
                id,
                organization_id,
                training_title,
                trainer_name,
                training_start_date,
                training_end_date,
                training_start_time,
                training_end_time,
                training_charges,
                registration_last_date,
                payment_link,
                training_link,
                training_location,
                training_mode,
                training_description,
                image_path,
                created_at
            FROM trainings
            WHERE id = ? AND organization_id = ?
        `;

        const [rows] = await pool.execute(query, [trainingId, organizationId]);
        return rows[0] || null;
    }

    // Delete training
    static async delete(trainingId, organizationId) {
        const query = `
            DELETE FROM trainings
            WHERE id = ? AND organization_id = ?
        `;

        const [result] = await pool.execute(query, [trainingId, organizationId]);
        return result.affectedRows > 0;
    }

    // Registration Methods
    static async registerUser(trainingId, userId, paymentLink = null, status = 'registered') {
        const query = `
            INSERT INTO training_registrations (training_id, user_id, status, payment_link, payment_status)
            VALUES (?, ?, ?, ?, 'pending')
            ON DUPLICATE KEY UPDATE status = VALUES(status), payment_link = VALUES(payment_link)
        `;
        await pool.execute(query, [trainingId, userId, status, paymentLink]);
    }

    static async getRegistrants(trainingId) {
        const query = `
            SELECT u.id, u.name, u.email, u.contact_number, u.company_name, u.chapter, 
                   tr.status, tr.payment_status, tr.payment_confirmed, tr.registered_at as registration_date,
                   'member' as registrant_type
            FROM training_registrations tr
            JOIN users u ON tr.user_id = u.id
            WHERE tr.training_id = ?
            UNION ALL
            SELECT NULL as id, v.name, v.email, COALESCE(v.contact_number, v.contact) as contact_number, v.company_name, v.chapter,
                   'registered' as status, v.payment_status, v.payment_confirmed, v.visit_date as registration_date,
                   'external' as registrant_type
            FROM visitors v
            WHERE v.training_id = ? AND v.registration_type = 'training'
            ORDER BY registration_date DESC
        `;
        const [rows] = await pool.execute(query, [trainingId, trainingId]);
        return rows;
    }

    static async isRegistered(trainingId, userId) {
        const query = 'SELECT * FROM training_registrations WHERE training_id = ? AND user_id = ?';
        const [rows] = await pool.execute(query, [trainingId, userId]);
        return rows.length > 0;
    }

    // Payment Methods
    static async confirmPayment(trainingId, userId) {
        const query = `
            UPDATE training_registrations 
            SET payment_confirmed = TRUE, payment_status = 'completed'
            WHERE training_id = ? AND user_id = ?
        `;
        await pool.execute(query, [trainingId, userId]);
    }

    static async getPaymentStatus(trainingId, userId) {
        const query = `
            SELECT payment_status, payment_confirmed, payment_link 
            FROM training_registrations 
            WHERE training_id = ? AND user_id = ?
        `;
        const [rows] = await pool.execute(query, [trainingId, userId]);
        return rows[0] || null;
    }

    // External Registration (for non-members)
    static async registerExternal(trainingId, organizationId, visitorData) {
        const query = `
            INSERT INTO visitors (
                organization_id, name, email, contact, contact_number, registered_for, registration_type, training_id,
                company_name, chapter, payment_status, payment_confirmed
            )
            VALUES (?, ?, ?, ?, ?, ?, 'training', ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            organizationId,
            visitorData.name,
            visitorData.email,
            visitorData.contact || visitorData.contact_number || null,
            visitorData.contact_number || visitorData.contact || null,
            visitorData.registered_for,
            trainingId,
            visitorData.company_name || null,
            visitorData.chapter || null,
            visitorData.payment_status || 'pending',
            visitorData.payment_confirmed || false
        ]);
        return result.insertId;
    }
}

module.exports = Training;
