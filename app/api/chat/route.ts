import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, userApiKey } = await req.json();
    const apiKey = userApiKey || process.env.WORKING_KEY;
    if (!apiKey) {
       return NextResponse.json({ text: "API key is missing. Please configure your Gemini API Key in the Settings." });
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });
    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate response" }, { status: 500 });
  }
}
