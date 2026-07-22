import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// MESSAGE INTERFACE
// ============================================

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  messageType: 'text' | 'image' | 'file' | 'location' | 'order_update';
  content: string;
  isRead: boolean;
  readBy: {
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf' | 'document' | 'other';
  fileName?: string;
  fileSize?: number;
  relatedOrder?: mongoose.Types.ObjectId;
  isDeleted: boolean;           // ✅ Added
  deletedFor: mongoose.Types.ObjectId[];  // ✅ Added
  replyTo?: mongoose.Types.ObjectId;
  metadata: {
    orderStatus?: string;
    orderNumber?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    productId?: mongoose.Types.ObjectId;
    productName?: string;
    productImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// MESSAGE SCHEMA
// ============================================

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver is required'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'location', 'order_update'],
      default: 'text',
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    attachmentUrl: {
      type: String,
      trim: true,
    },
    attachmentType: {
      type: String,
      enum: ['image', 'pdf', 'document', 'other'],
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      min: 0,
    },
    relatedOrder: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    metadata: {
      orderStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
      },
      orderNumber: String,
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'MenuItem',
      },
      productName: String,
      productImage: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, isRead: 1 });
MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ relatedOrder: 1 });
MessageSchema.index({ isDeleted: 1, deletedFor: 1 });

// ============================================
// STATIC METHODS
// ============================================

MessageSchema.statics.getUnreadCount = async function (userId: string): Promise<number> {
  return this.countDocuments({
    receiver: userId,
    isRead: false,
    isDeleted: false,
  });
};

MessageSchema.statics.markAllAsRead = async function (conversationId: string, userId: string) {
  return this.updateMany(
    {
      conversationId,
      receiver: userId,
      isRead: false,
    },
    {
      $set: { isRead: true },
      $push: {
        readBy: {
          userId: userId,
          readAt: new Date(),
        },
      },
    }
  );
};

// ============================================
// INSTANCE METHODS
// ============================================

MessageSchema.methods.markAsRead = async function (userId: string): Promise<void> {
  this.isRead = true;
  if (!this.readBy.some((r: any) => r.userId.toString() === userId)) {
    this.readBy.push({
      userId: userId,
      readAt: new Date(),
    });
  }
  await this.save();
};

MessageSchema.methods.softDelete = async function (userId: string): Promise<void> {
  this.isDeleted = true;
  if (!this.deletedFor.includes(userId as any)) {
    this.deletedFor.push(userId as any);
  }
  await this.save();
};

// ============================================
// CREATE MODEL
// ============================================

export const Message: Model<IMessage> = mongoose.model<IMessage>(
  'Message',
  MessageSchema
);

// ============================================
// DEFAULT EXPORT
// ============================================

export default Message;