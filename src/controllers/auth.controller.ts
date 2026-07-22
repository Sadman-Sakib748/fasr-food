// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User.model';
import { generateToken } from '../utils/jwt';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

// ============================================
// REGISTER USER
// ============================================
export const register = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { name, email, password, phone, role, address } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            throw new AppError('Name, email and password are required', 400);
        }

        try {
            // Check if user exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                logger.warn(`Registration attempt with existing email: ${email}`);
                throw new AppError('User already exists with this email', 400);
            }

            // ✅ Password সরাসরি সেভ করুন (হ্যাশ ছাড়া)
            const user = await User.create({
                name,
                email,
                password: password, // সরাসরি পাসওয়ার্ড সেভ
                phone: phone || '',
                role: role || 'customer',
                address: address || {},
                status: 'active',
                emailVerified: false,
                preferences: {
                    language: 'en',
                    theme: 'light',
                    notifications: true,
                },
            });

            // Generate JWT token
            const token = generateToken({
                id: user._id.toString(),
                email: user.email,
                role: user.role,
            });

            logger.info(`✅ User registered successfully: ${email} (${user.role})`);

            // Remove password from response
            const userResponse = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                status: user.status,
            };

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token,
                user: userResponse,
            });

        } catch (error) {
            logger.error(`❌ Registration error for ${email}:`, error);
            throw error;
        }
    }
);

// ============================================
// LOGIN USER
// ============================================
export const login = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            throw new AppError('Email and password are required', 400);
        }

        logger.info(`🔍 Login attempt for: ${email}`);

        try {
            // Find user with password
            const user = await User.findOne({ email }).select('+password');

            if (!user) {
                logger.warn(`❌ Login failed - User not found: ${email}`);
                throw new AppError('Invalid credentials', 401);
            }

            logger.info(`👤 User found: ${user.name} (${user.role})`);
            logger.info(`🔑 User ID: ${user._id}`);

            // Check if user is banned
            if (user.status === 'banned') {
                logger.warn(`❌ Login attempt by banned user: ${email}`);
                throw new AppError('Your account has been banned. Please contact support.', 403);
            }

            // Check if password field exists
            if (!user.password) {
                logger.error(`❌ User has no password set: ${email}`);
                throw new AppError('Account setup incomplete. Please reset your password.', 401);
            }

            // ✅ সরাসরি পাসওয়ার্ড তুলনা করুন (plain text)
            const isPasswordMatch = password === user.password;

            if (!isPasswordMatch) {
                logger.warn(`❌ Login failed - Invalid password for: ${email}`);
                throw new AppError('Invalid credentials', 401);
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save({ validateBeforeSave: false });

            // Generate JWT token
            const token = generateToken({
                id: user._id.toString(),
                email: user.email,
                role: user.role,
            });

            logger.info(`✅ Login successful: ${email} (${user.role})`);

            // Remove password from response
            const userResponse = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                status: user.status,
                preferences: user.preferences,
                restaurantName: user.restaurantName || null,
                isVerified: user.isVerified || false,
                lastLogin: user.lastLogin,
            };

            res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                user: userResponse,
            });

        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`❌ Login error for ${email}: ${error.message}`);
            } else {
                logger.error(`❌ Unexpected login error for ${email}:`, error);
            }
            throw error;
        }
    }
);

// ============================================
// GET CURRENT USER
// ============================================
export const getMe = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const user = await User.findById(req.user!._id)
                .select('-password')
                .lean();

            if (!user) {
                logger.warn(`❌ User not found: ${req.user!._id}`);
                throw new AppError('User not found', 404);
            }

            logger.info(`✅ User profile fetched: ${user.email}`);
            res.status(200).json({
                success: true,
                user,
            });
        } catch (error) {
            logger.error('❌ Error fetching user profile:', error);
            throw error;
        }
    }
);

