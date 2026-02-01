import { google } from "googleapis";
import prisma from "./db";
import { encrypt, decrypt } from "./encryption";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || "";
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || "";
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/api/youtube/callback";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI
  );
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    state,
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function saveTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
  scope: string
) {
  await prisma.googleOAuthToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      expiresAt,
      scope,
    },
    update: {
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      expiresAt,
      scope,
    },
  });
}

export async function getAuthenticatedClient(userId: string) {
  const tokenRecord = await prisma.googleOAuthToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) {
    throw new Error("No YouTube connection found");
  }

  const oauth2Client = getOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: decrypt(tokenRecord.accessToken),
    refresh_token: decrypt(tokenRecord.refreshToken),
    expiry_date: tokenRecord.expiresAt.getTime(),
  });

  // Check if token needs refresh
  if (tokenRecord.expiresAt < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (credentials.access_token) {
      await saveTokens(
        userId,
        credentials.access_token,
        credentials.refresh_token || decrypt(tokenRecord.refreshToken),
        new Date(credentials.expiry_date || Date.now() + 3600000),
        tokenRecord.scope
      );
      
      oauth2Client.setCredentials(credentials);
    }
  }

  return oauth2Client;
}

export async function fetchChannelInfo(userId: string) {
  const auth = await getAuthenticatedClient(userId);
  const youtube = google.youtube({ version: "v3", auth });

  const response = await youtube.channels.list({
    part: ["snippet", "statistics"],
    mine: true,
  });

  const channel = response.data.items?.[0];
  if (!channel) {
    throw new Error("No channel found");
  }

  return {
    channelId: channel.id!,
    title: channel.snippet?.title || "",
    description: channel.snippet?.description || "",
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url || "",
    subscriberCount: channel.statistics?.subscriberCount || "0",
    videoCount: channel.statistics?.videoCount || "0",
    viewCount: channel.statistics?.viewCount || "0",
  };
}

export async function fetchUploads(userId: string, maxResults = 50) {
  const auth = await getAuthenticatedClient(userId);
  const youtube = google.youtube({ version: "v3", auth });

  // First get the uploads playlist ID
  const channelResponse = await youtube.channels.list({
    part: ["contentDetails"],
    mine: true,
  });

  const uploadsPlaylistId =
    channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Could not find uploads playlist");
  }

  // Fetch videos from uploads playlist
  const playlistResponse = await youtube.playlistItems.list({
    part: ["snippet", "contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults,
  });

  const videoIds = playlistResponse.data.items?.map(
    (item) => item.contentDetails?.videoId
  ).filter(Boolean) as string[];

  if (!videoIds || videoIds.length === 0) {
    return [];
  }

  // Get video details including duration
  const videosResponse = await youtube.videos.list({
    part: ["snippet", "contentDetails"],
    id: videoIds,
  });

  return (videosResponse.data.items || []).map((video) => ({
    youtubeVideoId: video.id!,
    title: video.snippet?.title || "",
    description: video.snippet?.description || "",
    publishedAt: video.snippet?.publishedAt
      ? new Date(video.snippet.publishedAt)
      : null,
    thumbnailUrl:
      video.snippet?.thumbnails?.medium?.url ||
      video.snippet?.thumbnails?.default?.url ||
      "",
    durationSeconds: parseDuration(video.contentDetails?.duration || ""),
  }));
}

// Parse ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(duration: string): number | null {
  if (!duration) return null;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

export async function syncYouTubeUploads(userId: string) {
  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: {
      userId,
      syncType: "youtube_uploads",
      status: "started",
    },
  });

  try {
    const uploads = await fetchUploads(userId);
    let newVideosCount = 0;

    for (const upload of uploads) {
      // Check if video already exists
      const existing = await prisma.video.findUnique({
        where: { youtubeVideoId: upload.youtubeVideoId },
      });

      if (!existing) {
        await prisma.video.create({
          data: {
            userId,
            youtubeVideoId: upload.youtubeVideoId,
            title: upload.title,
            description: upload.description,
            publishedAt: upload.publishedAt,
            thumbnailUrl: upload.thumbnailUrl,
            durationSeconds: upload.durationSeconds,
          },
        });
        newVideosCount++;
      } else {
        // Update existing video info
        await prisma.video.update({
          where: { id: existing.id },
          data: {
            title: upload.title,
            description: upload.description,
            thumbnailUrl: upload.thumbnailUrl,
            durationSeconds: upload.durationSeconds,
          },
        });
      }
    }

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        newVideosCount,
        completedAt: new Date(),
      },
    });

    return { success: true, newVideosCount };
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
