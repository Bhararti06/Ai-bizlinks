const MemberCategory = require('../models/MemberCategory');
const MembershipPlan = require('../models/MembershipPlan');

// Member Categories Controllers
exports.getCategories = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const categories = await MemberCategory.getByOrg(organizationId);
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        // Accept both 'name' and 'category_name' for backward compatibility
        const name = req.body.name || req.body.category_name;
        const { description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const exists = await MemberCategory.exists(organizationId, name);
        if (exists) {
            return res.status(409).json({ success: false, message: 'Category name already exists' });
        }

        const categoryId = await MemberCategory.create(organizationId, name, description);
        res.status(201).json({ success: true, data: { id: categoryId, name, description } });
    } catch (error) {
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        // Accept both 'name' and 'category_name' for backward compatibility
        const name = req.body.name || req.body.category_name;
        const { description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const category = await MemberCategory.findById(id, organizationId);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const exists = await MemberCategory.exists(organizationId, name, id);
        if (exists) {
            return res.status(409).json({ success: false, message: 'Category name already exists' });
        }

        await MemberCategory.update(id, organizationId, name, description);
        res.status(200).json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;

        const success = await MemberCategory.delete(id, organizationId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Membership Plans Controllers
exports.getPlans = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const plans = await MembershipPlan.getByOrg(organizationId);
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        next(error);
    }
};

exports.createPlan = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { name, description, fees, benefits } = req.body;

        if (!name || fees === undefined) {
            return res.status(400).json({ success: false, message: 'Plan name and fees are required' });
        }

        const exists = await MembershipPlan.exists(organizationId, name);
        if (exists) {
            return res.status(409).json({ success: false, message: 'Plan name already exists' });
        }

        const planId = await MembershipPlan.create(organizationId, name, description, fees, benefits);
        res.status(201).json({ success: true, data: { id: planId, name, description, fees, benefits } });
    } catch (error) {
        next(error);
    }
};

exports.updatePlan = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const { name, description, fees, benefits } = req.body;

        if (!name || fees === undefined) {
            return res.status(400).json({ success: false, message: 'Plan name and fees are required' });
        }

        const plan = await MembershipPlan.findById(id, organizationId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        const exists = await MembershipPlan.exists(organizationId, name, id);
        if (exists) {
            return res.status(409).json({ success: false, message: 'Plan name already exists' });
        }

        await MembershipPlan.update(id, organizationId, name, description, fees, benefits);
        res.status(200).json({ success: true, message: 'Plan updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.deletePlan = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;

        const success = await MembershipPlan.delete(id, organizationId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.status(200).json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) {
        next(error);
    }
};
