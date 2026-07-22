import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User, IUser } from '../models/User.model';
import { hashPassword } from '../utils/bcrypt';
import logger from '../utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

// Google Profile Type
interface GoogleProfile {
    id: string;
    displayName?: string;
    name?: {
        givenName?: string;
        familyName?: string;
    };
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
    provider: string;
    _raw: string;
    _json: any;
}

// GitHub Profile Type
interface GitHubProfile {
    id: string;
    displayName?: string;
    username?: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
    provider: string;
    _raw: string;
    _json: any;
}

// ============================================
// GOOGLE OAUTH STRATEGY
// ============================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/google/callback`,
                scope: ['profile', 'email'],
            },
            async (
                accessToken: string,
                refreshToken: string,
                profile: GoogleProfile,
                done: (error: any, user?: any, info?: any) => void
            ) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        logger.error('Google OAuth: No email found in profile');
                        return done(new Error('No email found in Google profile'), undefined);
                    }

                    let user = await User.findOne({ email });

                    if (!user) {
                        const randomPassword = Math.random().toString(36).slice(-12);
                        const hashedPassword = await hashPassword(randomPassword);
                        
                        const userName = profile.displayName || 
                                       profile.name?.givenName || 
                                       profile.name?.familyName || 
                                       'Google User';

                        user = await User.create({
                            name: userName,
                            email: email,
                            password: hashedPassword,
                            avatar: profile.photos?.[0]?.value || '',
                            emailVerified: true,
                            role: 'customer',
                            status: 'active',
                            preferences: {
                                language: 'en',
                                theme: 'light',
                                notifications: true,
                            },
                        });

                        logger.info(`✅ User created via Google OAuth: ${email}`);
                    }

                    // Update last login
                    user.lastLogin = new Date();
                    await user.save({ validateBeforeSave: false });

                    return done(null, user);
                } catch (error) {
                    logger.error('❌ Google OAuth error:', error);
                    return done(error instanceof Error ? error : new Error('Google OAuth failed'), undefined);
                }
            }
        )
    );

    logger.info('✅ Google OAuth strategy initialized');
}

// ============================================
// GITHUB OAUTH STRATEGY
// ============================================
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/github/callback`,
                scope: ['user:email'],
            },
            async (
                accessToken: string,
                refreshToken: string,
                profile: GitHubProfile,
                done: (error: any, user?: any, info?: any) => void
            ) => {
                try {
                    // GitHub might not provide email in the main profile
                    let email = profile.emails?.[0]?.value;
                    
                    // If no email in profile, try to fetch it
                    if (!email) {
                        try {
                            const emailResponse = await fetch('https://api.github.com/user/emails', {
                                headers: {
                                    Authorization: `token ${accessToken}`,
                                    'User-Agent': 'FastFeast-App',
                                },
                            });
                            
                            if (emailResponse.ok) {
                                const emails = await emailResponse.json() as Array<{ 
                                    email: string; 
                                    primary: boolean; 
                                    verified: boolean 
                                }>;
                                const primaryEmail = emails.find(e => e.primary && e.verified);
                                email = primaryEmail?.email;
                            }
                        } catch (fetchError) {
                            logger.warn('GitHub OAuth: Could not fetch emails from API:', fetchError);
                        }
                    }

                    if (!email) {
                        logger.error('GitHub OAuth: No email found in profile');
                        return done(new Error('No email found in GitHub profile'), undefined);
                    }

                    let user = await User.findOne({ email });

                    if (!user) {
                        const randomPassword = Math.random().toString(36).slice(-12);
                        const hashedPassword = await hashPassword(randomPassword);
                        
                        const userName = profile.displayName || 
                                       profile.username || 
                                       'GitHub User';

                        user = await User.create({
                            name: userName,
                            email: email,
                            password: hashedPassword,
                            avatar: profile.photos?.[0]?.value || '',
                            emailVerified: true,
                            role: 'customer',
                            status: 'active',
                            preferences: {
                                language: 'en',
                                theme: 'light',
                                notifications: true,
                            },
                        });

                        logger.info(`✅ User created via GitHub OAuth: ${email}`);
                    }

                    // Update last login
                    user.lastLogin = new Date();
                    await user.save({ validateBeforeSave: false });

                    return done(null, user);
                } catch (error) {
                    logger.error('❌ GitHub OAuth error:', error);
                    return done(error instanceof Error ? error : new Error('GitHub OAuth failed'), undefined);
                }
            }
        )
    );

    logger.info('✅ GitHub OAuth strategy initialized');
}

// ============================================
// SERIALIZE & DESERIALIZE
// ============================================

// Serialize user - store only user ID in session
passport.serializeUser((user: any, done: (err: any, id?: string) => void) => {
    try {
        if (user && user._id) {
            done(null, user._id.toString());
        } else {
            done(new Error('Invalid user object'), undefined);
        }
    } catch (error) {
        done(error, undefined);
    }
});

// Deserialize user - retrieve full user from database
passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
    try {
        const user = await User.findById(id).select('-password');
        
        if (!user) {
            logger.warn(`⚠️ User not found during deserialization: ${id}`);
            return done(null, null);
        }

        done(null, user);
    } catch (error) {
        logger.error('❌ Deserialize user error:', error);
        done(error instanceof Error ? error : new Error('Failed to deserialize user'), null);
    }
});

// ============================================
// EXPORT PASSPORT
// ============================================
export default passport;