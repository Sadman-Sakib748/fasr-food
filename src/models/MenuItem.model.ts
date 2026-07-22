import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMenuItem extends Document {
  restaurant: mongoose.Types.ObjectId;
  name: string;
  description: string;
  image: string;
  price: number;
  category: 'appetizers' | 'mains' | 'desserts' | 'beverages' | 'sides' | 'soups' | 'salads' | 'other';
  isVegetarian: boolean;
  isSpicy: boolean;
  preparationTime: number;
  rating: number;
  totalReviews: number;
  customizations: Array<{
    name: string;
    options: Array<{
      name: string;
      price: number;
    }>;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a menu item name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      enum: ['appetizers', 'mains', 'desserts', 'beverages', 'sides', 'soups', 'salads', 'other'],
      default: 'other',
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isSpicy: {
      type: Boolean,
      default: false,
    },
    preparationTime: {
      type: Number,
      default: 15,
      min: [0, 'Preparation time cannot be negative'],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    customizations: [
      {
        name: {
          type: String,
          required: true,
        },
        options: [
          {
            name: {
              type: String,
              required: true,
            },
            price: {
              type: Number,
              default: 0,
            },
          },
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MenuItemSchema.index({ restaurant: 1, category: 1 });
MenuItemSchema.index({ name: 'text', description: 'text' });
MenuItemSchema.index({ isActive: 1 });

export const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);