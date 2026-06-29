import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { taskDescription, userProfile, activeDate, historicalContext, userApiKey, contextOverride, currentTasks, chatHistory } = await req.json();

    if (!taskDescription || !userProfile) {
      return NextResponse.json({ error: "taskDescription and userProfile are required" }, { status: 400 });
    }

   
    
    const apiKey = userApiKey || process.env.WORKING_KEY;
    const ai = new GoogleGenAI({ apiKey });

    let apiProfile = userProfile;
    if (userProfile === "Student") apiProfile = "student";
    if (userProfile === "Working Professional") apiProfile = "professional";
    if (userProfile === "Startup Founder") apiProfile = "founder";

    let systemInstruction = "";

    if (activeDate) {
      systemInstruction += `The user is currently looking at the schedule for ${activeDate}.\n\n`;
    }

    if (contextOverride) {
      systemInstruction += `Context Override: ${contextOverride}\n\n`;
    }

    systemInstruction += `Profile Context: ${apiProfile}. You are a precise task manager. You must respond in pure JSON format.
Your response must have this structure:
{
  "addedTasks": [],
  "updatedTasks": [],
  "deletedTaskIds": [],
  "message": "Brief chat response"
}

Behavioral Rules:
1. NEVER round or alter times provided by the user. If they say 6:40 to 6:42, use exactly those times format (e.g. "06:40").
2. The user will often specify times in a 12-hour format (e.g., "2 PM", "half past three in the afternoon"). You must mentally convert all times to a 24-hour format. When converting times past midnight (12:00 AM to 12:59 AM), you must output "00:00" to "00:59", NEVER "24:xx".
3. For ADD: Generate new tasks in the "addedTasks" array. Ensure newly added tasks include at least "title", "startTime" (e.g. "09:00"), "endTime" (e.g. "10:00"), and "targetDate" (e.g. "YYYY-MM-DD"). If the user asks to schedule a task for tomorrow, next week, or a specific date, you must calculate that exact YYYY-MM-DD date based on the current activeDate and include it in the targetDate field. "type" can be "high-priority", "focused", or "downtime". Whenever generating a task object, the startTime and endTime fields MUST strictly use the 24-hour format "HH:mm" (e.g., "14:00", "09:30"). Do not include AM or PM in the JSON output.
4. For UPDATE: If the user asks to change a task, find its ID in the provided current state. Include the modified task with the same ID in the "updatedTasks" array. DO NOT add a new task.
5. For DELETE: If the user asks to remove a task, find its ID. Include the ID in the "deletedTaskIds" array. DO NOT generate replacement tasks unless explicitly asked.
6. Breakdown Rule: If the user asks to "break down", "chunk", or "subdivide" an existing task, you MUST NOT put a list inside the userNotes field. Instead, you must physically replace the task on the timeline. Put the original task's ID in the deletedTaskIds array, and generate 2-4 new proportional sub-tasks in the addedTasks array that fit exactly within the original start and end times.
6. For CHAT: If no task modification is needed, leave the task arrays empty and only return a "message".`;

    const jsonSchema = `{
  "addedTasks": ["Array of new task objects, each containing targetDate (YYYY-MM-DD), and startTime/endTime in 24-hour format (HH:mm)"],
  "updatedTasks": ["Array of modified task objects (must include id, startTime/endTime in 24-hour format)"],
  "deletedTaskIds": ["Array of string IDs to remove"],
  "message": "Brief user message"
}`;

    const contents: any[] = [];
    
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      }
    }

    const prompt = `Task Description: ${taskDescription}
Historical Context: ${historicalContext || "None provided"}
Current Tasks State: ${JSON.stringify(currentTasks || [])}

You must return a strict JSON object that exactly matches this schema:
${jsonSchema}`;

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    let result = {};
    try {
      result = JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", response.text);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate breakdown" }, { status: 500 });
  }
}
