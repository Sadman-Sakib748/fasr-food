import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

// Import middleware
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

// Import controllers
import {
    // User Management
    getUsers,
    getUser,
    updateUserStatus,
    updateUserRole,
    updateUser,
    deleteUser,
    
    // Restaurant Management
    getRestaurants,
    getRestaurant,
    verifyRestaurant,
    updateRestaurantStatus,
    deleteRestaurant,
    
    // Order Management
    getAllOrders,
    getOrder,
    updateOrderStatus,
    
    // Blog Management
    getBlogs,
    getBlog,
    createBlog,
    updateBlog,
    deleteBlog,
    updateBlogStatus,
    
    // Review Management
    getReviews,
    getReview,
    updateReviewStatus,
    deleteReview,
    getReviewStats,
    
    // Dashboard & Stats
    getDashboardStats,
    getRevenueStats,
} from '../controllers/admin.controller';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPER FOR AUTH
// ============================================

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('admin')(req as AuthRequest, res, next);
};

// ============================================
// ALL ADMIN ROUTES - Authentication Required
// ============================================

router.use(authMiddleware);
router.use(adminMiddleware);

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

/**
 * Get all users with pagination and filters
 * GET /api/admin/users
 */
router.get(
    '/users',
    validate([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('role').optional().isIn(['customer', 'restaurant', 'rider', 'admin', 'moderator']).withMessage('Invalid role'),
        query('status').optional().isIn(['active', 'inactive', 'banned']).withMessage('Invalid status'),
        query('search').optional().isString().withMessage('Search must be a string'),
    ]),
    getUsers
);

/**
 * Get single user by ID
 * GET /api/admin/users/:id
 */
router.get(
    '/users/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid user ID'),
    ]),
    getUser
);

/**
 * Update user status (active/inactive/banned)
 * PUT /api/admin/users/:id/status
 */
router.put(
    '/users/:id/status',
    validate([
        param('id').isMongoId().withMessage('Invalid user ID'),
        body('status').isIn(['active', 'inactive', 'banned']).withMessage('Invalid status'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    updateUserStatus
);

/**
 * Update user role
 * PUT /api/admin/users/:id/role
 */
router.put(
    '/users/:id/role',
    validate([
        param('id').isMongoId().withMessage('Invalid user ID'),
        body('role')
            .isIn(['customer', 'restaurant', 'rider', 'admin', 'moderator'])
            .withMessage('Invalid role. Must be: customer, restaurant, rider, admin, or moderator'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    updateUserRole
);

/**
 * Update user (status and/or role together)
 * PUT /api/admin/users/:id
 */
router.put(
    '/users/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid user ID'),
        body('status')
            .optional()
            .isIn(['active', 'inactive', 'banned'])
            .withMessage('Invalid status'),
        body('role')
            .optional()
            .isIn(['customer', 'restaurant', 'rider', 'admin', 'moderator'])
            .withMessage('Invalid role'),
        body('name').optional().isString().withMessage('Name must be a string'),
        body('phone').optional().isString().withMessage('Phone must be a string'),
        body('address').optional().isObject().withMessage('Address must be an object'),
    ]),
    updateUser
);

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
router.delete(
    '/users/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid user ID'),
    ]),
    deleteUser
);

// ============================================
// RESTAURANT MANAGEMENT ROUTES
// ============================================

/**
 * Get all restaurants with pagination and filters
 * GET /api/admin/restaurants
 */
router.get(
    '/restaurants',
    validate([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
        query('search').optional().isString().withMessage('Search must be a string'),
        query('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean'),
        query('cuisine').optional().isString().withMessage('Cuisine must be a string'),
    ]),
    getRestaurants
);

/**
 * Get single restaurant by ID
 * GET /api/admin/restaurants/:id
 */
router.get(
    '/restaurants/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid restaurant ID'),
    ]),
    getRestaurant
);

/**
 * Verify restaurant
 * PUT /api/admin/restaurants/:id/verify
 */
router.put(
    '/restaurants/:id/verify',
    validate([
        param('id').isMongoId().withMessage('Invalid restaurant ID'),
    ]),
    verifyRestaurant
);

/**
 * Update restaurant status (active/inactive/suspended)
 * PUT /api/admin/restaurants/:id/status
 */
router.put(
    '/restaurants/:id/status',
    validate([
        param('id').isMongoId().withMessage('Invalid restaurant ID'),
        body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    updateRestaurantStatus
);

/**
 * Delete restaurant
 * DELETE /api/admin/restaurants/:id
 */
router.delete(
    '/restaurants/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid restaurant ID'),
    ]),
    deleteRestaurant
);

// ============================================
// ORDER MANAGEMENT ROUTES
// ============================================

/**
 * Get all orders with pagination and filters
 * GET /api/admin/orders
 */
router.get(
    '/orders',
    validate([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('status')
            .optional()
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
            .withMessage('Invalid order status'),
        query('paymentStatus')
            .optional()
            .isIn(['pending', 'completed', 'failed', 'refunded'])
            .withMessage('Invalid payment status'),
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
        query('customerId').optional().isMongoId().withMessage('Invalid customer ID'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    ]),
    getAllOrders
);

/**
 * Get single order by ID
 * GET /api/admin/orders/:id
 */
router.get(
    '/orders/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid order ID'),
    ]),
    getOrder
);

