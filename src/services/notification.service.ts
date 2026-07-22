import nodemailer from 'nodemailer';
import { io } from '../app';
import logger from '../utils/logger';
import { IOrder } from '../models/Order.model';

export class NotificationService {
  private static transporter: nodemailer.Transporter;

  // Initialize email transporter
  static initEmailTransporter(): void {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info('Email transporter initialized');
    }
  }

  // Send email
  static async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      this.initEmailTransporter();

      const mailOptions = {
        from: `"FastFeast" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  // Send order confirmation email
  static async sendOrderConfirmationEmail(order: any): Promise<void> {
    const html = `
      <h1>Order Confirmation</h1>
      <p>Dear ${order.customer.name},</p>
      <p>Your order has been placed successfully!</p>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
      <p><strong>Status:</strong> ${order.orderStatus}</p>
      <p>Thank you for ordering with FastFeast!</p>
    `;

    await this.sendEmail(order.customer.email, 'Order Confirmation', html);
  }

  // Send order status update email
  static async sendOrderStatusUpdateEmail(order: any, status: string): Promise<void> {
    const html = `
      <h1>Order Status Update</h1>
      <p>Dear ${order.customer.name},</p>
      <p>Your order <strong>${order.orderNumber}</strong> is now <strong>${status}</strong>.</p>
      <p>Track your order in real-time on the FastFeast app.</p>
      <p>Thank you for choosing FastFeast!</p>
    `;

    await this.sendEmail(order.customer.email, `Order ${status}`, html);
  }

  // Send welcome email
  static async sendWelcomeEmail(user: any): Promise<void> {
    const html = `
      <h1>Welcome to FastFeast!</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for joining FastFeast! We're excited to have you on board.</p>
      <p>Start exploring delicious food from your favorite restaurants today!</p>
      <p>Happy eating!</p>
    `;

    await this.sendEmail(user.email, 'Welcome to FastFeast', html);
  }

  // Send real-time notification via Socket.io
  static sendSocketNotification(room: string, event: string, data: any): void {
    try {
      io.to(room).emit(event, data);
      logger.info(`Socket notification sent to ${room}: ${event}`);
    } catch (error) {
      logger.error('Error sending socket notification:', error);
    }
  }

  // Notify restaurant of new order
  static notifyRestaurantNewOrder(order: any): void {
    this.sendSocketNotification(`restaurant-${order.restaurant._id}`, 'new-order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      totalAmount: order.totalAmount,
      items: order.items,
    });
  }

  // Notify customer of order status update
  static notifyCustomerOrderUpdate(order: any, status: string): void {
    this.sendSocketNotification(`order-${order._id}`, 'order-updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: status,
      timestamp: new Date(),
    });

    this.sendSocketNotification(`user-${order.customer._id}`, 'order-update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: status,
      timestamp: new Date(),
    });
  }

  // Notify rider of new delivery assignment
  static notifyRiderNewDelivery(order: any, riderId: string): void {
    this.sendSocketNotification(`user-${riderId}`, 'new-delivery', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      restaurant: order.restaurant.restaurantName,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
    });
  }
}

export default NotificationService;