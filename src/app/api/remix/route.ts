import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const prompts: Record<string, string> = {
  tweet: `You are a viral finance/investment content creator. Transform the following investment content into a single viral tweet (max 280 characters).

Rules:
- Start with a hook that stops the scroll
- Make it punchy, confident, and slightly provocative
- Use numbers and specific data points when available
- No hashtags unless absolutely essential
- Sound like a successful investor sharing wisdom, not a salesperson
- Create FOMO or curiosity
- Old money energy - sophisticated but accessible

Only output the tweet text, nothing else.`,

  youtube: `You are a viral finance/investment content creator for YouTube. Transform the following investment content into a YouTube hook + script + caption.

Format your response EXACTLY like this:
HOOK: [A 5-10 second spoken hook that makes viewers NEED to keep watching]

SCRIPT: [A 60-90 second video script that delivers value, keeps viewers engaged, and sounds natural when spoken]

CAPTION: [A compelling video description with the key points, 150-300 words]

Rules for the HOOK:
- Open with a bold claim, shocking stat, or provocative question
- Create immediate curiosity or FOMO
- Sound confident and authoritative
- Examples: "Here's why 90% of investors are about to lose money..." or "The one stock everyone's ignoring that's about to explode..."

Rules for the SCRIPT:
- Write it to be SPOKEN, not read - use natural, conversational language
- Break down complex ideas into simple, digestible points
- Include pattern interrupts to maintain attention
- Build to a clear takeaway or insight
- Sound like you're sharing insider knowledge with a friend

Rules for the CAPTION:
- Start with the most compelling insight
- Use short paragraphs
- Include a clear value proposition
- End with a soft CTA
- Sound sophisticated but accessible - old money energy

Only output the hook, script, and caption, nothing else.`,

  tiktok: `You are a viral finance/investment content creator for TikTok. Transform the following investment content into a TikTok hook + script + caption.

Format your response EXACTLY like this:
HOOK: [A 3-5 second spoken hook that stops the scroll immediately]

SCRIPT: [A 30-60 second video script that's fast-paced, engaging, and delivers a clear point]

CAPTION: [A short, punchy caption with relevant context, 50-150 words max]

Rules for the HOOK:
- MUST grab attention in under 3 seconds
- Be bold, controversial, or shocking
- Use "you" language - make it personal
- Examples: "If you have $1000 saved, watch this now" or "POV: You just found out what the rich actually invest in"
- Sound like you're sharing a secret

Rules for the SCRIPT:
- Fast-paced and punchy - no filler words
- Written to be SPOKEN naturally, like talking to a friend
- Get to the point quickly - TikTok viewers have short attention spans
- Use simple language, break down complex finance terms
- End with a strong statement or call-to-action
- Include 1-2 "wait for it" moments to keep viewers watching

Rules for the CAPTION:
- Keep it scannable and punchy
- Use line breaks
- Add 2-3 relevant hashtags at the end
- Sound confident and slightly exclusive - like you're letting people in on something

Only output the hook, script, and caption, nothing else.`,
};

// Fetch knowledge base content
async function getKnowledgeBaseContext(): Promise<string> {
  try {
    const { blobs } = await list({ prefix: "knowledge-base/" });
    
    if (blobs.length === 0) {
      return "";
    }

    const contextParts: string[] = [];
    
    // Fetch each blob's content
    for (const blob of blobs.filter(b => b.pathname.endsWith(".json"))) {
      try {
        const response = await fetch(blob.url);
        const data = await response.json();
        if (data.text) {
          contextParts.push(`[From: ${data.originalName}]\n${data.text.substring(0, 10000)}`);
        }
      } catch {
        // Skip failed fetches
      }
    }

    if (contextParts.length === 0) {
      return "";
    }

    return `

--- CHANNEL KNOWLEDGE BASE ---
Use the following information about the channel, past content, and metrics to inform your output style and make it more personalized:

${contextParts.join("\n\n---\n\n")}

--- END KNOWLEDGE BASE ---

`;
  } catch {
    return "";
  }
}

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

    // Get knowledge base context
    const knowledgeContext = await getKnowledgeBaseContext();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `${systemPrompt}
${knowledgeContext}
Investment content to transform:
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
