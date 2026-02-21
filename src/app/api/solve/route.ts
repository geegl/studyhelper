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
            // 剔除非法的不可见控制字符（除了正常的回车换行，剔除 ASCII 0-31 之间的其他字符）
            cleaned = cleaned.replace(/[\u0000-\u0009\u000B-\u000C\u000E-\u001F]+/g, "");

            parsed = JSON.parse(cleaned);
        } catch {
            // 传统正则替换往往会误伤且很难修复括号不匹配问题。
            // 听取您的建议：我们在此引入“AI 二次兜底修复机制”
            try {
                console.log("Direct JSON parse failed. Triggering AI JSON repair...");
                const fixResult = await generateText({
                    model: siliconflow("deepseek-ai/DeepSeek-V3"),
                    system: `你是一个负责数据清洗与 JSON 实体修复的 AI。以下是一段原本打算输出为 JSON，但因为含有发疯式的非法物理换行、反斜杠逃逸错误、或者是被意外截断等导致了语法崩坏的文本。
你的唯一任务是：提取这些内容里残存的逻辑，重新梳理出结构完美合法的 JSON。
【严重警告】：
1. 绝不要有任何前置或后置对话闲聊。
2. 绝对不能使用 \`\`\`json 标记，输出必须且仅仅以 { 开始，以 } 结束。
3. 如果输入文本实在太乱无法识别，请尽你所能去推演并填充 JSON 字段。
【强制结构】：必需且只包含 "summary", "answer", "explanation", "analysis", "derivation", "practice" 这6个键，且每一个键对应的值**必须是扁平的字符串（String）**。
如果有嵌套对象例如 {"1":"...", "2":"..."}，请将它们在对应值里合并为字符串 "1: ...\\n2: ..."。
【转义安全】：如果内容存在数学公式或大段文本，请务必保证输出合法的被转义的 \\n，严禁在 JSON 字符串值中间输出物理真实回车换行！`,
                    prompt: `请提取以下出错文本中的信息，合并嵌套字典为字符串，并转换为符合要求的合法 JSON：\n\n${result.text}`,
                    temperature: 0.1, // 极低温度保证结构严谨性
                });

                let fixedClean = fixResult.text.trim();
                const ffirst = fixedClean.indexOf("{");
                const flast = fixedClean.lastIndexOf("}");
                if (ffirst !== -1 && flast !== -1) {
                    fixedClean = fixedClean.substring(ffirst, flast + 1);
                }

                // 去除可能存在的不可见控制字符保护
                fixedClean = fixedClean.replace(/[\u0000-\u0009\u000B-\u000C\u000E-\u001F]+/g, "");

                parsed = JSON.parse(fixedClean);
                console.log("AI JSON repair succeeded!");
            } catch (error) {
                console.error("AI JSON repair also failed", error);
                // 假如连大模型智能修复也报语法错，做最终的安全托底
                parsed = {
                    summary: "大模型格式异常且修复失败",
                    answer: "详见推导",
                    explanation: "因输出格式化错误，且二次 AI 智能联想修复也发生了解析失败，以下为读出的原内容",
                    analysis: "",
                    derivation: result.text, // 回退到使用原内容
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
