const { pool } = require('../config/database');

class Visitor {
    static async create(data) {
        const query = `
            INSERT INTO visitors (
                organization_id, name, email, contact_number, company_name, chapter, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            data.organizationId,
            data.name,
            data.email,
            data.contactNumber,
            data.companyName,
            data.chapter,
            data.createdBy
        ]);
        return result.insertId;
    }

    static async findByEmail(email, organizationId) {
        const query = 'SELECT * FROM visitors WHERE email = ? AND organization_id = ?';
        const [rows] = await pool.execute(query, [email, organizationId]);
        return rows[0] || null;
    }

    static async getByOrganization(organizationId) {
        const query = `
            SELECT v.*, u.name as added_by_name
            FROM visitors v
            LEFT JOIN users u ON v.created_by = u.id
            WHERE v.organization_id = ?
            ORDER BY v.created_at DESC
        `;
        const [rows] = await pool.execute(query, [organizationId]);
        return rows;
    }

    static async addToMeeting(visitorId, meetingId) {
        const query = 'INSERT INTO chapter_meeting_registrations (meeting_id, visitor_id) VALUES (?, ?)';
        await pool.execute(query, [meetingId, visitorId]);
    }
}

module.exports = Visitor;
