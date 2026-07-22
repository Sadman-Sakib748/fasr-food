import { Request, Response } from 'express';
import { SpecialOffer } from '../models/SpecialOffer.model';
import { Restaurant } from '../models/Restaurant.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

// ============================================
// HELPER: Get Restaurant Owner ID
// ============================================
const getRestaurantOwnerId = (restaurant: any): string | undefined => {
    if (!restaurant) return undefined;

    // Check if owner is populated as object or just ID
    if (restaurant.owner) {
        if (typeof restaurant.owner === 'object' && restaurant.owner._id) {
            return restaurant.owner._id.toString();
        }
        if (typeof restaurant.owner === 'string') {
            return restaurant.owner;
        }
    }
    return undefined;
};

// ============================================
// GET ALL SPECIAL OFFERS
// ============================================
export const getSpecialOffers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { restaurantId, isActive, page = 1, limit = 10 } = req.query;

        const query: any = {};
        if (restaurantId) query.restaurant = restaurantId;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [offers, total] = await Promise.all([
            SpecialOffer.find(query)
                .populate('restaurant', 'restaurantName logo address')
                .populate('applicableMenuItems', 'name price image')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            SpecialOffer.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            count: offers.length,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
            offers,
        });
    }
);

// ============================================
// GET SINGLE SPECIAL OFFER
// ============================================
export const getSpecialOffer = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const offer = await SpecialOffer.findById(req.params.id)
            .populate('restaurant', 'restaurantName logo address phone email')
            .populate('applicableMenuItems', 'name price image description');

        if (!offer) {
            throw new AppError('Special offer not found', 404);
        }

        res.status(200).json({
            success: true,
            offer,
        });
    }
);

// ============================================
// CREATE SPECIAL OFFER
// ============================================
export const createSpecialOffer = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { restaurantId, ...data } = req.body;

        if (!restaurantId) {
            throw new AppError('Restaurant ID is required', 400);
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            throw new AppError('Restaurant not found', 404);
        }

        // ✅ FIXED: Get owner ID safely
        const ownerId = getRestaurantOwnerId(restaurant);
        const isOwner = ownerId === req.user!._id.toString();
        const isAdmin = req.user!.role === 'admin';

        if (!isOwner && !isAdmin) {
            throw new AppError('Not authorized to create offers for this restaurant', 403);
        }

        // Check for overlapping offers
        const existingOffer = await SpecialOffer.findOne({
            restaurant: restaurantId,
            isActive: true,
            $or: [
                { startDate: { $lte: data.endDate, $gte: data.startDate } },
                { endDate: { $lte: data.endDate, $gte: data.startDate } },
            ],
        });

        if (existingOffer) {
            throw new AppError('An active offer already exists for this date range', 400);
        }

        const offer = await SpecialOffer.create({
            restaurant: restaurantId,
            ...data,
        });

        await offer.populate('restaurant', 'restaurantName logo');

        logger.info(`✅ Special offer created: ${offer.title} for ${restaurant.restaurantName}`);

        res.status(201).json({
            success: true,
            message: 'Special offer created successfully',
            offer,
        });
    }
);

// ============================================
// UPDATE SPECIAL OFFER
// ============================================
export const updateSpecialOffer = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        // ✅ FIXED: Populate restaurant with owner
        const offer = await SpecialOffer.findById(req.params.id)
            .populate({
                path: 'restaurant',
                populate: {
                    path: 'owner',
                    select: '_id',
                },
            });

        if (!offer) {
            throw new AppError('Special offer not found', 404);
        }

        // ✅ FIXED: Get owner ID safely
        const ownerId = getRestaurantOwnerId(offer.restaurant);
        const isOwner = ownerId === req.user!._id.toString();
        const isAdmin = req.user!.role === 'admin';

        if (!isOwner && !isAdmin) {
            throw new AppError('Not authorized to update this offer', 403);
        }

        const updated = await SpecialOffer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('restaurant', 'restaurantName logo');

        logger.info(`✅ Special offer updated: ${updated?.title}`);

        res.status(200).json({
            success: true,
            message: 'Special offer updated successfully',
            offer: updated,
        });
    }
);

// ============================================
// DELETE SPECIAL OFFER
// ============================================
export const deleteSpecialOffer = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        // ✅ FIXED: Populate restaurant with owner
        const offer = await SpecialOffer.findById(req.params.id)
            .populate({
                path: 'restaurant',
                populate: {
                    path: 'owner',
                    select: '_id',
                },
            });

        if (!offer) {
            throw new AppError('Special offer not found', 404);
        }

        // ✅ FIXED: Get owner ID safely
        const ownerId = getRestaurantOwnerId(offer.restaurant);
        const isOwner = ownerId === req.user!._id.toString();
        const isAdmin = req.user!.role === 'admin';

        if (!isOwner && !isAdmin) {
            throw new AppError('Not authorized to delete this offer', 403);
        }

        await offer.deleteOne();

        logger.info(`✅ Special offer deleted: ${offer.title}`);

        res.status(200).json({
            success: true,
            message: 'Special offer deleted successfully',
        });
    }
);

// ============================================
// TOGGLE OFFER STATUS
// ============================================
export const toggleOfferStatus = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        // ✅ FIXED: Populate restaurant with owner
        const offer = await SpecialOffer.findById(req.params.id)
            .populate({
                path: 'restaurant',
                populate: {
                    path: 'owner',
                    select: '_id',
                },
            });

        if (!offer) {
            throw new AppError('Special offer not found', 404);
        }

        // ✅ FIXED: Get owner ID safely
        const ownerId = getRestaurantOwnerId(offer.restaurant);
        const isOwner = ownerId === req.user!._id.toString();
        const isAdmin = req.user!.role === 'admin';

        if (!isOwner && !isAdmin) {
            throw new AppError('Not authorized to update this offer', 403);
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        res.status(200).json({
            success: true,
            message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
            offer,
        });
    }
);

// ============================================
// GET ACTIVE OFFERS FOR RESTAURANT
// ============================================
export const getActiveOffersForRestaurant = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { restaurantId } = req.params;
        const now = new Date();

        const offers = await SpecialOffer.find({
            restaurant: restaurantId,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        }).populate('applicableMenuItems', 'name price image');

        res.status(200).json({
            success: true,
            count: offers.length,
            offers,
        });
    }
);

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
    getSpecialOffers,
    getSpecialOffer,
    createSpecialOffer,
    updateSpecialOffer,
    deleteSpecialOffer,
    toggleOfferStatus,
    getActiveOffersForRestaurant,
};