import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

// Import controllers
import {
    getReviews,
    getReview,
    createReview,
    updateReview,
    deleteReview,
    markHelpful,
    markUnhelpful,
} from '../controllers/review.controller';

// Import middleware
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPERS - FIXED
// ============================================

// ✅ Wrap authenticate to match Express middleware signature
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

// ✅ Wrap authorize for customer
const customerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('customer')(req as AuthRequest, res, next);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all reviews with filters
 * GET /api/reviews
 */
router.get(
    '/',
    validate([
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
        query('menuItemId').optional().isMongoId().withMessage('Invalid menu item ID'),
        query('riderId').optional().isMongoId().withMessage('Invalid rider ID'),
        query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
        query('sortBy').optional().isString().withMessage('Invalid sort field'),
    ]),
    getReviews
);

/**
 * Get single review by ID
 * GET /api/reviews/:id
 */
router.get(
    '/:id',
    validate([param('id').isMongoId().withMessage('Invalid review ID')]),
    getReview
);

// ============================================
// PRIVATE ROUTES
// ============================================

/**
 * Create review
 * POST /api/reviews
 */
router.post(
    '/',
    authMiddleware,
    customerMiddleware,
    validate([
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('comment')
            .notEmpty()
            .withMessage('Comment is required')
            .isLength({ max: 500 })
            .withMessage('Comment cannot exceed 500 characters'),
        body('reviewType')
            .isIn(['restaurant', 'menuItem', 'rider'])
            .withMessage('Invalid review type'),
        body('restaurant')
            .optional()
            .custom((value, { req }) => {
                if (req.body.reviewType === 'restaurant' && !value) {
                    throw new Error('Restaurant ID is required for restaurant review');
                }
                return true;
            })
            .isMongoId()
            .withMessage('Invalid restaurant ID'),
        body('menuItem')
            .optional()
            .custom((value, { req }) => {
                if (req.body.reviewType === 'menuItem' && !value) {
                    throw new Error('Menu item ID is required for menu item review');
                }
                return true;
            })
            .isMongoId()
            .withMessage('Invalid menu item ID'),
        body('rider')
            .optional()
            .custom((value, { req }) => {
                if (req.body.reviewType === 'rider' && !value) {
                    throw new Error('Rider ID is required for rider review');
                }
                return true;
            })
            .isMongoId()
            .withMessage('Invalid rider ID'),
    ]),
    createReview
);

/**
 * Update review
 * PUT /api/reviews/:id
 */
router.put(
    '/:id',
    authMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid review ID'),
        body('rating')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('comment')
            .optional()
            .notEmpty()
            .withMessage('Comment cannot be empty')
            .isLength({ max: 500 })
            .withMessage('Comment cannot exceed 500 characters'),
    ]),
    updateReview
);

/**
 * Delete review
 * DELETE /api/reviews/:id
 */
router.delete(
    '/:id',
    authMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid review ID')]),
    deleteReview
);

/**
 * Mark review as helpful
 * PUT /api/reviews/:id/helpful
 */
router.put(
    '/:id/helpful',
    authMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid review ID')]),
    markHelpful
);

/**
 * Mark review as unhelpful
 * PUT /api/reviews/:id/unhelpful
 */
router.put(
    '/:id/unhelpful',
    authMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid review ID')]),
    markUnhelpful
);

// ============================================
// GET REVIEWS FOR A SPECIFIC TARGET
// ============================================

/**
 * Get reviews for a restaurant
 * GET /api/reviews/restaurant/:restaurantId
 */
router.get(
    '/restaurant/:restaurantId',
    validate([
        param('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
        query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    ]),
    getReviews
);

/**
 * Get reviews for a menu item
 * GET /api/reviews/menu-item/:menuItemId
 */
router.get(
    '/menu-item/:menuItemId',
    validate([
        param('menuItemId').isMongoId().withMessage('Invalid menu item ID'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    ]),
    getReviews
);

/**
 * Get reviews for a rider
 * GET /api/reviews/rider/:riderId
 */
router.get(
    '/rider/:riderId',
    validate([
        param('riderId').isMongoId().withMessage('Invalid rider ID'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    ]),
    getReviews
);

// ============================================
// GET REVIEW STATISTICS
// ============================================

/**
 * Get review statistics for a target
 * GET /api/reviews/stats/:targetType/:targetId
 */
router.get(
    '/stats/:targetType/:targetId',
    validate([
        param('targetType').isIn(['restaurant', 'menuItem', 'rider']).withMessage('Invalid target type'),
        param('targetId').isMongoId().withMessage('Invalid target ID'),
    ]),
    getReviews
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;