"use client";

import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface AnswerData {
    summary: string;
    answer: string;
    explanation: string;
    analysis: string;
    derivation: string;
    practice: string;
}

interface AnswerCardProps {
    data: AnswerData;
    ocrText?: string;
}

const TABS = [
    { key: "analysis", label: "考点剖析", icon: "🎯" },
    { key: "derivation", label: "分步推导", icon: "📝" },
    { key: "practice", label: "举一反三", icon: "💡" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AnswerCard({ data, ocrText }: AnswerCardProps) {
    const [activeTab, setActiveTab] = useState<TabKey | null>(null);

    const tabContent = activeTab ? data[activeTab] : "";

    return (
        <div className="space-y-4">
            {/* 顶部：OCR 原文 + 摘要 + 答案 + 一句话解释 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                {/* OCR 识别原文展示 */}
                {ocrText && (
                    <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                            OCR 识别完整题目原文
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-serif leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer" title="点击展开/收起完整题目">
                            {ocrText}
                        </div>
                    </div>
                )}

                {/* 题目摘要 */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">
                    {data.summary}
                </p>

                {/* 答案区 */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                        答案
                    </span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        <MarkdownRenderer content={data.answer} />
                    </div>
                </div>

                {/* 一句话解释 */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl p-4">
                    <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">
                        💡 {data.explanation}
                    </p>
                </div>
            </div>

            {/* 底部：3 个 Tab */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Tab 栏 */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() =>
                                setActiveTab(
                                    activeTab === tab.key ? null : tab.key
                                )
                            }
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition-all ${activeTab === tab.key
                                ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab 内容 */}
                {activeTab && tabContent && (
                    <div className="p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                        <MarkdownRenderer content={tabContent} />
                    </div>
                )}

                {/* 未展开时的提示 */}
                {!activeTab && (
                    <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                        点击上方标签查看详细解析
                    </div>
                )}
            </div>
        </div>
    );
}
