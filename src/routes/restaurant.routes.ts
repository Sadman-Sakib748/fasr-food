import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

// Import controllers
import {
    getRestaurants,
    getRestaurant,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
} from '../controllers/restaurant.controller';

// Import middleware
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { searchLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPERS - FIXED
// ============================================

// ✅ Wrap authenticate to match Express middleware signature
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

// ✅ Wrap authorize for restaurant and admin
const restaurantAdminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('restaurant', 'admin')(req as AuthRequest, res, next);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all restaurants with filters
 * GET /api/restaurants
 */
router.get(
    '/',
    searchLimiter,
    validate([
        query('search').optional().isString().withMessage('Search must be a string'),
        query('cuisine').optional().isString().withMessage('Cuisine must be a string'),
        query('city').optional().isString().withMessage('City must be a string'),
        query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
        query('maxDeliveryTime').optional().isInt({ min: 0 }).withMessage('Delivery time must be a positive integer'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
        query('sortBy').optional().isString().withMessage('Invalid sort field'),
    ]),
    getRestaurants
);

/**
 * Get single restaurant by ID
 * GET /api/restaurants/:id
 */
router.get(
    '/:id',
    validate([param('id').isMongoId().withMessage('Invalid restaurant ID')]),
    getRestaurant
);

// ============================================
// PRIVATE ROUTES (Restaurant Owner or Admin)
// ============================================

/**
 * Create restaurant
 * POST /api/restaurants
 */
router.post(
    '/',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([
        body('restaurantName')
            .notEmpty()
            .withMessage('Restaurant name is required')
            .isLength({ max: 100 })
            .withMessage('Restaurant name cannot exceed 100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters'),
        body('address.street')
            .notEmpty()
            .withMessage('Street address is required'),
        body('address.city')
            .notEmpty()
            .withMessage('City is required'),
        body('address.state')
            .notEmpty()
            .withMessage('State is required'),
        body('address.zipCode')
            .notEmpty()
            .withMessage('Zip code is required'),
        body('address.country')
            .optional()
            .notEmpty()
            .withMessage('Country is required'),
        body('address.coordinates')
            .optional()
            .isArray({ min: 2, max: 2 })
            .withMessage('Coordinates must be an array of [longitude, latitude]'),
        body('phone')
            .notEmpty()
            .withMessage('Phone number is required')
            .isMobilePhone('any')
            .withMessage('Invalid phone number'),
        body('email')
            .isEmail()
            .withMessage('Invalid email address')
            .normalizeEmail(),
        body('cuisineType')
            .optional()
            .isArray()
            .withMessage('Cuisine type must be an array'),
        body('operatingHours')
            .optional()
            .isArray()
            .withMessage('Operating hours must be an array'),
        body('deliveryTime')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Delivery time must be a positive integer'),
        body('deliveryCharge')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Delivery charge must be a positive number'),
        body('minimumOrder')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Minimum order must be a positive number'),
    ]),
    createRestaurant
);

/**
 * Update restaurant
 * PUT /api/restaurants/:id
 */
router.put(
    '/:id',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid restaurant ID'),
        body('restaurantName')
            .optional()
            .notEmpty()
            .withMessage('Restaurant name cannot be empty')
            .isLength({ max: 100 })
            .withMessage('Restaurant name cannot exceed 100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters'),
        body('address.street')
            .optional()
            .notEmpty()
            .withMessage('Street address cannot be empty'),
        body('address.city')
            .optional()
            .notEmpty()
            .withMessage('City cannot be empty'),
        body('phone')
            .optional()
            .isMobilePhone('any')
            .withMessage('Invalid phone number'),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Invalid email address')
            .normalizeEmail(),
        body('deliveryCharge')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Delivery charge must be a positive number'),
        body('minimumOrder')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Minimum order must be a positive number'),
        body('isOpen')
            .optional()
            .isBoolean()
            .withMessage('isOpen must be a boolean'),
    ]),
    updateRestaurant
);

/**
 * Delete restaurant
 * DELETE /api/restaurants/:id
 */
router.delete(
    '/:id',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid restaurant ID')]),
    deleteRestaurant
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;