const { pool } = require('../config/database');
const PushService = require('../services/pushService');
const Organization = require('./Organization');

async function dispatchPush(userIds, organizationId, message, type, data) {
    if (!userIds || userIds.length === 0) return;
    try {
        const org = await Organization.findById(organizationId);
        const subDomain = org ? org.sub_domain : '';

        let logoUrl = '/logo192.png';
        if (org && org.settings) {
            const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
            if (settings.logo) {
                // IMPORTANT: If logo is a base64 string, it can exceed 4KB push limit.
                // We should only use it if it's a URL or a small string.
                if (settings.logo.startsWith('data:image')) {
                    console.log(`[Notification] Base64 logo detected (length: ${settings.logo.length}). Using default icon for push to avoid 4KB limit.`);
                    logoUrl = '/logo192.png';
                } else {
                    logoUrl = settings.logo;
                }
            }
        }

        let targetUrl = `/${subDomain}/dashboard`;
        if (data && data.path) {
            targetUrl = `/${subDomain}${data.path}`;
        } else if (data && data.redirectTo) {
            if (data.redirectTo === 'training_registrations') {
                targetUrl = `/${subDomain}/admin/training`; // Or wherever registrations are viewed
            } else if (data.redirectTo === 'training_list') {
                targetUrl = `/${subDomain}/admin/training`;
            } else if (data.redirectTo.startsWith('/')) {
                targetUrl = data.redirectTo;
            }
        } else if (type === 'training') {
            targetUrl = `/${subDomain}/admin/training`;
        } else if (type === 'meeting') {
            targetUrl = `/${subDomain}/meetings`;
        } else if (type === 'post') {
            targetUrl = `/${subDomain}/userposts`;
        } else if (type === 'event') {
            targetUrl = `/${subDomain}/userposts`;
        } else if (type === 'referral') {
            targetUrl = `/${subDomain}/received-referrals`;
        } else if (type === 'thank_you_note') {
            targetUrl = `/${subDomain}/thank-you-notes`;
        }

        const payload = {
            title: `New ${type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)} Notification`,
            body: message,
            icon: logoUrl,
            data: {
                url: targetUrl,
                ...(data || {})
            }
        };

        await PushService.sendPushToUsers(userIds, payload);
    } catch (err) {
        console.error('Error dispatching push notifications:', err);
    }
}

class Notification {
    static async create(userId, organizationId, message, type, data = null) {
        const [result] = await pool.execute(
            'INSERT INTO notifications (user_id, organization_id, message, type, data) VALUES (?, ?, ?, ?, ?)',
            [userId, organizationId, message, type, data ? JSON.stringify(data) : null]
        );

        dispatchPush([userId], organizationId, message, type, data).catch(console.error);

        return result.insertId;
    }

    static async broadcast(organizationId, message, type, excludeUserId = null, data = null, chapter = null) {
        let insertQuery = 'INSERT INTO notifications (user_id, organization_id, message, type, data) SELECT id, organization_id, ?, ?, ? FROM users WHERE organization_id = ? AND status = "approved"';
        let selectQuery = 'SELECT id FROM users WHERE organization_id = ? AND status = "approved"';

        const insertParams = [message, type, data ? JSON.stringify(data) : null, organizationId];
        const selectParams = [organizationId];

        if (chapter) {
            insertQuery += ' AND chapter = ?';
            selectQuery += ' AND chapter = ?';
            insertParams.push(chapter);
            selectParams.push(chapter);
        }

        if (excludeUserId) {
            insertQuery += ' AND id != ?';
            selectQuery += ' AND id != ?';
            insertParams.push(excludeUserId);
            selectParams.push(excludeUserId);
        }

        const [result] = await pool.execute(insertQuery, insertParams);

        const [usersToNotify] = await pool.execute(selectQuery, selectParams);
        const userIds = usersToNotify.map(u => u.id);

        dispatchPush(userIds, organizationId, message, type, data).catch(() => { });

        return result;
    }

    static async notifyAdmins(organizationId, message, type, data = null) {
        const query = `
            INSERT INTO notifications (user_id, organization_id, message, type, data)
            SELECT id, organization_id, ?, ?, ?
            FROM users 
            WHERE organization_id = ? AND role = 'admin' AND status = 'approved'
        `;
        const params = [message, type, data ? JSON.stringify(data) : null, organizationId];
        const [result] = await pool.execute(query, params);

        const [admins] = await pool.execute('SELECT id FROM users WHERE organization_id = ? AND role = "admin" AND status = "approved"', [organizationId]);
        const userIds = admins.map(u => u.id);
        dispatchPush(userIds, organizationId, message, type, data).catch(console.error);

        return result;
    }

    static async notifyChapterAdmins(organizationId, chapter, message, type, data = null) {
        const query = `
            INSERT INTO notifications (user_id, organization_id, message, type, data)
            SELECT id, organization_id, ?, ?, ?
            FROM users 
            WHERE organization_id = ? AND chapter = ? AND role = 'chapter_admin' AND status = 'approved'
        `;
        const params = [message, type, data ? JSON.stringify(data) : null, organizationId, chapter];
        const [result] = await pool.execute(query, params);

        const [admins] = await pool.execute('SELECT id FROM users WHERE organization_id = ? AND chapter = ? AND role = "chapter_admin" AND status = "approved"', [organizationId, chapter]);
        const userIds = admins.map(u => u.id);
        dispatchPush(userIds, organizationId, message, type, data).catch(console.error);

        return result;
    }

    static async getByUserId(userId) {
        const [rows] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        return rows.map(row => ({
            ...row,
            data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        }));
    }

    static async getUnreadCount(userId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return rows[0].count;
    }

    static async markAsRead(notificationId, userId) {
        const [result] = await pool.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        return result;
    }

    static async markAllAsRead(userId) {
        const [result] = await pool.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [userId]
        );
        return result;
    }
}

module.exports = Notification;
