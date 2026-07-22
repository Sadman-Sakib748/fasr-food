import { Response } from 'express';
import { Types } from 'mongoose';
import { Order } from '../models/Order.model';
import { Restaurant } from '../models/Restaurant.model';
import { MenuItem } from '../models/MenuItem.model';
import { User } from '../models/User.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { io } from '../app';

// ============================================
// TYPE DEFINITIONS
// ============================================
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

// ============================================
// ORDER STATUS TRANSITIONS
// ============================================
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get restaurant owner ID safely
const getRestaurantOwnerId = (order: any): string | undefined => {
  if (!order.restaurant) return undefined;
  
  if (order.restaurant.owner) {
    if (typeof order.restaurant.owner === 'object' && order.restaurant.owner._id) {
      return order.restaurant.owner._id.toString();
    }
    if (typeof order.restaurant.owner === 'string') {
      return order.restaurant.owner;
    }
  }
  return undefined;
};

// Get restaurant name safely
const getRestaurantName = (order: any): string => {
  if (!order.restaurant) return 'Unknown Restaurant';
  
  if (typeof order.restaurant === 'object' && order.restaurant.restaurantName) {
    return order.restaurant.restaurantName;
  }
  
  return 'Restaurant';
};

// Get customer name safely
const getCustomerName = (order: any): string => {
  if (!order.customer) return 'Customer';
  
  if (typeof order.customer === 'object' && order.customer.name) {
    return order.customer.name;
  }
  
  return 'Customer';
};

// Get customer phone safely
const getCustomerPhone = (order: any): string => {
  if (!order.customer) return '';
  
  if (typeof order.customer === 'object' && order.customer.phone) {
    return order.customer.phone;
  }
  
  return '';
};

// Get rider name safely
const getRiderName = (order: any): string => {
  if (!order.rider) return 'Unassigned';
  
  if (typeof order.rider === 'object' && order.rider.name) {
    return order.rider.name;
  }
  
  return 'Rider';
};

// ============================================
// GET ORDERS (Role-based)
// ============================================
export const getOrders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, page = 1, limit = 10 } = req.query;

    const query: Record<string, any> = {};

    // Role-based filtering
    if (req.user!.role === 'customer') {
      query.customer = req.user!._id;
    } else if (req.user!.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ owner: req.user!._id });
      if (restaurant) {
        query.restaurant = restaurant._id;
      } else {
        res.status(200).json({
          success: true,
          count: 0,
          orders: [],
          pagination: { total: 0, page: 1, limit: 10, pages: 0 },
        });
        return;
      }
    } else if (req.user!.role === 'rider') {
      query.rider = req.user!._id;
    }

    // Filter by status
    if (status) {
      query.orderStatus = status;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name email phone address')
        .populate('restaurant', 'restaurantName logo address')
        .populate('rider', 'name email phone')
        .populate('items.menuItem', 'name price image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      orders,
    });
  }
);

// ============================================
// GET SINGLE ORDER
// ============================================
export const getOrder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: 'name email',
        },
      })
      .populate('rider', 'name email phone avatar')
      .populate('items.menuItem', 'name price image description');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Get restaurant owner ID safely
    const restaurantOwnerId = getRestaurantOwnerId(order);

    // Check authorization
    const isAuthorized =
      req.user!.role === 'admin' ||
      order.customer._id.toString() === req.user!._id.toString() ||
      restaurantOwnerId === req.user!._id.toString() ||
      (order.rider && order.rider._id.toString() === req.user!._id.toString());

    if (!isAuthorized) {
      throw new AppError('Not authorized to view this order', 403);
    }

    res.status(200).json({
      success: true,
      order,
    });
  }
);

// ============================================
// CREATE ORDER
// ============================================
export const createOrder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      restaurant: restaurantId,
      items,
      deliveryAddress,
      paymentMethod,
      specialInstructions,
    } = req.body;

    // Validate required fields
    if (!restaurantId) {
      throw new AppError('Restaurant ID is required', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('At least one item is required', 400);
    }

    if (!deliveryAddress || !deliveryAddress.street) {
      throw new AppError('Delivery address is required', 400);
    }

    // Get restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Calculate subtotal
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        throw new AppError(`Menu item ${item.menuItem} not found`, 404);
      }

      if (!menuItem.isActive) {
        throw new AppError(`Menu item "${menuItem.name}" is not available`, 400);
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItem: menuItem._id,
        quantity: item.quantity,
        price: menuItem.price,
        customizations: item.customizations || [],
      });
    }

    // Calculate totals
    const tax = subtotal * 0.1;
    const deliveryCharge = restaurant.deliveryCharge || 0;
    const totalAmount = subtotal + tax + deliveryCharge;

    // Create order
    const order = await Order.create({
      customer: req.user!._id,
      restaurant: restaurantId,
      items: orderItems,
      deliveryAddress,
      subtotal,
      tax,
      deliveryCharge,
      totalAmount,
      paymentMethod: paymentMethod || 'cod',
      specialInstructions,
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order placed',
        },
      ],
    });

    // Populate order
    await order.populate('customer', 'name email phone');
    await order.populate('restaurant', 'restaurantName logo');
    await order.populate('items.menuItem', 'name price image');

    // Emit socket event
    io.to(`restaurant-${restaurantId}`).emit('new-order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: req.user!.name,
      totalAmount: order.totalAmount,
    });

    // Update restaurant stats
    await Restaurant.findByIdAndUpdate(restaurantId, {
      $inc: { totalOrders: 1, totalRevenue: totalAmount },
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order,
    });
  }
);

