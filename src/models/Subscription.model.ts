import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  planType: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'paused';
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
  paymentStatus: 'pending' | 'completed' | 'failed';
  autoRenewal: boolean;
  features: string[];
  price: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema<ISubscription> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    planType: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'paused'],
      default: 'active',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    renewalDate: {
      type: Date,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    autoRenewal: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    stripeCustomerId: {
      type: String,
    },
    stripeSubscriptionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriptionSchema.index({ user: 1 });
SubscriptionSchema.index({ planType: 1, status: 1 });
SubscriptionSchema.index({ renewalDate: 1 });

export const Subscription = mongoose.model<ISubscription>(
  'Subscription',
  SubscriptionSchema
);