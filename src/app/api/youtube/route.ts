import { NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_HANDLE = "gginvestments"; // Your YouTube handle

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export async function GET() {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: "YouTube API key not configured" },
      { status: 500 }
    );
  }

  try {
    // First, get the channel ID from the handle
    const channelSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${CHANNEL_HANDLE}&type=channel&key=${YOUTUBE_API_KEY}`;
    const channelResponse = await fetch(channelSearchUrl);
    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json(
        { error: "Channel not found", videos: [] },
        { status: 200 }
      );
    }

    const channelId = channelData.items[0].snippet.channelId;

    // Get the channel's uploads playlist
    const channelDetailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const channelDetailsResponse = await fetch(channelDetailsUrl);
    const channelDetails = await channelDetailsResponse.json();

    if (!channelDetails.items || channelDetails.items.length === 0) {
      return NextResponse.json({ error: "Channel details not found", videos: [] });
    }

    const uploadsPlaylistId = channelDetails.items[0].contentDetails.relatedPlaylists.uploads;
    const channelStats = channelDetails.items[0].statistics;

    // Get recent videos from the uploads playlist
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=6&key=${YOUTUBE_API_KEY}`;
    const playlistResponse = await fetch(playlistUrl);
    const playlistData = await playlistResponse.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      return NextResponse.json({ 
        videos: [], 
        channelStats: {
          subscriberCount: channelStats.subscriberCount,
          totalViews: channelStats.viewCount,
          videoCount: channelStats.videoCount,
        }
      });
    }

    // Get video IDs for statistics
    const videoIds = playlistData.items
      .map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId)
      .join(",");

    // Get video statistics
    const videoStatsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const videoStatsResponse = await fetch(videoStatsUrl);
    const videoStatsData = await videoStatsResponse.json();

    // Combine video data with statistics
    const videos: YouTubeVideo[] = playlistData.items.map((item: {
      snippet: {
        resourceId: { videoId: string };
        title: string;
        thumbnails: { high?: { url: string }; medium?: { url: string }; default: { url: string } };
        publishedAt: string;
      }
    }, index: number) => {
      const stats = videoStatsData.items[index]?.statistics || {};
      return {
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
        publishedAt: item.snippet.publishedAt,
        viewCount: stats.viewCount || "0",
        likeCount: stats.likeCount || "0",
        commentCount: stats.commentCount || "0",
      };
    });

    return NextResponse.json({
      videos,
      channelStats: {
        subscriberCount: channelStats.subscriberCount,
        totalViews: channelStats.viewCount,
        videoCount: channelStats.videoCount,
      },
    });
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube data", videos: [] },
      { status: 500 }
    );
  }
}
