"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                // 如果关闭了邮箱验证，signUp 会直接返回 session
                if (data.session) {
                    router.push("/");
                    router.refresh();
                } else {
                    setMessage("注册成功！请检查邮箱验证链接。");
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/");
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "操作失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex items-center justify-center min-h-screen-safe bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background p-6">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                        <span className="text-3xl font-bold text-white">M</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Dr. MShout
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isSignUp ? "创建新账号" : "登录你的账号"}
                    </p>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="邮箱地址"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="密码（至少6位）"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}
                    {message && (
                        <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        {loading ? "处理中..." : isSignUp ? "注册" : "登录"}
                    </button>
                </form>

                {/* 切换登录/注册 */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    {isSignUp ? "已有账号？" : "还没有账号？"}
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
                        className="text-blue-600 dark:text-blue-400 font-medium ml-1 hover:underline"
                    >
                        {isSignUp ? "去登录" : "注册一个"}
                    </button>
                </p>

                {/* 跳过登录 */}
                <button
                    onClick={() => router.push("/")}
                    className="w-full mt-4 text-center text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    先不登录，直接使用 →
                </button>
            </div>
        </main>
    );
}
