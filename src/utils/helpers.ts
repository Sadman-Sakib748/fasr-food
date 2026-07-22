import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { AppError } from '../middleware/error.middleware';

// ============================================
// ID GENERATORS
// ============================================

/**
 * Generate unique ID with optional prefix
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export const generateId = (prefix: string = ''): string => {
    const id = uuidv4().replace(/-/g, '');
    return prefix ? `${prefix}-${id}` : id;
};

/**
 * Generate unique order number
 * @returns Order number in format ORD-YYYYMMDD-RANDOM
 */
export const generateOrderNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${year}${month}${day}-${random}`;
};

/**
 * Generate random token
 * @param length - Length of token (default: 32)
 * @returns Random hex string
 */
export const generateToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate OTP (One-Time Password)
 * @param length - Length of OTP (default: 6)
 * @returns Numeric OTP string
 */
export const generateOTP = (length: number = 6): string => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};

// ============================================
// GEOSPATIAL HELPERS
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format currency amount
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

/**
 * Format date
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

/**
 * Format date and time
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date | string): string => {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param length - Maximum length (default: 100)
 * @returns Truncated text with ellipsis
 */
export const truncateText = (text: string, length: number = 100): string => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

/**
 * Sanitize string to prevent XSS
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (str: string): string => {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate email address
 * @param email - Email to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number
 * @param phone - Phone number to validate
 * @returns Boolean indicating if phone number is valid
 */
export const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(phone);
};

/**
 * Validate URL
 * @param url - URL to validate
 * @returns Boolean indicating if URL is valid
 */
export const isValidURL = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate MongoDB ObjectId
 * @param id - ID to validate
 * @returns Boolean indicating if ID is valid
 */
export const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

// ============================================
// OBJECT HELPERS
// ============================================

/**
 * Deep clone an object
 * @param obj - Object to clone
 * @returns Cloned object
 */
export const deepClone = <T extends object>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param obj - Object to check
 * @returns Boolean indicating if object is empty
 */
export const isEmpty = (obj: any): boolean => {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    return Object.keys(obj).length === 0;
};

/**
 * Pick specific fields from object
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns New object with picked fields
 */
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result: any = {};
    keys.forEach((key) => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};

/**
 * Omit specific fields from object
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns New object without omitted fields
 */
export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result: any = { ...obj };
    keys.forEach((key) => {
        delete result[key];
    });
    return result;
};

// ============================================
// PAGINATION HELPERS
// ============================================

/**
 * Get pagination options
 * @param page - Page number
 * @param limit - Items per page
 * @returns Pagination options
 */
export const getPaginationOptions = (page: string | number = 1, limit: string | number = 10) => {
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;
    return { page: pageNum, limit: limitNum, skip };
};

/**
 * Create pagination response
 * @param total - Total items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export const createPaginationResponse = (total: number, page: number, limit: number) => {
    return {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
    };
};

// ============================================
// STRING HELPERS
// ============================================

/**
 * Generate slug from text
 * @param text - Text to convert to slug
 * @returns Slug string
 */
export const generateSlug = (text: string): string => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
};

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export const extractPublicId = (url: string): string => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
};

// ============================================
// ASYNC HELPERS
// ============================================

/**
 * Sleep/delay for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry an async operation with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param delay - Initial delay in ms (default: 1000)
 * @returns Result of the operation
 */
export const retry = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> => {
    let lastError: Error;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries - 1) {
                const waitTime = delay * Math.pow(2, i);
                await sleep(waitTime);
            }
        }
    }
    throw new AppError(`Operation failed after ${maxRetries} retries: ${lastError!.message}`, 500);
};

// ============================================
// EXPORT ALL
// ============================================

export default {
    generateId,
    generateOrderNumber,
    generateToken,
    generateOTP,
    calculateDistance,
    formatCurrency,
    formatDate,
    formatDateTime,
    truncateText,
    sanitizeString,
    isValidEmail,
    isValidPhone,
    isValidURL,
    isValidObjectId,
    deepClone,
    isEmpty,
    pick,
    omit,
    getPaginationOptions,
    createPaginationResponse,
    generateSlug,
    extractPublicId,
    sleep,
    retry,
};