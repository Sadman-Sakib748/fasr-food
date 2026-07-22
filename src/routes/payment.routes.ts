import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import express from 'express';

// Import middleware
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

// Import models and utilities
import { Order } from '../models/Order.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import logger from '../utils/logger';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

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

// ✅ Wrap authorize for admin
const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authorize('admin')(req as AuthRequest, res, next);
};

// ============================================
// CREATE PAYMENT INTENT
// ============================================

/**
 * Create a payment intent for an order
 * POST /api/payments/create-payment-intent
 */
router.post(
    '/create-payment-intent',
    authMiddleware,
    customerMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId } = req.body;

        if (!orderId) {
            throw new AppError('Order ID is required', 400);
        }

        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // Check authorization
        if (order.customer.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to pay for this order', 403);
        }

        // Check if already paid
        if (order.paymentStatus === 'completed') {
            throw new AppError('Order already paid', 400);
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(order.totalAmount * 100),
            currency: 'usd',
            metadata: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                customerId: req.user!._id.toString(),
            },
        });

        logger.info(`Payment intent created for order ${orderId}`);

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: order.totalAmount,
            currency: 'usd',
        });
    })
);

// ============================================
// CONFIRM PAYMENT
// ============================================

/**
 * Confirm a payment
 * POST /api/payments/confirm-payment
 */
router.post(
    '/confirm-payment',
    authMiddleware,
    customerMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            throw new AppError('Payment intent ID is required', 400);
        }

        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            const orderId = paymentIntent.metadata?.orderId;
            
            if (orderId) {
                await Order.findByIdAndUpdate(orderId, {
                    paymentStatus: 'completed',
                });
                logger.info(`Payment confirmed for order ${orderId}`);
            }

            res.status(200).json({
                success: true,
                message: 'Payment confirmed successfully',
                paymentStatus: paymentIntent.status,
            });
        } else {
            res.status(400).json({
                success: false,
                message: `Payment status: ${paymentIntent.status}`,
                paymentStatus: paymentIntent.status,
            });
        }
    })
);

// ============================================
// STRIPE WEBHOOK
// ============================================

/**
 * Handle Stripe webhook events
 * POST /api/payments/webhook
 */
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    asyncHandler(async (req: Request, res: Response) => {
        const sig = req.headers['stripe-signature'] as string;

        if (!sig) {
            logger.error('No Stripe signature found in headers');
            res.status(400).json({
                success: false,
                message: 'No Stripe signature found',
            });
            return;
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            logger.error('Webhook signature verification failed:', errorMessage);
            res.status(400).send(`Webhook Error: ${errorMessage}`);
            return;
        }

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const orderId = paymentIntent.metadata?.orderId;

                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'completed',
                    });
                    logger.info(`✅ Payment successful for order ${orderId}`);
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const orderId = paymentIntent.metadata?.orderId;

                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'failed',
                    });
                    logger.warn(`❌ Payment failed for order ${orderId}`);
                }
                break;
            }

            case 'payment_intent.canceled': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const orderId = paymentIntent.metadata?.orderId;

                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'refunded',
                    });
                    logger.info(`🔄 Payment cancelled for order ${orderId}`);
                }
                break;
            }

            case 'charge.succeeded': {
                const charge = event.data.object as Stripe.Charge;
                logger.info(`💳 Charge succeeded: ${charge.id}`);
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                logger.info(`💰 Charge refunded: ${charge.id}`);
                break;
            }

            default:
                logger.info(`📌 Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    })
);

// ============================================
// GET PAYMENT STATUS
// ============================================

/**
 * Get payment status for an order
 * GET /api/payments/status/:orderId
 */
router.get(
    '/status/:orderId',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // Check authorization
        const isAuthorized =
            order.customer.toString() === req.user!._id.toString() ||
            req.user!.role === 'admin';

        if (!isAuthorized) {
            throw new AppError('Not authorized to view this payment', 403);
        }

        res.status(200).json({
            success: true,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            totalAmount: order.totalAmount,
            orderNumber: order.orderNumber,
        });
    })
);

// ============================================
// REFUND PAYMENT - FIXED
// ============================================

/**
 * Refund a payment (Admin only)
 * POST /api/payments/refund
 */
router.post(
    '/refund',
    authMiddleware,
    adminMiddleware, // ✅ FIXED: Using wrapped middleware
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId, amount, reason } = req.body;

        if (!orderId) {
            throw new AppError('Order ID is required', 400);
        }

        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        if (order.paymentStatus !== 'completed') {
            throw new AppError('Order is not paid', 400);
        }

        // Find the payment intent
        const paymentIntents = await stripe.paymentIntents.list({
            limit: 10,
        });

        const paymentIntent = paymentIntents.data.find(
            (pi) => pi.metadata?.orderId === orderId
        );

        if (!paymentIntent) {
            throw new AppError('Payment not found', 404);
        }

        // Create refund
        const refundAmount = amount ? Math.round(amount * 100) : undefined;
        
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            amount: refundAmount,
            reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
            metadata: {
                orderId: orderId,
                refundedBy: req.user!._id.toString(),
            },
        });

        // Update order status
        if (refund.status === 'succeeded') {
            await Order.findByIdAndUpdate(orderId, {
                paymentStatus: 'refunded',
            });
            logger.info(`Refund processed for order ${orderId}`);
        }

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refund,
        });
    })
);

// ============================================
// GET PAYMENT METHODS
// ============================================

/**
 * Get available payment methods
 * GET /api/payments/methods
 */
router.get(
    '/methods',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        res.status(200).json({
            success: true,
            methods: [
                {
                    id: 'stripe',
                    name: 'Credit Card / Debit Card',
                    icon: 'stripe',
                    enabled: true,
                },
                {
                    id: 'bkash',
                    name: 'bKash',
                    icon: 'bkash',
                    enabled: !!process.env.BKASH_APP_KEY,
                },
                {
                    id: 'cod',
                    name: 'Cash on Delivery',
                    icon: 'cash',
                    enabled: true,
                },
            ],
        });
    })
);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;