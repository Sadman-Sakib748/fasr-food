import { Request, Response } from 'express';
import Stripe from 'stripe';
import { Order } from '../models/Order.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

// ============================================
// CREATE PAYMENT INTENT
// ============================================
export const createPaymentIntent = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { orderId } = req.body;

        if (!orderId) {
            throw new AppError('Order ID is required', 400);
        }

        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

        if (order.customer.toString() !== req.user!._id.toString()) {
            throw new AppError('Not authorized to pay for this order', 403);
        }

        if (order.paymentStatus === 'completed') {
            throw new AppError('Order already paid', 400);
        }

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
    }
);

// ============================================
// CONFIRM PAYMENT
// ============================================
export const confirmPayment = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            throw new AppError('Payment intent ID is required', 400);
        }

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
    }
);

// ============================================
// GET PAYMENT STATUS
// ============================================
export const getPaymentStatus = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }

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
    }
);

// ============================================
// REFUND PAYMENT
// ============================================
export const refundPayment = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
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

        const paymentIntents = await stripe.paymentIntents.list({ limit: 10 });
        const paymentIntent = paymentIntents.data.find(
            (pi) => pi.metadata?.orderId === orderId
        );

        if (!paymentIntent) {
            throw new AppError('Payment not found', 404);
        }

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

        if (refund.status === 'succeeded') {
            await Order.findByIdAndUpdate(orderId, { paymentStatus: 'refunded' });
            logger.info(`Refund processed for order ${orderId}`);
        }

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refund,
        });
    }
);

// ============================================
// GET PAYMENT METHODS
// ============================================
export const getPaymentMethods = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        res.status(200).json({
            success: true,
            methods: [
                {
                    id: 'stripe',
                    name: 'Credit / Debit Card',
                    icon: '💳',
                    enabled: true,
                },
                {
                    id: 'bkash',
                    name: 'bKash',
                    icon: '📱',
                    enabled: !!process.env.BKASH_APP_KEY,
                },
                {
                    id: 'cod',
                    name: 'Cash on Delivery',
                    icon: '💵',
                    enabled: true,
                },
            ],
        });
    }
);

// ============================================
// STRIPE WEBHOOK
// ============================================
export const stripeWebhook = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const sig = req.headers['stripe-signature'] as string;

        if (!sig) {
            res.status(400).json({ success: false, message: 'No Stripe signature' });
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
                    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'completed' });
                    logger.info(`✅ Payment successful for order ${orderId}`);
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const orderId = paymentIntent.metadata?.orderId;
                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
                    logger.warn(`❌ Payment failed for order ${orderId}`);
                }
                break;
            }
            case 'payment_intent.canceled': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const orderId = paymentIntent.metadata?.orderId;
                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'refunded' });
                    logger.info(`🔄 Payment cancelled for order ${orderId}`);
                }
                break;
            }
            default:
                logger.info(`📌 Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    }
);

export default {
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
    refundPayment,
    getPaymentMethods,
    stripeWebhook,
};