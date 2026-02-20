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

            // --- 强化清洗逻辑 ---
            // 很多时候大模型为了排版公式，会输出形如 \frac 或者真实的换行符，
            // 导致 JSON.parse 因为不规范的反斜杠或换行直接报错。
            // 1. 我们先将真正的物理换行变成转义的 \\n，以便 JSON 支持。
            cleaned = cleaned.replace(/\n/g, "\\n").replace(/\r/g, "");

            // 2. 将非法的不可见控制字符剔除，不含回车换行（上面已转义处理）
            cleaned = cleaned.replace(/[\u0000-\u0009\u000B-\u000C\u000E-\u001F]+/g, "");

            parsed = JSON.parse(cleaned);
        } catch {
            // 最后抢救措施：如果大模型 JSON 被截断（没输出完），尝试补齐结尾
            try {
                let rescue = result.text.trim();
                const firstBrace = rescue.indexOf("{");
                if (firstBrace !== -1) {
                    rescue = rescue.substring(firstBrace);
                    // 补充可能的未闭合格式
                    rescue = rescue.replace(/\n/g, "\\n").replace(/\r/g, "");
                    rescue += '"}';
                    parsed = JSON.parse(rescue);
                } else {
                    throw new Error("No JSON structure found");
                }
            } catch {
                // 如果解析彻底失败，将整段文本作为 derivation 强制返回兜底
                parsed = {
                    summary: "大模型格式异常",
                    answer: "详见推导",
                    explanation: "因大模型输出格式化错误，以下为直接捕获的内容",
                    analysis: "",
                    derivation: result.text,
                    practice: "",
                };
            }
        }

        // --- 类型强制拉平护城河 ---
        // 大模型经常会无视 "所有字段必须为字符串" 的 Prompt，尤其在有多小问的时候把 answer 和 explanation 写成嵌套对象。
        // 这里我们对所有期望是 string 的字段进行强制类型转换与扁平化，防止前端渲染 Crash。
        const stringFields = ["summary", "answer", "explanation", "analysis", "derivation", "practice"];
        for (const field of stringFields) {
            if (parsed && parsed[field] !== undefined) {
                if (typeof parsed[field] === "object" && parsed[field] !== null) {
                    try {
                        // 将自作聪明的嵌套 JSON Object 拉平成一段好读的文本段落，例如 "1: xxx\n2: yyy"
                        parsed[field] = Object.entries(parsed[field])
                            .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join("\n\n");
                    } catch {
                        parsed[field] = String(parsed[field]);
                    }
                } else {
                    parsed[field] = String(parsed[field] || "");
                }
            }
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
