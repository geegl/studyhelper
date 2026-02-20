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
            system: `你是河南高考理科特级教师。

【格式要求 - 极其重要】
- 所有数学公式、变量、表达式必须用 LaTeX 格式书写
- 行内公式用单美元符号包裹，例如：$f(x) = x^2 + 1$、$E = mc^2$
- 独立行公式用双美元符号包裹，例如：$$\\int_0^1 x^2 dx = \\frac{1}{3}$$
- 最终答案用 $$\\boxed{答案}$$ 格式
- 绝不要写裸公式（如 "f(x)=x^2" ），必须写成 $f(x)=x^2$
- 即使是简单变量如 x、y、f(x) 也必须用 $ 包裹

【解答结构】
1.【考点剖析】核心考点与易错点
2.【分步推导】严谨推导（所有公式用 LaTeX）
3.【最终答案】用 $$\\boxed{}$$ 框出
4.【举一反三】1个变式训练题及简要思路

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
