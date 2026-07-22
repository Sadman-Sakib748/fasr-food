// models/User.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'restaurant' | 'rider' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      type: string;
      coordinates: number[];
    };
  };
  preferences: {
    language: 'en' | 'bn' | 'hi' | 'ar' | 'es';
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  restaurantName?: string;
  cuisineType?: string[];
  operatingHours?: Array<{
    day: string;
    open: string;
    close: string;
  }>;
  deliveryTime?: number;
  deliveryCharge?: number;
  minimumOrder?: number;
  isVerified?: boolean;
  totalOrders?: number;
  totalRevenue?: number;
  licenseNumber?: string;
  vehicleType?: 'bike' | 'car' | 'scooter';
  earnings?: number;
  completedDeliveries?: number;
  rating?: number;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  emailVerified?: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['customer', 'restaurant', 'rider', 'admin', 'moderator'],
      default: 'customer',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },
    preferences: {
      language: {
        type: String,
        enum: ['en', 'bn', 'hi', 'ar', 'es'],
        default: 'en',
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
    restaurantName: {
      type: String,
      trim: true,
    },
    cuisineType: {
      type: [String],
      default: [],
    },
    operatingHours: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
        open: String,
        close: String,
      },
    ],
    deliveryTime: {
      type: Number,
      default: 30,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    minimumOrder: {
      type: Number,
      default: 0,
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
    licenseNumber: {
      type: String,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'scooter'],
    },
    earnings: {
      type: Number,
      default: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ❌ bcrypt middleware সরানো হয়েছে
// UserSchema.pre<IUser>('save', async function (next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// ❌ comparePassword method সরানো হয়েছে

// Remove password from JSON response
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ 'address.coordinates': '2dsphere' });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);