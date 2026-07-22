import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import {
    getConversations,
    getConversation,
    createOrGetConversation,
    getMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    deleteConversation,
    getUnreadCount,
} from '../controllers/conversation.controller';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ============================================
// MIDDLEWARE WRAPPER
// ============================================

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req as AuthRequest, res, next);
};

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(authMiddleware);

// ============================================
// CONVERSATION ROUTES
// ============================================

/**
 * Get all conversations for current user
 * GET /api/conversations
 */
router.get(
    '/',
    validate([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
        query('type').optional().isIn(['individual', 'group', 'order']).withMessage('Invalid conversation type'),
    ]),
    getConversations
);

/**
 * Get single conversation
 * GET /api/conversations/:id
 */
router.get(
    '/:id',
    validate([param('id').isMongoId().withMessage('Invalid conversation ID')]),
    getConversation
);

/**
 * Create or get conversation
 * POST /api/conversations
 */
router.post(
    '/',
    validate([
        body('participantId').isMongoId().withMessage('Invalid participant ID'),
        body('type').optional().isIn(['individual', 'group', 'order']).withMessage('Invalid conversation type'),
        body('orderId').optional().isMongoId().withMessage('Invalid order ID'),
    ]),
    createOrGetConversation
);

/**
 * Delete conversation
 * DELETE /api/conversations/:id
 */
router.delete(
    '/:id',
    validate([param('id').isMongoId().withMessage('Invalid conversation ID')]),
    deleteConversation
);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * Get messages for conversation
 * GET /api/conversations/:id/messages
 */
router.get(
    '/:id/messages',
    validate([
        param('id').isMongoId().withMessage('Invalid conversation ID'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    getMessages
);

/**
 * Send message
 * POST /api/conversations/:id/messages
 */
router.post(
    '/:id/messages',
    validate([
        param('id').isMongoId().withMessage('Invalid conversation ID'),
        body('content').optional().isString().withMessage('Content must be a string'),
        body('messageType').optional().isIn(['text', 'image', 'file', 'location', 'order_update']).withMessage('Invalid message type'),
        body('attachmentUrl').optional().isURL().withMessage('Invalid attachment URL'),
        body('replyToId').optional().isMongoId().withMessage('Invalid reply to ID'),
        body('metadata').optional().isObject().withMessage('Metadata must be an object'),
    ]),
    // ✅ FIXED: Proper middleware with return in all paths
    (req: Request, res: Response, next: NextFunction): void => {
        const { content, attachmentUrl } = req.body;
        if (!content && !attachmentUrl) {
            res.status(400).json({
                success: false,
                message: 'Either content or attachment is required',
            });
            return; // ✅ Return to stop execution
        }
        next(); // ✅ Call next to continue
    },
    sendMessage
);

/**
 * Mark messages as read
 * PUT /api/conversations/:id/read
 */
router.put(
    '/:id/read',
    validate([param('id').isMongoId().withMessage('Invalid conversation ID')]),
    markAsRead
);

/**
 * Delete message
 * DELETE /api/messages/:messageId
 */
router.delete(
    '/messages/:messageId',
    validate([param('messageId').isMongoId().withMessage('Invalid message ID')]),
    deleteMessage
);

// ============================================
// UNREAD COUNT
// ============================================

/**
 * Get unread message count
 * GET /api/conversations/unread/count
 */
router.get('/unread/count', getUnreadCount);

// ============================================
// EXPORT ROUTER
// ============================================

export default router;