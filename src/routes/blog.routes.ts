import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

// Import controllers
import {
    getBlogs,
    getBlogBySlug,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    addComment,
    deleteComment,
    togglePublishStatus,
    toggleLikeBlog,
    getBlogCategories,
    getPopularBlogs,
} from '../controllers/blog.controller';

// Import middleware
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPERS
// ============================================

// ✅ FIXED: Wrap authenticate to match Express middleware signature
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

// ✅ FIXED: Wrap authorize to match Express middleware signature
const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('admin')(req as AuthRequest, res, next);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all published blogs with filters
 * GET /api/blog
 */
router.get(
    '/',
    validate([
        query('category')
            .optional()
            .isIn(['food', 'health', 'lifestyle', 'recipes', 'tips', 'news'])
            .withMessage('Invalid category'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
        query('search').optional().isString().withMessage('Search must be a string'),
        query('tag').optional().isString().withMessage('Tag must be a string'),
    ]),
    getBlogs
);

/**
 * Get single blog by slug
 * GET /api/blog/slug/:slug
 */
router.get('/slug/:slug', getBlogBySlug);

/**
 * Get blog categories with counts
 * GET /api/blog/categories
 */
router.get('/categories', getBlogCategories);

/**
 * Get popular blogs
 * GET /api/blog/popular
 */
router.get(
    '/popular',
    validate([
        query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
    ]),
    getPopularBlogs
);

// ============================================
// PRIVATE ROUTES (Admin Only)
// ============================================

/**
 * Get single blog by ID (Admin)
 * GET /api/blog/:id
 */
router.get(
    '/:id',
    authMiddleware,
    adminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid blog ID')]),
    getBlogById
);

/**
 * Create new blog (Admin)
 * POST /api/blog
 */
router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    validate([
        body('title').notEmpty().withMessage('Title is required'),
        body('content').notEmpty().withMessage('Content is required'),
        body('excerpt').notEmpty().withMessage('Excerpt is required'),
        body('category')
            .isIn(['food', 'health', 'lifestyle', 'recipes', 'tips', 'news'])
            .withMessage('Invalid category'),
        body('tags').optional().isArray().withMessage('Tags must be an array'),
        body('featuredImage').optional().isURL().withMessage('Featured image must be a valid URL'),
        body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    ]),
    createBlog
);

/**
 * Update blog (Admin)
 * PUT /api/blog/:id
 */
router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid blog ID'),
        body('title').optional().notEmpty().withMessage('Title cannot be empty'),
        body('content').optional().notEmpty().withMessage('Content cannot be empty'),
        body('excerpt').optional().notEmpty().withMessage('Excerpt cannot be empty'),
        body('category')
            .optional()
            .isIn(['food', 'health', 'lifestyle', 'recipes', 'tips', 'news'])
            .withMessage('Invalid category'),
        body('tags').optional().isArray().withMessage('Tags must be an array'),
        body('featuredImage').optional().isURL().withMessage('Featured image must be a valid URL'),
        body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    ]),
    updateBlog
);

/**
 * Delete blog (Admin)
 * DELETE /api/blog/:id
 */
router.delete(
    '/:id',
    authMiddleware,
    adminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid blog ID')]),
    deleteBlog
);

/**
 * Toggle blog publish status (Admin)
 * PATCH /api/blog/:id/toggle
 */
router.patch(
    '/:id/toggle',
    authMiddleware,
    adminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid blog ID')]),
    togglePublishStatus
);

// ============================================
// COMMENTS ROUTES
// ============================================

/**
 * Add comment to blog (Authenticated users)
 * POST /api/blog/:id/comments
 */
router.post(
    '/:id/comments',
    authMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid blog ID'),
        body('content')
            .notEmpty()
            .withMessage('Comment content is required')
            .isLength({ min: 3, max: 500 })
            .withMessage('Comment must be between 3 and 500 characters'),
    ]),
    addComment
);

/**
 * Delete comment from blog (Admin or Comment owner)
 * DELETE /api/blog/:id/comments/:commentId
 */
router.delete(
    '/:id/comments/:commentId',
    authMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid blog ID'),
        param('commentId').isMongoId().withMessage('Invalid comment ID'),
    ]),
    deleteComment
);

// ============================================
// LIKES ROUTES
// ============================================

/**
 * Like a blog (Authenticated users)
 * POST /api/blog/:id/like
 */
router.post(
    '/:id/like',
    authMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid blog ID')]),
    toggleLikeBlog
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;