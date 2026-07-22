import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Restaurant } from '../models/Restaurant.model';
import { Order } from '../models/Order.model';
import { Blog } from '../models/Blog.model';
import { Review } from '../models/Review.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

// ============================================
// USER MANAGEMENT
// ============================================

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { page = 1, limit = 10, role, status, search } = req.query;

        const query: any = {};
        if (role) query.role = role;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            User.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            count: users.length,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
            users,
        });
    }
);

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
export const getUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            user,
        });
    }
);

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
export const updateUserStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { status } = req.body;
        
        const validStatuses = ['active', 'inactive', 'banned'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        logger.info(`✅ User status updated: ${user.email} -> ${status}`);

        res.status(200).json({
            success: true,
            message: `User ${status} successfully`,
            user,
        });
    }
);

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
export const updateUserRole = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { role } = req.body;
        const userId = req.params.id;

        if (!role) {
            throw new AppError('Role is required', 400);
        }

        const validRoles = ['customer', 'restaurant', 'rider', 'admin', 'moderator'];
        if (!validRoles.includes(role)) {
            throw new AppError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const authReq = req as AuthRequest;
        
        if (authReq.user && authReq.user._id.toString() === userId) {
            throw new AppError('You cannot change your own role', 403);
        }

        if (user.role === role) {
            throw new AppError(`User already has role: ${role}`, 400);
        }

        user.role = role;
        await user.save();

        logger.info(`✅ User role updated: ${user.email} -> ${role} (by admin: ${authReq.user?.email})`);

        res.status(200).json({
            success: true,
            message: `User role updated to ${role} successfully`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    }
);

// @desc    Update user (status and role together)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { status, role } = req.body;
        const userId = req.params.id;

        const updateData: any = {};
        const authReq = req as AuthRequest;

        if (status !== undefined) {
            const validStatuses = ['active', 'inactive', 'banned'];
            if (!validStatuses.includes(status)) {
                throw new AppError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
            }
            updateData.status = status;
        }

        if (role !== undefined) {
            const validRoles = ['customer', 'restaurant', 'rider', 'admin', 'moderator'];
            if (!validRoles.includes(role)) {
                throw new AppError(`Invalid role. Must be: ${validRoles.join(', ')}`, 400);
            }
            
            if (authReq.user && authReq.user._id.toString() === userId) {
                throw new AppError('You cannot change your own role', 403);
            }
            updateData.role = role;
        }

        if (Object.keys(updateData).length === 0) {
            throw new AppError('Please provide status or role to update', 400);
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        logger.info(`✅ User updated: ${user.email} (Status: ${status || 'unchanged'}, Role: ${role || 'unchanged'})`);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user,
        });
    }
);

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        logger.info(`✅ User deleted: ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    }
);

// ============================================
// RESTAURANT MANAGEMENT
// ============================================

// @desc    Get all restaurants
// @route   GET /api/admin/restaurants
// @access  Private (Admin)
export const getRestaurants = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { page = 1, limit = 10, status, search, isVerified } = req.query;

        const query: any = {};
        if (status) query.status = status;
        if (isVerified !== undefined) query.isVerified = isVerified === 'true';
        if (search) {
            query.$or = [
                { restaurantName: { $regex: search, $options: 'i' } },
                { cuisineType: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [restaurants, total] = await Promise.all([
            Restaurant.find(query)
                .populate('owner', 'name email phone')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            Restaurant.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            count: restaurants.length,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
            restaurants,
        });
    }
);

// @desc    Get single restaurant
// @route   GET /api/admin/restaurants/:id
// @access  Private (Admin)
export const getRestaurant = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const restaurant = await Restaurant.findById(req.params.id)
            .populate('owner', 'name email phone');

        if (!restaurant) {
            throw new AppError('Restaurant not found', 404);
        }

        res.status(200).json({
            success: true,
            restaurant,
        });
    }
);

// @desc    Verify restaurant
// @route   PUT /api/admin/restaurants/:id/verify
// @access  Private (Admin)
export const verifyRestaurant = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const restaurantId = req.params.id;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            throw new AppError('Restaurant not found', 404);
        }

        if (restaurant.isVerified) {
            throw new AppError('Restaurant is already verified', 400);
        }

        restaurant.isVerified = true;
        await restaurant.save();

        await restaurant.populate('owner', 'name email phone');

        logger.info(`✅ Restaurant verified: ${restaurant.restaurantName} (${restaurantId})`);

        res.status(200).json({
            success: true,
            message: 'Restaurant verified successfully',
            restaurant: {
                id: restaurant._id,
                restaurantName: restaurant.restaurantName,
                owner: restaurant.owner,
                isVerified: restaurant.isVerified,
                status: restaurant.status,
                cuisineType: restaurant.cuisineType,
                address: restaurant.address,
                rating: restaurant.rating,
                totalOrders: restaurant.totalOrders,
            },
        });
    }
);

// @desc    Update restaurant status
// @route   PUT /api/admin/restaurants/:id/status
// @access  Private (Admin)
export const updateRestaurantStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { status } = req.body;
        
        const validStatuses = ['active', 'inactive', 'suspended'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
        }

        const restaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('owner', 'name email');

        if (!restaurant) {
            throw new AppError('Restaurant not found', 404);
        }

        logger.info(`✅ Restaurant status updated: ${restaurant.restaurantName} -> ${status}`);

        res.status(200).json({
            success: true,
            message: `Restaurant ${status} successfully`,
            restaurant,
        });
    }
);

// @desc    Delete restaurant
// @route   DELETE /api/admin/restaurants/:id
// @access  Private (Admin)
export const deleteRestaurant = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
        if (!restaurant) {
            throw new AppError('Restaurant not found', 404);
        }

        logger.info(`✅ Restaurant deleted: ${restaurant.restaurantName}`);

        res.status(200).json({
            success: true,
            message: 'Restaurant deleted successfully',
        });
    }
);

// ============================================
// ORDER MANAGEMENT
// ============================================

// @desc    Get all orders (admin view)
// @route   GET /api/admin/orders
// @access  Private (Admin)
export const getAllOrders = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            paymentStatus,
            restaurantId,
            customerId,
            startDate,
            endDate 
        } = req.query;

        const query: any = {};
        if (status) query.orderStatus = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (restaurantId) query.restaurant = restaurantId;
        if (customerId) query.customer = customerId;
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('customer', 'name email phone')
                .populate('restaurant', 'restaurantName logo')
                .populate('rider', 'name email')
                .populate('items.menuItem', 'name price')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
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

// @desc    Get single order
// @route   GET /api/admin/orders/:id
// @access  Private (Admin)
export const getOrder = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email phone address')
            .populate('restaurant', 'restaurantName logo address')
            .populate('rider', 'name email phone')
            .populate('items.menuItem', 'name price images');

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        res.status(200).json({
            success: true,
            order,
        });
    }
);

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin)
export const updateOrderStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { status } = req.body;
        
        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { orderStatus: status },
            { new: true }
        )
        .populate('customer', 'name email')
        .populate('restaurant', 'restaurantName');

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        logger.info(`✅ Order status updated: ${order._id} -> ${status}`);

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            order,
        });
    }
);

// ============================================
// BLOG MANAGEMENT (NEW)
// ============================================

// @desc    Get all blogs
// @route   GET /api/admin/blogs
// @access  Private (Admin)
export const getBlogs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { page = 1, limit = 10, status, category, search } = req.query;

        const query: any = {};
        if (status) query.status = status;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [blogs, total] = await Promise.all([
            Blog.find(query)
                .populate('author', 'name email avatar')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            Blog.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            count: blogs.length,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
            blogs,
        });
    }
);

// @desc    Get single blog
// @route   GET /api/admin/blogs/:id
// @access  Private (Admin)
export const getBlog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const blog = await Blog.findById(req.params.id)
            .populate('author', 'name email avatar');

        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        res.status(200).json({
            success: true,
            blog,
        });
    }
);

// @desc    Create blog
// @route   POST /api/admin/blogs
// @access  Private (Admin)
export const createBlog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { title, content, category, tags, image, status, excerpt } = req.body;
        const authReq = req as AuthRequest;

        if (!title || !content || !category) {
            throw new AppError('Title, content and category are required', 400);
        }

        const blog = await Blog.create({
            title,
            content,
            excerpt: excerpt || content.substring(0, 150),
            category,
            tags: tags || [],
            image: image || '',
            status: status || 'draft',
            author: authReq.user?._id,
            views: 0,
            likes: 0,
        });

        await blog.populate('author', 'name email avatar');

        logger.info(`✅ Blog created: ${title} by ${authReq.user?.email}`);

        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            blog,
        });
    }
);

// @desc    Update blog
// @route   PUT /api/admin/blogs/:id
// @access  Private (Admin)
export const updateBlog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { title, content, category, tags, image, status, excerpt } = req.body;

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        // Update fields
        if (title) blog.title = title;
        if (content) blog.content = content;
        if (excerpt) blog.excerpt = excerpt;
        if (category) blog.category = category;
        if (tags) blog.tags = tags;
        if (image) blog.image = image;
        if (status) blog.status = status;

        await blog.save();
        await blog.populate('author', 'name email avatar');

        logger.info(`✅ Blog updated: ${blog.title}`);

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            blog,
        });
    }
);

// @desc    Delete blog
// @route   DELETE /api/admin/blogs/:id
// @access  Private (Admin)
export const deleteBlog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        logger.info(`✅ Blog deleted: ${blog.title}`);

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully',
        });
    }
);

// @desc    Update blog status
// @route   PUT /api/admin/blogs/:id/status
// @access  Private (Admin)
export const updateBlogStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { status } = req.body;
        
        const validStatuses = ['draft', 'published', 'archived'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
        }

        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('author', 'name email');

        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        logger.info(`✅ Blog status updated: ${blog.title} -> ${status}`);

        res.status(200).json({
            success: true,
            message: `Blog ${status} successfully`,
            blog,
        });
    }
);

// ============================================
// REVIEW MANAGEMENT (NEW)
// ============================================

// @desc    Get all reviews
// @route   GET /api/admin/reviews
// @access  Private (Admin)
export const getReviews = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { page = 1, limit = 10, rating, status, restaurantId, userId, search } = req.query;

        const query: any = {};
        if (rating) query.rating = parseInt(rating as string);
        if (status) query.status = status;
        if (restaurantId) query.restaurant = restaurantId;
        if (userId) query.user = userId;
        if (search) {
            query.comment = { $regex: search, $options: 'i' };
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('user', 'name email avatar')
                .populate('restaurant', 'restaurantName logo')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            Review.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            count: reviews.length,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
            reviews,
        });
    }
);

// @desc    Get single review
// @route   GET /api/admin/reviews/:id
// @access  Private (Admin)
export const getReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const review = await Review.findById(req.params.id)
            .populate('user', 'name email avatar')
            .populate('restaurant', 'restaurantName logo address');

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        res.status(200).json({
            success: true,
            review,
        });
    }
);

// @desc    Update review status
// @route   PUT /api/admin/reviews/:id/status
// @access  Private (Admin)
export const updateReviewStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { status } = req.body;
        
        const validStatuses = ['active', 'hidden', 'flagged'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
        }

        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('user', 'name email')
         .populate('restaurant', 'restaurantName');

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        logger.info(`✅ Review status updated: ${review._id} -> ${status}`);

        res.status(200).json({
            success: true,
            message: `Review ${status} successfully`,
            review,
        });
    }
);

// @desc    Delete review
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin)
export const deleteReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) {
            throw new AppError('Review not found', 404);
        }

        // Update restaurant rating
        await Restaurant.findByIdAndUpdate(review.restaurant, {
            $pull: { reviews: review._id }
        });

        logger.info(`✅ Review deleted: ${review._id}`);

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
        });
    }
);

// @desc    Get review stats
// @route   GET /api/admin/reviews/stats
// @access  Private (Admin)
export const getReviewStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const [totalReviews, averageRating, ratingDistribution, recentReviews] = await Promise.all([
            Review.countDocuments(),
            Review.aggregate([
                { $group: { _id: null, average: { $avg: '$rating' } } }
            ]),
            Review.aggregate([
                {
                    $group: {
                        _id: '$rating',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Review.find()
                .populate('user', 'name')
                .populate('restaurant', 'restaurantName')
                .sort({ createdAt: -1 })
                .limit(10)
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalReviews,
                averageRating: averageRating[0]?.average || 0,
                ratingDistribution,
            },
            recentReviews,
        });
    }
);

// ============================================
// DASHBOARD STATS
// ============================================

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getDashboardStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const [totalUsers, totalRestaurants, totalOrders, totalRevenue, pendingOrders, activeRiders, totalBlogs, totalReviews] =
            await Promise.all([
                User.countDocuments(),
                Restaurant.countDocuments({ status: 'active' }),
                Order.countDocuments(),
                Order.aggregate([
                    { $match: { orderStatus: 'delivered' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
                ]),
                Order.countDocuments({ orderStatus: 'pending' }),
                User.countDocuments({ role: 'rider', status: 'active' }),
                Blog.countDocuments({ status: 'published' }),
                Review.countDocuments(),
            ]);

        const recentOrders = await Order.find()
            .populate('customer', 'name')
            .populate('restaurant', 'restaurantName')
            .sort({ createdAt: -1 })
            .limit(5);

        const topRestaurants = await Restaurant.find()
            .sort({ rating: -1 })
            .limit(5);

        const dailyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                    },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalRestaurants,
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                pendingOrders,
                activeRiders,
                totalBlogs,
                totalReviews,
            },
            recentOrders,
            topRestaurants,
            dailyStats,
        });
    }
);

// @desc    Get revenue stats
// @route   GET /api/admin/revenue
// @access  Private (Admin)
export const getRevenueStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { period = 'month' } = req.query;

        let dateFilter: any = {};
        const now = new Date();

        if (period === 'today') {
            dateFilter = {
                createdAt: {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                },
            };
        } else if (period === 'week') {
            dateFilter = {
                createdAt: {
                    $gte: new Date(now.setDate(now.getDate() - 7)),
                },
            };
        } else if (period === 'month') {
            dateFilter = {
                createdAt: {
                    $gte: new Date(now.setMonth(now.getMonth() - 1)),
                },
            };
        } else if (period === 'year') {
            dateFilter = {
                createdAt: {
                    $gte: new Date(now.setFullYear(now.getFullYear() - 1)),
                },
            };
        }

        const revenue = await Order.aggregate([
            { $match: { ...dateFilter, orderStatus: 'delivered' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 },
                    average: { $avg: '$totalAmount' },
                },
            },
        ]);

        const byPaymentMethod = await Order.aggregate([
            { $match: { ...dateFilter, orderStatus: 'delivered' } },
            {
                $group: {
                    _id: '$paymentMethod',
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            revenue: revenue[0] || { total: 0, count: 0, average: 0 },
            byPaymentMethod,
        });
    }
);

// ============================================
// EXPORT ALL
// ============================================

export default {
    // User Management
    getUsers,
    getUser,
    updateUserStatus,
    updateUserRole,
    updateUser,
    deleteUser,
    
    // Restaurant Management
    getRestaurants,
    getRestaurant,
    verifyRestaurant,
    updateRestaurantStatus,
    deleteRestaurant,
    
    // Order Management
    getAllOrders,
    getOrder,
    updateOrderStatus,
    
    // Blog Management
    getBlogs,
    getBlog,
    createBlog,
    updateBlog,
    deleteBlog,
    updateBlogStatus,
    
    // Review Management
    getReviews,
    getReview,
    updateReviewStatus,
    deleteReview,
    getReviewStats,
    
    // Dashboard & Stats
    getDashboardStats,
    getRevenueStats,
};