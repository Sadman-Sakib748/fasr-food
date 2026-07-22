import nodemailer from 'nodemailer';
import logger from './logger';

let transporter: nodemailer.Transporter;

export const initEmailTransporter = (): void => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    logger.info('✅ Email transporter initialized');
  }
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  try {
    initEmailTransporter();

    const mailOptions = {
      from: `"FastFeast" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    await transporter.sendMail(mailOptions);
    logger.info(`📧 Email sent to ${to}`);
  } catch (error) {
    logger.error('❌ Error sending email:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (user: any): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
        .button { display: inline-block; background: #ff6b35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to FastFeast! 🍕</h1>
        </div>
        <div class="content">
          <h2>Dear ${user.name},</h2>
          <p>Thank you for joining FastFeast! We're excited to have you on board.</p>
          <p>Start exploring delicious food from your favorite restaurants today!</p>
          <p>
            <a href="${process.env.CLIENT_URL}/restaurants" class="button">Browse Restaurants</a>
          </p>
          <p>Happy eating! 🍔🌮🍕</p>
          <p>- The FastFeast Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FastFeast. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(user.email, 'Welcome to FastFeast!', html);
};

export const sendOrderConfirmation = async (order: any): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-details { background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .footer { background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
        .button { display: inline-block; background: #ff6b35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation 🎉</h1>
        </div>
        <div class="content">
          <h2>Dear ${order.customer.name},</h2>
          <p>Your order has been placed successfully!</p>
          <div class="order-details">
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
            <p><strong>Estimated Delivery:</strong> ${order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleString() : 'Calculating...'}</p>
          </div>
          <p>
            <a href="${process.env.CLIENT_URL}/orders/${order._id}" class="button">Track Order</a>
          </p>
          <p>Thank you for ordering with FastFeast!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FastFeast. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(order.customer.email, `Order Confirmation #${order.orderNumber}`, html);
};

export const sendOrderStatusUpdate = async (order: any, status: string): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .status-box { background: #e8f5e9; padding: 15px; border-radius: 5px; text-align: center; }
        .footer { background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
        .button { display: inline-block; background: #ff6b35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Status Update 📦</h1>
        </div>
        <div class="content">
          <h2>Dear ${order.customer.name},</h2>
          <p>Your order status has been updated!</p>
          <div class="status-box">
            <h3>Status: ${status.toUpperCase()}</h3>
            <p>Order #${order.orderNumber}</p>
          </div>
          <p>
            <a href="${process.env.CLIENT_URL}/orders/${order._id}" class="button">Track Order</a>
          </p>
          <p>Thank you for choosing FastFeast!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FastFeast. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(order.customer.email, `Order ${status} - #${order.orderNumber}`, html);
};

export const sendPasswordResetEmail = async (user: any, resetToken: string): Promise<void> => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
        .button { display: inline-block; background: #ff6b35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset 🔑</h1>
        </div>
        <div class="content">
          <h2>Dear ${user.name},</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <p>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p>- The FastFeast Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FastFeast. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(user.email, 'Password Reset Request', html);
};

export default {
  initEmailTransporter,
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPasswordResetEmail,
};