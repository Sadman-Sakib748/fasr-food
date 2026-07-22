import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

// Import controllers
import {
    getOrders,
    getOrder,
    createOrder,
    updateOrderStatus,
    assignRider,
    cancelOrder,
    getOrderStats,
    getOrderByNumber,
    getRiderOrders,
    getCustomerOrders,
    getRestaurantOrders,
} from '../controllers/order.controller';

// Import middleware
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { orderLimiter } from '../middleware/rateLimiter.middleware';

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

// ✅ Wrap authorize for restaurant and admin
const restaurantAdminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('restaurant', 'admin')(req as AuthRequest, res, next);
};

// ✅ Wrap authorize for rider
const riderMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('rider')(req as AuthRequest, res, next);
};

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(authMiddleware);

// ============================================
// GET ORDERS (Role-based)
// ============================================

/**
 * Get orders based on user role
 * GET /api/orders
 */
router.get(
    '/',
    validate([
        query('status')
            .optional()
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
            .withMessage('Invalid order status'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    getOrders
);

// ============================================
// GET ORDER BY ID
// ============================================

/**
 * Get single order by ID
 * GET /api/orders/:id
 */
router.get(
    '/:id',
    validate([param('id').isMongoId().withMessage('Invalid order ID')]),
    getOrder
);

// ============================================
// GET ORDER BY ORDER NUMBER
// ============================================

/**
 * Get order by order number
 * GET /api/orders/number/:orderNumber
 */
router.get(
    '/number/:orderNumber',
    validate([
        param('orderNumber').notEmpty().withMessage('Order number is required'),
    ]),
    getOrderByNumber
);

// ============================================
// GET ORDER STATISTICS (Restaurant)
// ============================================

/**
 * Get order statistics for restaurant
 * GET /api/orders/stats
 */
router.get(
    '/stats',
    restaurantAdminMiddleware,
    getOrderStats
);

// ============================================
// GET RIDER ORDERS
// ============================================

/**
 * Get orders for rider
 * GET /api/orders/rider
 */
router.get(
    '/rider',
    riderMiddleware,  // ✅ FIXED: Using wrapped middleware
    validate([
        query('status')
            .optional()
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
            .withMessage('Invalid order status'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    getRiderOrders
);

// ============================================
// GET CUSTOMER ORDERS
// ============================================

/**
 * Get orders for customer
 * GET /api/orders/customer
 */
router.get(
    '/customer',
    customerMiddleware,
    validate([
        query('status')
            .optional()
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
            .withMessage('Invalid order status'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    getCustomerOrders
);

// ============================================
// GET RESTAURANT ORDERS
// ============================================

/**
 * Get orders for restaurant
 * GET /api/orders/restaurant
 */
router.get(
    '/restaurant',
    restaurantAdminMiddleware,
    validate([
        query('status')
            .optional()
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
            .withMessage('Invalid order status'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    getRestaurantOrders
);

// ============================================
// CREATE ORDER (Customer only)
// ============================================

/**
 * Create new order
 * POST /api/orders
 */
router.post(
    '/',
    customerMiddleware,
    orderLimiter,
    validate([
        body('restaurant').isMongoId().withMessage('Invalid restaurant ID'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.menuItem').isMongoId().withMessage('Invalid menu item ID'),
        body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('items.*.customizations').optional().isArray().withMessage('Customizations must be an array'),
        body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
        body('deliveryAddress.city').notEmpty().withMessage('City is required'),
        body('deliveryAddress.state').notEmpty().withMessage('State is required'),
        body('deliveryAddress.zipCode').notEmpty().withMessage('Zip code is required'),
        body('deliveryAddress.country').optional().notEmpty().withMessage('Country is required'),
        body('paymentMethod')
            .isIn(['stripe', 'bkash', 'cod'])
            .withMessage('Invalid payment method'),
        body('specialInstructions').optional().isString().withMessage('Special instructions must be a string'),
    ]),
    createOrder
);

// ============================================
// UPDATE ORDER STATUS
// ============================================

/**
 * Update order status (Restaurant/Rider/Admin)
 * PUT /api/orders/:id/status
 */
router.put(
    '/:id/status',
    validate([
        param('id').isMongoId().withMessage('Invalid order ID'),
        body('orderStatus')
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
            .withMessage('Invalid order status'),
        body('note').optional().isString().withMessage('Note must be a string'),
    ]),
    updateOrderStatus
);

// ============================================
// ASSIGN RIDER TO ORDER
// ============================================

/**
 * Assign rider to order (Restaurant/Admin)
 * PUT /api/orders/:id/assign-rider
 */
router.put(
    '/:id/assign-rider',
    restaurantAdminMiddleware,
    validate([
        param('id').isMongoId().withMessage('Invalid order ID'),
        body('riderId').isMongoId().withMessage('Invalid rider ID'),
    ]),
    assignRider
);

// ============================================
// CANCEL ORDER
// ============================================

/**
 * Cancel order (Customer/Restaurant/Admin)
 * PUT /api/orders/:id/cancel
 */
router.put(
    '/:id/cancel',
    validate([
        param('id').isMongoId().withMessage('Invalid order ID'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    cancelOrder
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;