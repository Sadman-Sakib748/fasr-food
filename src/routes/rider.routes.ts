import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

// Import controllers
import {
  getAvailableOrders,
  acceptOrder,
  updateRiderOrderStatus,
  getRiderEarnings,
  getDeliveryHistory,
  updateLocation,
  getRiderStatus,
  getCurrentOrder,
  deliverOrder,
} from '../controllers/rider.controller';

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

// ✅ Wrap authorize for rider
const riderMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  authorize('rider')(req as AuthRequest, res, next);
};

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION AND RIDER ROLE
// ============================================

router.use(authMiddleware);
router.use(riderMiddleware);

// ============================================
// ORDER MANAGEMENT
// ============================================

/**
 * Get available orders for rider
 * GET /api/rider/available-orders
 */
router.get(
  '/available-orders',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('radius').optional().isFloat({ min: 1 }).withMessage('Radius must be at least 1 km'),
  ]),
  getAvailableOrders
);

/**
 * Accept an order for delivery
 * PUT /api/rider/accept-order/:orderId
 */
router.put(
  '/accept-order/:orderId',
  validate([
    param('orderId').isMongoId().withMessage('Invalid order ID'),
    body('estimatedTime').optional().isInt({ min: 1 }).withMessage('Estimated time must be a positive number'),
  ]),
  acceptOrder
);

/**
 * Update order status (rider)
 * PUT /api/rider/order/:orderId/status
 */
router.put(
  '/order/:orderId/status',
  validate([
    param('orderId').isMongoId().withMessage('Invalid order ID'),
    body('orderStatus')
      .isIn(['picked_up', 'in_transit', 'delivered'])
      .withMessage('Invalid order status'),
    body('note').optional().isString().withMessage('Note must be a string'),
  ]),
  updateRiderOrderStatus
);

/**
 * Deliver order (mark as delivered)
 * PUT /api/rider/deliver-order/:orderId
 */
router.put(
  '/deliver-order/:orderId',
  validate([
    param('orderId').isMongoId().withMessage('Invalid order ID'),
    body('deliveryPhoto').optional().isURL().withMessage('Delivery photo must be a valid URL'),
    body('signature').optional().isString().withMessage('Signature must be a string'),
  ]),
  deliverOrder
);

/**
 * Get rider's current active order
 * GET /api/rider/current-order
 */
router.get('/current-order', getCurrentOrder);

// ============================================
// EARNINGS AND HISTORY
// ============================================

/**
 * Get rider earnings
 * GET /api/rider/earnings
 */
router.get(
  '/earnings',
  validate([
    query('period').optional().isIn(['today', 'week', 'month', 'year']).withMessage('Invalid period'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  ]),
  getRiderEarnings
);

/**
 * Get delivery history
 * GET /api/rider/deliveries
 */
router.get(
  '/deliveries',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('status').optional().isIn(['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled']).withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  ]),
  getDeliveryHistory
);

/**
 * Get rider earnings summary
 * GET /api/rider/earnings/summary
 */
router.get(
  '/earnings/summary',
  validate([
    query('period').optional().isIn(['today', 'week', 'month', 'year']).withMessage('Invalid period'),
  ]),
  getRiderEarnings
);

/**
 * Get earning details for a specific delivery
 * GET /api/rider/earnings/:orderId
 */
router.get(
  '/earnings/:orderId',
  validate([param('orderId').isMongoId().withMessage('Invalid order ID')]),
  getRiderEarnings
);

// ============================================
// LOCATION AND STATUS
// ============================================

/**
 * Update rider location
 * PUT /api/rider/location
 */
router.put(
  '/location',
  validate([
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('accuracy')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Accuracy must be a positive number'),
  ]),
  updateLocation
);

/**
 * Get rider status
 * GET /api/rider/status
 */
router.get('/status', getRiderStatus);

/**
 * Update rider availability status
 * PUT /api/rider/availability
 */
router.put(
  '/availability',
  validate([
    body('isAvailable')
      .isBoolean()
      .withMessage('isAvailable must be a boolean'),
    body('reason')
      .optional()
      .isString()
      .withMessage('Reason must be a string'),
  ]),
  // availability controller (add if needed)
  (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
    });
  }
);

/**
 * Get rider analytics
 * GET /api/rider/analytics
 */
router.get(
  '/analytics',
  validate([
    query('period').optional().isIn(['today', 'week', 'month', 'year']).withMessage('Invalid period'),
  ]),
  // analytics controller (add if needed)
  (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      analytics: {
        totalDeliveries: 0,
        totalEarnings: 0,
        averageRating: 0,
        completionRate: 0,
        onTimeRate: 0,
      },
    });
  }
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;