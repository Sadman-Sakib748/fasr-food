import { body, param, query } from 'express-validator';

// Auth validators
export const validateRegister = [
  body('name').notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('role').optional().isIn(['customer', 'restaurant', 'rider']).withMessage('Invalid role'),
];

export const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// Restaurant validators
export const validateCreateRestaurant = [
  body('restaurantName').notEmpty().withMessage('Restaurant name is required'),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.zipCode').notEmpty().withMessage('Zip code is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Invalid email address'),
];

// Menu validators
export const validateCreateMenuItem = [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category')
    .isIn(['appetizers', 'mains', 'desserts', 'beverages', 'sides', 'soups', 'salads', 'other'])
    .withMessage('Invalid category'),
];

// Order validators
export const validateCreateOrder = [
  body('restaurant').isMongoId().withMessage('Invalid restaurant ID'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItem').isMongoId().withMessage('Invalid menu item ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
  body('deliveryAddress.city').notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').notEmpty().withMessage('State is required'),
  body('deliveryAddress.zipCode').notEmpty().withMessage('Zip code is required'),
  body('paymentMethod').isIn(['stripe', 'bkash', 'cod']).withMessage('Invalid payment method'),
];

export const validateUpdateOrderStatus = [
  body('orderStatus')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
];

// Review validators
export const validateCreateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').notEmpty().withMessage('Comment is required').isLength({ max: 500 }),
  body('reviewType').isIn(['restaurant', 'menuItem', 'rider']).withMessage('Invalid review type'),
];

// Blog validators
export const validateCreateBlog = [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('excerpt').notEmpty().withMessage('Excerpt is required'),
  body('category')
    .isIn(['food', 'health', 'lifestyle', 'recipes', 'tips', 'news'])
    .withMessage('Invalid category'),
];

// ID validators
export const validateId = (paramName: string = 'id') => {
  return param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`);
};

// Pagination validators
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Search validators
export const validateSearch = [
  query('search').optional().isString().withMessage('Search must be a string'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('cuisine').optional().isString().withMessage('Cuisine must be a string'),
  query('city').optional().isString().withMessage('City must be a string'),
];

// Location validators
export const validateLocation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

// Export all validators
export default {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateCreateRestaurant,
  validateCreateMenuItem,
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateCreateReview,
  validateCreateBlog,
  validateId,
  validatePagination,
  validateSearch,
  validateLocation,
};