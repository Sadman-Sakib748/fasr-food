import { Request, Response } from 'express';
import { Blog } from '../models/Blog.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { Types } from 'mongoose';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate slug from title
const generateSlug = (title: string): string => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);
};

// Calculate reading time
const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
};

// ============================================
// GET ALL BLOGS
// @route   GET /api/blog
// @access  Public
// ============================================
export const getBlogs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { category, search, page = 1, limit = 10 } = req.query;

        const query: any = { isPublished: true };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$text = { $search: search as string };
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;
        const skip = (pageNum - 1) * limitNum;

        const [blogs, total] = await Promise.all([
            Blog.find(query)
                .populate('author', 'name avatar')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 })
                .lean(),
            Blog.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            count: blogs.length,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
            blogs,
        });
    }
);

// ============================================
// GET SINGLE BLOG BY SLUG
// @route   GET /api/blog/slug/:slug
// @access  Public
// ============================================
export const getBlogBySlug = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const blog = await Blog.findOne({ slug: req.params.slug })
            .populate('author', 'name avatar')
            .populate('comments.userId', 'name avatar')
            .lean();

        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        // Increment views
        await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

        // Get related blogs
        const relatedBlogs = await Blog.find({
            _id: { $ne: blog._id },
            category: blog.category,
            isPublished: true,
        })
            .select('title slug featuredImage category createdAt')
            .limit(3)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            blog,
            relatedBlogs,
        });
    }
);

// ============================================
// GET SINGLE BLOG BY ID
// @route   GET /api/blog/id/:id
// @access  Private (Admin)
// ============================================
export const getBlogById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const blog = await Blog.findById(req.params.id)
            .populate('author', 'name avatar')
            .populate('comments.userId', 'name avatar')
            .lean();

        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        res.status(200).json({
            success: true,
            blog,
        });
    }
);

// ============================================
// CREATE BLOG
// @route   POST /api/blog
// @access  Private (Admin)
// ============================================
export const createBlog = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { title, content, excerpt, category, tags, featuredImage, isPublished } = req.body;

        // Validate required fields
        if (!title) {
            throw new AppError('Title is required', 400);
        }

        if (!content) {
            throw new AppError('Content is required', 400);
        }

        if (!excerpt) {
            throw new AppError('Excerpt is required', 400);
        }

        // Generate slug
        let slug = generateSlug(title);

        // Check if slug already exists
        const existingBlog = await Blog.findOne({ slug });
        if (existingBlog) {
            slug = `${slug}-${Date.now()}`;
        }

        // Calculate reading time
        const readingTime = calculateReadingTime(content);

        const blog = await Blog.create({
            title,
            slug,
            content,
            excerpt,
            category: category || 'food',
            tags: tags || [],
            featuredImage: featuredImage || '',
            isPublished: isPublished || false,
            readingTime,
            author: req.user!._id,
        });

        await blog.populate('author', 'name avatar');

        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            blog,
        });
    }
);

// ============================================
// UPDATE BLOG
// @route   PUT /api/blog/:id
// @access  Private (Admin)
// ============================================
export const updateBlog = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { title, content, excerpt, category, tags, featuredImage, isPublished } = req.body;

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        // Update fields
        if (title) {
            blog.title = title;
            const newSlug = generateSlug(title);
            if (newSlug !== blog.slug) {
                const existingBlog = await Blog.findOne({
                    slug: newSlug,
                    _id: { $ne: blog._id },
                });
                blog.slug = existingBlog ? `${newSlug}-${Date.now()}` : newSlug;
            }
        }

        if (content) {
            blog.content = content;
            blog.readingTime = calculateReadingTime(content);
        }

        if (excerpt) blog.excerpt = excerpt;
        if (category) blog.category = category;
        if (tags) blog.tags = tags;
        if (featuredImage !== undefined) blog.featuredImage = featuredImage;
        if (isPublished !== undefined) blog.isPublished = isPublished;

        await blog.save();
        await blog.populate('author', 'name avatar');

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            blog,
        });
    }
);

