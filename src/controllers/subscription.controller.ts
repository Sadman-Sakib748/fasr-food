import { Request, Response } from 'express';
import { Subscription } from '../models/Subscription.model';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

// ============================================
// SUBSCRIPTION PLANS (Dynamic from DB)
// ============================================
const SUBSCRIPTION_PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'BDT',
        duration: 'lifetime',
        features: [
            'Basic order tracking',
            'Standard delivery (30-45 min)',
            'Email support (48 hrs)',
            'Limited to 5 orders per month',
            'Basic restaurant discovery',
        ],
        limits: {
            maxOrdersPerMonth: 5,
            maxFavorites: 10,
            cashback: 0,
            deliveryDiscount: 0,
        },
        badge: 'Free',
        color: '#6B7280',
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 499,
        currency: 'BDT',
        duration: 'monthly',
        features: [
            'Priority order tracking',
            'Express delivery (15-25 min)',
            'Priority support (4 hrs)',
            'Unlimited orders',
            'Exclusive offers & discounts',
            'Free delivery on orders above 500',
            '5% cashback on every order',
            'Advanced restaurant filters',
        ],
        limits: {
            maxOrdersPerMonth: 999,
            maxFavorites: 50,
            cashback: 5,
            deliveryDiscount: 100,
        },
        badge: 'Popular',
        color: '#F59E0B',
        savings: 'Save up to 300/month',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 999,
        currency: 'BDT',
        duration: 'monthly',
        features: [
            'All Premium features',
            'Dedicated account manager',
            'Custom integration support',
            'Advanced analytics dashboard',
            'API access for integrations',
            'White-label solution',
            'Bulk order management',
            '10% cashback on every order',
            'Free delivery on all orders',
        ],
        limits: {
            maxOrdersPerMonth: 9999,
            maxFavorites: 999,
            cashback: 10,
            deliveryDiscount: 999,
        },
        badge: 'Best Value',
        color: '#8B5CF6',
        savings: 'Save up to 1000/month',
    },
];

// ============================================
// GET SUBSCRIPTION PLANS (Dynamic)
// ============================================
export const getSubscriptionPlans = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        // Get active subscription counts for each plan
        const plans = await Promise.all(
            SUBSCRIPTION_PLANS.map(async (plan) => {
                const activeCount = await Subscription.countDocuments({
                    planType: plan.id,
                    status: 'active',
                });

                return {
                    ...plan,
                    subscribers: activeCount,
                    isPopular: plan.id === 'premium',
                };
            })
        );

        res.status(200).json({
            success: true,
            plans,
            totalSubscribers: await Subscription.countDocuments({ status: 'active' }),
        });
    }
);

// ============================================
// GET USER SUBSCRIPTION (With Benefits)
// ============================================
export const getUserSubscription = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const subscription = await Subscription.findOne({ user: req.user!._id });

        // Get user's monthly order count
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const orderCount = await Order.countDocuments({
            customer: req.user!._id,
            createdAt: { $gte: startOfMonth },
        });

        if (!subscription) {
            // Return default free plan with usage
            const freePlan = SUBSCRIPTION_PLANS.find(p => p.id === 'free');
            res.status(200).json({
                success: true,
                subscription: {
                    planType: 'free',
                    status: 'active',
                    features: freePlan?.features || [],
                    limits: freePlan?.limits || {},
                    startDate: null,
                    endDate: null,
                    renewalDate: null,
                    autoRenewal: false,
                    usage: {
                        ordersThisMonth: orderCount,
                        maxOrders: freePlan?.limits.maxOrdersPerMonth || 5,
                        remainingOrders: Math.max(0, (freePlan?.limits.maxOrdersPerMonth || 5) - orderCount),
                    },
                },
                isSubscribed: false,
            });
            return;
        }

        // Get plan details
        const planDetails = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planType);

        res.status(200).json({
            success: true,
            subscription: {
                ...subscription.toJSON(),
                features: planDetails?.features || subscription.features,
                limits: planDetails?.limits || {},
                usage: {
                    ordersThisMonth: orderCount,
                    maxOrders: planDetails?.limits.maxOrdersPerMonth || 999,
                    remainingOrders: Math.max(0, (planDetails?.limits.maxOrdersPerMonth || 999) - orderCount),
                },
                planDetails: planDetails || null,
            },
            isSubscribed: true,
        });
    }
);

