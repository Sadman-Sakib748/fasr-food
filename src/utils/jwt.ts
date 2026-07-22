import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface TokenPayload {
    id: string;
    email: string;
    role: string;
}

// ============================================
// CONSTANTS
// ============================================

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new AppError('JWT_SECRET is not defined in environment variables', 500);
    }
    return secret;
};

const getJwtExpire = (): string | number => {
    return process.env.JWT_EXPIRE || '7d';
};

// ============================================
// JWT TOKEN GENERATION
// ============================================

/**
 * Generate JWT token
 * @param payload - Token payload containing user data
 * @returns JWT token string
 * 
 * @example
 * const token = generateToken({ id: '123', email: 'user@example.com', role: 'customer' });
 */
export const generateToken = (payload: TokenPayload): string => {
    const secret = getJwtSecret();
    const expiresIn = getJwtExpire();

    return jwt.sign(
        payload,
        secret,
        { 
            expiresIn: expiresIn,
            algorithm: 'HS256',
        } as jwt.SignOptions
    );
};

// ============================================
// JWT TOKEN VERIFICATION
// ============================================

/**
 * Verify JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws {AppError} If token is invalid or expired
 * 
 * @example
 * const decoded = verifyToken(token);
 * console.log(decoded.id, decoded.email);
 */
export const verifyToken = (token: string): TokenPayload => {
    try {
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret, {
            algorithms: ['HS256'],
        }) as TokenPayload;
        return decoded;
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError('Invalid token: ' + error.message, 401);
        }
        if (error instanceof jwt.TokenExpiredError) {
            throw new AppError('Token has expired', 401);
        }
        throw new AppError('Failed to verify token', 401);
    }
};

// ============================================
// JWT TOKEN DECODING (Without Verification)
// ============================================

/**
 * Decode JWT token without verification
 * @param token - JWT token to decode
 * @returns Decoded token payload or null if invalid
 * 
 * @example
 * const decoded = decodeToken(token);
 * if (decoded) {
 *   console.log(decoded.id);
 * }
 */
export const decodeToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.decode(token, { json: true }) as TokenPayload | null;
        return decoded;
    } catch (error) {
        return null;
    }
};

// ============================================
// JWT TOKEN REFRESH
// ============================================

/**
 * Refresh JWT token
 * @param token - Current JWT token
 * @returns New JWT token
 * @throws {AppError} If token is invalid
 * 
 * @example
 * const newToken = refreshToken(oldToken);
 */
export const refreshToken = (token: string): string => {
    const decoded = verifyToken(token);
    return generateToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
    });
};

// ============================================
// JWT TOKEN INFO
// ============================================

/**
 * Get token expiration time
 * @param token - JWT token
 * @returns Expiration timestamp or null
 * 
 * @example
 * const expiresAt = getTokenExpiration(token);
 * console.log('Token expires at:', expiresAt);
 */
export const getTokenExpiration = (token: string): number | null => {
    try {
        const decoded = jwt.decode(token, { json: true });
        if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
            return decoded.exp as number;
        }
        return null;
    } catch (error) {
        return null;
    }
};

/**
 * Check if token is expired
 * @param token - JWT token
 * @returns Boolean indicating if token is expired
 * 
 * @example
 * if (isTokenExpired(token)) {
 *   // Refresh token
 * }
 */
export const isTokenExpired = (token: string): boolean => {
    const exp = getTokenExpiration(token);
    if (!exp) return true;
    return Date.now() >= exp * 1000;
};

/**
 * Get token remaining time
 * @param token - JWT token
 * @returns Remaining time in milliseconds or null
 * 
 * @example
 * const remaining = getTokenRemainingTime(token);
 * if (remaining < 60000) {
 *   // Less than 1 minute left
 * }
 */
export const getTokenRemainingTime = (token: string): number | null => {
    const exp = getTokenExpiration(token);
    if (!exp) return null;
    const remaining = exp * 1000 - Date.now();
    return remaining > 0 ? remaining : 0;
};

// ============================================
// JWT MIDDLEWARE HELPERS
// ============================================

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 * 
 * @example
 * const token = extractTokenFromHeader(req.headers.authorization);
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
    if (!authHeader) return null;
    if (!authHeader.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
};

/**
 * Get user ID from token
 * @param token - JWT token
 * @returns User ID or null
 * 
 * @example
 * const userId = getUserIdFromToken(token);
 */
export const getUserIdFromToken = (token: string): string | null => {
    try {
        const decoded = decodeToken(token);
        return decoded?.id || null;
    } catch (error) {
        return null;
    }
};

// ============================================
// EXPORT ALL
// ============================================

export default {
    generateToken,
    verifyToken,
    decodeToken,
    refreshToken,
    getTokenExpiration,
    isTokenExpired,
    getTokenRemainingTime,
    extractTokenFromHeader,
    getUserIdFromToken,
};