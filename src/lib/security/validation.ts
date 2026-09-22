import { z } from 'zod';

export const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export const LoginSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters').max(50),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
  captchaAnswer: z.string().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(10, 'New password must be at least 10 characters long')
    .max(100, 'Password is too long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[^a-zA-Z\d]/, 'Password must contain at least one special character'),
});

// Helper for optional HTTPS URLs that:
// 1. Trims whitespace
// 2. Converts empty/whitespace-only input or null/undefined to null
// 3. Automatically prepends 'https://' if the user omits protocol (e.g. 'github.com/username')
// 4. Validates HTTPS protocol and valid URL format
// 5. Returns a clear, field-specific error message
export const createOptionalHttpsUrlSchema = (fieldName: string, example?: string) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    let trimmed = val.trim();
    if (trimmed === '') return null;
    if (trimmed.startsWith('https:///')) {
      trimmed = trimmed.replace('https:///', 'https://');
    }
    // Auto-prefix https:// if user provided a domain without protocol
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  }, z.string()
      .url(`${fieldName}: Invalid URL format${example ? ` (e.g. ${example})` : ''}`)
      .startsWith('https://', `${fieldName}: URL must use secure HTTPS (https://)`)
      .nullable()
      .optional()
  );

export const createOptionalMediaOrUrlSchema = (fieldName: string, example?: string) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    let trimmed = val.trim();
    if (trimmed === '') return null;
    // Fix any accidental triple slash from prior schema
    if (trimmed.startsWith('https:///uploads/')) {
      return trimmed.replace('https://', '');
    }
    if (trimmed.startsWith('http:///uploads/')) {
      return trimmed.replace('http://', '');
    }
    // If it's a local uploaded file
    if (trimmed.startsWith('/uploads/')) {
      return trimmed;
    }
    // Auto-prefix https:// if user provided an external domain without protocol
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  }, z.string()
      .refine(
        (val) => val.startsWith('/uploads/') || /^https:\/\//i.test(val),
        { message: `${fieldName}: Must be an uploaded file (/uploads/...) or secure HTTPS URL${example ? ` (e.g. ${example})` : ''}` }
      )
      .nullable()
      .optional()
  );

export const MemberProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  title: z.string().trim().min(2, 'Title tagline is required').max(120),
  bio: z.string().trim().max(600, 'Bio cannot exceed 600 characters'),
  bioHighlights: z
    .array(z.string().trim().max(140, 'Highlight cannot exceed 140 characters'))
    .max(3, 'Maximum of 3 highlights allowed'),
  bookCallUrl: createOptionalHttpsUrlSchema('Book A Call URL', 'https://cal.com/username'),
  email: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().email('Public Email: Invalid email address format').nullable().optional()),
  github: createOptionalHttpsUrlSchema('GitHub Profile URL', 'https://github.com/username'),
  twitter: createOptionalHttpsUrlSchema('Twitter / 𝕏 Profile URL', 'https://x.com/username'),
  linkedin: createOptionalHttpsUrlSchema('LinkedIn Profile URL', 'https://linkedin.com/in/username'),
  discord: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(60, 'Discord ID cannot exceed 60 characters').nullable().optional()),
  resumeUrl: createOptionalMediaOrUrlSchema('Resume / CV PDF Link', '/uploads/resume.pdf or https://example.com/resume.pdf'),
  profileImageUrl: createOptionalMediaOrUrlSchema('Profile Avatar Image URL', '/uploads/avatar.png or https://images.unsplash.com/...'),
  githubUsername: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().regex(GITHUB_USERNAME_REGEX, 'GitHub Username: Invalid username format').nullable().optional()),
  closingQuote: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(240, 'Quote cannot exceed 240 characters').nullable().optional()),
  quoteAuthor: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(80, 'Quote author cannot exceed 80 characters').nullable().optional()),
});

export const ExperienceSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(100),
  org: z.string().trim().min(2, 'Organization is required').max(100),
  location: z.string().trim().min(2, 'Location is required').max(100),
  startDate: z.string().trim().min(2, 'Start date is required').max(30),
  endDate: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(30).nullable().optional()),
  description: z.string().trim().max(600, 'Description cannot exceed 600 characters'),
  sortOrder: z.number().int().default(0),
});

export const ProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name is required').max(100),
  thumbnailUrl: createOptionalHttpsUrlSchema('Project Thumbnail URL', 'https://images.unsplash.com/...'),
  status: z.enum(['LIVE', 'IN_PROGRESS', 'ARCHIVED']),
  description: z.string().trim().max(600, 'Description cannot exceed 600 characters'),
  projectUrl: createOptionalHttpsUrlSchema('Project Link URL', 'https://github.com/organization/project'),
  techTags: z.array(z.string().trim().max(30)).max(8, 'Maximum 8 technology tags allowed'),
  sortOrder: z.number().int().default(0),
});

export const AdminCreateMemberSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, dots, hyphens, and underscores'),
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  title: z.string().trim().min(2, 'Title tagline is required').max(120),
  email: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().email('Email: Invalid email address format').nullable().optional()),
});
