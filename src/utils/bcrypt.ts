// src/utils/bcrypt.ts
import bcrypt from 'bcryptjs';
import logger from './logger';

const SALT_ROUNDS = 10;

/**
 * পাসওয়ার্ড হ্যাশ করা
 */
export const hashPassword = async (password: string): Promise<string> => {
    try {
        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ভেরিফাই
        const isValid = await bcrypt.compare(password, hashedPassword);
        if (!isValid) {
            throw new Error('Password hash verification failed');
        }

        logger.info(`✅ Password hashed successfully`);
        return hashedPassword;

    } catch (error) {
        logger.error('❌ Password hashing error:', error);
        throw error;
    }
};

/**
 * পাসওয়ার্ড তুলনা করা
 */
export const comparePassword = async (
    plainPassword: string,
    hashedPassword: string
): Promise<boolean> => {
    try {
        // ইনপুট ভ্যালিডেশন
        if (!plainPassword || typeof plainPassword !== 'string') {
            logger.warn('❌ Invalid plain password');
            return false;
        }

        if (!hashedPassword || typeof hashedPassword !== 'string') {
            logger.warn('❌ Invalid hashed password');
            return false;
        }

        // হ্যাশ ফরম্যাট চেক
        if (!hashedPassword.startsWith('$2')) {
            logger.warn('❌ Invalid bcrypt hash format');
            return false;
        }

        // ডাইরেক্ট তুলনা
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        
        if (isMatch) {
            logger.info('✅ Password matched successfully');
        } else {
            logger.warn('❌ Password did not match');
        }

        return isMatch;

    } catch (error) {
        logger.error('❌ Password comparison error:', error);
        return false;
    }
};

export const hashPasswordSync = (password: string): string => {
    try {
        const salt = bcrypt.genSaltSync(SALT_ROUNDS);
        const hash = bcrypt.hashSync(password, salt);
        
        const verify = bcrypt.compareSync(password, hash);
        if (!verify) {
            throw new Error('Password hash verification failed');
        }
        
        return hash;
    } catch (error) {
        console.error('❌ Hash error:', error);
        throw error;
    }
};

export const comparePasswordSync = (
    plainPassword: string,
    hashedPassword: string
): boolean => {
    try {
        if (!plainPassword || !hashedPassword) return false;
        return bcrypt.compareSync(plainPassword, hashedPassword);
    } catch (error) {
        console.error('❌ Compare error:', error);
        return false;
    }
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

export default {
    hashPassword,
    comparePassword,
    hashPasswordSync,
    comparePasswordSync,
    validatePassword,
};