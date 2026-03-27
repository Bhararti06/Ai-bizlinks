const Chapter = require('../models/Chapter');

const getChapters = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const chapters = await Chapter.getAllByOrganization(organizationId);
        res.status(200).json({ success: true, data: chapters });
    } catch (error) {
        next(error);
    }
};

const createChapter = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        // Accept both 'name' and 'chapter_name' for backward compatibility
        const name = req.body.name || req.body.chapter_name;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Chapter name is required' });
        }

        const existing = await Chapter.findByName(name, organizationId);
        if (existing) {
            return res.status(409).json({ success: false, message: 'Chapter name already exists in your organization' });
        }

        const chapterId = await Chapter.create({ ...req.body, organizationId });
        res.status(201).json({ success: true, message: 'Chapter created successfully', data: { id: chapterId } });
    } catch (error) {
        next(error);
    }
};

const updateChapter = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        // Accept both 'name' and 'chapter_name' for backward compatibility
        const name = req.body.name || req.body.chapter_name;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Chapter name is required' });
        }

        const existing = await Chapter.findByName(name, organizationId);
        if (existing && existing.id !== parseInt(id)) {
            return res.status(409).json({ success: false, message: 'Chapter name already exists' });
        }

        const success = await Chapter.update(id, organizationId, req.body);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Chapter not found' });
        }

        res.status(200).json({ success: true, message: 'Chapter updated successfully' });
    } catch (error) {
        next(error);
    }
};

const deleteChapter = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;

        const success = await Chapter.delete(id, organizationId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Chapter not found' });
        }

        res.status(200).json({ success: true, message: 'Chapter deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getChapters,
    createChapter,
    updateChapter,
    deleteChapter
};
