import { ConferenceType } from "../types";

export const ANALYSIS_PROMPT = `
# Role
你是一位 CVPR/NeurIPS 顶刊的**视觉架构师**。你的核心能力是将抽象的论文逻辑转化为**具体的、结构化的、几何级的视觉指令**。

# Objective
阅读我提供的论文内容，输出一份 **[VISUAL SCHEMA]**。这份 Schema 将被直接发送给 AI 绘图模型，因此必须使用**强硬的物理描述**。

# Phase 1: Layout Strategy Selector
1. **Linear Pipeline**: 左→右流向 (适合 Data Processing, Encoding-Decoding)。
2. **Cyclic/Iterative**: 中心包含循环箭头 (适合 Optimization, RL, Feedback Loops)。
3. **Hierarchical Stack**: 上→下或下→上堆叠 (适合 Multiscale features, Tree structures)。
4. **Parallel/Dual-Stream**: 上下平行的双流结构 (适合 Multi-modal fusion, Contrastive Learning)。
5. **Central Hub**: 一个核心模块连接四周组件 (适合 Agent-Environment, Knowledge Graphs)。

# Phase 2: Schema Generation Rules
1. **Dynamic Zoning**: 根据选择的布局，定义 2-5 个物理区域 (Zones)。
2. **Internal Visualization**: 必须定义每个区域内部的“物体” (Icons, Grids, Trees)。
3. **Explicit Connections**: 明确描述连接关系。

Return JSON structure matching the schema requested.
`;

export const getGenerationPrompt = (blueprint: string) => `
**Style Reference & Execution Instructions:**

1. **Art Style (Visio/Illustrator Aesthetic):**
   Generate a **professional academic architecture diagram** suitable for a top-tier computer science paper.
   * **Visuals:** Flat vector graphics, distinct geometric shapes, clean thin outlines, and soft pastel fills (Azure Blue, Slate Grey, Coral Orange).
   * **Layout:** Strictly follow the spatial arrangement defined below.
   * **Vibe:** Technical, precise, clean white background. NOT hand-drawn, NOT photorealistic, NOT 3D render.

2. **CRITICAL TEXT CONSTRAINTS:**
   * **DO NOT render meta-labels:** Do not write words like "ZONE 1" or "LAYOUT CONFIGURATION".
   * **ONLY render "Key Text Labels":** Only text inside double quotes (e.g., "[Text]").
   * **Font:** Clean, bold Sans-Serif font.

3. **Visual Schema Execution:**
${blueprint}
`;
