const { pool } = require('../config/database');

class Event {
    static async create(organizationId, createdBy, data) {
        const query = `
      INSERT INTO events (
        organization_id, created_by, title, description, 
        event_date, event_end_date, event_time_in, event_time_out,
        location, event_link, chapter, organizer_name, 
        event_charges, registration_cutoff_date, event_mode, 
        image_path, payment_link
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const [result] = await pool.execute(query, [
            organizationId || null,
            createdBy || null,
            data.title || null,
            data.description || null,
            data.eventDate || null,
            data.eventEndDate || null,
            data.eventTimeIn || null,
            data.eventTimeOut || null,
            data.location || null,
            data.eventLink || null,
            data.chapter || null,
            data.organizerName || null,
            data.eventCharges || 0,
            data.registrationCutoffDate || null,
            data.eventMode || 'In-Person',
            data.imagePath || null,
            data.paymentLink || null
        ]);
        return result.insertId;
    }

    static async findByOrganization(organizationId, chapter = null) {
        let query = `
      SELECT e.*, u.name as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.organization_id = ?
    `;
        const params = [organizationId];

        if (chapter) {
            query += ' AND (e.chapter = ? OR e.chapter IS NULL)';
            params.push(chapter);
        }

        query += ' ORDER BY e.event_date ASC';
        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM events WHERE id = ?';
        const [rows] = await pool.execute(query, [id]);
        return rows[0] || null;
    }

    static async update(id, data) {
        const query = `
      UPDATE events
      SET title = ?, description = ?, event_date = ?, location = ?, event_link = ?, chapter = ?,
          organizer_name = ?, event_end_date = ?, event_time_in = ?, event_time_out = ?,
          event_charges = ?, registration_cutoff_date = ?, event_mode = ?, image_path = ?, payment_link = ?
      WHERE id = ?
    `;
        await pool.execute(query, [
            data.title || null,
            data.description || null,
            data.eventDate || null,
            data.location || null,
            data.eventLink || null,
            data.chapter || null,
            data.organizerName || null,
            data.eventEndDate || null,
            data.eventTimeIn || null,
            data.eventTimeOut || null,
            data.eventCharges || 0,
            data.registrationCutoffDate || null,
            data.eventMode || 'In-Person',
            data.imagePath || null,
            data.paymentLink || null,
            id
        ]);
    }

    static async delete(id) {
        const query = 'DELETE FROM events WHERE id = ?';
        await pool.execute(query, [id]);
    }

    // Registration Methods
    static async registerUser(eventId, userId, paymentLink = null, status = 'registered') {
        const query = `
            INSERT INTO event_registrations (event_id, user_id, status, payment_link, payment_status)
            VALUES (?, ?, ?, ?, 'pending')
            ON DUPLICATE KEY UPDATE status = VALUES(status), payment_link = VALUES(payment_link)
        `;
        await pool.execute(query, [eventId, userId, status, paymentLink]);
    }

    static async getRegistrants(eventId) {
        const query = `
            SELECT u.id, u.name, u.email, u.contact_number, u.company_name, u.chapter, 
                   er.status, er.payment_status, er.payment_confirmed, er.registered_at as registration_date,
                   'member' as registrant_type
            FROM event_registrations er
            JOIN users u ON er.user_id = u.id
            WHERE er.event_id = ?
            UNION ALL
            SELECT NULL as id, v.name, v.email, COALESCE(v.contact_number, v.contact) as contact_number, v.company_name, v.chapter,
                   'registered' as status, v.payment_status, v.payment_confirmed, v.visit_date as registration_date,
                   'external' as registrant_type
            FROM visitors v
            WHERE v.event_id = ? AND v.registration_type = 'event'
            ORDER BY registration_date DESC
        `;
        const [rows] = await pool.execute(query, [eventId, eventId]);
        return rows;
    }

    static async isRegistered(eventId, userId) {
        const query = 'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?';
        const [rows] = await pool.execute(query, [eventId, userId]);
        return rows.length > 0;
    }

    // Payment Methods
    static async confirmPayment(eventId, userId) {
        const query = `
            UPDATE event_registrations 
            SET payment_confirmed = TRUE, payment_status = 'completed'
            WHERE event_id = ? AND user_id = ?
        `;
        await pool.execute(query, [eventId, userId]);
    }

    static async getPaymentStatus(eventId, userId) {
        const query = `
            SELECT payment_status, payment_confirmed, payment_link 
            FROM event_registrations 
            WHERE event_id = ? AND user_id = ?
        `;
        const [rows] = await pool.execute(query, [eventId, userId]);
        return rows[0] || null;
    }

    // External Registration (for non-members)
    static async registerExternal(eventId, organizationId, visitorData) {
        const query = `
            INSERT INTO visitors (
                organization_id, name, email, contact, contact_number, registered_for, registration_type, event_id,
                company_name, chapter, payment_status, payment_confirmed
            )
            VALUES (?, ?, ?, ?, ?, ?, 'event', ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            organizationId,
            visitorData.name,
            visitorData.email,
            visitorData.contact || visitorData.contact_number || null,
            visitorData.contact_number || visitorData.contact || null,
            visitorData.registered_for,
            eventId,
            visitorData.company_name || null,
            visitorData.chapter || null,
            visitorData.payment_status || 'pending',
            visitorData.payment_confirmed || false
        ]);
        return result.insertId;
    }
}

module.exports = Event;