// ============================================
// SUBSCRIBE TO PLAN (With Payment Integration)
// ============================================
export const subscribeToPlan = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { planType, paymentMethod, paymentDetails } = req.body;

        const validPlans = ['premium', 'enterprise'];
        if (!validPlans.includes(planType)) {
            throw new AppError('Invalid plan type. Must be premium or enterprise', 400);
        }

        // Check existing subscription
        const existingSubscription = await Subscription.findOne({
            user: req.user!._id,
            status: 'active',
        });

        if (existingSubscription) {
            throw new AppError('You already have an active subscription. Please cancel first.', 400);
        }

        // Get plan details
        const planDetails = SUBSCRIPTION_PLANS.find(p => p.id === planType);
        if (!planDetails) {
            throw new AppError('Plan not found', 404);
        }

        // Calculate end date (30 days from now)
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);

        // Create subscription
        const subscription = await Subscription.create({
            user: req.user!._id,
            planType,
            status: 'active',
            startDate,
            endDate,
            renewalDate: endDate,
            paymentStatus: 'pending',
            autoRenewal: true,
            features: planDetails.features,
            price: planDetails.price,
            paymentMethod: paymentMethod || 'stripe',
            paymentDetails: paymentDetails || {},
        });

        // Update user preferences
        await User.findByIdAndUpdate(req.user!._id, {
            $set: {
                'preferences.subscription': planType,
                'preferences.subscriptionId': subscription._id,
            },
        });

        logger.info(`✅ User ${req.user!.email} subscribed to ${planType} plan`);

        // Populate subscription
        await subscription.populate('user', 'name email');

        res.status(201).json({
            success: true,
            message: `Successfully subscribed to ${planType} plan`,
            subscription,
            planDetails,
            nextBillingDate: endDate,
        });
    }
);

// ============================================
// CANCEL SUBSCRIPTION
// ============================================
export const cancelSubscription = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const subscription = await Subscription.findOne({
            user: req.user!._id,
            status: { $in: ['active', 'paused'] },
        });

        if (!subscription) {
            throw new AppError('No active subscription found', 404);
        }

        // Check if subscription can be cancelled (at least 24 hours before renewal)
        const now = new Date();
        const renewalDate = new Date(subscription.renewalDate);
        const hoursUntilRenewal = Math.floor((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        if (hoursUntilRenewal < 24) {
            throw new AppError('Cannot cancel within 24 hours of renewal', 400);
        }

        subscription.status = 'cancelled';
        subscription.autoRenewal = false;
        await subscription.save();

        await User.findByIdAndUpdate(req.user!._id, {
            $set: { 'preferences.subscription': 'free' },
            $unset: { 'preferences.subscriptionId': 1 },
        });

        logger.info(`✅ User ${req.user!.email} cancelled subscription`);

        res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully. You will have access until the end of your billing period.',
            subscription,
            validUntil: subscription.endDate,
        });
    }
);

// ============================================
// PAUSE SUBSCRIPTION
// ============================================
export const pauseSubscription = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const subscription = await Subscription.findOne({
            user: req.user!._id,
            status: 'active',
        });

        if (!subscription) {
            throw new AppError('No active subscription found', 404);
        }

        subscription.status = 'paused';
        await subscription.save();

        logger.info(`⏸️ User ${req.user!.email} paused subscription`);

        res.status(200).json({
            success: true,
            message: 'Subscription paused successfully',
            subscription,
        });
    }
);

// ============================================
// RESUME SUBSCRIPTION
// ============================================
export const resumeSubscription = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const subscription = await Subscription.findOne({
            user: req.user!._id,
            status: 'paused',
        });

        if (!subscription) {
            throw new AppError('No paused subscription found', 404);
        }

        subscription.status = 'active';
        await subscription.save();

        logger.info(`▶️ User ${req.user!.email} resumed subscription`);

        res.status(200).json({
            success: true,
            message: 'Subscription resumed successfully',
            subscription,
        });
    }
);

// ============================================
// UPDATE SUBSCRIPTION PAYMENT STATUS
// ============================================
export const updatePaymentStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { subscriptionId, paymentStatus, transactionId } = req.body;

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            throw new AppError('Subscription not found', 404);
        }

        subscription.paymentStatus = paymentStatus;
        if (transactionId) {
            subscription.stripeSubscriptionId = transactionId;
        }
        await subscription.save();

        logger.info(`💳 Payment status updated for subscription ${subscriptionId}: ${paymentStatus}`);

        res.status(200).json({
            success: true,
            message: 'Payment status updated',
            subscription,
        });
    }
);

// ============================================
// GET SUBSCRIPTION HISTORY (Admin)
// ============================================
export const getSubscriptionHistory = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { userId, page = 1, limit = 10 } = req.query;

        const query: any = {};
        if (userId) query.user = userId;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [subscriptions, total] = await Promise.all([
            Subscription.find(query)
                .populate('user', 'name email')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            Subscription.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
            subscriptions,
        });
    }
);

// ============================================
// GET SUBSCRIPTION STATS (Admin)
// ============================================
export const getSubscriptionStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const [totalSubscriptions, activeSubscriptions, cancelledSubscriptions, revenue] = await Promise.all([
            Subscription.countDocuments(),
            Subscription.countDocuments({ status: 'active' }),
            Subscription.countDocuments({ status: 'cancelled' }),
            Subscription.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: null, total: { $sum: '$price' } } },
            ]),
        ]);

        const planDistribution = await Subscription.aggregate([
            {
                $group: {
                    _id: '$planType',
                    count: { $sum: 1 },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalSubscriptions,
                activeSubscriptions,
                cancelledSubscriptions,
                monthlyRevenue: revenue[0]?.total || 0,
                planDistribution,
            },
        });
    }
);

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
    getSubscriptionPlans,
    getUserSubscription,
    subscribeToPlan,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    updatePaymentStatus,
    getSubscriptionHistory,
    getSubscriptionStats,
};