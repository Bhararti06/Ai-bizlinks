const File = require('../models/File');
const fs = require('fs');
const path = require('path');

const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { organizationId, userId } = req.user;
        const { originalname, filename, size, mimetype } = req.file;

        // Create DB record
        // Storing relative path or full? usually relative to public/ or root.
        // req.file.path is usually full temp path or dest path.
        // Assuming destination is public/uploads/files/
        const relativePath = `/uploads/files/${filename}`;

        const fileId = await File.create(
            organizationId,
            userId,
            originalname,
            relativePath,
            path.extname(originalname).substring(1), // type (extension without dot)
            size
        );

        const newFile = await File.findById(fileId);

        res.status(201).json({
            success: true,
            data: newFile
        });
    } catch (error) {
        next(error);
    }
};

const getFiles = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const files = await File.getByOrganization(organizationId);

        // Map to format suitable for frontend if needed, or frontend adapts
        // Frontend expects: { id, name, type, size, date, uploadBy }
        // We will transform in frontend or here. Let's send raw data.

        res.status(200).json({
            success: true,
            data: files
        });
    } catch (error) {
        next(error);
    }
};

const deleteFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId, userId, role } = req.user;

        const file = await File.findById(id);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Authorization: Only uploader or Admin can delete? 
        // Assuming Admin can delete any, Member can delete own.
        if (role !== 'admin' && file.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Delete from DB
        await File.delete(id);

        // Delete from FS
        const filePath = path.join(__dirname, '../../public', file.path); // Adjust path resolution
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadFile,
    getFiles,
    deleteFile
};
