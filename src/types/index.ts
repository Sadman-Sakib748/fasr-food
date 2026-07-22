import { Request } from 'express';
import { IUser } from '../interfaces';

// ============================================
// USER TYPES
// ============================================
export type UserRole = 'customer' | 'restaurant' | 'rider' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'inactive' | 'banned';
export type Language = 'en' | 'bn' | 'hi' | 'ar' | 'es';
export type Theme = 'light' | 'dark';
export type VehicleType = 'bike' | 'car' | 'scooter';

// ============================================
// RESTAURANT TYPES
// ============================================
export type RestaurantStatus = 'active' | 'inactive' | 'suspended';

// ============================================
// MENU TYPES
// ============================================
export type MenuCategory = 'appetizers' | 'mains' | 'desserts' | 'beverages' | 'sides' | 'soups' | 'salads' | 'other';

// ============================================
// ORDER TYPES
// ============================================
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
export type PaymentMethod = 'stripe' | 'bkash' | 'cod';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// ============================================
// REVIEW TYPES
// ============================================
export type ReviewType = 'restaurant' | 'menuItem' | 'rider';

// ============================================
// BLOG TYPES
// ============================================
export type BlogCategory = 'food' | 'health' | 'lifestyle' | 'recipes' | 'tips' | 'news';

// ============================================
// SUBSCRIPTION TYPES
// ============================================
export type PlanType = 'free' | 'premium' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'paused';

// ============================================
// MESSAGE TYPES
// ============================================
export type MessageType = 'text' | 'image' | 'file';

// ============================================
// OFFER TYPES
// ============================================
export type DiscountType = 'percentage' | 'fixed';

// ============================================
// NOTIFICATION TYPES
// ============================================
export type NotificationType = 'order' | 'payment' | 'delivery' | 'promotion' | 'system';

// ============================================
// DAY TYPES
// ============================================
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// ============================================
// ENVIRONMENT TYPES
// ============================================
export type EnvironmentType = 'development' | 'staging' | 'production';

// ============================================
// SORT TYPES
// ============================================
export type SortOrder = 'asc' | 'desc';

// ============================================
// API RESPONSE TYPES
// ============================================
export type ApiResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ApiError[];
  pagination?: Pagination;
};

export type ApiError = {
  field?: string;
  message: string;
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// ============================================
// GEOSPATIAL TYPES
// ============================================
export type Coordinates = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

// ============================================
// ADDRESS TYPES
// ============================================
export type Address = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: Coordinates;
};

// ============================================
// OPERATING HOURS TYPES
// ============================================
export type OperatingHours = {
  day: DayOfWeek;
  open: string;
  close: string;
};

// ============================================
// CUSTOMIZATION TYPES
// ============================================
export type Customization = {
  name: string;
  options: CustomizationOption[];
};

export type CustomizationOption = {
  name: string;
  price: number;
};

// ============================================
// ORDER ITEM TYPES
// ============================================
export type OrderItem = {
  menuItem: string;
  quantity: number;
  price: number;
  customizations: OrderItemCustomization[];
};

export type OrderItemCustomization = {
  name: string;
  option: string;
  price: number;
};

// ============================================
// STATUS HISTORY TYPES
// ============================================
export type StatusHistory = {
  status: string;
  timestamp: Date;
  note?: string;
};

// ============================================
// BLOG COMMENT TYPES
// ============================================
export type BlogComment = {
  userId: string;
  content: string;
  createdAt: Date;
};

// ============================================
// JWT TYPES
// ============================================
export type JwtPayload = {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

// ============================================
// REQUEST TYPES
// ============================================
export type AuthRequest = Request & {
  user: IUser;
  token: string;
};

export type PaginatedRequest = {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
};

// ============================================
// FILTER TYPES
// ============================================
export type FilterOptions = {
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
  role?: UserRole;
};

// ============================================
// SORT OPTIONS TYPES
// ============================================
export type SortOptions = {
  field: string;
  order: SortOrder;
};

// ============================================
// DATE RANGE TYPES
// ============================================
export type DateRange = {
  start: Date;
  end: Date;
};

// ============================================
// STATISTICS TYPES
// ============================================
export type Statistics = {
  total: number;
  count: number;
  average: number;
  min: number;
  max: number;
  sum: number;
};

// ============================================
// DASHBOARD STATS TYPES
// ============================================
export type DashboardStats = {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeRiders: number;
  completedDeliveries: number;
  averageRating: number;
};

// ============================================
// CHART DATA TYPES
// ============================================
export type ChartData = {
  labels: string[];
  datasets: ChartDataset[];
};

export type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
};

