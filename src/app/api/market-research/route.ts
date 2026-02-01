import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import { put, list } from "@vercel/blob";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || "three-seconds-secret-key-change-in-production";

function getUserIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// Fetch trending YouTube videos for a topic
async function fetchYouTubeTrending(topic: string): Promise<{
  videos: { title: string; views: string; channel: string }[];
  error?: string;
}> {
  if (!YOUTUBE_API_KEY) {
    return { videos: [], error: "YouTube API key not configured" };
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(topic)}&order=viewCount&maxResults=15&publishedAfter=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}&key=${YOUTUBE_API_KEY}`;
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      return { videos: [] };
    }

    const videoIds = searchData.items.map((item: { id: { videoId: string } }) => item.id.videoId).join(",");
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json();

    const videos = statsData.items?.map((video: {
      snippet: { title: string; channelTitle: string };
      statistics: { viewCount: string };
    }) => ({
      title: video.snippet.title,
      views: formatViews(parseInt(video.statistics.viewCount || "0")),
      channel: video.snippet.channelTitle,
    })) || [];

    return { videos };
  } catch (error) {
    console.error("YouTube API error:", error);
    return { videos: [], error: "Failed to fetch YouTube data" };
  }
}

// Fetch trending Reddit posts
async function fetchRedditTrending(topic: string): Promise<{
  posts: { title: string; upvotes: number; subreddit: string }[];
  error?: string;
}> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=hot&limit=20&t=week`;
    
    const res = await fetch(url, {
      headers: { "User-Agent": "three-seconds-app/1.0" }
    });
    
    if (!res.ok) {
      return { posts: [], error: "Reddit API unavailable" };
    }

    const data = await res.json();
    
    const posts = data.data?.children?.map((child: {
      data: { title: string; ups: number; subreddit: string }
    }) => ({
      title: child.data.title,
      upvotes: child.data.ups,
      subreddit: child.data.subreddit,
    })) || [];

    return { posts };
  } catch (error) {
    console.error("Reddit API error:", error);
    return { posts: [], error: "Failed to fetch Reddit data" };
  }
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
  return views.toString();
}

// GET - Get latest market research snapshot
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { blobs } = await list({ prefix: `market-research/${userId}/` });
    
    if (blobs.length === 0) {
      return NextResponse.json({ snapshot: null });
    }

    const sortedBlobs = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    
    const response = await fetch(sortedBlobs[0].url);
    const snapshot = await response.json();

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Get market research error:", error);
    return NextResponse.json({ error: "Failed to get research" }, { status: 500 });
  }
}

// POST - Run new market research OR chat about results
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Check if this is a chat message
    if (body.type === "chat") {
      return handleChat(body.message, body.researchContext, body.conversationHistory);
    }

    // Otherwise, run new research
    const { niche, keywords } = body;

    if (!niche) {
      return NextResponse.json({ error: "Niche is required" }, { status: 400 });
    }

    const searchTopic = keywords ? `${niche} ${keywords}` : niche;

    const [youtubeData, redditData] = await Promise.all([
      fetchYouTubeTrending(searchTopic),
      fetchRedditTrending(searchTopic),
    ]);

    const realDataContext = `
REAL DATA FROM SOURCES:

=== YOUTUBE TRENDING VIDEOS (Last 30 Days) ===
${youtubeData.videos.length > 0 
  ? youtubeData.videos.map((v, i) => `${i + 1}. "${v.title}" - ${v.views} views (${v.channel})`).join("\n")
  : "No YouTube data available"}

=== REDDIT HOT POSTS (This Week) ===
${redditData.posts.length > 0
  ? redditData.posts.map((p, i) => `${i + 1}. "${p.title}" - ${p.upvotes} upvotes (r/${p.subreddit})`).join("\n")
  : "No Reddit data available"}
`;

    const prompt = `You are analyzing REAL trending data to help a content creator in the "${niche}" niche.

${realDataContext}

Based on this REAL data, extract:

1. HOOKS TRENDING - What hook styles/formats are working? Look at video titles and post titles.
2. CONTENT TRENDING - What topics/themes are getting views? Be specific.
3. HASHTAGS TRENDING - What hashtags would work based on these trends?

Return JSON:
{
  "hooksTrending": [
    {"hook": "The exact hook format/style", "example": "Real example from the data", "whyWorks": "Why this works"}
  ] (5-7 hooks),
  "contentTrending": [
    {"topic": "Specific topic", "description": "What angle is working", "viewPotential": "High/Medium"}
  ] (5-7 topics),
  "hashtagsTrending": ["hashtag1", "hashtag2", ...] (10-15 hashtags WITHOUT #),
  "topVideos": [
    {"title": "Title", "views": "Views", "takeaway": "What to learn from this"}
  ] (top 5 from YouTube data),
  "summary": "2-3 sentence summary of what's trending and why"
}

Use the ACTUAL data above. Be specific and reference real titles/topics you see. Return valid JSON only.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    let result = await model.generateContent(prompt);
    let responseText = result.response.text();

    let parsedResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      const retryResult = await model.generateContent(prompt + "\n\nReturn ONLY valid JSON.");
      const retryText = retryResult.response.text();
      const jsonMatch = retryText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse research results");
      }
    }

    const snapshot = {
      id: `research_${Date.now()}`,
      niche,
      keywords: keywords || "",
      sources: {
        youtube: youtubeData.videos.length,
        reddit: redditData.posts.length,
      },
      ...parsedResult,
      createdAt: new Date().toISOString(),
    };

    await put(
      `market-research/${userId}/${snapshot.id}.json`,
      JSON.stringify(snapshot),
      { access: "public", contentType: "application/json" }
    );

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Market research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Handle chat messages about research results
async function handleChat(message: string, researchContext: string, conversationHistory?: ChatMessage[]) {
  try {
    // Build conversation context
    const history = conversationHistory || [];
    const conversationContext = history.length > 0 
      ? "\n\nPREVIOUS CONVERSATION:\n" + history.map(m => `${m.role === "user" ? "User" : "You"}: ${m.content}`).join("\n")
      : "";

    const prompt = `You are a friendly, conversational trend research assistant helping a content creator.

TREND DATA YOU'RE DISCUSSING:
${researchContext}

GUIDELINES:
- Be conversational and natural - talk like a helpful friend
- Give specific video ideas when asked (use the actual trends above)
- Remember what was discussed in this conversation
- If they ask to narrow down, focus on their criteria
- Be concise but helpful
- Reference specific hooks, topics, or hashtags from the data
${conversationContext}

User says: "${message}"

Respond naturally and helpfully:`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process your question" },
      { status: 500 }
    );
  }
}
