// routes/auth.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';

// Import controllers
import {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    logout,
    refreshToken,
} from '../controllers/auth.controller';

// Import middleware
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// ============================================
// ✅ MIDDLEWARE WRAPPER
// ============================================

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

// ============================================
// ✅ PUBLIC ROUTES (কোনো authentication লাগে না)
// ============================================

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post(
    '/register',
    validate([
        body('name')
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ max: 50 })
            .withMessage('Name cannot exceed 50 characters'),
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain at least one number'),
        body('phone')
            .optional()
            .isMobilePhone('any')
            .withMessage('Invalid phone number'),
        body('role')
            .optional()
            .isIn(['customer', 'restaurant', 'rider'])
            .withMessage('Invalid role'),
    ]),
    register
);

/**
 * Login user
 * POST /api/auth/login
 */
router.post(
    '/login',
    validate([
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
    ]),
    login
);

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
router.post(
    '/forgot-password',
    validate([
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
    ]),
    forgotPassword
);

/**
 * Reset password
 * POST /api/auth/reset-password
 */
router.post(
    '/reset-password',
    validate([
        body('token')
            .notEmpty()
            .withMessage('Reset token is required'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain at least one number'),
        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.newPassword) {
                    throw new Error('Passwords do not match');
                }
                return true;
            }),
    ]),
    resetPassword
);

// ============================================
// ✅ PRIVATE ROUTES (Authentication required)
// ============================================

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, getMe);

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put(
    '/profile',
    authMiddleware,
    validate([
        body('name')
            .optional()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),
        body('phone')
            .optional()
            .isMobilePhone('any')
            .withMessage('Invalid phone number'),
        body('address')
            .optional()
            .isObject()
            .withMessage('Address must be an object'),
        body('preferences')
            .optional()
            .isObject()
            .withMessage('Preferences must be an object'),
        body('avatar')
            .optional()
            .isURL()
            .withMessage('Avatar must be a valid URL'),
    ]),
    updateProfile
);

/**
 * Change password
 * PUT /api/auth/change-password
 */
router.put(
    '/change-password',
    authMiddleware,
    validate([
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('New password must be at least 6 characters')
            .matches(/\d/)
            .withMessage('New password must contain at least one number')
            .custom((value, { req }) => {
                if (value === req.body.currentPassword) {
                    throw new Error('New password must be different from current password');
                }
                return true;
            }),
        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.newPassword) {
                    throw new Error('Passwords do not match');
                }
                return true;
            }),
    ]),
    changePassword
);

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, logout);

/**
 * Refresh token
 * POST /api/auth/refresh-token
 */
router.post('/refresh-token', authMiddleware, refreshToken);

export default router;