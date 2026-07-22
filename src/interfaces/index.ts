import { Document, Types } from 'mongoose';
import { Request } from 'express';

// ============================================
// USER INTERFACES
// ============================================

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'restaurant' | 'rider' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  address?: IAddress;
  preferences: IPreferences;
  restaurantName?: string;
  cuisineType?: string[];
  operatingHours?: IOperatingHour[];
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
  comparePassword(password: string): Promise<boolean>;
}

// ============================================
// ADDRESS INTERFACE
// ============================================

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    type: string;
    coordinates: number[];
  };
}

// ============================================
// PREFERENCES INTERFACE
// ============================================

export interface IPreferences {
  language: 'en' | 'bn' | 'hi' | 'ar' | 'es';
  theme: 'light' | 'dark';
  notifications: boolean;
}

// ============================================
// OPERATING HOURS INTERFACE
// ============================================

export interface IOperatingHour {
  day: string;
  open: string;
  close: string;
}

// ============================================
// RESTAURANT INTERFACES
// ============================================

export interface IRestaurant extends Document {
  owner: Types.ObjectId;
  restaurantName: string;
  description: string;
  logo: string;
  banner: string;
  cuisineType: string[];
  rating: number;
  reviewsCount: number;
  address: IAddress;
  phone: string;
  email: string;
  operatingHours: IOperatingHour[];
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

// ============================================
// MENU ITEM INTERFACES
// ============================================

export interface IMenuItem extends Document {
  restaurant: Types.ObjectId;
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
  customizations: ICustomization[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CUSTOMIZATION INTERFACES
// ============================================

export interface ICustomization {
  name: string;
  options: ICustomizationOption[];
}

export interface ICustomizationOption {
  name: string;
  price: number;
}

// ============================================
// ORDER INTERFACES
// ============================================

export interface IOrder extends Document {
  orderNumber: string;
  customer: Types.ObjectId;
  restaurant: Types.ObjectId;
  rider?: Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: IAddress;
  subtotal: number;
  tax: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'stripe' | 'bkash' | 'cod';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  specialInstructions?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  rating?: number;
  review?: string;
  riderRating?: number;
  riderReview?: string;
  statusHistory: IStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ORDER ITEM INTERFACE
// ============================================

export interface IOrderItem {
  menuItem: Types.ObjectId;
  quantity: number;
  price: number;
  customizations: IOrderItemCustomization[];
}

export interface IOrderItemCustomization {
  name: string;
  option: string;
  price: number;
}

// ============================================
// STATUS HISTORY INTERFACE
// ============================================

export interface IStatusHistory {
  status: string;
  timestamp: Date;
  note?: string;
}

// ============================================
// REVIEW INTERFACES
// ============================================

export interface IReview extends Document {
  customer: Types.ObjectId;
  restaurant?: Types.ObjectId;
  menuItem?: Types.ObjectId;
  rider?: Types.ObjectId;
  rating: number;
  comment: string;
  reviewType: 'restaurant' | 'menuItem' | 'rider';
  isVerified: boolean;
  helpful: number;
  unhelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// BLOG INTERFACES
// ============================================

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  author: Types.ObjectId;
  category: 'food' | 'health' | 'lifestyle' | 'recipes' | 'tips' | 'news';
  tags: string[];
  isPublished: boolean;
  views: number;
  likes: number;
  comments: IBlogComment[];
  readingTime: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// BLOG COMMENT INTERFACE
// ============================================

export interface IBlogComment {
  userId: Types.ObjectId;
  content: string;
  createdAt: Date;
}

// ============================================
// SPECIAL OFFER INTERFACES
// ============================================

export interface ISpecialOffer extends Document {
  restaurant: Types.ObjectId;
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
  applicableMenuItems?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SUBSCRIPTION INTERFACES
// ============================================

export interface ISubscription extends Document {
  user: Types.ObjectId;
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

// ============================================
// MESSAGE INTERFACES
// ============================================

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  messageType: 'text' | 'image' | 'file';
  content: string;
  isRead: boolean;
  attachmentUrl?: string;
  relatedOrder?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CONVERSATION INTERFACE
// ============================================

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  lastMessageTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PAYMENT INTERFACES
// ============================================

export interface IPayment {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  metadata?: Record<string, any>;
}

// ============================================
// NOTIFICATION INTERFACES
// ============================================

export interface INotification {
  userId: string;
  type: 'order' | 'payment' | 'delivery' | 'promotion' | 'system';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

// ============================================
// API RESPONSE INTERFACES
// ============================================

export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: IApiError[];
  pagination?: IPagination;
}

export interface IApiError {
  field?: string;
  message: string;
}

export interface IPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ============================================
// REQUEST INTERFACES
// ============================================

export interface IAuthRequest extends Request {
  user: IUser;
  token: string;
}

export interface IPaginatedRequest {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}

// ============================================
// JWT PAYLOAD INTERFACE
// ============================================

export interface IJwtPayload {
  id: string;
  email: string;
  role: 'customer' | 'restaurant' | 'rider' | 'admin' | 'moderator';
  iat?: number;
  exp?: number;
}

// ============================================
// FILTER OPTIONS INTERFACE
// ============================================

export interface IFilterOptions {
  search?: string;
  category?: string;
  cuisine?: string;
  city?: string;
  minRating?: number;
  maxDeliveryTime?: number;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  priceMin?: number;
  priceMax?: number;
  status?: string;
  role?: 'customer' | 'restaurant' | 'rider' | 'admin' | 'moderator';
}

// ============================================
// SORT OPTIONS INTERFACE
// ============================================

export interface ISortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// ============================================
// DATE RANGE INTERFACE
// ============================================

export interface IDateRange {
  start: Date;
  end: Date;
}

// ============================================
// STATISTICS INTERFACE
// ============================================

export interface IStatistics {
  total: number;
  count: number;
  average: number;
  min: number;
  max: number;
  sum: number;
}

// ============================================
// DASHBOARD STATS INTERFACE
// ============================================

export interface IDashboardStats {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeRiders: number;
  completedDeliveries: number;
  averageRating: number;
}

// ============================================
// CHART DATA INTERFACES
// ============================================

export interface IChartData {
  labels: string[];
  datasets: IChartDataset[];
}

export interface IChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
}

