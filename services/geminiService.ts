
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function generatePersonalizedMessage(
  companyName: string, 
  baseTemplate: string,
  contactName?: string
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
