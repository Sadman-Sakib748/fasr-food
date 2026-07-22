import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, Result } from 'express-validator';

// ============================================
// TYPE DEFINITIONS
// ============================================

type ValidationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

interface ValidationError {
    field: string;
    message: string;
    location: string;
}

// ============================================
// MAIN VALIDATE FUNCTION
// ============================================

/**
 * Validate request using express-validator
 * @param validations - Array of validation chains
 * @returns Express middleware
 * 
 * @example
 * router.post('/user',
 *   validate([
 *     body('name').notEmpty(),
 *     body('email').isEmail()
 *   ]),
 *   controller
 * );
 */
export const validate = (validations: ValidationChain[]): ValidationMiddleware => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Run all validations
            await Promise.all(validations.map((validation) => validation.run(req)));

            // Check for validation errors
            const errors = validationResult(req);
            
            if (errors.isEmpty()) {
                next();
                return;
            }

            // Format and return errors
            const formattedErrors = formatErrors(errors);

            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            next(error);
        }
    };
};

// ============================================
// ERROR FORMATTING HELPER
// ============================================

/**
 * Format validation errors into consistent structure
 * @param errors - Validation result object
 * @returns Formatted errors array
 */
const formatErrors = (errors: Result): ValidationError[] => {
    return errors.array().map((err) => ({
        field: err.type === 'field' ? err.path : err.type,
        message: err.msg,
        location: err.location || 'body',
    }));
};

// ============================================
// ERROR CHECKING HELPERS
// ============================================

/**
 * Check if validation has errors
 * @param req - Express request
 * @returns Boolean indicating if there are validation errors
 */
export const hasValidationErrors = (req: Request): boolean => {
    const errors = validationResult(req);
    return !errors.isEmpty();
};

/**
 * Get validation errors as array
 * @param req - Express request
 * @returns Array of validation errors
 */
export const getValidationErrors = (req: Request): any[] => {
    const errors = validationResult(req);
    return errors.array();
};

/**
 * Get validation errors as formatted object
 * @param req - Express request
 * @returns Formatted errors object
 */
export const getFormattedErrors = (req: Request): ValidationError[] => {
    const errors = validationResult(req);
    return formatErrors(errors);
};

// ============================================
// CUSTOM VALIDATION HELPERS
// ============================================

/**
 * Check if a value is a valid MongoDB ObjectId
 * @param value - The value to check
 * @returns Boolean
 */
export const isValidObjectId = (value: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(value);
};

/**
 * Check if a value is a valid phone number
 * @param value - The value to check
 * @returns Boolean
 */
export const isValidPhone = (value: string): boolean => {
    return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(value);
};

/**
 * Check if a value is a valid URL
 * @param value - The value to check
 * @returns Boolean
 */
export const isValidUrl = (value: string): boolean => {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

/**
 * Check if a value is a valid date
 * @param value - The value to check
 * @returns Boolean
 */
export const isValidDate = (value: string): boolean => {
    const date = new Date(value);
    return !isNaN(date.getTime());
};

/**
 * Check if a value is a valid email
 * @param value - The value to check
 * @returns Boolean
 */
export const isValidEmail = (value: string): boolean => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(value);
};

/**
 * Check if a value is a valid password (min 6 chars, at least one number)
 * @param value - The value to check
 * @returns Boolean
 */
export const isValidPassword = (value: string): boolean => {
    return value.length >= 6 && /\d/.test(value);
};

// ============================================
// MIDDLEWARE: HANDLE VALIDATION ERRORS
// ============================================

/**
 * Handle validation errors middleware
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const handleValidationErrors = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = formatErrors(errors);

        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    next();
};

// ============================================
// SPECIALIZED VALIDATION MIDDLEWARES
// ============================================

/**
 * Validate request params middleware
 * @param validations - Array of validation chains
 * @returns Express middleware
 */
export const validateParams = (validations: ValidationChain[]): ValidationMiddleware => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await Promise.all(validations.map((validation) => validation.run(req)));

            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                const formattedErrors = formatErrors(errors);

                res.status(400).json({
                    success: false,
                    message: 'Invalid parameters',
                    errors: formattedErrors,
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Validate request query middleware
 * @param validations - Array of validation chains
 * @returns Express middleware
 */
export const validateQuery = (validations: ValidationChain[]): ValidationMiddleware => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await Promise.all(validations.map((validation) => validation.run(req)));

            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                const formattedErrors = formatErrors(errors);

                res.status(400).json({
                    success: false,
                    message: 'Invalid query parameters',
                    errors: formattedErrors,
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Validate request body middleware
 * @param validations - Array of validation chains
 * @returns Express middleware
 */
export const validateBody = (validations: ValidationChain[]): ValidationMiddleware => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await Promise.all(validations.map((validation) => validation.run(req)));

            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                const formattedErrors = formatErrors(errors);

                res.status(400).json({
                    success: false,
                    message: 'Invalid request body',
                    errors: formattedErrors,
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// ============================================
// COMBINE VALIDATIONS
// ============================================

/**
 * Combine multiple validation groups into one
 * @param validationGroups - Array of validation chain arrays
 * @returns Combined validation chains
 */
export const combineValidations = (
    ...validationGroups: ValidationChain[][]
): ValidationChain[] => {
    return validationGroups.flat();
};

// ============================================
// EXPORT ALL
// ============================================

export default {
    validate,
    hasValidationErrors,
    getValidationErrors,
    getFormattedErrors,
    isValidObjectId,
    isValidPhone,
    isValidUrl,
    isValidDate,
    isValidEmail,
    isValidPassword,
    handleValidationErrors,
    validateParams,
    validateQuery,
    validateBody,
    combineValidations,
};