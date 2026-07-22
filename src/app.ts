// app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import blogRoutes from './routes/blog.routes';
import reviewRoutes from './routes/review.routes';
import riderRoutes from './routes/rider.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Import utils
import logger from './utils/logger';

const app: Application = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
export const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());

// Apply rate limiting to API routes
app.use('/api', limiter);

// ============================================
// ✅ ROOT ROUTE (সবার আগে)
// ============================================
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: '🚀 Welcome to FastFeast API Server',
        version: '1.0.0',
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            root: '/',
            api: '/api',
            health: '/health',
            auth: '/api/auth',
            restaurants: '/api/restaurants',
            menu: '/api/menu',
            orders: '/api/orders',
            blog: '/api/blog',
            reviews: '/api/reviews',
            rider: '/api/rider',
            admin: '/api/admin',
            payments: '/api/payments',
        },
        documentation: 'https://github.com/yourusername/fastfeast-backend',
        support: 'support@fastfeast.com'
    });
});

// ============================================
// HEALTH CHECK ROUTES
// ============================================
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    });
});

app.get('/api', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to FastFeast API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            restaurants: '/api/restaurants',
            menu: '/api/menu',
            orders: '/api/orders',
            blog: '/api/blog',
            reviews: '/api/reviews',
            rider: '/api/rider',
            admin: '/api/admin',
            payments: '/api/payments',
        },
        documentation: 'https://github.com/yourusername/fastfeast-backend'
    });
});

// ============================================
// ✅ AUTH ROUTES - FIRST (সবার আগে)
// ============================================
app.use('/api/auth', authRoutes);

// ============================================
// OTHER ROUTES
// ============================================
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// ============================================
// ✅ FIXED: CATCH-ALL 404 HANDLER (সব রাউটের শেষে)
// ============================================
app.use(notFoundHandler);

// ============================================
// ✅ GLOBAL ERROR HANDLER (একদম শেষে)
// ============================================
app.use(errorHandler);

// ============================================
// SOCKET.IO CONNECTION HANDLING
// ============================================

io.on('connection', (socket) => {
    logger.info(`🔌 New client connected: ${socket.id}`);

    // Join order room
    socket.on('join-order', (orderId: string) => {
        socket.join(`order-${orderId}`);
        logger.info(`📦 Socket ${socket.id} joined order ${orderId}`);
    });

    // Leave order room
    socket.on('leave-order', (orderId: string) => {
        socket.leave(`order-${orderId}`);
        logger.info(`📦 Socket ${socket.id} left order ${orderId}`);
    });

    // Join user room
    socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        logger.info(`👤 Socket ${socket.id} joined user ${userId}`);
    });

    // Join restaurant room
    socket.on('join-restaurant', (restaurantId: string) => {
        socket.join(`restaurant-${restaurantId}`);
        logger.info(`🏪 Socket ${socket.id} joined restaurant ${restaurantId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
        logger.error(`❌ Socket error for ${socket.id}:`, error);
    });
});

export { server };
export default app;