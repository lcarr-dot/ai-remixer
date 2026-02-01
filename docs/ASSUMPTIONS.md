# Assumptions & Design Decisions

## Core Philosophy

This app follows a **manual-first data collection** approach. While we integrate with YouTube's Data API for video metadata, all performance metrics come from user input. This ensures:

1. **User control** - Users decide what data to share
2. **Cross-platform support** - Works with any platform the user posts to
3. **Privacy** - No analytics API access required
4. **Accuracy** - Users can input the exact metrics they see

## YouTube Integration

### What we fetch (Data API only):
- Channel identity (name, thumbnail)
- Uploaded videos list (videoId, title, publishedAt, thumbnails, duration)

### What we DON'T fetch:
- Analytics data (views, watch time, etc.)
- Revenue data
- Audience demographics

**Rationale**: YouTube Analytics API requires additional OAuth scopes and provides data that may not match what users see in their dashboard. By having users input metrics manually, we ensure the data matches their actual experience.

## Data Model

### Three states for manual fields:
1. **Known value** - User has provided this data
2. **Explicitly "not posted"** - User confirmed they didn't post to this platform
3. **Missing (unknown)** - We don't have this data yet

The UI clearly distinguishes these states with visual indicators.

### Per-video, per-platform tracking:
Each video can have different metrics on different platforms. A video might have:
- 10K views on TikTok
- 500 views on Instagram
- Not posted to YouTube Shorts

## AI Processing

### Log Entry Pipeline:
1. User submits text (or voice, future)
2. Gemini parses and extracts structured data
3. System matches to video (by title, date, or user selection)
4. Data written to DB with audit trail
5. Original input always preserved

### Confidence Scoring:
AI extractions include confidence scores. Low-confidence extractions may require user confirmation.

### Audit Trail:
Every data change is logged with:
- Previous value
- New value
- Source (manual, transcript, api)
- Timestamp
- Who made the change

## Priority: YouTube + TikTok

The app explicitly prioritizes YouTube and TikTok data because:
1. These platforms drive discovery
2. They signal content-market fit
3. They have the most engagement data points

Users are reminded of this throughout the app.

## Storage

### User Data:
- PostgreSQL via Prisma
- OAuth tokens encrypted at rest
- Passwords hashed with bcrypt

### Audio Files (future):
- S3-compatible storage (AWS S3 or Cloudflare R2)
- Presigned URLs for secure access

## Security Considerations

1. **OAuth tokens** - Encrypted with AES-256-CBC
2. **Passwords** - Hashed with bcrypt (10 rounds)
3. **Sessions** - JWT with 7-day expiry
4. **API routes** - Auth required on all user-specific endpoints
5. **Rate limiting** - To be implemented on AI endpoints

## Future Enhancements

1. **Voice input** - Record voice notes, transcribe with Gemini
2. **CSV import/export** - Bulk data management
3. **Automated insights** - Cached AI analysis with confidence notes
4. **Team support** - Multiple users per account
5. **API** - Programmatic access for power users

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma
- **Auth**: JWT + bcrypt
- **AI**: Google Gemini API
- **Storage**: Vercel Blob (current), S3 (planned for audio)
- **Deployment**: Vercel