// ============================================
// DELETE BLOG
// @route   DELETE /api/blog/:id
// @access  Private (Admin)
// ============================================
export const deleteBlog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const blog = await Blog.findByIdAndDelete(req.params.id);

        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully',
        });
    }
);

// ============================================
// TOGGLE BLOG PUBLISH STATUS
// @route   PATCH /api/blog/:id/toggle
// @access  Private (Admin)
// ============================================
export const togglePublishStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        blog.isPublished = !blog.isPublished;
        await blog.save();

        res.status(200).json({
            success: true,
            message: `Blog ${blog.isPublished ? 'published' : 'unpublished'} successfully`,
            blog,
        });
    }
);

// ============================================
// ADD COMMENT TO BLOG
// @route   POST /api/blog/:id/comments
// @access  Private
// ============================================
export const addComment = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const { content } = req.body;

        if (!content) {
            throw new AppError('Comment content is required', 400);
        }

        if (content.length < 3) {
            throw new AppError('Comment must be at least 3 characters', 400);
        }

        if (content.length > 500) {
            throw new AppError('Comment cannot exceed 500 characters', 400);
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        blog.comments.push({
            userId: req.user!._id,
            content: content.trim(),
            createdAt: new Date(),
        });

        await blog.save();
        await blog.populate('comments.userId', 'name avatar');

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: blog.comments[blog.comments.length - 1],
        });
    }
);

// ============================================
// DELETE COMMENT FROM BLOG - FIXED
// @route   DELETE /api/blog/:id/comments/:commentId
// @access  Private (Admin or Comment owner)
// ============================================
export const deleteComment = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        // ✅ FIXED: Properly handle the comment lookup
        // Use type assertion or check for _id existence
        const commentIndex = blog.comments.findIndex(
            (c) => {
                // Check if comment has _id using type guard
                const comment = c as any;
                return comment._id && comment._id.toString() === req.params.commentId;
            }
        );

        if (commentIndex === -1) {
            throw new AppError('Comment not found', 404);
        }

        const comment = blog.comments[commentIndex] as any;

        // ✅ FIXED: Check if userId exists before comparing
        const isCommentOwner = comment.userId &&
            comment.userId.toString() === req.user!._id.toString();
        const isAdmin = req.user!.role === 'admin';

        if (!isCommentOwner && !isAdmin) {
            throw new AppError('Not authorized to delete this comment', 403);
        }

        blog.comments.splice(commentIndex, 1);
        await blog.save();

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully',
        });
    }
);

// ============================================
// LIKE/UNLIKE BLOG
// @route   POST /api/blog/:id/like
// @access  Private
// ============================================
export const toggleLikeBlog = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            throw new AppError('Blog not found', 404);
        }

        blog.likes = (blog.likes || 0) + 1;
        await blog.save();

        res.status(200).json({
            success: true,
            message: 'Blog liked successfully',
            likes: blog.likes,
        });
    }
);

// ============================================
// GET BLOG CATEGORIES WITH COUNTS
// @route   GET /api/blog/categories
// @access  Public
// ============================================
export const getBlogCategories = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const categories = await Blog.aggregate([
            { $match: { isPublished: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        res.status(200).json({
            success: true,
            categories: categories.map((cat) => ({
                name: cat._id,
                count: cat.count,
            })),
        });
    }
);

// ============================================
// GET POPULAR BLOGS
// @route   GET /api/blog/popular
// @access  Public
// ============================================
export const getPopularBlogs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { limit = 5 } = req.query;

        const limitNum = parseInt(limit as string) || 5;

        const blogs = await Blog.find({ isPublished: true })
            .populate('author', 'name avatar')
            .sort({ views: -1, likes: -1 })
            .limit(limitNum)
            .lean();

        res.status(200).json({
            success: true,
            count: blogs.length,
            blogs,
        });
    }
);