/**
 * Update order status
 * PUT /api/admin/orders/:id/status
 */
router.put(
    '/orders/:id/status',
    validate([
        param('id').isMongoId().withMessage('Invalid order ID'),
        body('status')
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
            .withMessage('Invalid order status'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    updateOrderStatus
);

// ============================================
// BLOG MANAGEMENT ROUTES
// ============================================

/**
 * Get all blogs with pagination and filters
 * GET /api/admin/blogs
 */
router.get(
    '/blogs',
    validate([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
        query('category').optional().isString().withMessage('Category must be a string'),
        query('search').optional().isString().withMessage('Search must be a string'),
        query('author').optional().isMongoId().withMessage('Invalid author ID'),
    ]),
    getBlogs
);

/**
 * Get single blog by ID
 * GET /api/admin/blogs/:id
 */
router.get(
    '/blogs/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid blog ID'),
    ]),
    getBlog
);

/**
 * Create blog
 * POST /api/admin/blogs
 */
router.post(
    '/blogs',
    validate([
        body('title').notEmpty().withMessage('Title is required'),
        body('content').notEmpty().withMessage('Content is required'),
        body('category').notEmpty().withMessage('Category is required'),
        body('excerpt').optional().isString().withMessage('Excerpt must be a string'),
        body('tags').optional().isArray().withMessage('Tags must be an array'),
        body('image').optional().isURL().withMessage('Image must be a valid URL'),
        body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    ]),
    createBlog
);

/**
 * Update blog
 * PUT /api/admin/blogs/:id
 */
router.put(
    '/blogs/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid blog ID'),
        body('title').optional().isString().withMessage('Title must be a string'),
        body('content').optional().isString().withMessage('Content must be a string'),
        body('category').optional().isString().withMessage('Category must be a string'),
        body('excerpt').optional().isString().withMessage('Excerpt must be a string'),
        body('tags').optional().isArray().withMessage('Tags must be an array'),
        body('image').optional().isURL().withMessage('Image must be a valid URL'),
        body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    ]),
    updateBlog
);

/**
 * Update blog status
 * PUT /api/admin/blogs/:id/status
 */
router.put(
    '/blogs/:id/status',
    validate([
        param('id').isMongoId().withMessage('Invalid blog ID'),
        body('status').isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    updateBlogStatus
);

/**
 * Delete blog
 * DELETE /api/admin/blogs/:id
 */
router.delete(
    '/blogs/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid blog ID'),
    ]),
    deleteBlog
);

// ============================================
// REVIEW MANAGEMENT ROUTES
// ============================================

/**
 * Get all reviews with pagination and filters
 * GET /api/admin/reviews
 */
router.get(
    '/reviews',
    validate([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        query('status').optional().isIn(['active', 'hidden', 'flagged']).withMessage('Invalid status'),
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
        query('userId').optional().isMongoId().withMessage('Invalid user ID'),
        query('search').optional().isString().withMessage('Search must be a string'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    ]),
    getReviews
);

/**
 * Get single review by ID
 * GET /api/admin/reviews/:id
 */
router.get(
    '/reviews/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid review ID'),
    ]),
    getReview
);

/**
 * Update review status
 * PUT /api/admin/reviews/:id/status
 */
router.put(
    '/reviews/:id/status',
    validate([
        param('id').isMongoId().withMessage('Invalid review ID'),
        body('status').isIn(['active', 'hidden', 'flagged']).withMessage('Invalid status'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    updateReviewStatus
);

/**
 * Delete review
 * DELETE /api/admin/reviews/:id
 */
router.delete(
    '/reviews/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid review ID'),
    ]),
    deleteReview
);

/**
 * Get review statistics
 * GET /api/admin/reviews/stats
 */
router.get(
    '/reviews/stats',
    validate([
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    ]),
    getReviewStats
);

// ============================================
// DASHBOARD STATS ROUTES
// ============================================

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
router.get(
    '/stats',
    validate([
        query('period').optional().isIn(['today', 'week', 'month', 'year']).withMessage('Invalid period'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    ]),
    getDashboardStats
);

/**
 * Get revenue statistics
 * GET /api/admin/revenue
 */
router.get(
    '/revenue',
    validate([
        query('period').optional().isIn(['today', 'week', 'month', 'year']).withMessage('Invalid period'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
        query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
    ]),
    getRevenueStats
);

// ============================================
// DEBUG: Log all routes (optional)
// ============================================

if (process.env.NODE_ENV === 'development') {
    console.log('\n🔍 Admin Routes Registered:');
    router.stack.forEach((layer: any) => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            console.log(`  ${methods} /api/admin${layer.route.path}`);
        }
    });
    console.log(`✅ Total admin routes: ${router.stack.filter((l: any) => l.route).length}\n`);
}

// ============================================
// EXPORT ROUTER
// ============================================

export default router;