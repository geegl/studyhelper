import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// 使用 Edge Runtime！Edge 函数的流式响应不受 60 秒限制
// 只要数据流在持续传输，连接就不会被 Vercel 切断
export const runtime = "edge";

const siliconflow = createOpenAI({
    baseURL: "https://api.siliconflow.cn/v1",
    apiKey: process.env.SILICONFLOW_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!process.env.SILICONFLOW_API_KEY) {
            return Response.json({ error: "SiliconFlow API Key is not configured" }, { status: 500 });
        }

        const userMessage = messages?.[messages.length - 1]?.content || "";

        // 使用 streamText 代替 generateText！
        // 流式传输让 Vercel 的连接一直保持活跃（数据持续流动），
        // 哪怕模型推理需要 90 秒也不会触发 60s 超时强杀。
        const result = await streamText({
            model: siliconflow("deepseek-ai/DeepSeek-V3"),
            system: `你是一位拥有 20 年高考教学经验的河南省高中数学特级教师。你的学生是高三备战高考的理科生。

【核心教学原则 - 极其重要】
1. 你的解题过程必须完全基于高中课本知识，使用学生在课堂上学过的定理、公式和方法
2. 每一步推导都要解释"为什么这样做"——不是直接给结果，而是引导学生理解解题思路
3. 要像课堂上讲题一样，先分析题目条件，找到突破口，再一步步推进
4. 禁止使用大学数学方法（如极限、微积分、矩阵等），必须用高中生能理解的方法
5. 推导过程中遇到关键转折点或技巧性步骤，要特别标注并解释为什么想到这样做

【输出格式 - 严格遵守】
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

【各字段内容要求】
- summary：简洁概括，例如"抛物线焦点弦与面积比最值问题"
- answer：直接给结论（如"C、D"或具体数值）
- explanation：一句话精炼解释核心思路
- analysis：列出本题涉及的高中课本知识点、常见陷阱和易错点
- derivation：这是最重要的部分！要求如下：
  · 第一步：审题——提取已知条件，明确要求什么
  · 第二步：分析突破口——解释"看到这道题，我们应该从哪里入手，为什么"
  · 后续每一步都要说清楚：这一步在做什么、为什么要这样做、用了什么定理/公式
  · 关键步骤用 **💡 思路点拨：** 标注，解释为什么想到这个方法
  · 计算过程要详细，不要跳步，每个等号变换都要写清楚
  · 最后要有总结：回顾解题路径，帮助学生建立解题框架
- practice：1个同类型变式题及解题思路提示（不需要完整解答）

如OCR有错漏，请推断原题意图。只输出 JSON，不要包含 \`\`\`json 标记。`,
            prompt: userMessage,
            temperature: 0.7,
        });

        // 直接返回流式响应！不再等待全部完成
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error("DeepSeek Error:", error);
        return Response.json(
            { error: "Failed to generate solution", details: error.message },
            { status: 500 }
        );
    }
}
