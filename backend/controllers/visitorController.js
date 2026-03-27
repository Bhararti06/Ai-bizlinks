const Visitor = require('../models/Visitor');

const getVisitors = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const visitors = await Visitor.getByOrganization(organizationId);
        res.status(200).json({ success: true, data: visitors });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getVisitors
};
