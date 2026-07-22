import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Message } from '../models/Message.model';
import { Conversation } from '../models/Conversation.model';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import { io } from '../app';

// ============================================
// GET ALL CONVERSATIONS FOR USER
// ============================================
export const getConversations = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { page = 1, limit = 20, type } = req.query;

        const query: any = {
            participants: { $in: [req.user!._id] },
            isActive: true,
        };

        if (type) {
            query.type = type;
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        try {
            const [conversations, total] = await Promise.all([
                Conversation.find(query)
                    .populate('participants', 'name avatar role status')
                    .populate('lastMessage.sender', 'name avatar')
                    .populate('orderId', 'orderNumber totalAmount orderStatus')
                    .populate('metadata.restaurantId', 'restaurantName logo')
                    .populate('metadata.customerId', 'name avatar')
                    .populate('metadata.riderId', 'name avatar')
                    .sort({ lastMessageTime: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                Conversation.countDocuments(query),
            ]);

            logger.info(`✅ Conversations fetched for user: ${req.user!.email}`);

            res.status(200).json({
                success: true,
                count: conversations.length,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum),
                },
                conversations,
            });
        } catch (error) {
            logger.error(`❌ Error fetching conversations for ${req.user!.email}:`, error);
            throw error;
        }
    }
);

// ============================================
// GET SINGLE CONVERSATION
// ============================================
export const getConversation = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const conversation = await Conversation.findById(req.params.id)
                .populate('participants', 'name avatar role status')
                .populate('orderId', 'orderNumber totalAmount orderStatus')
                .populate('metadata.restaurantId', 'restaurantName logo')
                .populate('metadata.customerId', 'name avatar')
                .populate('metadata.riderId', 'name avatar');

            if (!conversation) {
                logger.warn(`❌ Conversation not found: ${req.params.id}`);
                throw new AppError('Conversation not found', 404);
            }

            const isParticipant = conversation.participants.some(
                (p: any) => p._id.toString() === req.user!._id.toString()
            );

            if (!isParticipant) {
                logger.warn(`❌ User ${req.user!.email} not authorized to view conversation ${req.params.id}`);
                throw new AppError('Not authorized to view this conversation', 403);
            }

            logger.info(`✅ Conversation fetched: ${req.params.id} for user: ${req.user!.email}`);

            res.status(200).json({
                success: true,
                conversation,
            });
        } catch (error) {
            logger.error(`❌ Error fetching conversation ${req.params.id}:`, error);
            throw error;
        }
    }
);

// ============================================
// CREATE OR GET CONVERSATION
// ============================================
export const createOrGetConversation = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { participantId, type, orderId } = req.body;

        if (!participantId) {
            throw new AppError('Participant ID is required', 400);
        }

        try {
            const participant = await User.findById(participantId);
            if (!participant) {
                throw new AppError('Participant not found', 404);
            }

            let conversation = await Conversation.findOne({
                participants: { $all: [req.user!._id, participantId] },
                type: type || 'individual',
                isActive: true,
            });

            if (!conversation) {
                const participants = [req.user!._id, participantId];

                const participantDetails = await Promise.all(
                    participants.map(async (p) => {
                        const user = await User.findById(p).select('name avatar role');
                        return {
                            _id: user?._id,
                            name: user?.name || 'Unknown',
                            avatar: user?.avatar || '',
                            role: user?.role || 'customer',
                        };
                    })
                );

                const conversationData: any = {
                    participants,
                    participantDetails,
                    type: type || 'individual',
                    metadata: {},
                };

                if (orderId) {
                    const order = await Order.findById(orderId);
                    if (order) {
                        conversationData.orderId = orderId;
                        conversationData.metadata.orderNumber = order.orderNumber;
                        conversationData.metadata.restaurantId = order.restaurant;
                        conversationData.metadata.customerId = order.customer;
                        conversationData.type = 'order';
                    }
                }

                conversation = await Conversation.create(conversationData);
                logger.info(`✅ New conversation created between ${req.user!.email} and ${participant.email}`);
            }

            // Mark messages as read
            await Message.updateMany(
                {
                    conversationId: conversation._id,
                    receiver: req.user!._id,
                    isRead: false,
                },
                {
                    $set: { isRead: true },
                    $push: {
                        readBy: {
                            userId: req.user!._id,
                            readAt: new Date(),
                        },
                    },
                }
            );

            const unreadCount = await Message.countDocuments({
                conversationId: conversation._id,
                receiver: req.user!._id,
                isRead: false,
            });
            conversation.unreadCount = unreadCount;
            await conversation.save();

            res.status(200).json({
                success: true,
                conversation,
            });
        } catch (error) {
            logger.error(`❌ Error creating conversation for user ${req.user!.email}:`, error);
            throw error;
        }
    }
);

