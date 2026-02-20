"use client";

import { useState } from "react";
import { useChat } from "ai/react";
import { Camera, Image as ImageIcon, Loader2, RefreshCcw } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

import imageCompression from "browser-image-compression";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState("");

  const { messages, append, isLoading: isChatLoading, setMessages } = useChat({
    api: "/api/solve",
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // 清除历史状态
    setMessages([]);
    setOcrError("");
    setIsOcrProcessing(true);

    try {
      // 1. 压缩图片 (减小体积、提升 Vercel 函数及阿里云 OCR 的成功率和响应速度)
      const options = {
        maxSizeMB: 1,           // 最大 1MB
        maxWidthOrHeight: 1920, // 最大宽高
        useWebWorker: true,
      };

      file = await imageCompression(file, options);

      // 2. 读取并在前端预览
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setSelectedImage(base64);

        try {
          // 3. 开始执行 OCR
          const response = await fetch("/api/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64 }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || "OCR 切题失败");
          }

          // 4. 调用大模型进行解答
          const questions: string[] = data.questions || [];

          let promptContent: string;
          if (questions.length > 0) {
            promptContent = questions.length === 1
              ? `请解答以下高考题：\n\n${questions[0]}`
              : `请依次解答以下 ${questions.length} 道高考题：\n\n${questions.map((q: string, i: number) => `【第${i + 1}题】${q}`).join("\n\n")}`;
          } else {
            // fallback：如果题目提取为空，把原始数据也传过去
            promptContent = `请解答这道高考题，以下是 OCR 识别的原始数据，请从中提取题目并解答：\n\n${JSON.stringify(data.rawData)}`;
          }

          await append({
            role: "user",
            content: promptContent,
          });
        } catch (err: any) {
          setOcrError(err.message || "后端接口未响应或出错");
        } finally {
          setIsOcrProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (compressionError) {
      console.error("Image Compression failed:", compressionError);
      setOcrError("图片压缩或解析失败，请换张照片再试");
      setIsOcrProcessing(false);
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setMessages([]);
    setOcrError("");
    setIsOcrProcessing(false);
  };

  const isWorking = isOcrProcessing || isChatLoading;

  return (
    <main className="flex flex-col min-h-[100dvh] bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
      {/* 如果没有上传照片，显示欢迎入口 */}
      {!selectedImage && (
        <div className="flex flex-col items-center justify-center flex-1 p-6">
          <div className="flex flex-col items-center max-w-md w-full gap-8 text-center mt-[-10vh]">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-4xl font-bold text-white">M</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Dr. MShout
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                你的高考理科最强答疑外脑
              </p>
            </div>

            <div className="w-full flex flex-col gap-4 mt-8">
              <label className="relative flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-semibold text-lg cursor-pointer transition-all active:scale-95 shadow-xl shadow-blue-600/20">
                <Camera className="w-6 h-6" />
                <span>拍照搜题</span>
                <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFileSelect} disabled={isWorking} />
              </label>

              <label className="relative flex items-center justify-center gap-3 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-700 dark:text-gray-200 p-5 rounded-2xl font-semibold text-lg cursor-pointer transition-all active:scale-95 shadow-sm">
                <ImageIcon className="w-6 h-6 text-blue-500" />
                <span>从相册选择试卷</span>
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFileSelect} disabled={isWorking} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 如果正在解答或已经解答，显示详情界面 */}
      {selectedImage && (
        <div className="flex flex-col flex-1 pb-24">
          {/* 顶部原图预览区 */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="max-w-3xl mx-auto flex items-start gap-4">
              <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedImage} alt="上传的考卷" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">诊断进行中...</h3>
                {isOcrProcessing ? (
                  <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> 正在提取试卷结构
                  </p>
                ) : isChatLoading && messages.length <= 1 ? (
                  <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> DeepSeek V3.2 正在推理拉取
                  </p>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400">✅ 提取解析完成</p>
                )}
              </div>
              <button onClick={resetAll} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 错误提示区 */}
          {ocrError && (
            <div className="max-w-3xl mx-auto w-full p-4 mt-4">
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
                ⚠️ 发生错误：{ocrError}
                {ocrError.includes("configured") && "，请检查 Vercel 环境变量设置。"}
              </div>
            </div>
          )}

          {/* 答疑呈现区 */}
          <div className="flex-1 max-w-3xl mx-auto w-full p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
              {messages.filter((m: any) => m.role === "assistant").length > 0 ? (
                messages.filter((m: any) => m.role === "assistant").map((m: any) => (
                  <MarkdownRenderer key={m.id} content={m.content} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 space-y-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                  <p>AI 正在绞尽脑汁演算中...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
