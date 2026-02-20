import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
    content: string;
}

/**
 * 预处理：将 AI 可能输出的裸 LaTeX 命令自动包裹 $ 符号
 * 例如 \boxed{C} → $\boxed{C}$，\frac{1}{2} → $\frac{1}{2}$
 */
function preprocessLatex(text: string): string {
    // 匹配独立的裸 LaTeX 命令（不在 $ 内的），包裹成 $...$
    // 处理 \boxed{...}、\frac{...}{...}、\sqrt{...} 等带花括号的命令
    text = text.replace(
        /(?<!\$)\\(boxed|frac|sqrt|int|sum|prod|lim|infty|left|right|begin|end)\b/g,
        (match, command, offset) => {
            // 检查前面是否已经有 $ 符号
            const before = text.substring(Math.max(0, offset - 5), offset);
            if (before.includes('$')) return match;
            return match; // 不在这里处理，用下面更完整的逻辑
        }
    );

    // 处理裸 \boxed{...} ：找到完整的 \boxed{...} 并包裹
    text = text.replace(
        /(?<!\$)\\boxed\{([^}]*)\}(?!\$)/g,
        (match) => `$${match}$`
    );

    return text;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const processed = preprocessLatex(content);
    return (
        <div className="prose prose-blue dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed space-y-4">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-2 text-blue-800 dark:text-blue-300" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-2 text-blue-700 dark:text-blue-400" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium mt-4 mb-2 text-blue-600 dark:text-blue-500" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-4 text-gray-800 dark:text-gray-200" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1 text-gray-800 dark:text-gray-200" {...props} />,
                    code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match && !className;
                        return isInline ? (
                            <code className="bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-mono text-sm" {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {processed}
            </ReactMarkdown>
        </div>
    );
}