// ============================================
// GET MESSAGES FOR CONVERSATION
// ============================================
export const getMessages = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { page = 1, limit = 50 } = req.query;

        try {
            const conversation = await Conversation.findById(req.params.id);
            if (!conversation) {
                throw new AppError('Conversation not found', 404);
            }

            if (!conversation.participants.some((p: any) => p.toString() === req.user!._id.toString())) {
                throw new AppError('Not authorized to view these messages', 403);
            }

            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);
            const skip = (pageNum - 1) * limitNum;

            // Mark messages as read
            await Message.updateMany(
                {
                    conversationId: conversation._id,
                    receiver: req.user!._id,
                    isRead: false,
                },
                {
                    $set: { isRead: true },
                    $push: {
                        readBy: {
                            userId: req.user!._id,
                            readAt: new Date(),
                        },
                    },
                }
            );

            const messages = await Message.find({
                conversationId: conversation._id,
                isDeleted: false,
                $or: [
                    { deletedFor: { $nin: [req.user!._id] } },
                    { deletedFor: { $exists: false } },
                ],
            })
                .populate('sender', 'name avatar role')
                .populate('receiver', 'name avatar role')
                .populate('replyTo', 'content sender')
                .populate('relatedOrder', 'orderNumber orderStatus')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();

            const totalMessages = await Message.countDocuments({ conversationId: conversation._id });

            // Update unread count
            const unreadCount = await Message.countDocuments({
                conversationId: conversation._id,
                receiver: req.user!._id,
                isRead: false,
            });
            await Conversation.findByIdAndUpdate(conversation._id, { unreadCount });

            logger.info(`✅ Messages fetched for conversation ${conversation._id}`);

            res.status(200).json({
                success: true,
                count: messages.length,
                pagination: {
                    total: totalMessages,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(totalMessages / limitNum),
                },
                messages: messages.reverse(),
            });
        } catch (error) {
            logger.error(`❌ Error fetching messages for conversation ${req.params.id}:`, error);
            throw error;
        }
    }
);

// ============================================
// SEND MESSAGE
// ============================================
export const sendMessage = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { conversationId, content, messageType, attachmentUrl, replyToId, metadata } = req.body;

        if (!conversationId) {
            throw new AppError('Conversation ID is required', 400);
        }

        if (!content && !attachmentUrl) {
            throw new AppError('Message content or attachment is required', 400);
        }

        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new AppError('Conversation not found', 404);
            }

            const isParticipant = conversation.participants.some(
                (p: any) => p.toString() === req.user!._id.toString()
            );
            if (!isParticipant) {
                throw new AppError('You are not a participant in this conversation', 403);
            }

            const receiverId = conversation.participants.find(
                (p: any) => p.toString() !== req.user!._id.toString()
            );

            if (!receiverId) {
                throw new AppError('No receiver found', 400);
            }

            const messageData: any = {
                conversationId,
                sender: req.user!._id,
                receiver: receiverId,
                content: content || '',
                messageType: messageType || 'text',
                isRead: false,
                readBy: [],
                metadata: metadata || {},
            };

            if (attachmentUrl) {
                messageData.attachmentUrl = attachmentUrl;
                messageData.attachmentType = 'image';
            }

            if (replyToId) {
                const replyTo = await Message.findById(replyToId);
                if (replyTo) {
                    messageData.replyTo = replyToId;
                }
            }

            if (metadata?.orderStatus) {
                messageData.messageType = 'order_update';
                messageData.metadata.orderStatus = metadata.orderStatus;
            }

            const message = await Message.create(messageData);

            await message.populate('sender', 'name avatar role');
            await message.populate('receiver', 'name avatar role');

            // Update conversation
            conversation.lastMessage = {
                _id: message._id,
                content: message.content,
                sender: message.sender,
                createdAt: message.createdAt,
                isRead: false,
            };
            conversation.lastMessageTime = new Date();
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
            await conversation.save();

            logger.info(`✅ Message sent from ${req.user!.email} to ${receiverId}`);

            // Socket events
            io.to(`conversation-${conversationId}`).emit('new-message', {
                message,
                conversationId,
            });

            io.to(`user-${receiverId}`).emit('new-message-notification', {
                conversationId,
                message: message.content,
                sender: req.user!.name,
                senderId: req.user!._id,
                timestamp: message.createdAt,
            });

            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: message,
            });
        } catch (error) {
            logger.error(`❌ Error sending message from ${req.user!.email}:`, error);
            throw error;
        }
    }
);

