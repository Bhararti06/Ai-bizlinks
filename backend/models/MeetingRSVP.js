const { pool } = require('../config/database');

class MeetingRSVP {
    // Create or update RSVP
    static async upsert(meetingId, userId, status) {
        // Check if RSVP already exists
        const checkQuery = 'SELECT id FROM meeting_rsvps WHERE meeting_id = ? AND user_id = ?';
        const [existing] = await pool.execute(checkQuery, [meetingId, userId]);

        if (existing.length > 0) {
            // Update existing RSVP
            const updateQuery = 'UPDATE meeting_rsvps SET status = ? WHERE meeting_id = ? AND user_id = ?';
            await pool.execute(updateQuery, [status, meetingId, userId]);
            return existing[0].id;
        } else {
            // Create new RSVP
            const insertQuery = 'INSERT INTO meeting_rsvps (meeting_id, user_id, status) VALUES (?, ?, ?)';
            const [result] = await pool.execute(insertQuery, [meetingId, userId, status]);
            return result.insertId;
        }
    }

    // Get all RSVPs for a meeting
    static async getByMeeting(meetingId) {
        const query = `
      SELECT 
        mr.id,
        mr.user_id,
        mr.status,
        mr.created_at,
        u.name as user_name
      FROM meeting_rsvps mr
      LEFT JOIN users u ON mr.user_id = u.id
      WHERE mr.meeting_id = ?
      ORDER BY mr.created_at DESC
    `;

        const [rows] = await pool.execute(query, [meetingId]);
        return rows;
    }

    // Get user's RSVP for a meeting
    static async getUserRSVP(meetingId, userId) {
        const query = 'SELECT * FROM meeting_rsvps WHERE meeting_id = ? AND user_id = ?';
        const [rows] = await pool.execute(query, [meetingId, userId]);
        return rows[0] || null;
    }

    // Get RSVP summary (counts by status)
    static async getSummary(meetingId) {
        const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM meeting_rsvps
      WHERE meeting_id = ?
      GROUP BY status
    `;

        const [rows] = await pool.execute(query, [meetingId]);

        // Format summary
        const summary = {
            attending: 0,
            not_attending: 0,
            maybe: 0,
            total: 0
        };

        rows.forEach(row => {
            summary[row.status] = row.count;
            summary.total += row.count;
        });

        return summary;
    }

    // Delete RSVP
    static async delete(meetingId, userId) {
        const query = 'DELETE FROM meeting_rsvps WHERE meeting_id = ? AND user_id = ?';
        const [result] = await pool.execute(query, [meetingId, userId]);
        return result.affectedRows > 0;
    }
}

module.exports = MeetingRSVP;
