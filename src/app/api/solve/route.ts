import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const maxDuration = 60; // 允许推导较长时间

// 创建兼容 OpenAI 接口形式的 SiliconFlow 客户端
const siliconflow = createOpenAI({
    baseURL: "https://api.siliconflow.cn/v1",
    apiKey: process.env.SILICONFLOW_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!process.env.SILICONFLOW_API_KEY) {
            return new Response(JSON.stringify({ error: "SiliconFlow API Key is not configured" }), { status: 500 });
        }
        const result = await streamText({
            model: siliconflow("Pro/deepseek-ai/DeepSeek-V3.2"),
            system: `你是一位专门辅导【河南高考理科生】的资深物理/数学/化学特级教师（Dr. MShout系统内核）。
请仔细阅读学生提供的题目信息（可能包含OCR识别的文本和坐标），并按照以下结构提供最高质量的解答：
1. 【考点剖析】：一句话点破这道题的核心考点，指出它的易错点。
2. 【分步推导】：步骤必须严谨、清晰。不要跳大步。所有复杂的物理量、数学公式请使用精确的 LaTeX 语法，用 $ 包裹行内公式，用 $$ 包裹独立行公式，例如 $E = mc^2$。
3. 【最终答案】：明确框出最终结果。
4. 【举一反三】：在这个题的基础之上，稍微变形（比如改变条件或设问），提出1个相似但更具区分度的变式训练题，并给出简要解答思路。

始终保持鼓励、循循善诱的语气。如果OCR识别的内容有明显错漏，请大胆基于上下文推断原本的高考真题意图，但要提醒学生注意。`,
            messages,
            temperature: 0.7,
        });

        return result.toAIStreamResponse();
    } catch (error: any) {
        console.error("DeepSeek Streaming Error:", error);
        return new Response(JSON.stringify({ error: "Failed to generate solution", details: error.message }), { status: 500 });
    }
}
