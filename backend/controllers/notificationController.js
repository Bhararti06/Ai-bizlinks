const Notification = require('../models/Notification');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const notifications = await Notification.getByUserId(userId);
        const unreadCount = await Notification.getUnreadCount(userId);

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount
            }
        });
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        await Notification.markAsRead(id, userId);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await Notification.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};
