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
            model: siliconflow("deepseek-ai/DeepSeek-V3"),
            system: `你是河南高考理科特级教师。请按以下结构解答题目：
1.【考点剖析】核心考点与易错点
2.【分步推导】严谨推导，用 LaTeX（$行内$ 或 $$独立行$$）
3.【最终答案】明确框出结果
4.【举一反三】提出1个变式训练题及简要思路
如OCR有错漏，请基于上下文推断原题意图。`,
            messages,
            temperature: 0.7,
        });

        return result.toAIStreamResponse();
    } catch (error: any) {
        console.error("DeepSeek Streaming Error:", error);
        return new Response(JSON.stringify({ error: "Failed to generate solution", details: error.message }), { status: 500 });
    }
}
