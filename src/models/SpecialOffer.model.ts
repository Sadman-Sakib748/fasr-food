import mongoose, { Schema, Document } from 'mongoose';

export interface ISpecialOffer extends Document {
  restaurant: mongoose.Types.ObjectId;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxUsageCount?: number;
  usageCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  applicableMenuItems?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SpecialOfferSchema: Schema<ISpecialOffer> = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide an offer title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [0, 'Discount value cannot be negative'],
    },
    minimumOrderAmount: {
      type: Number,
      min: [0, 'Minimum order amount cannot be negative'],
    },
    maxUsageCount: {
      type: Number,
      min: [1, 'Maximum usage count must be at least 1'],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableMenuItems: [
      {
        type: Schema.Types.ObjectId,
        ref: 'MenuItem',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Validate end date is after start date
SpecialOfferSchema.pre<ISpecialOffer>('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Indexes
SpecialOfferSchema.index({ restaurant: 1, isActive: 1 });
SpecialOfferSchema.index({ startDate: 1, endDate: 1 });

export const SpecialOffer = mongoose.model<ISpecialOffer>(
  'SpecialOffer',
  SpecialOfferSchema
);