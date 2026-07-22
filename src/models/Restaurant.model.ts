import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRestaurant extends Document {
  owner: mongoose.Types.ObjectId;
  restaurantName: string;
  description: string;
  logo: string;
  banner: string;
  cuisineType: string[];
  rating: number;
  reviewsCount: number;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates: {
      type: string;
      coordinates: number[];
    };
  };
  phone: string;
  email: string;
  operatingHours: Array<{
    day: string;
    open: string;
    close: string;
  }>;
  isOpen: boolean;
  deliveryTime: number;
  deliveryCharge: number;
  minimumOrder: number;
  status: 'active' | 'inactive' | 'suspended';
  isVerified: boolean;
  totalOrders: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurantName: {
      type: String,
      required: [true, 'Please provide a restaurant name'],
      trim: true,
      maxlength: [100, 'Restaurant name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    logo: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    cuisineType: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: 'Bangladesh',
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          required: true,
          default: [0, 0],
        },
      },
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    operatingHours: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          required: true,
        },
        open: {
          type: String,
          required: true,
        },
        close: {
          type: String,
          required: true,
        },
      },
    ],
    isOpen: {
      type: Boolean,
      default: true,
    },
    deliveryTime: {
      type: Number,
      default: 30,
      min: [0, 'Delivery time cannot be negative'],
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: [0, 'Delivery charge cannot be negative'],
    },
    minimumOrder: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate menu items
RestaurantSchema.virtual('menuItems', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'restaurant',
});

// Indexes
RestaurantSchema.index({ 'address.coordinates': '2dsphere' });
RestaurantSchema.index({ restaurantName: 'text', description: 'text' });
RestaurantSchema.index({ cuisineType: 1 });
RestaurantSchema.index({ rating: -1 });

export const Restaurant: Model<IRestaurant> = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);