import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const siliconflow = createOpenAI({
    baseURL: "https://api.siliconflow.cn/v1",
    apiKey: process.env.SILICONFLOW_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!process.env.SILICONFLOW_API_KEY) {
            return NextResponse.json({ error: "SiliconFlow API Key is not configured" }, { status: 500 });
        }

        const userMessage = messages?.[messages.length - 1]?.content || "";

        const result = await generateText({
            model: siliconflow("deepseek-ai/DeepSeek-V3"),
            system: `你是河南高考理科特级教师。

【输出格式 - 极其重要】
你必须严格按以下 JSON 格式输出，不要输出任何其他内容：
{
  "summary": "一句话概括题目类型和考查内容",
  "answer": "最终答案（如 C、D 或具体数值）",
  "explanation": "一句话解释为什么是这个答案",
  "analysis": "考点剖析的详细 Markdown 内容",
  "derivation": "分步推导的详细 Markdown 内容",
  "practice": "举一反三的变式题和思路 Markdown 内容"
}

【LaTeX 格式要求】
- 所有数学公式、变量必须用 $ 包裹，如 $f(x) = x^2$
- 独立行公式用 $$ 包裹
- answer 字段中如有公式也需用 $ 包裹

【内容要求】
- summary：简洁，例如"分段函数性质综合分析（奇偶性、单调性、对称性、零点）"
- answer：直接给结论（如"C、D"）
- explanation：一句话精炼解释
- analysis：核心考点与易错点，可用列表
- derivation：严谨推导过程，不跳步
- practice：1个变式训练题及解答思路

如OCR有错漏，请推断原题意图。只输出 JSON，不要包含 \`\`\`json 标记。`,
            prompt: userMessage,
            temperature: 0.7,
        });

        // 尝试解析 JSON
        let parsed;
        try {
            // 取出第一个 { 和最后一个 } 之间的内容，忽略模型可能的闲聊前缀或后缀
            let cleaned = result.text.trim();
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            parsed = JSON.parse(cleaned);
        } catch {
            // 如果解析失败，将整段文本作为 derivation 返回
            parsed = {
                summary: "题目解析",
                answer: "详见推导",
                explanation: "请查看分步推导获取完整解答",
                analysis: "",
                derivation: result.text,
                practice: "",
            };
        }

        return NextResponse.json({
            success: true,
            data: parsed,
        });
    } catch (error: any) {
        console.error("DeepSeek Error:", error);
        return NextResponse.json(
            { error: "Failed to generate solution", details: error.message },
            { status: 500 }
        );
    }
}
