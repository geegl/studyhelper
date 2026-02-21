const rawOutput = `{
  "summary": "something",
  "explanation": "test\\nnewline"
}`;

console.log("Original parse:", JSON.parse(rawOutput));

let cleaned = rawOutput.replace(/\n/g, "\\n").replace(/\r/g, "");
console.log("Cleaned:", cleaned);
try {
    console.log("Parse cleaned:", JSON.parse(cleaned));
} catch (e) {
    console.error("Parse failed:", e.message);
}

// 更好的清洗方案：
// 1. 对于一些经常出错的大模型，它们可能会把实际换行直接放进字符串
// 比如 "answer": "a
// b"
// 但 JSON 支持字符串里的 newline 必须被转义。对所有的 structural newlines 如果直接 replace 会破坏 JSON。
// 我们只需要处理那些导致 "Bad control character in string literal in JSON" 的换行符。
// JSON.parse(raw) 失败时我们再补救？或者干脆利用一些 JSON 修复库？由于用不了外部库，我们只能：
// 将不可见字符剔除，不剔除物理换行（物理换行对 JSON 外层结构是合法的，对内部字符串是非法的）。
// 应对模型在字符串里包含物理换行的正则替换比较难（因为不知道是在字符串里面还是外面）。
// 其实像 DeepSeek 这样的模型，通常不会在字符串中间放物理换行，除非偶尔发癫。

// 把之前暴力的替换去掉，只在抢救逻辑中处理。
