const { pool } = require('../config/database');

class User {
  // Create a new user
  static async create(organizationId, name, email, hashedPassword, role = 'member', status = 'pending', chapter = null, firstName = null, lastName = null, contactNumber = null, yearsInBusiness = null, passwordSet = false) {
    const query = `
      INSERT INTO users (organization_id, name, email, password, role, status, chapter, first_name, last_name, contact_number, years_in_business, password_set)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      organizationId,
      name,
      email,
      hashedPassword,
      role,
      status,
      chapter,
      firstName,
      lastName,
      contactNumber,
      yearsInBusiness,
      passwordSet
    ]);

    return result.insertId;
  }

  // Find user by ID
  static async findById(id) {
    const query = `
      SELECT u.*, 
             o.name as organization_name, o.settings as organization_settings, o.sub_domain as organization_sub_domain,
             mc.name as category_name,
             mp.name as plan_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN member_categories mc ON u.category_id = mc.id
      LEFT JOIN membership_plans mp ON u.plan_id = mp.id
      WHERE u.id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  // Find user by email
  static async findByEmail(email) {
    const query = `
      SELECT u.*, o.name as organization_name, o.settings as organization_settings, o.sub_domain as organization_sub_domain
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.email = ?
    `;
    const [rows] = await pool.execute(query, [email]);
    return rows[0] || null;
  }

  // Set password for user (first-time password creation)
  static async setPassword(userId, hashedPassword) {
    const query = `
      UPDATE users
      SET password = ?, password_set = TRUE
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [hashedPassword, userId]);
    return result.affectedRows > 0;
  }

  // Get pending users for an organization
  static async getPendingByOrganization(organizationId) {
    const query = `
      SELECT id, name, email, contact_number as mobile, status, created_at, 
             first_name, last_name, years_in_business, profile_image
      FROM users
      WHERE organization_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  // Get approved users for an organization
  static async getApprovedByOrganization(organizationId, chapter = null) {
    let query = `
      SELECT u.*, 
             mc.name as category_name,
             mp.name as plan_name
      FROM users u
      LEFT JOIN member_categories mc ON u.category_id = mc.id
      LEFT JOIN membership_plans mp ON u.plan_id = mp.id
      WHERE u.organization_id = ? AND u.status = 'approved'
    `;
    const params = [organizationId];

    if (chapter) {
      query += ` AND u.chapter = ?`;
      params.push(chapter);
    }

    query += ` ORDER BY u.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Get rejected users for an organization
  static async getRejectedByOrganization(organizationId) {
    const query = `
      SELECT id, name, email, contact_number as mobile, status, created_at, 
             first_name, last_name, years_in_business
      FROM users
      WHERE organization_id = ? AND status = 'rejected'
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  // Update user with full membership details on approval
  static async updateApprovalDetails(userId, organizationId, data) {
    const query = `
      UPDATE users
      SET status = 'approved',
          created_at = CURRENT_TIMESTAMP,
          name = ?,
          contact_number = ?,
          chapter = ?,
          category_id = ?,
          plan_id = ?,
          referred_by_id = ?,
          referred_by_other = ?
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await pool.execute(query, [
      data.name,
      data.mobile,
      data.chapter,
      data.categoryId,
      data.planId,
      data.referredById,
      data.referredByOther,
      userId,
      organizationId
    ]);
    return result.affectedRows > 0;
  }

  // Update user status (approve/reject)
  static async updateStatus(userId, organizationId, status) {
    const query = `
      UPDATE users
      SET status = ?
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await pool.execute(query, [status, userId, organizationId]);
    return result.affectedRows > 0;
  }

  // Get user by ID and organization (for security)
  static async findByIdAndOrganization(userId, organizationId) {
    const query = `
      SELECT u.*, o.name as organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = ? AND u.organization_id = ?
    `;
    const [rows] = await pool.execute(query, [userId, organizationId]);
    return rows[0] || null;
  }

  // Get all admins for an organization
  static async getAdminsByOrganization(organizationId) {
    const query = `
      SELECT id, name, email, contact_number as mobile, status, created_at, role
      FROM users
      WHERE organization_id = ? AND role = 'admin' AND (status != 'inactive' OR status IS NULL) AND (status != 'deleted' OR status IS NULL)
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  // Check if email exists
  static async emailExists(email) {
    const query = 'SELECT id FROM users WHERE email = ?';
    const [rows] = await pool.execute(query, [email]);
    return rows.length > 0;
  }

  // Get all users in an organization
  static async getByOrganization(organizationId) {
    const query = `
      SELECT id, name, email, role, status, chapter, created_at, profile_image
      FROM users
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }
  static async getEmailsByOrganization(organizationId) {
    const [rows] = await pool.execute(
      'SELECT email FROM users WHERE organization_id = ? AND status = "approved"',
      [organizationId]
    );
    return rows.map(row => row.email);
  }

  // Update user role and chapter
  static async updateRoleAndChapter(userId, organizationId, role, chapter) {
    const query = `
      UPDATE users
      SET role = ?, chapter = ?
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await pool.execute(query, [role, chapter, userId, organizationId]);
    return result.affectedRows > 0;
  }

  // Count users in an organization
  static async countByOrganization(organizationId) {
    const query = 'SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND status = "approved"';
    const [rows] = await pool.execute(query, [organizationId]);
    return rows[0].count;
  }

  // Get members with renewal dates in current year
  static async getRenewMembersByOrganization(organizationId, year, chapter = null) {
    let query = `
        SELECT 
            u.id,
            u.name,
            u.chapter,
            u.membership_end_date,
            u.membership_renewal_date,
            u.profile_image,
            mc.name as category_name
        FROM users u
        LEFT JOIN member_categories mc ON u.category_id = mc.id
        WHERE u.organization_id = ?
        AND u.status = 'approved'
        AND u.membership_renewal_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 15 DAY) AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
    `;
    const params = [organizationId];

    if (chapter) {
      query += ` AND u.chapter = ?`;
      params.push(chapter);
    }

    query += ` ORDER BY u.membership_renewal_date ASC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Update user profile
  static async updateProfile(userId, data) {
    const query = `
      UPDATE users
      SET name = ?, first_name = ?, last_name = ?, contact_number = ?
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [
      data.name,
      data.firstName,
      data.lastName,
      data.contactNumber,
      userId
    ]);
    return result.affectedRows > 0;
  }

  // Update admin details including email
  static async updateAdminDetails(userId, data) {
    const query = `
      UPDATE users
      SET name = ?, first_name = ?, last_name = ?, contact_number = ?, email = ?
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [
      data.name,
      data.firstName,
      data.lastName,
      data.contactNumber,
      data.email,
      userId
    ]);
    return result.affectedRows > 0;
  }

  // Update user password
  static async updatePassword(userId, hashedPassword) {
    const query = 'UPDATE users SET password = ? WHERE id = ?';
    const [result] = await pool.execute(query, [hashedPassword, userId]);
    return result.affectedRows > 0;
  }

  // Update profile image
  static async updateProfileImage(userId, imageUrl) {
    const query = 'UPDATE users SET profile_image = ? WHERE id = ?';
    const [result] = await pool.execute(query, [imageUrl, userId]);
    return result.affectedRows > 0;
  }

  // Get users by chapter
  static async getByChapter(organizationId, chapterName) {
    const query = `
      SELECT id, name, email, role, status, chapter, created_at
      FROM users
      WHERE organization_id = ? AND chapter = ? AND status = 'approved'
      ORDER BY name ASC
    `;
    const [rows] = await pool.execute(query, [organizationId, chapterName]);
    return rows;
  }

  // Get admins by chapter
  static async getAdminsByChapter(organizationId, chapterName) {
    const query = `
      SELECT id, name, email, role, status, chapter, created_at
      FROM users
      WHERE organization_id = ? AND chapter = ? AND role = 'chapter_admin'
      ORDER BY name ASC
    `;
    const [rows] = await pool.execute(query, [organizationId, chapterName]);
    return rows;
  }
  // Get deactivated users for an organization
  static async getDeactivatedByOrganization(organizationId) {
    const query = `
      SELECT id, name, email, contact_number as mobile, status, created_at, 
             first_name, last_name, years_in_business, chapter, profile_image, category_id, plan_id
      FROM users
      WHERE organization_id = ? AND status = 'inactive'
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  // Get deleted users for an organization
  static async getDeletedByOrganization(organizationId) {
    const query = `
      SELECT id, name, email, contact_number as mobile, status, created_at, 
             first_name, last_name, years_in_business, chapter, profile_image
      FROM users
      WHERE organization_id = ? AND status = 'deleted'
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  // Soft delete user (mark as deleted)
  static async softDelete(userId, organizationId) {
    const query = `
      UPDATE users
      SET status = 'deleted'
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await pool.execute(query, [userId, organizationId]);
    return result.affectedRows > 0;
  }

  // Admin update member details
  static async adminUpdateMember(userId, organizationId, data) {
    const query = `
      UPDATE users
      SET name = ?, contact_number = ?, chapter = ?, category_id = ?, plan_id = ?
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await pool.execute(query, [
      data.name,
      data.mobile,
      data.chapter,
      data.categoryId,
      data.planId,
      userId,
      organizationId
    ]);
    return result.affectedRows > 0;
  }

  // Get member counts by chapter
  static async getChapterCounts(organizationId) {
    const query = `
      SELECT chapter, COUNT(*) as count 
      FROM users 
      WHERE organization_id = ? AND status = 'approved' AND chapter IS NOT NULL
      GROUP BY chapter
      ORDER BY count DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  // Get member counts by category
  static async getCategoryCounts(organizationId) {
    const query = `
      SELECT c.name, COUNT(u.id) as count 
      FROM users u
      JOIN member_categories c ON u.category_id = c.id
      WHERE u.organization_id = ? AND u.status = 'approved'
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `;
    const [rows] = await pool.execute(query, [organizationId]);
    return rows;
  }

  // Get detailed member summary with activity counts
  static async getMembersSummary(organizationId, chapter = null) {
    let query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.chapter, u.status, u.created_at,
        u.profile_image,
        mc.name as category_name,
        (SELECT COUNT(*) FROM business_references r WHERE r.user_id = u.id AND (r.referral_flag != '0' OR r.referral_flag IS NULL)) as referral_count,
        (SELECT COUNT(*) FROM meetings m WHERE m.created_by = u.id) as meeting_count,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.user_id = u.id) as event_count,
        (SELECT COUNT(*) FROM training_registrations tr WHERE tr.user_id = u.id) as training_count,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) as post_count
      FROM users u
      LEFT JOIN member_categories mc ON u.category_id = mc.id
      WHERE u.organization_id = ? AND u.status = 'approved'
    `;

    const params = [organizationId];

    if (chapter) {
      query += ` AND u.chapter = ?`;
      params.push(chapter);
    }

    query += ` ORDER BY u.name ASC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}


module.exports = User;
