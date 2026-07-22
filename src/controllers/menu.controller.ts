import { Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem.model';
import { Restaurant } from '../models/Restaurant.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

// ============================================
// HELPER FUNCTION - Get Restaurant Owner ID
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
// HELPER FUNCTION - Check Restaurant Ownership
// ============================================
const isRestaurantOwner = (restaurant: any, userId: string): boolean => {
  const ownerId = getRestaurantOwnerId(restaurant);
  return ownerId === userId;
};

// ============================================
// GET ALL MENU ITEMS
// @route   GET /api/menu
// @access  Public
// ============================================
export const getMenuItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { 
      restaurantId, 
      category, 
      search, 
      isVegetarian, 
      isSpicy,
      priceMin,
      priceMax,
      page = 1, 
      limit = 20 
    } = req.query;

    const query: any = { isActive: true };

    if (restaurantId) {
      query.restaurant = restaurantId;
    }

    if (category) {
      query.category = category;
    }

    if (isVegetarian) {
      query.isVegetarian = isVegetarian === 'true';
    }

    if (isSpicy) {
      query.isSpicy = isSpicy === 'true';
    }

    if (priceMin) {
      query.price = { ...query.price, $gte: parseFloat(priceMin as string) };
    }

    if (priceMax) {
      query.price = { ...query.price, $lte: parseFloat(priceMax as string) };
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(query)
        .populate('restaurant', 'restaurantName logo')
        .skip(skip)
        .limit(limitNum)
        .sort({ category: 1, name: 1 })
        .lean(),
      MenuItem.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      items,
    });
  }
);

// ============================================
// GET SINGLE MENU ITEM
// @route   GET /api/menu/:id
// @access  Public
// ============================================
export const getMenuItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const item = await MenuItem.findById(req.params.id)
      .populate('restaurant', 'restaurantName logo address phone')
      .lean();

    if (!item) {
      throw new AppError('Menu item not found', 404);
    }

    res.status(200).json({
      success: true,
      item,
    });
  }
);

// ============================================
// CREATE MENU ITEM
// @route   POST /api/menu
// @access  Private (Restaurant owner/Admin)
// ============================================
export const createMenuItem = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { restaurant: restaurantId, ...data } = req.body;

    if (!restaurantId) {
      throw new AppError('Restaurant ID is required', 400);
    }

    // ✅ FIXED: Populate owner to access owner._id
    const restaurant = await Restaurant.findById(restaurantId)
      .populate('owner', '_id');

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // ✅ FIXED: Check ownership using helper
    const isOwner = isRestaurantOwner(restaurant, req.user!._id.toString());
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to add menu items to this restaurant', 403);
    }

    const menuItem = await MenuItem.create({
      restaurant: restaurantId,
      ...data,
    });

    // Populate restaurant data for response
    await menuItem.populate('restaurant', 'restaurantName logo');

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      menuItem,
    });
  }
);

// ============================================
// UPDATE MENU ITEM
// @route   PUT /api/menu/:id
// @access  Private (Restaurant owner/Admin)
// ============================================
export const updateMenuItem = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    // ✅ FIXED: Populate restaurant with owner
    const menuItem = await MenuItem.findById(req.params.id)
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: '_id',
        },
      });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    // ✅ FIXED: Check ownership using helper
    const restaurant = menuItem.restaurant;
    const isOwner = isRestaurantOwner(restaurant, req.user!._id.toString());
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to update this menu item', 403);
    }

    // Prevent updating restaurant ID
    delete req.body.restaurant;

    const updated = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('restaurant', 'restaurantName logo');

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      menuItem: updated,
    });
  }
);

// ============================================
// DELETE MENU ITEM
// @route   DELETE /api/menu/:id
// @access  Private (Restaurant owner/Admin)
// ============================================
export const deleteMenuItem = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    // ✅ FIXED: Populate restaurant with owner
    const menuItem = await MenuItem.findById(req.params.id)
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: '_id',
        },
      });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    // ✅ FIXED: Check ownership using helper
    const restaurant = menuItem.restaurant;
    const isOwner = isRestaurantOwner(restaurant, req.user!._id.toString());
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this menu item', 403);
    }

    await menuItem.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  }
);

// ============================================
// GET MENU ITEMS BY CATEGORY
// @route   GET /api/menu/category/:category
// @access  Public
// ============================================
export const getMenuItemsByCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category } = req.params;
    const { restaurantId, page = 1, limit = 20 } = req.query;

    const query: any = { 
      category, 
      isActive: true 
    };

    if (restaurantId) {
      query.restaurant = restaurantId;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(query)
        .populate('restaurant', 'restaurantName logo')
        .skip(skip)
        .limit(limitNum)
        .sort({ name: 1 })
        .lean(),
      MenuItem.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      items,
    });
  }
);

// ============================================
// TOGGLE MENU ITEM ACTIVE STATUS
// @route   PATCH /api/menu/:id/toggle
// @access  Private (Restaurant owner/Admin)
// ============================================
export const toggleMenuItemStatus = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    // ✅ FIXED: Populate restaurant with owner
    const menuItem = await MenuItem.findById(req.params.id)
      .populate({
        path: 'restaurant',
        populate: {
          path: 'owner',
          select: '_id',
        },
      });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    // ✅ FIXED: Check ownership using helper
    const restaurant = menuItem.restaurant;
    const isOwner = isRestaurantOwner(restaurant, req.user!._id.toString());
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to update this menu item', 403);
    }

    // Toggle active status
    menuItem.isActive = !menuItem.isActive;
    await menuItem.save();

    res.status(200).json({
      success: true,
      message: `Menu item ${menuItem.isActive ? 'activated' : 'deactivated'} successfully`,
      menuItem,
    });
  }
);

// ============================================
// GET RESTAURANT MENU WITH CATEGORIES
// @route   GET /api/menu/restaurant/:restaurantId
// @access  Public
// ============================================
export const getRestaurantMenu = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Get all active menu items grouped by category
    const menuItems = await MenuItem.find({
      restaurant: restaurantId,
      isActive: true,
    })
      .sort({ category: 1, name: 1 })
      .lean();

    // Group by category
    const groupedMenu = menuItems.reduce((acc: any, item) => {
      const category = item.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      restaurant: {
        id: restaurant._id,
        name: restaurant.restaurantName,
        logo: restaurant.logo,
      },
      menu: groupedMenu,
    });
  }
);