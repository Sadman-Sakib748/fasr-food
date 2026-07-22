import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import {
    getSpecialOffers,
    getSpecialOffer,
    createSpecialOffer,
    updateSpecialOffer,
    deleteSpecialOffer,
    toggleOfferStatus,
    getActiveOffersForRestaurant,
} from '../controllers/specialOffer.controller';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPER
// ============================================

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

const restaurantAdminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('restaurant', 'admin')(req as AuthRequest, res, next);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all special offers
 * GET /api/special-offers
 */
router.get(
    '/',
    validate([
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
        query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    ]),
    getSpecialOffers
);

/**
 * Get single special offer
 * GET /api/special-offers/:id
 */
router.get(
    '/:id',
    validate([param('id').isMongoId().withMessage('Invalid offer ID')]),
    getSpecialOffer
);

/**
 * Get active offers for restaurant
 * GET /api/special-offers/restaurant/:restaurantId/active
 */
router.get(
    '/restaurant/:restaurantId/active',
    validate([param('restaurantId').isMongoId().withMessage('Invalid restaurant ID')]),
    getActiveOffersForRestaurant
);

// ============================================
// PRIVATE ROUTES
// ============================================

/**
 * Create special offer
 * POST /api/special-offers
 */
router.post(
    '/',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([
        body('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
        body('title').notEmpty().withMessage('Title is required'),
        body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
        body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
        body('startDate').isISO8601().withMessage('Invalid start date'),
        body('endDate').isISO8601().withMessage('Invalid end date'),
        body('minimumOrderAmount').optional().isFloat({ min: 0 }).withMessage('Minimum order must be positive'),
        body('description').optional().isString().withMessage('Description must be a string'),
        body('applicableMenuItems').optional().isArray().withMessage('Applicable menu items must be an array'),
    ]),
    createSpecialOffer
);

/**
 * Update special offer
 * PUT /api/special-offers/:id
 */
router.put(
    '/:id',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid offer ID'),
        body('title').optional().notEmpty().withMessage('Title cannot be empty'),
        body('discountType').optional().isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
        body('discountValue').optional().isFloat({ min: 0 }).withMessage('Discount value must be positive'),
        body('startDate').optional().isISO8601().withMessage('Invalid start date'),
        body('endDate').optional().isISO8601().withMessage('Invalid end date'),
        body('minimumOrderAmount').optional().isFloat({ min: 0 }).withMessage('Minimum order must be positive'),
        body('description').optional().isString().withMessage('Description must be a string'),
    ]),
    updateSpecialOffer
);

/**
 * Delete special offer
 * DELETE /api/special-offers/:id
 */
router.delete(
    '/:id',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid offer ID')]),
    deleteSpecialOffer
);

/**
 * Toggle offer status
 * PATCH /api/special-offers/:id/toggle
 */
router.patch(
    '/:id/toggle',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid offer ID')]),
    toggleOfferStatus
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;