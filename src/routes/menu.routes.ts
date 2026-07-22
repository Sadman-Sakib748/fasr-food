import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

// Import controllers
import {
    getMenuItems,
    getMenuItem,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getMenuItemsByCategory,
    toggleMenuItemStatus,
    getRestaurantMenu,
} from '../controllers/menu.controller';

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
const restaurantAdminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('restaurant', 'admin')(req as AuthRequest, res, next);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all menu items with filters
 * GET /api/menu
 */
router.get(
    '/',
    validate([
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
        query('category')
            .optional()
            .isIn(['appetizers', 'mains', 'desserts', 'beverages', 'sides', 'soups', 'salads', 'other'])
            .withMessage('Invalid category'),
        query('search').optional().isString().withMessage('Search must be a string'),
        query('isVegetarian').optional().isBoolean().withMessage('isVegetarian must be a boolean'),
        query('isSpicy').optional().isBoolean().withMessage('isSpicy must be a boolean'),
        query('priceMin').optional().isFloat({ min: 0 }).withMessage('Price minimum must be a positive number'),
        query('priceMax').optional().isFloat({ min: 0 }).withMessage('Price maximum must be a positive number'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    ]),
    getMenuItems
);

/**
 * Get menu items by category
 * GET /api/menu/category/:category
 */
router.get(
    '/category/:category',
    validate([
        param('category')
            .isIn(['appetizers', 'mains', 'desserts', 'beverages', 'sides', 'soups', 'salads', 'other'])
            .withMessage('Invalid category'),
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    ]),
    getMenuItemsByCategory
);

/**
 * Get restaurant menu grouped by categories
 * GET /api/menu/restaurant/:restaurantId
 */
router.get(
    '/restaurant/:restaurantId',
    validate([param('restaurantId').isMongoId().withMessage('Invalid restaurant ID')]),
    getRestaurantMenu
);

/**
 * Get single menu item by ID
 * GET /api/menu/:id
 */
router.get(
    '/:id',
    validate([param('id').isMongoId().withMessage('Invalid menu item ID')]),
    getMenuItem
);

// ============================================
// PRIVATE ROUTES (Restaurant Owner or Admin)
// ============================================

/**
 * Create menu item
 * POST /api/menu
 */
router.post(
    '/',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([
        body('restaurant').isMongoId().withMessage('Invalid restaurant ID'),
        body('name')
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ max: 100 })
            .withMessage('Name cannot exceed 100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters'),
        body('price')
            .isFloat({ min: 0 })
            .withMessage('Price must be a positive number'),
        body('category')
            .isIn(['appetizers', 'mains', 'desserts', 'beverages', 'sides', 'soups', 'salads', 'other'])
            .withMessage('Invalid category'),
        body('isVegetarian').optional().isBoolean().withMessage('isVegetarian must be a boolean'),
        body('isSpicy').optional().isBoolean().withMessage('isSpicy must be a boolean'),
        body('preparationTime')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Preparation time must be a positive integer'),
        body('image').optional().isURL().withMessage('Image must be a valid URL'),
        body('customizations').optional().isArray().withMessage('Customizations must be an array'),
    ]),
    createMenuItem
);

/**
 * Update menu item
 * PUT /api/menu/:id
 */
router.put(
    '/:id',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid menu item ID'),
        body('name').optional().notEmpty().withMessage('Name cannot be empty'),
        body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
        body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        body('category')
            .optional()
            .isIn(['appetizers', 'mains', 'desserts', 'beverages', 'sides', 'soups', 'salads', 'other'])
            .withMessage('Invalid category'),
        body('isVegetarian').optional().isBoolean().withMessage('isVegetarian must be a boolean'),
        body('isSpicy').optional().isBoolean().withMessage('isSpicy must be a boolean'),
        body('preparationTime')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Preparation time must be a positive integer'),
        body('image').optional().isURL().withMessage('Image must be a valid URL'),
        body('customizations').optional().isArray().withMessage('Customizations must be an array'),
    ]),
    updateMenuItem
);

/**
 * Toggle menu item active status
 * PATCH /api/menu/:id/toggle
 */
router.patch(
    '/:id/toggle',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid menu item ID')]),
    toggleMenuItemStatus
);

/**
 * Delete menu item
 * DELETE /api/menu/:id
 */
router.delete(
    '/:id',
    authMiddleware,
    restaurantAdminMiddleware,
    validate([param('id').isMongoId().withMessage('Invalid menu item ID')]),
    deleteMenuItem
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;