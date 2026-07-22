// src/seeders/index.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';
import { Restaurant } from '../models/Restaurant.model';
import { MenuItem } from '../models/MenuItem.model';
import { Order } from '../models/Order.model';
import { Blog } from '../models/Blog.model';
import { Review } from '../models/Review.model';
import { connectDB } from '../config/database';

dotenv.config();

// ============================================
// HELPER: Generate Order Number
// ============================================
const generateOrderNumber = (): string => {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
};

// ============================================
// 1. SEED ADMIN
// ============================================
const seedAdmin = async (): Promise<any> => {
    console.log('\n👑 Seeding Admin...');
    console.log('='.repeat(40));

    const adminData = {
        name: 'Super Admin',
        email: 'admin@gmail.com',
        password: 'admin123456',
        role: 'admin',
        status: 'active',
        phone: '+8801712345678',
        emailVerified: true,
        preferences: { language: 'en', theme: 'dark', notifications: true },
    };

    try {
        await User.deleteOne({ email: adminData.email });
        console.log(`🗑️ Deleted existing: ${adminData.email}`);

        const user = await User.create(adminData);
        console.log(`✅ Admin created: ${user.email}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log(`   🔑 Password: ${adminData.password}`);
        
        return user;
    } catch (error) {
        console.error(`❌ Failed to seed admin:`, error);
        return null;
    }
};

// ============================================
// 2. SEED RIDER
// ============================================
const seedRider = async (): Promise<any> => {
    console.log('\n🏍️ Seeding Rider...');
    console.log('='.repeat(40));

    const riderData = {
        name: 'Rider Ahmed',
        email: 'rider@gmail.com',
        password: 'rider123456',
        role: 'rider',
        status: 'active',
        phone: '+8801712345679',
        emailVerified: true,
        earnings: 0,
        completedDeliveries: 0,
        preferences: { language: 'en', theme: 'light', notifications: true },
        address: {
            street: '123 Rider Lane',
            city: 'Dhaka',
            state: 'Dhaka',
            zipCode: '1200',
            country: 'Bangladesh'
        }
    };

    try {
        await User.deleteOne({ email: riderData.email });
        console.log(`🗑️ Deleted existing: ${riderData.email}`);

        const user = await User.create(riderData);
        console.log(`✅ Rider created: ${user.email}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log(`   🔑 Password: ${riderData.password}`);
        return user;
    } catch (error) {
        console.error(`❌ Failed to seed rider:`, error);
        return null;
    }
};

// ============================================
// 3. SEED CUSTOMER
// ============================================
const seedCustomer = async (): Promise<any> => {
    console.log('\n👤 Seeding Customer...');
    console.log('='.repeat(40));

    const customerData = {
        name: 'John Doe',
        email: 'customer@gmail.com',
        password: 'customer123456',
        role: 'customer',
        status: 'active',
        phone: '+8801812345678',
        emailVerified: true,
        preferences: { language: 'en', theme: 'light', notifications: true },
        address: {
            street: '456 Customer Ave',
            city: 'Dhaka',
            state: 'Dhaka',
            zipCode: '1200',
            country: 'Bangladesh'
        }
    };

    try {
        await User.deleteOne({ email: customerData.email });
        console.log(`🗑️ Deleted existing: ${customerData.email}`);

        const user = await User.create(customerData);
        console.log(`✅ Customer created: ${user.email}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log(`   🔑 Password: ${customerData.password}`);
        return user;
    } catch (error) {
        console.error(`❌ Failed to seed customer:`, error);
        return null;
    }
};

// ============================================
// 4. SEED RESTAURANT OWNER
// ============================================
const seedRestaurantOwner = async (): Promise<any> => {
    console.log('\n🏪 Seeding Restaurant Owner...');
    console.log('='.repeat(40));

    const ownerData = {
        name: 'Restaurant Owner',
        email: 'owner@gmail.com',
        password: 'owner123456',
        role: 'restaurant',
        status: 'active',
        phone: '+8801912345678',
        emailVerified: true,
        preferences: { language: 'en', theme: 'light', notifications: true },
        address: {
            street: '789 Restaurant Blvd',
            city: 'Dhaka',
            state: 'Dhaka',
            zipCode: '1200',
            country: 'Bangladesh'
        }
    };

    try {
        await User.deleteOne({ email: ownerData.email });
        console.log(`🗑️ Deleted existing: ${ownerData.email}`);

        const user = await User.create(ownerData);
        console.log(`✅ Restaurant Owner created: ${user.email}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log(`   🔑 Password: ${ownerData.password}`);
        return user;
    } catch (error) {
        console.error(`❌ Failed to seed restaurant owner:`, error);
        return null;
    }
};

// ============================================
// 5. SEED MODERATOR
// ============================================
const seedModerator = async (): Promise<any> => {
    console.log('\n🛡️ Seeding Moderator...');
    console.log('='.repeat(40));

    const moderatorData = {
        name: 'Content Moderator',
        email: 'moderator@gmail.com',
        password: 'moderator123456',
        role: 'moderator',
        status: 'active',
        phone: '+8802012345678',
        emailVerified: true,
        preferences: { language: 'en', theme: 'light', notifications: true },
    };

    try {
        await User.deleteOne({ email: moderatorData.email });
        console.log(`🗑️ Deleted existing: ${moderatorData.email}`);

        const user = await User.create(moderatorData);
        console.log(`✅ Moderator created: ${user.email}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log(`   🔑 Password: ${moderatorData.password}`);
        return user;
    } catch (error) {
        console.error(`❌ Failed to seed moderator:`, error);
        return null;
    }
};

// ============================================
// 6. SEED RESTAURANT
// ============================================
const seedRestaurant = async (ownerId: string): Promise<any> => {
    console.log('\n🏪 Seeding Restaurant...');
    console.log('='.repeat(40));

    const restaurantData = {
        owner: new mongoose.Types.ObjectId(ownerId),
        restaurantName: 'Pizza Palace',
        description: 'Authentic Italian pizza made with fresh ingredients',
        cuisineType: ['Italian', 'Pizza', 'Fast Food'],
        status: 'active',
        isVerified: true,
        rating: 4.5,
        totalOrders: 0,
        totalRevenue: 0,
        address: {
            street: '123 Food Street',
            city: 'Dhaka',
            state: 'Dhaka',
            zipCode: '1200',
            country: 'Bangladesh',
            coordinates: { type: 'Point', coordinates: [90.4125, 23.8103] }
        },
        phone: '+8801712345670',
        email: 'info@pizzapalace.com',
        operatingHours: [
            { day: 'Monday', open: '10:00', close: '22:00' },
            { day: 'Tuesday', open: '10:00', close: '22:00' },
            { day: 'Wednesday', open: '10:00', close: '22:00' },
            { day: 'Thursday', open: '10:00', close: '22:00' },
            { day: 'Friday', open: '14:00', close: '22:00' },
            { day: 'Saturday', open: '10:00', close: '22:00' },
            { day: 'Sunday', open: '10:00', close: '22:00' },
        ],
        deliveryTime: 30,
        deliveryCharge: 50,
        minimumOrder: 200,
        isOpen: true,
        images: ['https://example.com/pizza-palace.jpg'],
        logo: 'https://example.com/logo.png',
    };

    try {
        await Restaurant.deleteOne({ restaurantName: restaurantData.restaurantName });
        console.log(`🗑️ Deleted existing restaurant: ${restaurantData.restaurantName}`);

        const restaurant = await Restaurant.create(restaurantData);
        console.log(`✅ Restaurant created: ${restaurant.restaurantName}`);
        console.log(`   🆔 ID: ${restaurant._id}`);
        return restaurant;
    } catch (error) {
        console.error(`❌ Failed to seed restaurant:`, error);
        return null;
    }
};

// ============================================
// 7. SEED SECOND RESTAURANT
// ============================================
const seedSecondRestaurant = async (ownerId: string): Promise<any> => {
    console.log('\n🏪 Seeding Second Restaurant...');
    console.log('='.repeat(40));

    const restaurantData = {
        owner: new mongoose.Types.ObjectId(ownerId),
        restaurantName: 'Spice Garden',
        description: 'Authentic Indian and Bangladeshi cuisine',
        cuisineType: ['Indian', 'Bangladeshi', 'Spicy'],
        status: 'active',
        isVerified: true,
        rating: 4.2,
        totalOrders: 0,
        totalRevenue: 0,
        address: {
            street: '456 Spice Lane',
            city: 'Chittagong',
            state: 'Chittagong',
            zipCode: '4000',
            country: 'Bangladesh',
            coordinates: { type: 'Point', coordinates: [91.7895, 22.3568] }
        },
        phone: '+8801812345670',
        email: 'info@spicegarden.com',
        operatingHours: [
            { day: 'Monday', open: '11:00', close: '23:00' },
            { day: 'Tuesday', open: '11:00', close: '23:00' },
            { day: 'Wednesday', open: '11:00', close: '23:00' },
            { day: 'Thursday', open: '11:00', close: '23:00' },
            { day: 'Friday', open: '15:00', close: '23:00' },
            { day: 'Saturday', open: '11:00', close: '23:00' },
            { day: 'Sunday', open: '11:00', close: '23:00' },
        ],
        deliveryTime: 40,
        deliveryCharge: 60,
        minimumOrder: 150,
        isOpen: true,
        images: ['https://example.com/spice-garden.jpg'],
        logo: 'https://example.com/spice-logo.png',
    };

    try {
        await Restaurant.deleteOne({ restaurantName: restaurantData.restaurantName });
        console.log(`🗑️ Deleted existing restaurant: ${restaurantData.restaurantName}`);

        const restaurant = await Restaurant.create(restaurantData);
        console.log(`✅ Restaurant created: ${restaurant.restaurantName}`);
        console.log(`   🆔 ID: ${restaurant._id}`);
        return restaurant;
    } catch (error) {
        console.error(`❌ Failed to seed second restaurant:`, error);
        return null;
    }
};

// ============================================
// 8. SEED MENU ITEMS
// ============================================
const seedMenuItems = async (restaurantId: string): Promise<void> => {
    console.log('\n🍕 Seeding Menu Items...');
    console.log('='.repeat(40));

    const menuItems = [
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Margherita Pizza',
            description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil',
            price: 450,
            category: 'mains',
            isVegetarian: true,
            isSpicy: false,
            isActive: true,
            preparationTime: 15,
            image: 'https://example.com/margherita.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Pepperoni Pizza',
            description: 'Pizza with pepperoni, mozzarella, and tomato sauce',
            price: 550,
            category: 'mains',
            isVegetarian: false,
            isSpicy: true,
            isActive: true,
            preparationTime: 20,
            image: 'https://example.com/pepperoni.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Garlic Bread',
            description: 'Toasted bread with garlic butter and herbs',
            price: 150,
            category: 'appetizers',
            isVegetarian: true,
            isSpicy: false,
            isActive: true,
            preparationTime: 10,
            image: 'https://example.com/garlic-bread.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan',
            price: 250,
            category: 'salads',
            isVegetarian: true,
            isSpicy: false,
            isActive: true,
            preparationTime: 10,
            image: 'https://example.com/caesar-salad.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Tiramisu',
            description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
            price: 200,
            category: 'desserts',
            isVegetarian: true,
            isSpicy: false,
            isActive: true,
            preparationTime: 5,
            image: 'https://example.com/tiramisu.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Coca-Cola',
            description: 'Classic carbonated soft drink',
            price: 80,
            category: 'beverages',
            isVegetarian: true,
            isSpicy: false,
            isActive: true,
            preparationTime: 2,
            image: 'https://example.com/coke.jpg',
        },
    ];

    try {
        await MenuItem.deleteMany({ restaurant: restaurantId });
        console.log(`🗑️ Deleted existing menu items`);

        const created = await MenuItem.insertMany(menuItems);
        console.log(`✅ ${created.length} menu items created`);

    } catch (error) {
        console.error(`❌ Failed to seed menu items:`, error);
    }
    console.log('='.repeat(40));
};

// ============================================
// 9. SEED SECOND RESTAURANT MENU
// ============================================
const seedSecondRestaurantMenu = async (restaurantId: string): Promise<void> => {
    console.log('\n🍛 Seeding Second Restaurant Menu...');
    console.log('='.repeat(40));

    const menuItems = [
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Chicken Biryani',
            description: 'Fragrant basmati rice with spiced chicken',
            price: 350,
            category: 'mains',
            isVegetarian: false,
            isSpicy: true,
            isActive: true,
            preparationTime: 25,
            image: 'https://example.com/biryani.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Butter Chicken',
            description: 'Creamy tomato-based curry with tender chicken',
            price: 400,
            category: 'mains',
            isVegetarian: false,
            isSpicy: true,
            isActive: true,
            preparationTime: 20,
            image: 'https://example.com/butter-chicken.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Naan Bread',
            description: 'Traditional oven-baked flatbread',
            price: 80,
            category: 'sides',
            isVegetarian: true,
            isSpicy: false,
            isActive: true,
            preparationTime: 5,
            image: 'https://example.com/naan.jpg',
        },
        {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            name: 'Gulab Jamun',
            description: 'Sweet milk dumplings in rose syrup',
            price: 120,
            category: 'desserts',
            isVegetarian: true,
            isSpicy: false,
            isActive: true,
            preparationTime: 5,
            image: 'https://example.com/gulab-jamun.jpg',
        },
    ];

    try {
        await MenuItem.deleteMany({ restaurant: restaurantId });
        console.log(`🗑️ Deleted existing menu items`);

        const created = await MenuItem.insertMany(menuItems);
        console.log(`✅ ${created.length} menu items created for Spice Garden`);

    } catch (error) {
        console.error(`❌ Failed to seed second restaurant menu:`, error);
    }
    console.log('='.repeat(40));
};

// ============================================
// 10. SEED ORDERS
// ============================================
const seedOrders = async (customerId: string, restaurantId: string, riderId: string): Promise<void> => {
    console.log('\n📦 Seeding Orders...');
    console.log('='.repeat(40));

    const menuItems = await MenuItem.find({ restaurant: restaurantId }).limit(2);
    if (menuItems.length < 2) {
        console.log('⚠️ Not enough menu items found for orders');
        return;
    }

    const orders = [
        {
            orderNumber: generateOrderNumber(),
            customer: new mongoose.Types.ObjectId(customerId),
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            rider: new mongoose.Types.ObjectId(riderId),
            items: [
                { menuItem: menuItems[0]._id, quantity: 2, price: menuItems[0].price },
                { menuItem: menuItems[1]._id, quantity: 1, price: menuItems[1].price }
            ],
            subtotal: (menuItems[0].price * 2) + menuItems[1].price,
            tax: Math.round(((menuItems[0].price * 2) + menuItems[1].price) * 0.1),
            deliveryCharge: 50,
            totalAmount: Math.round(((menuItems[0].price * 2) + menuItems[1].price) * 1.1) + 50,
            orderStatus: 'delivered',
            paymentStatus: 'completed',
            paymentMethod: 'cod',
            deliveryAddress: {
                street: '123 Customer St',
                city: 'Dhaka',
                state: 'Dhaka',
                zipCode: '1200',
                country: 'Bangladesh'
            },
            statusHistory: [
                { status: 'pending', timestamp: new Date(Date.now() - 3600000), note: 'Order placed' },
                { status: 'confirmed', timestamp: new Date(Date.now() - 3000000), note: 'Confirmed by restaurant' },
                { status: 'preparing', timestamp: new Date(Date.now() - 2400000), note: 'Preparing food' },
                { status: 'ready', timestamp: new Date(Date.now() - 1800000), note: 'Ready for pickup' },
                { status: 'picked_up', timestamp: new Date(Date.now() - 1200000), note: 'Picked up by rider' },
                { status: 'in_transit', timestamp: new Date(Date.now() - 600000), note: 'On the way' },
                { status: 'delivered', timestamp: new Date(Date.now()), note: 'Delivered successfully' },
            ],
            createdAt: new Date(Date.now() - 3600000),
        },
        {
            orderNumber: generateOrderNumber(),
            customer: new mongoose.Types.ObjectId(customerId),
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            items: [
                { menuItem: menuItems[0]._id, quantity: 1, price: menuItems[0].price }
            ],
            subtotal: menuItems[0].price,
            tax: Math.round(menuItems[0].price * 0.1),
            deliveryCharge: 50,
            totalAmount: Math.round(menuItems[0].price * 1.1) + 50,
            orderStatus: 'pending',
            paymentStatus: 'pending',
            paymentMethod: 'stripe',
            deliveryAddress: {
                street: '456 Customer Ave',
                city: 'Dhaka',
                state: 'Dhaka',
                zipCode: '1200',
                country: 'Bangladesh'
            },
            statusHistory: [
                { status: 'pending', timestamp: new Date(), note: 'Order placed' },
            ],
            createdAt: new Date(),
        }
    ];

    try {
        await Order.deleteMany({ customer: customerId });
        console.log(`🗑️ Deleted existing orders`);

        const created = await Order.insertMany(orders);
        console.log(`✅ ${created.length} orders created`);

    } catch (error) {
        console.error(`❌ Failed to seed orders:`, error);
    }
    console.log('='.repeat(40));
};

// ============================================
// 11. SEED BLOGS (FIXED CATEGORIES)
// ============================================
const seedBlogs = async (authorId: string): Promise<void> => {
    console.log('\n📝 Seeding Blogs...');
    console.log('='.repeat(40));

    const blogs = [
        {
            title: 'The Future of Food Delivery',
            slug: 'future-of-food-delivery',
            content: `The food delivery industry is evolving rapidly with AI and automation. 
            From drone deliveries to AI-powered recommendations, the future of food delivery 
            is more exciting than ever. This blog explores the latest trends and technologies 
            that are shaping the industry.`,
            excerpt: 'Discover how technology is transforming the food delivery experience',
            category: 'food',
            tags: ['food', 'technology', 'delivery'],
            image: 'https://example.com/blog1.jpg',
            status: 'published',
            author: new mongoose.Types.ObjectId(authorId),
            views: 1500,
            likes: 120,
            isPublished: true,
            createdAt: new Date(Date.now() - 86400000 * 5),
        },
        {
            title: 'Healthy Eating Habits in 2024',
            slug: 'healthy-eating-habits-2024',
            content: `Maintaining a healthy diet is crucial for overall well-being. 
            In 2024, we're seeing a shift towards plant-based diets, mindful eating, 
            and sustainable food choices. This comprehensive guide will help you develop 
            sustainable healthy eating habits that last.`,
            excerpt: 'Tips and tricks for developing sustainable healthy eating habits',
            category: 'health',
            tags: ['health', 'nutrition', 'wellness'],
            image: 'https://example.com/blog2.jpg',
            status: 'published',
            author: new mongoose.Types.ObjectId(authorId),
            views: 980,
            likes: 85,
            isPublished: true,
            createdAt: new Date(Date.now() - 86400000 * 3),
        },
        {
            title: 'Top 10 Recipes of the Month',
            slug: 'top-10-recipes-month',
            content: `From classic comfort foods to exotic international dishes, 
            this month's top recipes are sure to delight your taste buds. 
            We've curated the most popular recipes our users are loving right now, 
            featuring easy-to-follow instructions and pro tips.`,
            excerpt: 'Discover the most popular recipes our users are loving this month',
            category: 'recipes',
            tags: ['recipes', 'cooking', 'food'],
            image: 'https://example.com/blog3.jpg',
            status: 'draft',
            author: new mongoose.Types.ObjectId(authorId),
            views: 0,
            likes: 0,
            isPublished: false,
            createdAt: new Date(),
        },
        {
            title: '10 Tips for Better Food Photography',
            slug: 'tips-for-better-food-photography',
            content: `Great food photography can make your dishes look irresistible. 
            Learn the best tips and tricks for capturing stunning food photos 
            that will make your audience hungry.`,
            excerpt: 'Master the art of food photography with these simple tips',
            category: 'tips',
            tags: ['photography', 'tips', 'food'],
            image: 'https://example.com/blog4.jpg',
            status: 'published',
            author: new mongoose.Types.ObjectId(authorId),
            views: 620,
            likes: 45,
            isPublished: true,
            createdAt: new Date(Date.now() - 86400000 * 1),
        },
        {
            title: 'Latest Food Industry News 2024',
            slug: 'food-industry-news-2024',
            content: `Stay updated with the latest news in the food industry. 
            From new restaurant openings to food safety regulations, 
            here's everything you need to know.`,
            excerpt: 'Your weekly roundup of food industry news and updates',
            category: 'news',
            tags: ['news', 'industry', 'food'],
            image: 'https://example.com/blog5.jpg',
            status: 'published',
            author: new mongoose.Types.ObjectId(authorId),
            views: 430,
            likes: 30,
            isPublished: true,
            createdAt: new Date(Date.now() - 86400000 * 0.5),
        }
    ];

    try {
        await Blog.deleteMany({});
        console.log(`🗑️ Deleted existing blogs`);

        const created = await Blog.insertMany(blogs);
        console.log(`✅ ${created.length} blogs created`);

    } catch (error) {
        console.error(`❌ Failed to seed blogs:`, error);
    }
    console.log('='.repeat(40));
};

// ============================================
// 12. SEED REVIEWS
// ============================================
const seedReviews = async (customerId: string, restaurantId: string): Promise<void> => {
    console.log('\n⭐ Seeding Reviews...');
    console.log('='.repeat(40));

    const reviews = [
        {
            customer: new mongoose.Types.ObjectId(customerId),
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            rating: 5,
            comment: 'Amazing food! The pizza was delicious and delivery was fast. Highly recommended!',
            reviewType: 'restaurant',
            isVerified: true,
            helpful: 15,
            unhelpful: 1,
            status: 'active',
            createdAt: new Date(Date.now() - 86400000 * 2),
        },
        {
            customer: new mongoose.Types.ObjectId(customerId),
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            rating: 4,
            comment: 'Great food, but delivery took a bit longer than expected. Still worth it!',
            reviewType: 'restaurant',
            isVerified: true,
            helpful: 8,
            unhelpful: 0,
            status: 'active',
            createdAt: new Date(Date.now() - 86400000),
        },
        {
            customer: new mongoose.Types.ObjectId(customerId),
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            rating: 5,
            comment: 'Best pizza in Dhaka! The crust is perfect and the ingredients are fresh.',
            reviewType: 'restaurant',
            isVerified: true,
            helpful: 22,
            unhelpful: 2,
            status: 'active',
            createdAt: new Date(Date.now() - 86400000 * 4),
        },
        {
            customer: new mongoose.Types.ObjectId(customerId),
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            rating: 3,
            comment: 'Good food but price is a bit high compared to other places.',
            reviewType: 'restaurant',
            isVerified: false,
            helpful: 3,
            unhelpful: 1,
            status: 'pending',
            createdAt: new Date(),
        }
    ];

    try {
        await Review.deleteMany({});
        console.log(`🗑️ Deleted existing reviews`);

        const created = await Review.insertMany(reviews);
        console.log(`✅ ${created.length} reviews created`);

    } catch (error) {
        console.error(`❌ Failed to seed reviews:`, error);
    }
    console.log('='.repeat(40));
};

// ============================================
// 13. SEED EXTRA DATA (OPTIONAL)
// ============================================
const seedExtraData = async (customerId: string, restaurantId: string): Promise<void> => {
    console.log('\n📊 Seeding Extra Data...');
    console.log('='.repeat(40));

    try {
        await Restaurant.findByIdAndUpdate(restaurantId, {
            $inc: { totalOrders: 50, totalRevenue: 25000 },
            rating: 4.6
        });
        console.log(`✅ Restaurant stats updated`);

        await User.findByIdAndUpdate(customerId, {
            preferences: {
                language: 'en',
                theme: 'dark',
                notifications: true,
                favoriteCuisines: ['Italian', 'Fast Food'],
                savedAddresses: [
                    { label: 'Home', street: '123 Customer St', city: 'Dhaka' },
                    { label: 'Office', street: '456 Corporate Ave', city: 'Dhaka' }
                ]
            }
        });
        console.log(`✅ Customer preferences updated`);

    } catch (error) {
        console.error(`❌ Failed to seed extra data:`, error);
    }
    console.log('='.repeat(40));
};

// ============================================
// MAIN SEEDER FUNCTION
// ============================================
const seedDatabase = async (): Promise<void> => {
    try {
        await connectDB();
        console.log('\n🗄️ Connected to database');
        console.log('🌱 Starting database seeding...\n');

        // Step 1: Seed Users
        console.log('📋 STEP 1: Creating Users');
        console.log('='.repeat(60));
        const admin = await seedAdmin();
        const rider = await seedRider();
        const customer = await seedCustomer();
        const restaurantOwner = await seedRestaurantOwner();
        const moderator = await seedModerator();

        if (!admin || !rider || !customer || !restaurantOwner || !moderator) {
            console.log('⚠️ Some users failed to seed. Continuing with available data...');
        }

        // Step 2: Seed Restaurants
        console.log('\n📋 STEP 2: Creating Restaurants');
        console.log('='.repeat(60));
        const restaurant1 = await seedRestaurant(restaurantOwner?._id || new mongoose.Types.ObjectId().toString());
        const restaurant2 = await seedSecondRestaurant(restaurantOwner?._id || new mongoose.Types.ObjectId().toString());

        // Step 3: Seed Menu Items
        console.log('\n📋 STEP 3: Creating Menu Items');
        console.log('='.repeat(60));
        if (restaurant1) {
            await seedMenuItems(restaurant1._id.toString());
        }
        if (restaurant2) {
            await seedSecondRestaurantMenu(restaurant2._id.toString());
        }

        // Step 4: Seed Orders
        console.log('\n📋 STEP 4: Creating Orders');
        console.log('='.repeat(60));
        if (customer && restaurant1 && rider) {
            await seedOrders(customer._id.toString(), restaurant1._id.toString(), rider._id.toString());
        } else {
            console.log('⚠️ Skipping orders - missing required data');
        }

        // Step 5: Seed Blogs
        console.log('\n📋 STEP 5: Creating Blogs');
        console.log('='.repeat(60));
        if (admin) {
            await seedBlogs(admin._id.toString());
        }

        // Step 6: Seed Reviews
        console.log('\n📋 STEP 6: Creating Reviews');
        console.log('='.repeat(60));
        if (customer && restaurant1) {
            await seedReviews(customer._id.toString(), restaurant1._id.toString());
        }

        // Step 7: Seed Extra Data
        console.log('\n📋 STEP 7: Adding Extra Data');
        console.log('='.repeat(60));
        if (customer && restaurant1) {
            await seedExtraData(customer._id.toString(), restaurant1._id.toString());
        }

        // ============================================
        // FINAL OUTPUT
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE SEEDING COMPLETED!');
        console.log('='.repeat(60));

        console.log('\n🔑 ===== LOGIN CREDENTIALS =====');
        console.log('='.repeat(60));
        console.log('\n👑 ADMIN:');
        console.log(`   📧 Email: admin@gmail.com`);
        console.log(`   🔑 Password: admin123456`);
        console.log('\n🏍️ RIDER:');
        console.log(`   📧 Email: rider@gmail.com`);
        console.log(`   🔑 Password: rider123456`);
        console.log('\n👤 CUSTOMER:');
        console.log(`   📧 Email: customer@gmail.com`);
        console.log(`   🔑 Password: customer123456`);
        console.log('\n🏪 RESTAURANT OWNER:');
        console.log(`   📧 Email: owner@gmail.com`);
        console.log(`   🔑 Password: owner123456`);
        console.log('\n🛡️ MODERATOR:');
        console.log(`   📧 Email: moderator@gmail.com`);
        console.log(`   🔑 Password: moderator123456`);
        console.log('\n' + '='.repeat(60));

        console.log('\n📊 SEEDED DATA SUMMARY:');
        console.log('='.repeat(60));
        console.log(`   👤 Users: 5 (Admin, Rider, Customer, Restaurant Owner, Moderator)`);
        console.log(`   🏪 Restaurants: 2 (Pizza Palace, Spice Garden)`);
        console.log(`   🍕 Menu Items: 10 (6 + 4)`);
        console.log(`   📦 Orders: 2`);
        console.log(`   📝 Blogs: 5 (food, health, recipes, tips, news)`);
        console.log(`   ⭐ Reviews: 4`);
        console.log(`   📊 Extra Data: Restaurant stats & Customer preferences`);
        console.log('='.repeat(60) + '\n');

        // Final verification
        console.log('🧪 FINAL VERIFICATION:');
        console.log('='.repeat(60));
        
        const adminCheck = await User.findOne({ email: 'admin@gmail.com' }).select('+password');
        if (adminCheck) {
            console.log(`   ✅ Admin found: ${adminCheck.name}`);
            console.log(`   ✅ Admin password: ${adminCheck.password}`);
        }
        
        const customerCheck = await User.findOne({ email: 'customer@gmail.com' }).select('+password');
        if (customerCheck) {
            console.log(`   ✅ Customer found: ${customerCheck.name}`);
            console.log(`   ✅ Customer password: ${customerCheck.password}`);
        }

        const restaurantCheck = await Restaurant.findOne({ restaurantName: 'Pizza Palace' });
        if (restaurantCheck) {
            console.log(`   ✅ Restaurant found: ${restaurantCheck.restaurantName}`);
        }

        const menuCheck = await MenuItem.countDocuments();
        console.log(`   ✅ Menu items: ${menuCheck}`);

        const orderCheck = await Order.countDocuments();
        console.log(`   ✅ Orders: ${orderCheck}`);

        const blogCheck = await Blog.countDocuments();
        console.log(`   ✅ Blogs: ${blogCheck}`);

        const reviewCheck = await Review.countDocuments();
        console.log(`   ✅ Reviews: ${reviewCheck}`);
        
        console.log('='.repeat(60) + '\n');

        await mongoose.disconnect();
        console.log('✅ Database connection closed');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
};

// ============================================
// RUN SEEDER
// ============================================
if (require.main === module) {
    seedDatabase();
}

// ============================================
// EXPORTS
// ============================================
export {
    seedDatabase,
    seedAdmin,
    seedRider,
    seedCustomer,
    seedRestaurantOwner,
    seedModerator,
    seedRestaurant,
    seedSecondRestaurant,
    seedMenuItems,
    seedSecondRestaurantMenu,
    seedOrders,
    seedBlogs,
    seedReviews,
    seedExtraData
};