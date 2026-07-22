import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConversation extends Document {
    participants: mongoose.Types.ObjectId[];
    participantDetails?: {
        _id: mongoose.Types.ObjectId;
        name: string;
        avatar?: string;
        role: string;
    }[];
    lastMessage?: {
        _id: mongoose.Types.ObjectId;
        content: string;
        sender: mongoose.Types.ObjectId;
        createdAt: Date;
        isRead: boolean;
    };
    lastMessageTime?: Date;
    unreadCount: number;
    type: 'individual' | 'group' | 'order';
    orderId?: mongoose.Types.ObjectId;
    isActive: boolean;
    metadata: {
        orderNumber?: string;
        restaurantId?: mongoose.Types.ObjectId;
        customerId?: mongoose.Types.ObjectId;
        riderId?: mongoose.Types.ObjectId;
    };
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ],
        participantDetails: [
            {
                _id: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                name: String,
                avatar: String,
                role: String,
            },
        ],
        lastMessage: {
            _id: {
                type: Schema.Types.ObjectId,
                ref: 'Message',
            },
            content: String,
            sender: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            createdAt: Date,
            isRead: {
                type: Boolean,
                default: false,
            },
        },
        lastMessageTime: {
            type: Date,
            default: Date.now,
        },
        unreadCount: {
            type: Number,
            default: 0,
        },
        type: {
            type: String,
            enum: ['individual', 'group', 'order'],
            default: 'individual',
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        metadata: {
            orderNumber: String,
            restaurantId: {
                type: Schema.Types.ObjectId,
                ref: 'Restaurant',
            },
            customerId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            riderId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ participants: 1, lastMessageTime: -1 });
ConversationSchema.index({ orderId: 1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ isActive: 1 });

export const Conversation: Model<IConversation> = mongoose.model<IConversation>(
    'Conversation',
    ConversationSchema
);