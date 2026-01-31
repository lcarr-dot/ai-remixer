import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const prompts: Record<string, string> = {
  tweet: `Transform the following content into an engaging tweet (max 280 characters). 
Be punchy and attention-grabbing. Use a hook at the start. 
Don't use hashtags unless they're truly essential.
Keep it natural and conversational, not salesy.
Only output the tweet text, nothing else.`,

  twitter_thread: `Transform the following content into an engaging Twitter thread of 5-8 tweets.
Format each tweet on its own line, numbered (1/, 2/, etc).
Start with a powerful hook in the first tweet.
Make each tweet valuable on its own but connected to the narrative.
End with a strong call-to-action or thought-provoking conclusion.
Keep each tweet under 280 characters.
Only output the thread, nothing else.`,

  linkedin: `Transform the following content into an engaging LinkedIn post.
Start with a hook that stops the scroll (first line is crucial).
Use short paragraphs (1-2 sentences each) with line breaks between them.
Include a personal angle or insight.
End with a question or call-to-action to drive engagement.
Use emojis sparingly and professionally (0-3 max).
Aim for 1000-1300 characters for optimal engagement.
Only output the post, nothing else.`,

  instagram: `Transform the following content into an engaging Instagram caption.
Start with a hook that captures attention.
Tell a micro-story or share a personal insight.
Use line breaks for readability.
End with a call-to-action (comment, save, share).
Add 3-5 highly relevant hashtags at the very end.
Aim for 150-300 words.
Only output the caption, nothing else.`,

  newsletter: `Transform the following content into a compelling email newsletter snippet.
Write a subject line first (marked as SUBJECT:).
Then write the email body with a personal, conversational tone.
Start with a hook, deliver value in the middle, end with a clear CTA.
Use short paragraphs and make it scannable.
Only output the newsletter content, nothing else.`,
};

export async function POST(request: NextRequest) {
  try {
    const { content, format } = await request.json();

    if (!content || !format) {
      return NextResponse.json(
        { error: "Content and format are required" },
        { status: 400 }
      );
    }

    const systemPrompt = prompts[format];
    if (!systemPrompt) {
      return NextResponse.json(
        { error: "Invalid format specified" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `${systemPrompt}

Content to transform:
"""
${content}
"""`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return NextResponse.json(
      { error: "Failed to process content. Please try again." },
      { status: 500 }
    );
  }
}
