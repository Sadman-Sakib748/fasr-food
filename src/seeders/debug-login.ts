// debug-login.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/database';
import { User } from '../models/User.model';

dotenv.config();

const debugLogin = async () => {
    try {
        await connectDB();
        console.log('🔍 ডিবাগ মোড চালু...\n');

        const email = 'admin@gmail.com';
        const password = 'admin123456';

        // ইউজার খুঁজে বের করি
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            console.log('❌ ইউজার পাওয়া যায়নি!');
            process.exit(1);
        }

        console.log('👤 ইউজার পাওয়া গেছে:', user.email);
        console.log('📝 সংরক্ষিত পাসওয়ার্ড হ্যাশ:', user.password);
        console.log('📏 হ্যাশের দৈর্ঘ্য:', user.password?.length);
        console.log('🔑 হ্যাশ ফরম্যাট:', user.password?.startsWith('$2') ? '✅ সঠিক' : '❌ ভুল');
        console.log('');

        // বিভিন্ন পাসওয়ার্ড চেক করি
        const testPasswords = [
            'admin123456',
            'admin123456',
            'Admin123456',
            'admin@123'
        ];

        console.log('🧪 পাসওয়ার্ড টেস্ট:');
        console.log('='.repeat(50));
        
        for (const testPw of testPasswords) {
            const isMatch = await bcrypt.compare(testPw, user.password);
            console.log(`পাসওয়ার্ড: "${testPw}" => ${isMatch ? '✅ ম্যাচ' : '❌ ম্যাচ হয়নি'}`);
        }

        // নতুন পাসওয়ার্ড সেট করি
        console.log('\n🔧 নতুন পাসওয়ার্ড সেট করা হচ্ছে...');
        const newHash = await bcrypt.hash('admin123456', 10);
        
        await User.updateOne(
            { email: email },
            { $set: { password: newHash } }
        );

        console.log('✅ পাসওয়ার্ড আপডেট করা হয়েছে');

        // ভেরিফাই করি
        const updatedUser = await User.findOne({ email }).select('+password');
        const verify = await bcrypt.compare('admin123456', updatedUser!.password);
        console.log(`🧪 ভেরিফিকেশন: ${verify ? '✅ সফল' : '❌ ব্যর্থ'}`);

        await mongoose.disconnect();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ এরর:', error);
        process.exit(1);
    }
};

debugLogin();