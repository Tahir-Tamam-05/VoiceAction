// ─── Gemini Service ──────────────────────────────────────────
// Refined AI pipeline: Voice transcript → AI Analysis → Structured Note

const API_KEY: string = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";

if (!API_KEY) {
  console.warn(
    "[VoiceAction] VITE_GEMINI_API_KEY is not set.\n" +
    "Please create a .env file and add: VITE_GEMINI_API_KEY=your_key_here"
  );
}

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

export interface GeminiStructuredResponse {
  title: string;
  type: 'task' | 'event' | 'idea' | 'voice' | 'audio' | 'text';
  summary: string;
  tags: string[];
  content?: string;
  body?: string;
  mood?: string;
}

/**
 * Processes voice transcript using Gemini API with a structured prompt.
 */
export async function processVoiceNote(text: string): Promise<GeminiStructuredResponse | null> {
  if (!API_KEY) {
    console.error("Gemini API key is missing.");
    return null;
  }

  const structuredPrompt = `Convert the following voice input into a structured note.
  
Return EXACTLY a JSON format:
{
  "title": "A concise and catchy title",
  "type": "TASK | EVENT | IDEA",
  "summary": "A short 1-sentence summary of the content",
  "tags": ["tag1", "tag2"]
}

Text: "${text}"`;

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: structuredPrompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) return null;

    // Parse logic with fallback
    try {
      // Clean up markdown code blocks if AI included them
      const cleaned = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned) as GeminiStructuredResponse;
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON:", parseErr, rawContent);
      return null;
    }
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return null;
  }
}

/**
 * Generates a cover image for a note using Gemini API.
 */
export async function generateNoteCover(title: string, type: string): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `Generate a cover image URL for a note titled "${title}" of type "${type}". Return only the URL.` }]
          }
        ]
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Cover generation failed:", error);
    return null;
  }
}

/**
 * Translates text using Gemini API.
 */
export async function translateNote(text: string, targetLang: string): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `Translate this text to ${targetLang}. Return only the translated text: "${text}"` }]
          }
        ]
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Translation failed:", error);
    return null;
  }
}
