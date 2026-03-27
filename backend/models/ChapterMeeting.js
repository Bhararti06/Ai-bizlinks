const { pool } = require('../config/database');

class ChapterMeeting {
    static async create(data) {
        const query = `
            INSERT INTO chapter_meetings (
                organization_id, chapter_name, created_by, title, description, 
                meeting_date, cutoff_date, start_time, end_time, mode, 
                meeting_link, location, charges, payment_link
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            data.organizationId,
            data.chapterName,
            data.createdBy,
            data.title,
            data.description,
            data.meetingDate,
            data.cutoffDate,
            data.startTime,
            data.endTime,
            data.mode,
            data.meetingLink,
            data.location,
            data.charges || 0.00,
            data.paymentLink
        ]);
        return result.insertId;
    }

    static async getByChapter(organizationId, chapterName) {
        const query = `
            SELECT m.*, u.name as creator_name
            FROM chapter_meetings m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.organization_id = ? AND m.chapter_name = ?
            ORDER BY m.meeting_date DESC
        `;
        const [rows] = await pool.execute(query, [organizationId, chapterName]);
        return rows;
    }

    static async getByOrganization(organizationId) {
        const query = `
            SELECT m.*, u.name as creator_name
            FROM chapter_meetings m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.organization_id = ?
            ORDER BY m.meeting_date DESC
        `;
        const [rows] = await pool.execute(query, [organizationId]);
        return rows;
    }

    static async findById(id) {
        const query = `
            SELECT m.*, u.name as creator_name
            FROM chapter_meetings m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `;
        const [rows] = await pool.execute(query, [id]);
        return rows[0] || null;
    }

    static async update(id, data) {
        const query = `
            UPDATE chapter_meetings
            SET title = ?, description = ?, meeting_date = ?, cutoff_date = ?, 
                start_time = ?, end_time = ?, mode = ?, meeting_link = ?, 
                location = ?, charges = ?, payment_link = ?, status = ?
            WHERE id = ?
        `;
        const [result] = await pool.execute(query, [
            data.title,
            data.description,
            data.meetingDate,
            data.cutoffDate,
            data.startTime,
            data.endTime,
            data.mode,
            data.meetingLink,
            data.location,
            data.charges,
            data.paymentLink,
            data.status,
            id
        ]);
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const query = 'DELETE FROM chapter_meetings WHERE id = ?';
        const [result] = await pool.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Registrations
    static async registerMember(meetingId, userId) {
        const query = 'INSERT INTO chapter_meeting_registrations (meeting_id, user_id) VALUES (?, ?)';
        await pool.execute(query, [meetingId, userId]);
    }

    static async getRegistrations(meetingId) {
        const query = `
            SELECT r.id, r.registered_at, u.name as member_name, u.email as member_email, 'Member' as type
            FROM chapter_meeting_registrations r
            JOIN users u ON r.user_id = u.id
            WHERE r.meeting_id = ?
            UNION ALL
            SELECT r.id, r.registered_at, v.name as member_name, v.email as member_email, 'Visitor' as type
            FROM chapter_meeting_registrations r
            JOIN visitors v ON r.visitor_id = v.id
            WHERE r.meeting_id = ?
            ORDER BY registered_at DESC
        `;
        const [rows] = await pool.execute(query, [meetingId, meetingId]);
        return rows;
    }

    static async isMemberRegistered(meetingId, userId) {
        const query = 'SELECT id FROM chapter_meeting_registrations WHERE meeting_id = ? AND user_id = ?';
        const [rows] = await pool.execute(query, [meetingId, userId]);
        return rows.length > 0;
    }

    static async isVisitorRegistered(meetingId, visitorId) {
        const query = 'SELECT id FROM chapter_meeting_registrations WHERE meeting_id = ? AND visitor_id = ?';
        const [rows] = await pool.execute(query, [meetingId, visitorId]);
        return rows.length > 0;
    }
}

module.exports = ChapterMeeting;
