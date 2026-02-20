const assert = require("assert");

// 1. JSON 解析容错逻辑测试
function parseAIResult(text) {
    let cleaned = text.trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleaned);
}

const testCasesJSON = [
    {
        input: '{"summary": "test"}',
        expect: { summary: "test" }
    },
    {
        input: '```json\n{"summary": "test"}\n```',
        expect: { summary: "test" }
    },
    {
        input: '好的，你想知道的答案是：\n {\n "summary": "test" \n } \n希望有帮助~',
        expect: { summary: "test" }
    }
];

testCasesJSON.forEach((tc, i) => {
    try {
        const res = parseAIResult(tc.input);
        assert.deepStrictEqual(res, tc.expect);
        console.log(`JSON Test ${i + 1} passed`);
    } catch (e) {
        console.error(`JSON Test ${i + 1} failed`, e);
    }
});

// 2. preprocessLatex 逻辑测试
function preprocessLatex(text) {
    // 之前代码里有两段，一段是废代码，一段是专门处理 \boxed
    text = text.replace(
        /(?<!\$)\\(boxed|frac|sqrt|int|sum|prod|lim|infty|left|right|begin|end)\b/g,
        (match, command, offset) => {
            const before = text.substring(Math.max(0, offset - 5), offset);
            if (before.includes('$')) return match;
            return match; // 不在这里处理
        }
    );
    text = text.replace(
        /(?<!\$)\\boxed\{([^}]*)\}(?!\$)/g,
        (match) => `$${match}$`
    );
    return text;
}

const testCasesLatex = [
    { input: "答案是 \\boxed{C}", expect: "答案是 $\\boxed{C}$" },
    { input: "答案是 $\\boxed{C}$", expect: "答案是 $\\boxed{C}$" },
    { input: "选 \\boxed{A、B}", expect: "选 $\\boxed{A、B}$" }
];

testCasesLatex.forEach((tc, i) => {
    const res = preprocessLatex(tc.input);
    if (res === tc.expect) {
        console.log(`Latex Test ${i + 1} passed`);
    } else {
        console.error(`Latex Test ${i + 1} failed: expected '${tc.expect}', got '${res}'`);
    }
});
