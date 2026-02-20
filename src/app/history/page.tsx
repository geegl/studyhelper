"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase-browser";
import { ArrowLeft, Trash2, Clock } from "lucide-react";
import Link from "next/link";
import AnswerCard from "@/components/AnswerCard";

interface HistoryItem {
    id: string;
    question_text: string;
    answer: {
        summary: string;
        answer: string;
        explanation: string;
        analysis: string;
        derivation: string;
        practice: string;
    };
    created_at: string;
}

export default function HistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const [records, setRecords] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        supabase
            .from("history")
            .select("id, question_text, answer, created_at")
            .order("created_at", { ascending: false })
            .limit(50)
            .then(({ data, error }: { data: any; error: any }) => {
                if (!error && data) {
                    setRecords(data as HistoryItem[]);
                }
                setLoading(false);
            });
    }, [user, authLoading]);

    const deleteRecord = async (id: string) => {
        await supabase.from("history").delete().eq("id", id);
        setRecords((prev) => prev.filter((r) => r.id !== id));
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "刚刚";
        if (diffMin < 60) return `${diffMin}分钟前`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}小时前`;
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    if (authLoading || loading) {
        return (
            <main className="flex items-center justify-center min-h-[100dvh] bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
                <div className="text-gray-400 animate-pulse">加载中...</div>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="flex flex-col items-center justify-center min-h-[100dvh] bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">请先登录以查看历史记录</p>
                <Link href="/login" className="text-blue-600 font-medium hover:underline">
                    去登录
                </Link>
            </main>
        );
    }

    return (
        <main className="min-h-[100dvh] bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
            {/* 顶栏 */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <Link href="/" className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        历史记录
                    </h1>
                    <span className="text-xs text-gray-400 ml-auto">{records.length} 条</span>
                </div>
            </div>

            {/* 列表 */}
            <div className="max-w-3xl mx-auto p-4 space-y-3">
                {records.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                        <p className="text-lg">📭 暂无记录</p>
                        <p className="text-sm mt-2">拍照搜题后会自动保存到这里</p>
                    </div>
                ) : (
                    records.map((r) => (
                        <div
                            key={r.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm relative group"
                        >
                            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => deleteRecord(r.id)}
                                    className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500 rounded-lg transition-colors"
                                    title="删除此记录"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(r.created_at)}
                            </div>
                            <AnswerCard data={r.answer} ocrText={r.question_text} />
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
