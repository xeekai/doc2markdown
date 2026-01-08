
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const optimizeMarkdownForAI = async (
  rawContent: string, 
  fileName: string, 
  isHtml: boolean = false,
  images: { name: string, data: string }[] = []
): Promise<string> => {
  const imageContext = images.length > 0 
    ? `\nI am also providing ${images.length} image assets that were attached. Please intelligently reference these images in the Markdown where they semantically belong using the standard Markdown syntax ![alt text](base64_data).
       Available images: ${images.map(img => img.name).join(', ')}.`
    : '';

  const prompt = `
    You are an expert document structural engineer and AI context optimizer. 
    I will provide you with the ${isHtml ? 'HTML source code' : 'raw text extraction'} of a document named "${fileName}".
    ${imageContext}
    
    Your task:
    1. Convert this content into a clean, highly structured Markdown file.
    2. Optimize it specifically for LLM comprehension.
    3. If input is HTML:
       - Strip unnecessary scripts, styles, and boilerplate (nav, footer, ads).
       Preserve semantic structure.
    4. Ensure semantic headers (#, ##, ###) are used correctly.
    5. Use bolding for key concepts and entities.
    6. Convert lists and tables into proper Markdown format.
    7. **Crucial**: If I provided image assets, look for mentions of images, figures, or diagrams in the text and insert the corresponding base64 data URL provided below in the standard Markdown image format.
    
    IMAGE DATA REFERENCE (Only use these):
    ${images.map(img => `File Name: ${img.name}\nData URL: ${img.data}`).join('\n\n')}

    DOCUMENT CONTENT:
    ${rawContent}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.1,
      },
    });

    return response.text || "Failed to generate optimized markdown.";
  } catch (error) {
    console.error("Gemini Optimization Error:", error);
    throw new Error("Failed to optimize document for AI.");
  }
};
