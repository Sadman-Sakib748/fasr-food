import { Request, Response } from 'express';
import { Review } from '../models/Review.model';
import { Restaurant } from '../models/Restaurant.model';
import { MenuItem } from '../models/MenuItem.model';
import { User } from '../models/User.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

// ============================================
// GET ALL REVIEWS
// ============================================
export const getReviews = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { restaurantId, menuItemId, riderId, page = 1, limit = 10 } = req.query;

        const query: any = { isVerified: true };

        if (restaurantId) query.restaurant = restaurantId;
        if (menuItemId) query.menuItem = menuItemId;
        if (riderId) query.rider = riderId;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('customer', 'name avatar')
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

// ============================================
// GET SINGLE REVIEW
// ============================================
export const getReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const review = await Review.findById(req.params.id)
            .populate('customer', 'name avatar')
            .populate('restaurant', 'restaurantName')
            .populate('menuItem', 'name')
            .populate('rider', 'name');

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        res.status(200).json({
            success: true,
            review,
        });
    }
);

// ============================================
// CREATE REVIEW
// ============================================
export const createReview = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { restaurant, menuItem, rider, rating, comment, reviewType } = req.body;

        // Check if user already reviewed this target
        const existingReview = await Review.findOne({
            customer: req.user!._id,
            ...(restaurant && { restaurant }),
            ...(menuItem && { menuItem }),
            ...(rider && { rider }),
        });

        if (existingReview) {
            throw new AppError('You have already reviewed this item', 400);
        }

        const review = await Review.create({
            customer: req.user!._id,
            restaurant,
            menuItem,
            rider,
            rating,
            comment,
            reviewType,
        });

        // Update average rating for the target
        if (restaurant) {
            const stats = await Review.aggregate([
                { $match: { restaurant: restaurant } },
                { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
            ]);

            if (stats.length > 0) {
                await Restaurant.findByIdAndUpdate(restaurant, {
                    rating: stats[0].avgRating,
                    reviewsCount: stats[0].count,
                });
            }
        }

        if (menuItem) {
            const stats = await Review.aggregate([
                { $match: { menuItem: menuItem } },
                { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
            ]);

            if (stats.length > 0) {
                await MenuItem.findByIdAndUpdate(menuItem, {
                    rating: stats[0].avgRating,
                    totalReviews: stats[0].count,
                });
            }
        }

        if (rider) {
            const stats = await Review.aggregate([
                { $match: { rider: rider } },
                { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
            ]);

            if (stats.length > 0) {
                await User.findByIdAndUpdate(rider, {
                    rating: stats[0].avgRating,
                });
            }
        }

        logger.info(`✅ Review created by ${req.user!.email} for ${reviewType}`);

        res.status(201).json({
            success: true,
            message: 'Review posted successfully',
            review,
        });
    }
);

// ============================================
// UPDATE REVIEW
// ============================================
export const updateReview = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const review = await Review.findById(req.params.id);

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        if (
            review.customer.toString() !== req.user!._id.toString() &&
            req.user!.role !== 'admin'
        ) {
            throw new AppError('Not authorized to update this review', 403);
        }

        const updated = await Review.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        logger.info(`✅ Review updated by ${req.user!.email}`);

        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            review: updated,
        });
    }
);

// ============================================
// DELETE REVIEW
// ============================================
export const deleteReview = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const review = await Review.findById(req.params.id);

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        if (
            review.customer.toString() !== req.user!._id.toString() &&
            req.user!.role !== 'admin'
        ) {
            throw new AppError('Not authorized to delete this review', 403);
        }

        await review.deleteOne();

        logger.info(`✅ Review deleted by ${req.user!.email}`);

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
        });
    }
);

// ============================================
// MARK REVIEW AS HELPFUL
// ============================================
export const markHelpful = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const review = await Review.findById(req.params.id);

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        review.helpful += 1;
        await review.save();

        res.status(200).json({
            success: true,
            message: 'Marked as helpful',
            review,
        });
    }
);

// ============================================
// MARK REVIEW AS UNHELPFUL
// ============================================
export const markUnhelpful = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const review = await Review.findById(req.params.id);

        if (!review) {
            throw new AppError('Review not found', 404);
        }

        review.unhelpful += 1;
        await review.save();

        res.status(200).json({
            success: true,
            message: 'Marked as unhelpful',
            review,
        });
    }
);

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
    getReviews,
    getReview,
    createReview,
    updateReview,
    deleteReview,
    markHelpful,
    markUnhelpful,
};