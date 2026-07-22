import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';
import { Restaurant } from '../models/Restaurant.model';
import { MenuItem } from '../models/MenuItem.model';
import { Order } from '../models/Order.model';
import { Blog } from '../models/Blog.model';
import { Review } from '../models/Review.model';
import { connectDB } from '../config/database';
import logger from '../utils/logger';

dotenv.config();

const clearDatabase = async (): Promise<void> => {
    try {
        await connectDB();
        logger.info('🗄️ Connected to database');

        // Clear all collections
        await User.deleteMany({});
        await Restaurant.deleteMany({});
        await MenuItem.deleteMany({});
        await Order.deleteMany({});
        await Blog.deleteMany({});
        await Review.deleteMany({});

        logger.info('✅ Database cleared successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Failed to clear database:', error);
        process.exit(1);
    }
};

if (require.main === module) {
    clearDatabase();
}

export { clearDatabase };