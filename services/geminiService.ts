
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ConferenceType, PaperAnalysis } from "../types";
import { ANALYSIS_PROMPT, getGenerationPrompt } from "./prompts";

// Initialize AI Client with the provided API key
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Step 1: Analyze paper semantics using Gemini 3 Pro
 */
export const analyzePaper = async (
  content: string | File,
  conference: ConferenceType
): Promise<PaperAnalysis> => {
  const ai = getAIClient();
  
  let contentPart: any;
  if (typeof content === 'string') {
    contentPart = { text: content };
  } else {
    const base64 = await fileToBase64(content);
    contentPart = {
      inlineData: {
        data: base64,
        mimeType: content.type
      }
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [contentPart, { text: ANALYSIS_PROMPT }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          layoutStrategy: { type: Type.STRING },
          architectureBlueprint: { type: Type.STRING },
          keyComponents: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "summary", "layoutStrategy", "architectureBlueprint", "keyComponents"]
      }
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text);
};

/**
 * Step 2: Generate diagram using Nano Banana (Gemini 2.5 Flash Image)
 */
export const generateDiagram = async (blueprint: string): Promise<string> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // The requested "Nano Banana"
    contents: {
      parts: [{ text: getGenerationPrompt(blueprint) }]
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3"
      }
    }
  });

  // Guidelines: Iterate through candidates and parts to find the image part
  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("Nano Banana failed to render the schematic.");
};

/**
 * Step 3: Refine the diagram using natural language
 */
export const refineDiagram = async (
  currentImageUrl: string,
  instruction: string,
  blueprint: string
): Promise<string> => {
  const ai = getAIClient();
  const base64Data = currentImageUrl.split(',')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // Use Nano Banana for edits as well
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/png'
          }
        },
        { 
          text: `Update this scientific architecture diagram based on instruction: "${instruction}". 
          Context Blueprint: ${blueprint}. 
          Keep the clean, academic, flat vector style.` 
        }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3"
      }
    }
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("Refinement cycle failed to produce an image.");
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};
