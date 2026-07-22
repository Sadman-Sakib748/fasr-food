import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { body, param } from 'express-validator';
import {
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
    refundPayment,
    getPaymentMethods,
    stripeWebhook,
} from '../controllers/payment.controller';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPER
// ============================================

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

const customerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('customer')(req as AuthRequest, res, next);
};

const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('admin')(req as AuthRequest, res, next);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Stripe webhook
 * POST /api/payments/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * Get payment methods
 * GET /api/payments/methods
 */
router.get('/methods', authMiddleware, getPaymentMethods);

/**
 * Create payment intent
 * POST /api/payments/create-payment-intent
 */
router.post(
    '/create-payment-intent',
    authMiddleware,
    customerMiddleware,
    validate([
        body('orderId').isMongoId().withMessage('Invalid order ID'),
    ]),
    createPaymentIntent
);

/**
 * Confirm payment
 * POST /api/payments/confirm-payment
 */
router.post(
    '/confirm-payment',
    authMiddleware,
    customerMiddleware,
    validate([
        body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
    ]),
    confirmPayment
);

/**
 * Get payment status
 * GET /api/payments/status/:orderId
 */
router.get(
    '/status/:orderId',
    authMiddleware,
    validate([
        param('orderId').isMongoId().withMessage('Invalid order ID'),
    ]),
    getPaymentStatus
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * Refund payment (Admin only)
 * POST /api/payments/refund
 */
router.post(
    '/refund',
    authMiddleware,
    adminMiddleware,
    validate([
        body('orderId').isMongoId().withMessage('Invalid order ID'),
        body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
        body('reason').optional().isString().withMessage('Reason must be a string'),
    ]),
    refundPayment
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;