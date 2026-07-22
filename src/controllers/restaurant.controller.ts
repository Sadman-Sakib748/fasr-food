import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant.model';
import { User } from '../models/User.model';
import { MenuItem } from '../models/MenuItem.model';
import { Review } from '../models/Review.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const getRestaurants = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      search,
      cuisine,
      city,
      minRating,
      maxDeliveryTime,
      page = 1,
      limit = 10,
    } = req.query;

    const query: any = { status: 'active' };

    if (search) {
      query.$text = { $search: search as string };
    }

    if (cuisine) {
      query.cuisineType = { $in: (cuisine as string).split(',') };
    }

    if (city) {
      query['address.city'] = { $regex: city as string, $options: 'i' };
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating as string) };
    }

    if (maxDeliveryTime) {
      query.deliveryTime = { $lte: parseInt(maxDeliveryTime as string) };
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query)
        .populate('owner', 'name email phone')
        .sort({ rating: -1 })
        .skip(skip)
        .limit(limitNum),
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

export const getRestaurant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate({
        path: 'menuItems',
        match: { isActive: true },
        options: { sort: { category: 1 } },
      });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    const reviews = await Review.find({
      restaurant: restaurant._id,
      isVerified: true,
    })
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      restaurant,
      reviews,
    });
  }
);

export const createRestaurant = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      restaurantName,
      description,
      cuisineType,
      address,
      phone,
      email,
      operatingHours,
      deliveryTime,
      deliveryCharge,
      minimumOrder,
    } = req.body;

    const existingRestaurant = await Restaurant.findOne({
      owner: req.user!._id,
    });
    if (existingRestaurant) {
      throw new AppError('You already have a restaurant', 400);
    }

    const restaurant = await Restaurant.create({
      owner: req.user!._id,
      restaurantName,
      description,
      cuisineType,
      address,
      phone,
      email,
      operatingHours,
      deliveryTime,
      deliveryCharge,
      minimumOrder,
    });

    if (req.user!.role !== 'restaurant') {
      await User.findByIdAndUpdate(req.user!._id, { role: 'restaurant' });
    }

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      restaurant,
    });
  }
);

export const updateRestaurant = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    if (
      restaurant.owner.toString() !== req.user!._id.toString() &&
      req.user!.role !== 'admin'
    ) {
      throw new AppError('Not authorized to update this restaurant', 403);
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      restaurant: updatedRestaurant,
    });
  }
);

export const deleteRestaurant = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    if (
      restaurant.owner.toString() !== req.user!._id.toString() &&
      req.user!.role !== 'admin'
    ) {
      throw new AppError('Not authorized to delete this restaurant', 403);
    }

    await restaurant.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully',
    });
  }
);