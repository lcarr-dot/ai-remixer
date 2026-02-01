import { z } from "zod";

// ==================== AUTH SCHEMAS ====================

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  businessName: z.string().min(1, "Business name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ==================== ONBOARDING SCHEMAS ====================

export const onboardingSchema = z.object({
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  timezone: z.string().min(1, "Timezone is required"),
  contentNiche: z.string().min(1, "Content niche is required"),
  primaryGoal: z.string().min(1, "Primary goal is required"),
});

// ==================== VIDEO SCHEMAS ====================

export const videoManualFieldsSchema = z.object({
  hook: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  hashtags: z.array(z.string()).nullable().optional(),
  topic: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  targetAudience: z.string().nullable().optional(),
  whyPosted: z.string().nullable().optional(),
  wearingOutfit: z.string().nullable().optional(),
  contentSummary: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const platformPostSchema = z.object({
  platform: z.string(),
  posted: z.boolean().nullable().optional(),
  postedAt: z.string().datetime().nullable().optional(),
  postUrl: z.string().url().nullable().optional(),
});

export const platformMetricsSchema = z.object({
  platform: z.string(),
  views: z.number().int().nonnegative().nullable().optional(),
  likes: z.number().int().nonnegative().nullable().optional(),
  comments: z.number().int().nonnegative().nullable().optional(),
  shares: z.number().int().nonnegative().nullable().optional(),
  saves: z.number().int().nonnegative().nullable().optional(),
  watchTimeSeconds: z.number().nonnegative().nullable().optional(),
  followersGained: z.number().int().nullable().optional(),
});

// ==================== LOG ENTRY SCHEMAS ====================

export const logEntrySchema = z.object({
  rawText: z.string().optional(),
  audioUrl: z.string().url().optional(),
  linkedVideoId: z.string().optional(),
});

// ==================== HELPERS ====================

// Parse numbers from various formats (1.2k, 12k, 1,200, etc.)
export function parseMetricNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  
  if (typeof value === "number") return Math.round(value);
  
  const cleaned = value.toLowerCase().replace(/,/g, "").trim();
  
  if (cleaned.endsWith("k")) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000);
  }
  if (cleaned.endsWith("m")) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000);
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

// Platform name normalization
export function normalizePlatform(platform: string): string {
  const p = platform.toLowerCase().trim();
  const mapping: Record<string, string> = {
    "youtube": "youtube",
    "yt": "youtube",
    "tiktok": "tiktok",
    "tt": "tiktok",
    "tik tok": "tiktok",
    "instagram": "instagram",
    "ig": "instagram",
    "insta": "instagram",
    "reels": "instagram",
    "ig reels": "instagram",
    "shorts": "shorts",
    "youtube shorts": "shorts",
    "yt shorts": "shorts",
    "facebook": "facebook",
    "fb": "facebook",
    "clapper": "clapper",
  };
  return mapping[p] || p;
}

export const PLATFORMS = [
  { id: "youtube", name: "YouTube", priority: 1 },
  { id: "tiktok", name: "TikTok", priority: 2 },
  { id: "instagram", name: "Instagram Reels", priority: 3 },
  { id: "shorts", name: "YouTube Shorts", priority: 4 },
  { id: "facebook", name: "Facebook", priority: 5 },
  { id: "clapper", name: "Clapper", priority: 6 },
];

export const NICHES = [
  "Business & Finance",
  "Lifestyle & Vlogging",
  "Fitness & Health",
  "Comedy & Entertainment",
  "Education & How-To",
  "Tech & Gaming",
  "Food & Travel",
  "Fashion & Beauty",
  "Motivation & Self-Improvement",
  "Other",
];

export const GOALS = [
  "Grow followers",
  "Increase views",
  "Build Discord community",
  "Generate revenue",
  "Brand awareness",
  "Lead generation",
  "Other",
];

export const VIDEO_FORMATS = [
  "Talking head",
  "Green screen",
  "Meme/edit",
  "Voiceover",
  "Slideshow",
  "Tutorial/screen share",
  "Vlog",
  "Interview",
  "Skit",
  "Other",
];

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "UTC",
];
