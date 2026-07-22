  import { Request, Response } from 'express';
  import { User } from '../models/User.model';
  import { Order } from '../models/Order.model';
  import { AppError, asyncHandler } from '../middleware/error.middleware';
  import { AuthRequest } from '../middleware/auth.middleware';

  // ============================================
  // ORDER STATUS TRANSITIONS
  // ============================================
  type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

  // Valid transitions for rider
  const RIDER_VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    pending: [],
    confirmed: [],
    preparing: [],
    ready: [],
    picked_up: ['in_transit'],
    in_transit: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  // @desc    Get available orders for riders
  // @route   GET /api/rider/available-orders
  // @access  Private (Rider)
  export const getAvailableOrders = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const orders = await Order.find({
        orderStatus: 'ready',
        rider: { $exists: false },
      })
        .populate('restaurant', 'restaurantName address phone')
        .populate('customer', 'name phone address')
        .sort({ createdAt: 1 })
        .limit(10);

      res.status(200).json({
        success: true,
        count: orders.length,
        orders,
      });
    }
  );

  // @desc    Accept order delivery
  // @route   PUT /api/rider/accept-order/:orderId
  // @access  Private (Rider)
  export const acceptOrder = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.orderStatus !== 'ready') {
        throw new AppError('Order is not ready for pickup', 400);
      }

      if (order.rider) {
        throw new AppError('Order already assigned to a rider', 400);
      }

      order.rider = req.user!._id;
      order.orderStatus = 'picked_up';
      order.statusHistory.push({
        status: 'picked_up',
        timestamp: new Date(),
        note: 'Rider picked up the order',
      });

      await order.save();

      res.status(200).json({
        success: true,
        message: 'Order accepted successfully',
        order,
      });
    }
  );

  // @desc    Update order status (rider)
  // @route   PUT /api/rider/order/:orderId/status
  // @access  Private (Rider)
  export const updateRiderOrderStatus = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { orderStatus } = req.body;
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Check if rider is assigned to this order
      if (order.rider?.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to update this order', 403);
      }

      // Validate status transition
      const currentStatus = order.orderStatus as OrderStatus;
      const newStatus = orderStatus as OrderStatus;

      // Check if transition is valid
      const validTransitions = RIDER_VALID_TRANSITIONS[currentStatus] || [];
      if (!validTransitions.includes(newStatus)) {
        throw new AppError(
          `Cannot transition from ${currentStatus} to ${newStatus}`,
          400
        );
      }

      // Update order status
      order.orderStatus = newStatus;
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note: `Order ${newStatus}`,
      });

      // If order is delivered, update rider stats
      if (newStatus === 'delivered') {
        order.actualDeliveryTime = new Date();
        await User.findByIdAndUpdate(req.user!._id, {
          $inc: { 
            completedDeliveries: 1, 
            earnings: order.totalAmount * 0.1 
          },
        });
      }

      await order.save();

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        order,
      });
    }
  );

  // @desc    Get rider earnings
  // @route   GET /api/rider/earnings
  // @access  Private (Rider)
  export const getRiderEarnings = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const user = await User.findById(req.user!._id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const completedOrders = await Order.countDocuments({
        rider: req.user!._id,
        orderStatus: 'delivered',
      });

      const pendingOrders = await Order.countDocuments({
        rider: req.user!._id,
        orderStatus: { $in: ['picked_up', 'in_transit'] },
      });

      res.status(200).json({
        success: true,
        earnings: user.earnings || 0,
        completedOrders,
        pendingOrders,
      });
    }
  );

  // @desc    Get rider delivery history
  // @route   GET /api/rider/deliveries
  // @access  Private (Rider)
  export const getDeliveryHistory = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
        Order.find({
          rider: req.user!._id,
          orderStatus: 'delivered',
        })
          .populate('restaurant', 'restaurantName address')
          .populate('customer', 'name address')
          .skip(skip)
          .limit(limitNum)
          .sort({ createdAt: -1 }),
        Order.countDocuments({
          rider: req.user!._id,
          orderStatus: 'delivered',
        }),
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

  // @desc    Update rider location
  // @route   PUT /api/rider/location
  // @access  Private (Rider)
  export const updateLocation = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        throw new AppError('Latitude and longitude are required', 400);
      }

      if (latitude < -90 || latitude > 90) {
        throw new AppError('Invalid latitude value. Must be between -90 and 90', 400);
      }

      if (longitude < -180 || longitude > 180) {
        throw new AppError('Invalid longitude value. Must be between -180 and 180', 400);
      }

      await User.findByIdAndUpdate(req.user!._id, {
        'address.coordinates.coordinates': [longitude, latitude],
      });

      res.status(200).json({
        success: true,
        message: 'Location updated successfully',
      });
    }
  );

  // @desc    Get rider status
  // @route   GET /api/rider/status
  // @access  Private (Rider)
  export const getRiderStatus = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const user = await User.findById(req.user!._id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const activeOrder = await Order.findOne({
        rider: req.user!._id,
        orderStatus: { $in: ['picked_up', 'in_transit'] },
      });

      res.status(200).json({
        success: true,
        status: user.status,
        isActive: user.status === 'active',
        hasActiveOrder: !!activeOrder,
        activeOrder: activeOrder || null,
      });
    }
  );

  // @desc    Get rider current order
  // @route   GET /api/rider/current-order
  // @access  Private (Rider)
  export const getCurrentOrder = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const order = await Order.findOne({
        rider: req.user!._id,
        orderStatus: { $in: ['picked_up', 'in_transit'] },
      })
        .populate('restaurant', 'restaurantName address phone')
        .populate('customer', 'name phone address');

      if (!order) {
        res.status(200).json({
          success: true,
          hasOrder: false,
          order: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        hasOrder: true,
        order,
      });
    }
  );

  // @desc    Mark order as delivered
  // @route   PUT /api/rider/deliver-order/:orderId
  // @access  Private (Rider)
  export const deliverOrder = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.rider?.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to deliver this order', 403);
      }

      if (order.orderStatus !== 'in_transit') {
        throw new AppError('Order is not in transit', 400);
      }

      // Update order status
      order.orderStatus = 'delivered';
      order.actualDeliveryTime = new Date();
      order.statusHistory.push({
        status: 'delivered',
        timestamp: new Date(),
        note: 'Order delivered successfully',
      });

      // Update rider stats
      await User.findByIdAndUpdate(req.user!._id, {
        $inc: { 
          completedDeliveries: 1, 
          earnings: order.totalAmount * 0.1 
        },
      });

      await order.save();

      res.status(200).json({
        success: true,
        message: 'Order delivered successfully',
        order,
      });
    }
  );