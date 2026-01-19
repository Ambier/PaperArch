
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ConferenceType, PaperAnalysis } from "../types";

// Using the injected API key
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Step 1: Analyze paper and extract architectural concepts using the Visual Architect Role.
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

  const prompt = `
# Role
你是一位 CVPR/NeurIPS 顶刊的**视觉架构师**。你的核心能力是将抽象的论文逻辑转化为**具体的、结构化的、几何级的视觉指令**。

# Objective
阅读我提供的论文内容，输出一份 **[VISUAL SCHEMA]**。这份 Schema 将被直接发送给 AI 绘图模型，因此必须使用**强硬的物理描述**。

# Phase 1: Layout Strategy Selector (关键步骤：布局决策)
在生成 Schema 之前，请先 analysis 论文逻辑，从以下**布局原型**中选择最合适的一个（或组合）：
1. **Linear Pipeline**: 左→右流向 (适合 Data Processing, Encoding-Decoding)。
2. **Cyclic/Iterative**: 中心包含循环箭头 (适合 Optimization, RL, Feedback Loops)。
3. **Hierarchical Stack**: 上→下或下→上堆叠 (适合 Multiscale features, Tree structures)。
4. **Parallel/Dual-Stream**: 上下平行的双流结构 (适合 Multi-modal fusion, Contrastive Learning)。
5. **Central Hub**: 一个核心模块连接四周组件 (适合 Agent-Environment, Knowledge Graphs)。

# Phase 2: Schema Generation Rules
1. **Dynamic Zoning**: 根据选择的布局，定义 2-5 个物理区域 (Zones)。不要局限于 3 个。
2. **Internal Visualization**: 必须定义每个区域内部的“物体” (Icons, Grids, Trees)，禁止使用抽象概念。
3. **Explicit Connections**: 如果是循环过程，必须明确描述 "Curved arrow looping back from Zone X to Zone Y"。

# Instructions for Output
Analyze the paper and return your findings in JSON format.
The "architectureBlueprint" field must contain the "Golden Schema" starting with ---BEGIN PROMPT--- and ending with ---END PROMPT--- following your defined rules.

Return JSON structure:
{
  "title": "Short descriptive title of the paper",
  "summary": "2-3 sentence summary of the core contribution",
  "layoutStrategy": "One of: Linear Pipeline, Cyclic/Iterative, Hierarchical Stack, Parallel/Dual-Stream, Central Hub",
  "architectureBlueprint": "The complete Golden Schema text including Style, Layout Config, Zones, and Connections",
  "keyComponents": ["List of main modules identified"]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [contentPart, { text: prompt }] },
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
 * Step 2: Generate the initial diagram based on the "Golden Schema" using specific style reference.
 */
export const generateDiagram = async (blueprint: string): Promise<string> => {
  const ai = getAIClient();
  
  // The full prompt including the user-specified style references
  const fullPrompt = `
**Style Reference & Execution Instructions:**

1. **Art Style (Visio/Illustrator Aesthetic):**
   Generate a **professional academic architecture diagram** suitable for a top-tier computer science paper (CVPR/NeurIPS).
   * **Visuals:** Flat vector graphics, distinct geometric shapes, clean thin outlines, and soft pastel fills (Azure Blue, Slate Grey, Coral Orange).
   * **Layout:** Strictly follow the spatial arrangement defined below.
   * **Vibe:** Technical, precise, clean white background. NOT hand-drawn, NOT photorealistic, NOT 3D render, NO shadows/shading.

2. **CRITICAL TEXT CONSTRAINTS (Read Carefully):**
   * **DO NOT render meta-labels:** Do not write words like "ZONE 1", "LAYOUT CONFIGURATION", "Input", "Output", or "Container" inside the image. These are structural instructions for YOU, not text for the image.
   * **ONLY render "Key Text Labels":** Only text inside double quotes (e.g., "[Text]") listed under "Key Text Labels" should appear in the diagram.
   * **Font:** Use a clean, bold Sans-Serif font (like Roboto or Helvetica) for all labels.

3. **Visual Schema Execution:**
   Translate the following structural blueprint into the final image:

${blueprint}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // "nano banana"
    contents: {
      parts: [{ text: fullPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  
  throw new Error("Failed to generate image data from Nano Banana.");
};

/**
 * Step 3: Refine the diagram using natural language.
 */
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
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/png'
          }
        },
        { 
          text: `Update this machine learning architecture diagram.
          User Instruction: "${instruction}"
          Original Specification Context: ${blueprint}
          
          Follow the academic Visio/Illustrator aesthetic: flat vector, clean outlines, no 3D elements, legible labels.` 
        }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  
  throw new Error("Failed to refine diagram.");
};

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
};
