const { pool } = require('../config/database');

class Meeting {
  // Create a new meeting
  static async create(organizationId, createdBy, title, description, meetingDate, endTime, mode, meetingLink, location) {
    const query = `
      INSERT INTO meetings (organization_id, created_by, title, description, meeting_date, end_time, mode, meeting_link, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      organizationId,
      createdBy,
      title,
      description,
      meetingDate,
      endTime,
      mode,
      meetingLink,
      location
    ]);

    return result.insertId;
  }

  // Get all meetings for an organization with user's RSVP status
  static async getByOrganization(organizationId, userId, userRole) {
    let visibilityClause = '';
    const params = [userId, organizationId];

    if (userRole === 'member') {
      // Members see:
      // 1. Meetings they created
      // 2. Meetings where they are invited/RSVPed
      // 3. Public meetings (no specific invitees)
      visibilityClause = `
            AND (
                m.created_by = ? 
                OR EXISTS (SELECT 1 FROM meeting_rsvps WHERE meeting_id = m.id AND user_id = ?)
                OR (m.description IS NULL OR m.description NOT LIKE '%\u200B%')
            )
        `;
      params.push(userId, userId);
    }

    const query = `
      SELECT 
        m.id,
        m.title,
        m.description,
        m.meeting_date,
        m.end_time,
        m.mode,
        m.meeting_link,
        m.location,
        m.created_by,
        m.created_at,
        u.name as created_by_name,
        u.role as created_by_role,
        (SELECT status FROM meeting_rsvps WHERE meeting_id = m.id AND user_id = ?) as user_rsvp
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.organization_id = ?
      ${visibilityClause}
      ORDER BY m.meeting_date ASC
    `;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Get meetings for a specific member (created by them or RSVP'd)
  static async getMemberMeetings(userId) {
    const query = `
      SELECT 
        m.id,
        m.title,
        m.description,
        m.meeting_date,
        m.end_time,
        m.mode,
        m.meeting_link,
        m.location,
        m.created_by,
        m.created_at,
        u.name as created_by_name,
        'created' as relation
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_by = ?

      UNION

      SELECT 
        m.id,
        m.title,
        m.description,
        m.meeting_date,
        m.end_time,
        m.mode,
        m.meeting_link,
        m.location,
        m.created_by,
        m.created_at,
        u.name as created_by_name,
        'attended' as relation
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      JOIN meeting_rsvps r ON m.id = r.meeting_id
      WHERE r.user_id = ?
      
      ORDER BY meeting_date DESC
    `;
    const [rows] = await pool.execute(query, [userId, userId]);
    return rows;
  }

  // Get meeting by ID
  static async findById(meetingId) {
    const query = `
      SELECT m.*, u.name as created_by_name
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `;

    const [rows] = await pool.execute(query, [meetingId]);
    return rows[0] || null;
  }

  // Get meeting by ID and organization (for security)
  static async findByIdAndOrganization(meetingId, organizationId) {
    const query = `
      SELECT m.*, u.name as created_by_name
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ? AND m.organization_id = ?
    `;

    const [rows] = await pool.execute(query, [meetingId, organizationId]);
    return rows[0] || null;
  }

  // Update meeting
  static async update(meetingId, organizationId, title, description, meetingDate, endTime, mode, meetingLink, location) {
    const query = `
      UPDATE meetings
      SET title = ?, description = ?, meeting_date = ?, end_time = ?, mode = ?, meeting_link = ?, location = ?
      WHERE id = ? AND organization_id = ?
    `;

    const [result] = await pool.execute(query, [
      title,
      description,
      meetingDate,
      endTime,
      mode,
      meetingLink,
      location,
      meetingId,
      organizationId
    ]);

    return result.affectedRows > 0;
  }

  // Delete meeting
  static async delete(meetingId, organizationId) {
    const query = 'DELETE FROM meetings WHERE id = ? AND organization_id = ?';
    const [result] = await pool.execute(query, [meetingId, organizationId]);
    return result.affectedRows > 0;
  }
}

module.exports = Meeting;
