"use client";

import { useState } from "react";
import { Camera, Image as ImageIcon, Loader2, RefreshCcw, Clock, User, LogOut } from "lucide-react";
import AnswerCard from "@/components/AnswerCard";
import ImageCropper from "@/components/ImageCropper";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase-browser";
import imageCompression from "browser-image-compression";
import Link from "next/link";

interface AnswerData {
  summary: string;
  answer: string;
  explanation: string;
  analysis: string;
  derivation: string;
  practice: string;
}

type Stage = "idle" | "compressing" | "cropping" | "ocr" | "solving" | "done" | "error";

export default function Home() {
  const { user, signOut } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null); // 压缩后的原始大图（裁剪前）
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [answerData, setAnswerData] = useState<AnswerData | null>(null);
  const supabase = createClient();

  // 保存到历史记录
  const saveToHistory = async (questionText: string, answer: AnswerData) => {
    if (!user) return;
    try {
      await supabase.from("history").insert({
        user_id: user.id,
        question_text: questionText,
        answer,
      });
    } catch (err) {
      console.error("Failed to save history:", err);
    }
  };

  const stageLabels: Record<Stage, string> = {
    idle: "",
    compressing: "正在压缩图片...",
    cropping: "请框选题目区域",
    ocr: "正在提取试卷文字...",
    solving: "DeepSeek V3 正在推理解答...",
    done: "✅ 解析完成",
    error: "❌ 出错了",
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 清除历史状态
    setAnswerData(null);
    setErrorMsg("");
    setStage("compressing");

    try {
      // 1. 压缩图片
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // 2. 读取并进入裁剪模式
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setRawImage(base64);
        setStage("cropping");
      };
      reader.readAsDataURL(compressed);
    } catch {
      setErrorMsg("图片压缩失败，请换张照片再试");
      setStage("error");
    }
  };

  // 裁剪确认后开始 OCR + AI 解答
  const processImage = async (croppedBase64: string) => {
    setSelectedImage(croppedBase64);
    setRawImage(null);
    setStage("ocr");

    try {
      const ocrRes = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: croppedBase64 }),
      });
      const ocrData = await ocrRes.json();

      if (!ocrRes.ok || !ocrData.success) {
        throw new Error(ocrData.error || "OCR 识别失败");
      }

      const questions: string[] = ocrData.questions || [];
      if (questions.length === 0) {
        throw new Error("未能从图片中识别出题目文字，请换一张更清晰的照片");
      }

      setStage("solving");
      const questionText = questions.join("\n\n");
      const solveRes = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `请解答以下高考题：\n\n${questionText}` },
          ],
        }),
      });
      const solveData = await solveRes.json();

      if (!solveRes.ok || !solveData.success) {
        throw new Error(solveData.error || "AI 解答失败");
      }

      setAnswerData(solveData.data);
      setStage("done");
      saveToHistory(questionText, solveData.data);
    } catch (err: any) {
      setErrorMsg(err.message || "处理过程中出错");
      setStage("error");
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setRawImage(null);
    setAnswerData(null);
    setErrorMsg("");
    setStage("idle");
  };

  const isWorking = stage === "compressing" || stage === "ocr" || stage === "solving";

  return (
    <main className="flex flex-col min-h-[100dvh] bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
      {/* 欢迎入口 */}
      {stage === "idle" && !selectedImage && (
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

            {/* 用户导航 */}
            <div className="flex items-center justify-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/history" className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                    <Clock className="w-4 h-4" />
                    历史记录
                  </Link>
                  <span className="text-gray-200 dark:text-gray-700">|</span>
                  <button onClick={signOut} className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 dark:text-gray-400 transition-colors">
                    <LogOut className="w-4 h-4" />
                    退出
                  </button>
                </>
              ) : (
                <Link href="/login" className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline">
                  <User className="w-4 h-4" />
                  登录以保存历史记录
                </Link>
              )}
            </div>

            <div className="w-full flex flex-col gap-4 mt-8">
              <label className="relative flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-semibold text-lg cursor-pointer transition-all active:scale-95 shadow-xl shadow-blue-600/20">
                <Camera className="w-6 h-6" />
                <span>拍照搜题</span>
                <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFileSelect} />
              </label>

              <label className="relative flex items-center justify-center gap-3 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-700 dark:text-gray-200 p-5 rounded-2xl font-semibold text-lg cursor-pointer transition-all active:scale-95 shadow-sm">
                <ImageIcon className="w-6 h-6 text-blue-500" />
                <span>从相册选择试卷</span>
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFileSelect} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 处理中 / 结果页 */}
      {(selectedImage || stage !== "idle") && (
        <div className="flex flex-col flex-1 pb-24">
          {/* 顶部状态栏 */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="max-w-3xl mx-auto flex items-center gap-4">
              {selectedImage && (
                <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedImage} alt="题目" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${stage === "done" ? "text-green-600 dark:text-green-400" :
                  stage === "error" ? "text-red-600 dark:text-red-400" :
                    "text-blue-600 dark:text-blue-400"
                  } flex items-center gap-1.5`}>
                  {isWorking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {stageLabels[stage]}
                </p>
              </div>
              <button onClick={resetAll} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="重新出题">
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {errorMsg && (
            <div className="max-w-3xl mx-auto w-full p-4 mt-4">
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
                ⚠️ {errorMsg}
              </div>
            </div>
          )}

          {/* 答案卡片 */}
          <div className="flex-1 max-w-3xl mx-auto w-full p-4 mt-2">
            {answerData ? (
              <AnswerCard data={answerData} />
            ) : isWorking ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 space-y-4">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                  </div>
                  <p className="text-sm">{stageLabels[stage]}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 裁剪模式全屏覆盖 */}
      {stage === "cropping" && rawImage && (
        <ImageCropper
          imageSrc={rawImage}
          onCropConfirm={processImage}
          onCancel={resetAll}
        />
      )}
    </main>
  );
}
