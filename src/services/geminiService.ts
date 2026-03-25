import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";

// Lazy initialization to prevent crash if API key is missing at load time
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!API_KEY) {
    console.warn("GEMINI_API_KEY is missing. AI features will be disabled.");
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiInstance;
};

export const processVoiceNote = async (transcript: string) => {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this voice transcript and provide a structured note. 
      Return a JSON object with:
      - title: A concise title
      - content: A short summary (max 100 chars)
      - body: The full cleaned up text
      - type: One of ['voice', 'text', 'task', 'idea']
      - mood: A single word describing the mood
      
      Transcript: "${transcript}"`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("AI Response Parse Error:", parseError, "Raw Text:", text);
      // Attempt to extract JSON if AI wrapped it in markdown blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          return null;
        }
      }
      return null;
    }
  } catch (error) {
    console.error("AI Processing Error:", error);
    return null;
  }
};
