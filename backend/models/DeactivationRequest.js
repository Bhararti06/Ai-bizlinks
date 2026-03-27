const { pool } = require('../config/database');

class DeactivationRequest {
    /**
     * Create a new deactivation request
     */
    static async create(organizationId, userId, requestedBy, reason = null) {
        const query = `
            INSERT INTO deactivation_requests (organization_id, user_id, requested_by, reason, status)
            VALUES (?, ?, ?, ?, 'pending')
        `;
        const [result] = await pool.execute(query, [organizationId, userId, requestedBy, reason]);
        return result.insertId;
    }

    /**
     * Get all deactivation requests for an organization
     */
    static async findByOrganization(organizationId, status = null) {
        let query = `
            SELECT 
                dr.*,
                u.name as user_name,
                u.email as user_email,
                u.profile_image as user_profile_image,
                u.chapter as user_chapter,
                u.contact_number as user_contact_number,
                requester.name as requested_by_name,
                requester.chapter as requested_by_chapter,
                reviewer.name as reviewed_by_name
            FROM deactivation_requests dr
            JOIN users u ON dr.user_id = u.id
            JOIN users requester ON dr.requested_by = requester.id
            LEFT JOIN users reviewer ON dr.reviewed_by = reviewer.id
            WHERE dr.organization_id = ?
        `;

        const params = [organizationId];

        if (status) {
            query += ' AND dr.status = ?';
            params.push(status);
        }

        query += ' ORDER BY dr.created_at DESC';

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async getPending(organizationId) {
        return this.findByOrganization(organizationId, 'pending');
    }

    /**
     * Get a single deactivation request by ID
     */
    static async findById(id) {
        const query = `
            SELECT 
                dr.*,
                u.name as user_name,
                u.email as user_email,
                requester.name as requested_by_name
            FROM deactivation_requests dr
            JOIN users u ON dr.user_id = u.id
            JOIN users requester ON dr.requested_by = requester.id
            WHERE dr.id = ?
        `;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    /**
     * Approve a deactivation request and deactivate the user
     */
    static async approve(id, reviewedBy) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Get the request details
            const [requests] = await connection.execute(
                'SELECT user_id FROM deactivation_requests WHERE id = ? AND status = "pending"',
                [id]
            );

            if (requests.length === 0) {
                throw new Error('Deactivation request not found or already processed');
            }

            const { user_id } = requests[0];

            // Update the request status
            await connection.execute(
                `UPDATE deactivation_requests 
                 SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() 
                 WHERE id = ?`,
                [reviewedBy, id]
            );

            // Deactivate the user
            await connection.execute(
                'UPDATE users SET status = "inactive" WHERE id = ?',
                [user_id]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Reject a deactivation request
     */
    static async reject(id, reviewedBy) {
        const query = `
            UPDATE deactivation_requests 
            SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW() 
            WHERE id = ? AND status = 'pending'
        `;
        const [result] = await pool.execute(query, [reviewedBy, id]);

        if (result.affectedRows === 0) {
            throw new Error('Deactivation request not found or already processed');
        }

        return true;
    }

    /**
     * Get count of pending deactivation requests
     */
    static async getPendingCount(organizationId) {
        const query = `
            SELECT COUNT(*) as count 
            FROM deactivation_requests 
            WHERE organization_id = ? AND status = 'pending'
        `;
        const [rows] = await pool.execute(query, [organizationId]);
        return rows[0].count;
    }

    /**
     * Check if there's already a pending request for a user
     */
    static async hasPendingRequest(userId) {
        const query = `
            SELECT id 
            FROM deactivation_requests 
            WHERE user_id = ? AND status = 'pending'
            LIMIT 1
        `;
        const [rows] = await pool.execute(query, [userId]);
        return rows.length > 0;
    }
}

module.exports = DeactivationRequest;
