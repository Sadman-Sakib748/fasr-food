import mongoose, { Schema, Document } from 'mongoose';

export interface IBlogComment {
  userId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  image?: string;           // ✅ এই ফিল্ড যোগ করুন
  status: 'draft' | 'published' | 'archived';  // ✅ এই ফিল্ড যোগ করুন
  author: mongoose.Types.ObjectId;
  category: 'food' | 'health' | 'lifestyle' | 'recipes' | 'tips' | 'news';
  tags: string[];
  isPublished: boolean;
  views: number;
  likes: number;
  comments: IBlogComment[];
  readingTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema: Schema<IBlog> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a blog title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide blog content'],
    },
    excerpt: {
      type: String,
      required: [true, 'Please provide a blog excerpt'],
      maxlength: [300, 'Excerpt cannot be more than 300 characters'],
    },
    featuredImage: {
      type: String,
      default: '',
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['food', 'health', 'lifestyle', 'recipes', 'tips', 'news'],
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: [500, 'Comment cannot be more than 500 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    readingTime: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug before saving
BlogSchema.pre<IBlog>('save', function (next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Indexes
BlogSchema.index({ slug: 1 });
BlogSchema.index({ title: 'text', content: 'text', tags: 'text' });
BlogSchema.index({ category: 1, isPublished: 1 });
BlogSchema.index({ createdAt: -1 });

export const Blog = mongoose.model<IBlog>('Blog', BlogSchema);