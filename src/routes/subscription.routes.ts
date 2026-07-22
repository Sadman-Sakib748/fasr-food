import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import {
    getSubscriptionPlans,
    getUserSubscription,
    subscribeToPlan,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    updatePaymentStatus,
    getSubscriptionHistory,
    getSubscriptionStats,
} from '../controllers/subscription.controller';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPER
// ============================================

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('admin')(req as AuthRequest, res, next);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all subscription plans
 * GET /api/subscriptions/plans
 */
router.get('/plans', getSubscriptionPlans);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

router.use(authMiddleware);

/**
 * Get user's current subscription
 * GET /api/subscriptions/me
 */
router.get('/me', getUserSubscription);

/**
 * Subscribe to a plan
 * POST /api/subscriptions/subscribe
 */
router.post(
    '/subscribe',
    validate([
        body('planType').isIn(['premium', 'enterprise']).withMessage('Invalid plan type'),
        body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
    ]),
    subscribeToPlan
);

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
router.post('/cancel', cancelSubscription);

/**
 * Pause subscription
 * POST /api/subscriptions/pause
 */
router.post('/pause', pauseSubscription);

/**
 * Resume subscription
 * POST /api/subscriptions/resume
 */
router.post('/resume', resumeSubscription);

// ============================================
// ADMIN ROUTES
// ============================================

router.use(adminMiddleware);

/**
 * Get subscription history
 * GET /api/subscriptions/history
 */
router.get(
    '/history',
    validate([
        query('userId').optional().isMongoId().withMessage('Invalid user ID'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    getSubscriptionHistory
);

/**
 * Get subscription statistics
 * GET /api/subscriptions/stats
 */
router.get('/stats', getSubscriptionStats);

/**
 * Update payment status (Admin)
 * PUT /api/subscriptions/payment-status
 */
router.put(
    '/payment-status',
    validate([
        body('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
        body('paymentStatus').isIn(['pending', 'completed', 'failed']).withMessage('Invalid payment status'),
    ]),
    updatePaymentStatus
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;