// ============================================
// MARK MESSAGE AS READ
// ============================================
export const markAsRead = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { conversationId } = req.params;

        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new AppError('Conversation not found', 404);
            }

            if (!conversation.participants.some((p: any) => p.toString() === req.user!._id.toString())) {
                throw new AppError('Not authorized', 403);
            }

            const result = await Message.updateMany(
                {
                    conversationId,
                    receiver: req.user!._id,
                    isRead: false,
                },
                {
                    $set: { isRead: true },
                    $push: {
                        readBy: {
                            userId: req.user!._id,
                            readAt: new Date(),
                        },
                    },
                }
            );

            const unreadCount = await Message.countDocuments({
                conversationId,
                receiver: req.user!._id,
                isRead: false,
            });
            await Conversation.findByIdAndUpdate(conversationId, { unreadCount });

            logger.info(`✅ Messages marked as read for ${req.user!.email} in conversation ${conversationId}`);

            res.status(200).json({
                success: true,
                message: 'Messages marked as read',
                modifiedCount: result.modifiedCount,
            });
        } catch (error) {
            logger.error(`❌ Error marking messages as read for ${req.user!.email}:`, error);
            throw error;
        }
    }
);

// ============================================
// DELETE MESSAGE (Soft delete)
// ============================================
export const deleteMessage = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { messageId } = req.params;

        try {
            const message = await Message.findById(messageId);
            if (!message) {
                throw new AppError('Message not found', 404);
            }

            if (message.sender.toString() !== req.user!._id.toString()) {
                throw new AppError('You can only delete your own messages', 403);
            }

            message.isDeleted = true;
            message.deletedFor = [req.user!._id];
            await message.save();

            logger.info(`✅ Message deleted by ${req.user!.email}`);

            res.status(200).json({
                success: true,
                message: 'Message deleted successfully',
            });
        } catch (error) {
            logger.error(`❌ Error deleting message ${messageId}:`, error);
            throw error;
        }
    }
);

// ============================================
// DELETE CONVERSATION
// ============================================
export const deleteConversation = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const conversation = await Conversation.findById(req.params.id);
            if (!conversation) {
                throw new AppError('Conversation not found', 404);
            }

            if (!conversation.participants.some((p: any) => p.toString() === req.user!._id.toString())) {
                throw new AppError('Not authorized', 403);
            }

            conversation.isActive = false;
            await conversation.save();

            logger.info(`✅ Conversation ${req.params.id} deleted by ${req.user!.email}`);

            res.status(200).json({
                success: true,
                message: 'Conversation deleted successfully',
            });
        } catch (error) {
            logger.error(`❌ Error deleting conversation ${req.params.id}:`, error);
            throw error;
        }
    }
);

// ============================================
// GET UNREAD COUNT
// ============================================
export const getUnreadCount = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const count = await Message.countDocuments({
                receiver: req.user!._id,
                isRead: false,
                isDeleted: false,
            });

            logger.info(`✅ Unread count for ${req.user!.email}: ${count}`);

            res.status(200).json({
                success: true,
                unreadCount: count,
            });
        } catch (error) {
            logger.error(`❌ Error fetching unread count for ${req.user!.email}:`, error);
            throw error;
        }
    }
);

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
    getConversations,
    getConversation,
    createOrGetConversation,
    getMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    deleteConversation,
    getUnreadCount,
};