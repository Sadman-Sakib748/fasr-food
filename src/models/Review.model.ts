import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  customer: mongoose.Types.ObjectId;
  restaurant?: mongoose.Types.ObjectId;
  menuItem?: mongoose.Types.ObjectId;
  rider?: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  reviewType: 'restaurant' | 'menuItem' | 'rider';
  isVerified: boolean;
  helpful: number;
  unhelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema<IReview> = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
    },
    rider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    comment: {
      type: String,
      required: [true, 'Please provide a comment'],
      trim: true,
      maxlength: [500, 'Comment cannot be more than 500 characters'],
    },
    reviewType: {
      type: String,
      enum: ['restaurant', 'menuItem', 'rider'],
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    unhelpful: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one target is selected
ReviewSchema.pre<IReview>('save', function (next) {
  const targets = [this.restaurant, this.menuItem, this.rider].filter(
    Boolean
  );
  if (targets.length !== 1) {
    next(
      new Error(
        'Review must have exactly one target: restaurant, menuItem, or rider'
      )
    );
  }
  next();
});

// Indexes
ReviewSchema.index({ restaurant: 1, rating: -1 });
ReviewSchema.index({ menuItem: 1, rating: -1 });
ReviewSchema.index({ rider: 1, rating: -1 });
ReviewSchema.index({ customer: 1, createdAt: -1 });
ReviewSchema.index({ reviewType: 1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);