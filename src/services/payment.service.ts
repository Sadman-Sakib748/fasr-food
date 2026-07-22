import Stripe from 'stripe';
import { Order } from '../models/Order.model';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  // Create a payment intent
  static async createPaymentIntent(orderId: string, customerId: string): Promise<string> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.customer.toString() !== customerId) {
        throw new AppError('Not authorized to pay for this order', 403);
      }

      if (order.paymentStatus === 'completed') {
        throw new AppError('Order already paid', 400);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          customerId: customerId,
        },
      });

      logger.info(`Payment intent created for order ${orderId}`);
      return paymentIntent.client_secret!;
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment
  static async confirmPayment(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      logger.error('Error confirming payment:', error);
      throw error;
    }
  }

  // Handle webhook events
  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orderId = paymentIntent.metadata.orderId;

          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'completed',
          });

          logger.info(`Payment successful for order ${orderId}`);
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orderId = paymentIntent.metadata.orderId;

          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'failed',
          });

          logger.warn(`Payment failed for order ${orderId}`);
          break;
        }

        case 'payment_intent.canceled': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orderId = paymentIntent.metadata.orderId;

          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'refunded',
          });

          logger.info(`Payment cancelled for order ${orderId}`);
          break;
        }

        default:
          logger.info(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling webhook event:', error);
      throw error;
    }
  }

  // Refund payment
  static async refundPayment(orderId: string): Promise<any> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Find the payment intent
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 10,
      });

      const paymentIntent = paymentIntents.data.find(
        (pi) => pi.metadata.orderId === orderId
      );

      if (!paymentIntent) {
        throw new AppError('Payment not found', 404);
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
      });

      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'refunded',
      });

      logger.info(`Refund processed for order ${orderId}`);
      return refund;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }
}

export default PaymentService;