// ============================================
// UPDATE ORDER STATUS
// ============================================
export const updateOrderStatus = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { orderStatus, note } = req.body;

    if (!orderStatus) {
      throw new AppError('Order status is required', 400);
    }

    const order = await Order.findById(req.params.id)
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: '_id',
        },
      })
      .populate('customer', 'name email phone');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Get restaurant owner ID
    const restaurantOwnerId = getRestaurantOwnerId(order);

    // Check authorization
    const isRestaurantOwner = restaurantOwnerId === req.user!._id.toString();
    const isRider = order.rider && order.rider.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isRestaurantOwner && !isRider && !isAdmin) {
      throw new AppError('Not authorized to update this order', 403);
    }

    // Validate status transition
    const currentStatus = order.orderStatus as OrderStatus;
    const newStatus = orderStatus as OrderStatus;

    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Cannot transition from "${currentStatus}" to "${newStatus}"`,
        400
      );
    }

    // Update order
    order.orderStatus = newStatus;
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note: note || `Status updated to ${newStatus}`,
    });

    // If order is delivered
    if (newStatus === 'delivered') {
      order.actualDeliveryTime = new Date();

      if (order.rider) {
        await User.findByIdAndUpdate(order.rider, {
          $inc: {
            completedDeliveries: 1,
            earnings: order.totalAmount * 0.1,
          },
        });
      }
    }

    await order.save();

    // Get customer name for notification
    const customerName = getCustomerName(order);
    const restaurantName = getRestaurantName(order);

    // Emit socket event to order room
    io.to(`order-${order._id}`).emit('order-updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      note: note || `Status updated to ${newStatus}`,
      customerName,
      restaurantName,
    });

    // Also notify customer
    if (order.customer && order.customer._id) {
      io.to(`user-${order.customer._id}`).emit('order-status-changed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        note: note || `Status updated to ${newStatus}`,
        restaurantName,
      });
    }

    // Notify restaurant owner
    if (restaurantOwnerId) {
      io.to(`user-${restaurantOwnerId}`).emit('order-status-changed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        note: note || `Status updated to ${newStatus}`,
        customerName,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order,
    });
  }
);

// ============================================
// ASSIGN RIDER TO ORDER - FULLY FIXED
// ============================================
export const assignRider = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { riderId } = req.body;

    if (!riderId) {
      throw new AppError('Rider ID is required', 400);
    }

    // Populate restaurant and customer
    const order = await Order.findById(req.params.id)
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: '_id',
        },
      })
      .populate('customer', 'name phone email');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check if order is ready for rider assignment
    if (order.orderStatus !== 'ready') {
      throw new AppError('Order must be ready before assigning a rider', 400);
    }

    if (order.rider) {
      throw new AppError('Order already has a rider assigned', 400);
    }

    // Get restaurant owner ID
    const restaurantOwnerId = getRestaurantOwnerId(order);

    // Check authorization
    const isRestaurantOwner = restaurantOwnerId === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isRestaurantOwner && !isAdmin) {
      throw new AppError('Not authorized to assign rider', 403);
    }

    // Check if rider exists and is active
    const rider = await User.findOne({
      _id: riderId,
      role: 'rider',
      status: 'active',
    });

    if (!rider) {
      throw new AppError('Rider not found or not available', 404);
    }

    // Assign rider
    order.rider = rider._id;
    await order.save();

    // Get names safely using helpers
    const restaurantName = getRestaurantName(order);
    const customerName = getCustomerName(order);
    const customerPhone = getCustomerPhone(order);

    // Emit socket event to rider
    io.to(`user-${riderId}`).emit('new-delivery', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      restaurant: restaurantName,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      customerName: customerName,
      customerPhone: customerPhone,
      specialInstructions: order.specialInstructions || '',
    });

    // Notify restaurant owner
    if (restaurantOwnerId) {
      io.to(`user-${restaurantOwnerId}`).emit('rider-assigned', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        riderName: rider.name,
        riderId: rider._id,
      });
    }

    // Notify customer
    if (order.customer && order.customer._id) {
      io.to(`user-${order.customer._id}`).emit('rider-assigned', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        riderName: rider.name,
        riderId: rider._id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Rider assigned successfully',
      order,
    });
  }
);

// ============================================
// CANCEL ORDER - FULLY FIXED
// ============================================
export const cancelOrder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id)
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: '_id',
        },
      })
      .populate('customer', 'name phone email');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.orderStatus)) {
      throw new AppError('Order cannot be cancelled', 400);
    }

    // Get restaurant owner ID
    const restaurantOwnerId = getRestaurantOwnerId(order);

    // Check authorization
    const isCustomer = order.customer._id.toString() === req.user!._id.toString();
    const isRestaurantOwner = restaurantOwnerId === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isCustomer && !isRestaurantOwner && !isAdmin) {
      throw new AppError('Not authorized to cancel this order', 403);
    }

    // Cancel order
    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason || 'Order cancelled',
    });

    await order.save();

    // Get names for notifications
    const restaurantName = getRestaurantName(order);
    const customerName = getCustomerName(order);

    // Emit socket events
    const cancelData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason: reason || 'Order cancelled',
      restaurant: restaurantName,
      customer: customerName,
    };

    io.to(`order-${order._id}`).emit('order-cancelled', cancelData);

    // Notify customer
    if (order.customer && order.customer._id) {
      io.to(`user-${order.customer._id}`).emit('order-cancelled', cancelData);
    }

    // Notify restaurant owner
    if (restaurantOwnerId) {
      io.to(`user-${restaurantOwnerId}`).emit('order-cancelled', cancelData);
    }

    // Notify rider if assigned
    if (order.rider) {
      io.to(`user-${order.rider}`).emit('order-cancelled', cancelData);
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order,
    });
  }
);

// ============================================
// GET ORDER STATISTICS (for restaurant)
// ============================================
export const getOrderStats = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const restaurant = await Restaurant.findOne({ owner: req.user!._id });
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    const [
      totalOrders,
      pendingOrders,
      preparingOrders,
      readyOrders,
      completedOrders,
      cancelledOrders,
      revenue,
    ] = await Promise.all([
      Order.countDocuments({ restaurant: restaurant._id }),
      Order.countDocuments({
        restaurant: restaurant._id,
        orderStatus: 'pending',
      }),
      Order.countDocuments({
        restaurant: restaurant._id,
        orderStatus: 'preparing',
      }),
      Order.countDocuments({
        restaurant: restaurant._id,
        orderStatus: 'ready',
      }),
      Order.countDocuments({
        restaurant: restaurant._id,
        orderStatus: 'delivered',
      }),
      Order.countDocuments({
        restaurant: restaurant._id,
        orderStatus: 'cancelled',
      }),
      Order.aggregate([
        {
          $match: {
            restaurant: restaurant._id,
            orderStatus: 'delivered',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    // Get recent orders
    const recentOrders = await Order.find({
      restaurant: restaurant._id,
    })
      .populate('customer', 'name')
      .populate('rider', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        completedOrders,
        cancelledOrders,
        revenue: revenue[0]?.total || 0,
        activeOrders: pendingOrders + preparingOrders + readyOrders,
      },
      recentOrders,
    });
  }
);

// ============================================
// GET ORDER BY ORDER NUMBER
// ============================================
export const getOrderByNumber = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .populate('customer', 'name email phone address')
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: 'name email',
        },
      })
      .populate('rider', 'name email phone avatar')
      .populate('items.menuItem', 'name price image description');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check authorization
    const restaurantOwnerId = getRestaurantOwnerId(order);
    const isAuthorized =
      req.user!.role === 'admin' ||
      order.customer._id.toString() === req.user!._id.toString() ||
      restaurantOwnerId === req.user!._id.toString() ||
      (order.rider && order.rider._id.toString() === req.user!._id.toString());

    if (!isAuthorized) {
      throw new AppError('Not authorized to view this order', 403);
    }

    res.status(200).json({
      success: true,
      order,
    });
  }
);

// ============================================
// GET RIDER ORDERS
// ============================================
export const getRiderOrders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, page = 1, limit = 10 } = req.query;

    const query: Record<string, any> = {
      rider: req.user!._id,
    };

    if (status) {
      query.orderStatus = status;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name phone address')
        .populate('restaurant', 'restaurantName address phone')
        .populate('items.menuItem', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      orders,
    });
  }
);

// ============================================
// GET CUSTOMER ORDERS
// ============================================
export const getCustomerOrders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, page = 1, limit = 10 } = req.query;

    const query: Record<string, any> = {
      customer: req.user!._id,
    };

    if (status) {
      query.orderStatus = status;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('restaurant', 'restaurantName logo address')
        .populate('rider', 'name phone')
        .populate('items.menuItem', 'name price image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      orders,
    });
  }
);

// ============================================
// GET RESTAURANT ORDERS
// ============================================
export const getRestaurantOrders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, page = 1, limit = 10 } = req.query;

    // Find restaurant for this owner
    const restaurant = await Restaurant.findOne({ owner: req.user!._id });
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    const query: Record<string, any> = {
      restaurant: restaurant._id,
    };

    if (status) {
      query.orderStatus = status;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name phone address')
        .populate('rider', 'name phone')
        .populate('items.menuItem', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      orders,
    });
  }
);