const { pool } = require('../config/database');

class Reference {
  static async create(organizationId, userId, referenceName, refOrganizationName, contactEmail, contactPhone, description, referralFlag = null, referredTo = null, businessDoneAmount = 0) {
    const query = `
      INSERT INTO business_references (organization_id, user_id, reference_name, ref_organization_name, contact_email, contact_phone, description, status, referral_flag, referred_to, business_done_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      organizationId,
      userId,
      referenceName,
      refOrganizationName,
      contactEmail,
      contactPhone,
      description,
      referralFlag,
      referredTo,
      businessDoneAmount
    ]);
    return result.insertId;
  }

  static async findByOrganization(organizationId) {
    const query = `
      SELECT r.*, 
             u.name as created_by_name,
             u.chapter as sender_chapter,
             u.profile_image as created_by_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.chapter, u2_name.chapter) as receiver_chapter,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.organization_id = ?
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  static async getSentByMember(userId) {
    const query = `
      SELECT r.*, 
             u.name as created_by_name,
             u.profile_image as created_by_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.user_id = ?
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }

  static async getReceivedByMember(userId) {
    const query = `
      SELECT r.*, 
             u.name as created_by_name,
             u.profile_image as created_by_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.referred_to = ? OR u2_id.name = ? OR u2_name.name = ?
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId, userId, userId]);
    return rows;
  }

  // Gets ALL references touching a chapter (Sent or Received) - primarily for dashboard aggregate stats
  static async getByChapter(organizationId, chapterName) {
    const query = `
      SELECT r.*, 
             u.name as created_by_name,
             u.chapter as sender_chapter,
             u.profile_image as created_by_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.chapter, u2_name.chapter) as receiver_chapter,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.organization_id = ? AND (TRIM(u.chapter) = TRIM(?) OR TRIM(u2_id.chapter) = TRIM(?) OR TRIM(u2_name.chapter) = TRIM(?))
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId, chapterName, chapterName, chapterName]);
    return rows;
  }

  // Gets STRICTLY references Received by a chapter (receiver == chapter)
  static async getReceivedByChapterName(organizationId, chapterName) {
    const query = `
      SELECT r.*, 
             u.name as created_by_name,
             u.chapter as sender_chapter,
             u.profile_image as created_by_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.chapter, u2_name.chapter) as receiver_chapter,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.organization_id = ? AND (TRIM(u2_id.chapter) = TRIM(?) OR TRIM(u2_name.chapter) = TRIM(?))
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId, chapterName, chapterName]);
    return rows;
  }

  static async getSentByChapter(organizationId, chapterName) {
    const query = `
      SELECT r.*, 
             u.name as created_by_name,
             u.chapter as sender_chapter,
             u.profile_image as created_by_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.chapter, u2_name.chapter) as receiver_chapter,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.organization_id = ? AND TRIM(u.chapter) = TRIM(?)
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId, chapterName]);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM business_references WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async update(id, data) {
    const query = `
      UPDATE business_references
      SET reference_name = ?, ref_organization_name = ?, contact_email = ?, contact_phone = ?, description = ?, status = ?, referral_flag = ?, referred_to = ?, business_done_amount = ?
      WHERE id = ?
    `;
    await pool.execute(query, [
      data.reference_name,
      data.ref_organization_name,
      data.contact_email,
      data.contact_phone,
      data.description,
      data.status,
      data.referral_flag,
      data.referred_to,
      data.business_done_amount || 0,
      id
    ]);
  }

  static async getThankYouNotes(organizationId) {
    const query = `
      SELECT r.*, 
             u.name as sender_name,
             u.profile_image as sender_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.organization_id = ? AND r.referral_flag = '0'
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  static async getThankYouNotesByChapter(organizationId, chapterName) {
    const query = `
      SELECT r.*, 
             u.name as sender_name,
             u.profile_image as sender_image,
             COALESCE(u2_id.name, u2_name.name) as receiver_name,
             COALESCE(u2_id.profile_image, u2_name.profile_image) as receiver_image
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.organization_id = ? AND r.referral_flag = '0' AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId, chapterName, chapterName, chapterName]);
    return rows;
  }

  static async getRevenue(organizationId) {
    const query = `
      SELECT SUM(business_done_amount) as total_revenue
      FROM business_references
      WHERE organization_id = ? AND status = 'Business Done' AND referral_flag = '0'
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows[0].total_revenue || 0;
  }

  static async getChapterRevenue(organizationId, chapterName) {
    const query = `
      SELECT SUM(r.business_done_amount) as total_revenue
      FROM business_references r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2_id ON r.referred_to = u2_id.id
      LEFT JOIN users u2_name ON r.referred_to = u2_name.name
      WHERE r.organization_id = ? AND r.status = 'Business Done' AND r.referral_flag = '0' 
        AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
    `;
    const [rows] = await pool.execute(query, [organizationId, chapterName, chapterName, chapterName]);
    return rows[0].total_revenue || 0;
  }

  static async delete(id) {
    const query = 'DELETE FROM business_references WHERE id = ?';
    await pool.execute(query, [id]);
  }
}

module.exports = Reference;
