
import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize lazily or conditionally to prevent crash on import
const getAiClient = () => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export async function generatePersonalizedMessage(
  companyName: string,
  baseTemplate: string,
  contactName?: string
): Promise<string> {
  const ai = getAiClient();

  if (!ai) {
    console.warn("Gemini API Key is missing. Skipping personalization.");
    return baseTemplate;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `
        Help me personalize this outreach message.
        Company: ${companyName}
        Contact: ${contactName || 'there'}
        Base Template: "${baseTemplate}"
        
        Rules:
        - Keep the tone friendly and professional.
        - Don't make it too long.
        - Only return the personalized message text, nothing else.
      `,
    });
    return response.text || baseTemplate;
  } catch (error) {
    console.error("AI personalization failed", error);
    return baseTemplate;
  }
}
