
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const optimizeMarkdownForAI = async (
  rawContent: string, 
  fileName: string, 
  isHtml: boolean = false,
  images: { name: string, data: string }[] = []
): Promise<string> => {
  
  // We send the image names but keep the prompt focused on structural integrity.
  const assetMetadata = images.map(img => img.name).join(', ');

  const prompt = `
    You are an AI context engineer. I have a document named "${fileName}".
    
    TASK:
    Convert the provided ${isHtml ? 'HTML' : 'raw text'} into a structured Markdown file optimized for LLM attention.
    
    RULES:
    1. Use H1, H2, H3 hierarchically.
    2. Convert messy data into clean Markdown tables or lists.
    3. Remove boilerplate (navs, footers, ad copy).
    4. BOLD key concepts and entities.
    5. IMAGE PLACEMENT: If there are references to figures, photos, or diagrams in the text, and I have provided asset names, insert the image using standard Markdown: ![alt text](base64_data).
    
    AVAILABLE IMAGE ASSETS:
    ${images.map(img => `NAME: ${img.name}\nDATA: ${img.data}`).join('\n\n')}

    DOCUMENT CONTENT:
    ${rawContent}

    OUTPUT ONLY THE MARKDOWN.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.1,
      },
    });

    return response.text || "Failed to generate markdown.";
  } catch (error) {
    console.error("Gemini Optimization Error:", error);
    throw new Error("Failed to optimize document.");
  }
};
