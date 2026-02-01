import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const prompts: Record<string, string> = {
  tweet: `You are an expert viral content creator. Transform the following content into a single viral tweet (max 280 characters).

Rules:
- Start with a hook that stops the scroll
- Make it punchy, confident, and engaging
- Use numbers and specific data points when available
- No hashtags unless absolutely essential
- Sound authentic and relatable
- Create FOMO, curiosity, or emotional connection

Only output the tweet text, nothing else.`,

  youtube: `You are an expert viral content creator for YouTube. Transform the following content into a YouTube hook + script + caption.

Format your response EXACTLY like this:
HOOK: [A 5-10 second spoken hook that makes viewers NEED to keep watching]

SCRIPT: [A 60-90 second video script that delivers value, keeps viewers engaged, and sounds natural when spoken]

CAPTION: [A compelling video description with the key points, 150-300 words]

Rules for the HOOK:
- Open with something that creates immediate curiosity
- Could be a bold claim, surprising fact, relatable moment, or provocative question
- Sound confident and authentic

Rules for the SCRIPT:
- Write it to be SPOKEN, not read - use natural, conversational language
- Include pattern interrupts to maintain attention
- Build to a clear takeaway or insight
- Sound like you're talking to a friend

Rules for the CAPTION:
- Start with the most compelling point
- Use short paragraphs
- Include a clear value proposition
- End with a soft CTA

Only output the hook, script, and caption, nothing else.`,

  tiktok: `You are an expert viral content creator for TikTok. Transform the following content into a TikTok hook + script + caption.

Format your response EXACTLY like this:
HOOK: [A 3-5 second spoken hook that stops the scroll immediately]

SCRIPT: [A 30-60 second video script that's fast-paced, engaging, and delivers a clear point]

CAPTION: [A short, punchy caption with relevant context, 50-150 words max]

Rules for the HOOK:
- MUST grab attention in under 3 seconds
- Be bold, intriguing, funny, or shocking
- Use "you" language - make it personal

Rules for the SCRIPT:
- Fast-paced and punchy - no filler words
- Written to be SPOKEN naturally, like talking to a friend
- Get to the point quickly - TikTok viewers have short attention spans
- Use simple, accessible language
- End with a strong statement, punchline, or call-to-action

Rules for the CAPTION:
- Keep it scannable and punchy
- Use line breaks
- Add 2-3 relevant hashtags at the end

Only output the hook, script, and caption, nothing else.`,
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