// ============================================
// UPDATE PROFILE
// ============================================
export const updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { name, phone, address, preferences, avatar } = req.body;

        try {
            const user = await User.findByIdAndUpdate(
                req.user!._id,
                {
                    name: name || req.user!.name,
                    phone: phone || req.user!.phone,
                    address: address || req.user!.address,
                    preferences: preferences || req.user!.preferences,
                    avatar: avatar || req.user!.avatar,
                },
                {
                    new: true,
                    runValidators: true,
                }
            ).select('-password');

            if (!user) {
                logger.warn(`❌ User not found for update: ${req.user!._id}`);
                throw new AppError('User not found', 404);
            }

            logger.info(`✅ Profile updated: ${user.email}`);
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                user,
            });
        } catch (error) {
            logger.error(`❌ Profile update error for ${req.user!.email}:`, error);
            throw error;
        }
    }
);

// ============================================
// CHANGE PASSWORD
// ============================================
export const changePassword = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { currentPassword, newPassword } = req.body;

        try {
            const user = await User.findById(req.user!._id).select('+password');
            if (!user) {
                logger.warn(`❌ User not found for password change: ${req.user!._id}`);
                throw new AppError('User not found', 404);
            }

            // ✅ সরাসরি তুলনা
            if (currentPassword !== user.password) {
                logger.warn(`❌ Invalid current password for: ${user.email}`);
                throw new AppError('Current password is incorrect', 401);
            }

            // ✅ নতুন পাসওয়ার্ড সরাসরি সেভ
            user.password = newPassword;
            await user.save();

            logger.info(`✅ Password changed for: ${user.email}`);
            res.status(200).json({
                success: true,
                message: 'Password changed successfully',
            });
        } catch (error) {
            logger.error(`❌ Password change error for ${req.user!.email}:`, error);
            throw error;
        }
    }
);

// ============================================
// FORGOT PASSWORD
// ============================================
export const forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { email } = req.body;

        try {
            const user = await User.findOne({ email });

            if (!user) {
                logger.info(`🔑 Password reset requested for non-existent email: ${email}`);
                res.status(200).json({
                    success: true,
                    message: 'If your email exists, you will receive a password reset link',
                });
                return;
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpire = new Date(Date.now() + 3600000);

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpire = resetTokenExpire;
            await user.save({ validateBeforeSave: false });

            logger.info(`🔑 Password reset token generated for: ${email}`);

            res.status(200).json({
                success: true,
                message: 'Password reset link sent to your email',
                resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
            });
        } catch (error) {
            logger.error(`❌ Forgot password error for ${email}:`, error);
            throw error;
        }
    }
);

// ============================================
// RESET PASSWORD
// ============================================
export const resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { token, newPassword } = req.body;

        try {
            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpire: { $gt: new Date() },
            });

            if (!user) {
                logger.warn(`❌ Invalid or expired reset token used`);
                throw new AppError('Invalid or expired reset token', 400);
            }

            // ✅ নতুন পাসওয়ার্ড সরাসরি সেভ
            user.password = newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            logger.info(`✅ Password reset successfully for: ${user.email}`);

            res.status(200).json({
                success: true,
                message: 'Password reset successfully',
            });
        } catch (error) {
            logger.error(`❌ Reset password error:`, error);
            throw error;
        }
    }
);

// ============================================
// LOGOUT USER
// ============================================
export const logout = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        logger.info(`🚪 User logged out: ${req.user!.email}`);
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    }
);

// ============================================
// REFRESH TOKEN
// ============================================
export const refreshToken = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const user = await User.findById(req.user!._id);
            if (!user) {
                logger.warn(`❌ User not found for refresh: ${req.user!._id}`);
                throw new AppError('User not found', 404);
            }

            const token = generateToken({
                id: user._id.toString(),
                email: user.email,
                role: user.role,
            });

            logger.info(`🔄 Token refreshed for: ${user.email}`);

            res.status(200).json({
                success: true,
                token,
            });
        } catch (error) {
            logger.error(`❌ Refresh token error:`, error);
            throw error;
        }
    }
);

export default {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    logout,
    refreshToken,
};