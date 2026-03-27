const webpush = require('web-push');
const DeviceToken = require('../models/DeviceToken');
// Ensure it's configured
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:admin@communityportal.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

class PushService {
    static async sendPushToUsers(userIds, payload) {
        if (!userIds || userIds.length === 0) return;
        const tokens = await DeviceToken.getTokensForUsers(userIds);

        if (tokens.length === 0) return;

        const notificationsList = tokens.map(async (tokenRow) => {
            try {
                const sub = typeof tokenRow.subscription === 'string'
                    ? JSON.parse(tokenRow.subscription)
                    : tokenRow.subscription;

                await webpush.sendNotification(sub, JSON.stringify(payload));
            } catch (error) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await DeviceToken.deleteByEndpoint(tokenRow.endpoint);
                } else {
                    console.error('Error sending push notification:', error);
                }
            }
        });

        await Promise.allSettled(notificationsList);
    }
}

module.exports = PushService;
