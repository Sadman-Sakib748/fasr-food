    import multer from 'multer';
    import path from 'path';
    import { Request, Response, NextFunction } from 'express';
    import { AppError } from './error.middleware';
    import logger from '../utils/logger';

    // ============================================
    // TYPE DEFINITIONS
    // ============================================

    interface MulterRequest extends Request {
        file?: Express.Multer.File;
        files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }

    // ============================================
    // CONFIGURE STORAGE
    // ============================================

    const storage = multer.memoryStorage();

    // ============================================
    // FILE FILTER
    // ============================================

    const fileFilter = (
        req: Request,
        file: Express.Multer.File,
        cb: multer.FileFilterCallback
    ): void => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new AppError(
                'Only image files are allowed (jpeg, jpg, png, gif, webp, svg)',
                400
            ));
        }
    };

    // ============================================
    // CREATE MULTER INSTANCE
    // ============================================

    export const upload = multer({
        storage: storage,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
            files: 10, // Maximum 10 files
        },
        fileFilter: fileFilter,
    });

    // ============================================
    // SINGLE FILE UPLOAD
    // ============================================

    /**
     * Upload a single file
     * @param fieldName - The field name for the file (default: 'image')
     * @returns Multer middleware
     * 
     * @example
     * router.post('/upload', uploadSingle('avatar'), controller);
     */
    export const uploadSingle = (fieldName: string = 'image') => {
        return upload.single(fieldName);
    };

    // ============================================
    // MULTIPLE FILE UPLOAD
    // ============================================

    /**
     * Upload multiple files
     * @param maxCount - Maximum number of files (default: 5)
     * @returns Multer middleware
     * 
     * @example
     * router.post('/upload', uploadMultiple(3), controller);
     */
    export const uploadMultiple = (maxCount: number = 5) => {
        return upload.array('files', maxCount);
    };

    // ============================================
    // MULTIPLE FIELDS UPLOAD
    // ============================================

    /**
     * Upload files with different field names
     * @param fields - Array of field configurations
     * @returns Multer middleware
     * 
     * @example
     * router.post('/upload', uploadFields([
     *   { name: 'avatar', maxCount: 1 },
     *   { name: 'gallery', maxCount: 5 }
     * ]), controller);
     */
    export const uploadFields = (fields: { name: string; maxCount?: number }[]) => {
        return upload.fields(fields);
    };

    // ============================================
    // MULTER ERROR HANDLER - FIXED
    // ============================================

    /**
     * Error handler for multer errors
     * @param err - The error object
     * @param req - Express request
     * @param res - Express response
     * @param next - Express next function
     * 
     * @example
     * app.use(handleUploadError);
     */
    export const handleUploadError = (
        err: any,
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        // ✅ FIXED: Use multer.MulterError type check
        if (err instanceof multer.MulterError) {
            logger.error(`Multer Error: ${err.code} - ${err.message}`);

            // ✅ FIXED: Use type assertion or check error codes properly
            const errorCode = err.code as string;

            // Common multer error codes
            const errorMessages: Record<string, string> = {
                'LIMIT_FILE_SIZE': 'File size limit exceeded. Maximum size is 5MB.',
                'LIMIT_FILE_COUNT': 'Too many files uploaded.',
                'LIMIT_UNEXPECTED_FILE': `Unexpected file field: ${err.field || 'unknown'}`,
                'LIMIT_FIELD_KEY': 'Invalid field name.',
                'LIMIT_FIELD_VALUE': 'Invalid field value.',
                'LIMIT_FIELD_COUNT': 'Too many fields.',
                'LIMIT_PART_COUNT': 'Too many parts.',
            };

            // Get error message or use default
            const message = errorMessages[errorCode] || err.message || 'Upload error occurred.';

            res.status(400).json({
                success: false,
                message: message,
                code: errorCode,
                ...(process.env.NODE_ENV === 'development' && { field: err.field }),
            });
            return;
        }

        // If it's our custom AppError, pass to error handler
        if (err instanceof AppError) {
            next(err);
            return;
        }

        // ✅ FIXED: Pass other errors to the next error handler
        next(err);
    };

    // ============================================
    // CLOUDINARY UPLOAD HELPER (Optional)
    // ============================================

    /**
     * Upload file to Cloudinary (if configured)
     * @param file - The file buffer
     * @param options - Cloudinary options
     * @returns Upload result
     */
    export const uploadToCloudinary = async (
        file: Express.Multer.File,
        options: {
            folder?: string;
            public_id?: string;
            width?: number;
            height?: number;
            crop?: string;
        } = {}
    ): Promise<any> => {
        try {
            // Check if Cloudinary is configured
            const cloudinary = require('cloudinary').v2;
            
            if (!cloudinary.config().cloud_name) {
                throw new AppError('Cloudinary is not configured', 500);
            }

            // Convert buffer to base64
            const base64String = file.buffer.toString('base64');
            const dataUri = `data:${file.mimetype};base64,${base64String}`;

            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(dataUri, {
                folder: options.folder || 'fastfeast',
                public_id: options.public_id,
                transformation: [
                    {
                        width: options.width || 800,
                        height: options.height || 800,
                        crop: options.crop || 'limit',
                        quality: 'auto',
                    },
                ],
            });

            logger.info(`File uploaded to Cloudinary: ${result.public_id}`);
            return result;
        } catch (error) {
            logger.error('Cloudinary upload error:', error);
            throw new AppError('Failed to upload file to cloud storage', 500);
        }
    };

    // ============================================
    // GET FILE URL HELPERS
    // ============================================

    /**
     * Get the URL of an uploaded file
     * @param publicId - The public ID of the file
     * @param options - Transformation options
     * @returns The file URL
     */
    export const getFileUrl = (
        publicId: string,
        options: {
            width?: number;
            height?: number;
            crop?: string;
            format?: string;
        } = {}
    ): string => {
        try {
            const cloudinary = require('cloudinary').v2;
            
            if (!cloudinary.config().cloud_name) {
                throw new AppError('Cloudinary is not configured', 500);
            }

            return cloudinary.url(publicId, {
                width: options.width || 800,
                height: options.height || 800,
                crop: options.crop || 'limit',
                format: options.format || 'auto',
                quality: 'auto',
            });
        } catch (error) {
            logger.error('Error generating file URL:', error);
            return publicId;
        }
    };

    // ============================================
    // VALIDATE FILE TYPE
    // ============================================

    /**
     * Validate file type
     * @param file - The file to validate
     * @param allowedTypes - Array of allowed MIME types
     * @returns Boolean indicating if file is valid
     */
    export const isValidFileType = (
        file: Express.Multer.File,
        allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    ): boolean => {
        return allowedTypes.includes(file.mimetype);
    };

    // ============================================
    // GET FILE EXTENSION
    // ============================================

    /**
     * Get file extension from filename
     * @param filename - The filename
     * @returns The extension (without dot)
     */
    export const getFileExtension = (filename: string): string => {
        return path.extname(filename).toLowerCase().substring(1);
    };

    // ============================================
    // GENERATE UNIQUE FILENAME
    // ============================================

    /**
     * Generate a unique filename
     * @param originalName - Original filename
     * @returns Unique filename
     */
    export const generateUniqueFilename = (originalName: string): string => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = getFileExtension(originalName);
        return `${timestamp}-${random}.${extension}`;
    };

    // ============================================
    // MULTER ERROR CODES REFERENCE
    // ============================================

    /**
     * List of all multer error codes for reference
     */
    export const MULTER_ERROR_CODES = {
        LIMIT_PART_COUNT: 'Too many parts',
        LIMIT_FILE_SIZE: 'File too large',
        LIMIT_FILE_COUNT: 'Too many files',
        LIMIT_FIELD_KEY: 'Field name invalid',
        LIMIT_FIELD_VALUE: 'Field value invalid',
        LIMIT_FIELD_COUNT: 'Too many fields',
        LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    };

    // ============================================
    // EXPORT ALL
    // ============================================

    export default {
        upload,
        uploadSingle,
        uploadMultiple,
        uploadFields,
        handleUploadError,
        uploadToCloudinary,
        getFileUrl,
        isValidFileType,
        getFileExtension,
        generateUniqueFilename,
        MULTER_ERROR_CODES,
    };