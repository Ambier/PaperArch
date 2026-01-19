
import { GoogleGenAI, Type } from "@google/genai";
import { ConferenceType, PaperAnalysis } from "../types";
import { ANALYSIS_PROMPT, getGenerationPrompt } from "./prompts";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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

  return JSON.parse(response.text || '{}');
};

export const generateDiagram = async (blueprint: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: getGenerationPrompt(blueprint) }]
    },
    config: {
      imageConfig: { aspectRatio: "4:3" }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Neural rendering failed.");
};

export const refineDiagram = async (
  currentImageUrl: string,
  instruction: string,
  blueprint: string
): Promise<string> => {
  const ai = getAIClient();
  const base64Data = currentImageUrl.split(',')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: 'image/png' } },
        { text: `Update this scientific diagram. Instruction: "${instruction}". Original Specs: ${blueprint}. Maintain flat vector academic style.` }
      ]
    },
    config: {
      imageConfig: { aspectRatio: "4:3" }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Refinement cycle failed.");
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};
