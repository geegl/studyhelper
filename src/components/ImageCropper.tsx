"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";

interface ImageCropperProps {
    imageSrc: string;
    onCropConfirm: (croppedBase64: string) => void;
    onCancel: () => void;
}

interface Point {
    x: number;
    y: number;
}

export default function ImageCropper({ imageSrc, onCropConfirm, onCancel }: ImageCropperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [imgLayout, setImgLayout] = useState({ x: 0, y: 0, width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    const pointsRef = useRef<Point[]>([]);
    const [isDrawingUI, setIsDrawingUI] = useState(false);
    const isDrawingRef = useRef(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // 图片加载后计算布局
    const onImageLoad = useCallback(() => {
        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !container) return;

        const containerRect = container.getBoundingClientRect();
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = containerRect.width / containerRect.height;

        let width, height, x, y;
        if (imgAspect > containerAspect) {
            width = containerRect.width;
            height = width / imgAspect;
            x = 0;
            y = (containerRect.height - height) / 2;
        } else {
            height = containerRect.height;
            width = height * imgAspect;
            x = (containerRect.width - width) / 2;
            y = 0;
        }

        setImgLayout({
            x, y, width, height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
        });
    }, []);

    // 获取相对于图片区域的坐标
    const getRelativePos = (e: React.TouchEvent | React.MouseEvent): Point | null => {
        const container = containerRef.current;
        if (!container) return null;
        const rect = container.getBoundingClientRect();

        let clientX, clientY;
        if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        // 相对于图片的坐标
        const x = clientX - rect.left - imgLayout.x;
        const y = clientY - rect.top - imgLayout.y;

        // 限制在图片范围内
        return {
            x: Math.max(0, Math.min(imgLayout.width, x)),
            y: Math.max(0, Math.min(imgLayout.height, y)),
        };
    };

    // 绘制开始
    const handleDrawStart = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        const pos = getRelativePos(e);
        if (!pos) return;
        isDrawingRef.current = true;
        setIsDrawingUI(true);
        setHasDrawn(false);
        pointsRef.current = [pos];
        drawCanvas();
    };

    // 绘制移动
    const handleDrawMove = useCallback((e: TouchEvent | MouseEvent) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();

        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        let clientX, clientY;
        if ("touches" in e) {
            clientX = (e as TouchEvent).touches[0].clientX;
            clientY = (e as TouchEvent).touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }

        const x = Math.max(0, Math.min(imgLayout.width, clientX - rect.left - imgLayout.x));
        const y = Math.max(0, Math.min(imgLayout.height, clientY - rect.top - imgLayout.y));

        pointsRef.current.push({ x, y });
        requestAnimationFrame(drawCanvas);
    }, [imgLayout]);

    // 绘制结束
    const handleDrawEnd = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        setIsDrawingUI(false);
        setHasDrawn(true);
        drawCanvas(); // 最终重绘触发闭合和高亮
    }, []);

    // 全局事件监听（只有在 drawing 时才绑定，但由于 ref 变化不触发重新绑定，我们需要依赖 isDrawingUI 绑定）
    useEffect(() => {
        if (!isDrawingUI) return;
        const onMove = (e: TouchEvent | MouseEvent) => handleDrawMove(e);
        const onEnd = () => handleDrawEnd();
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("mousemove", onMove);
        window.addEventListener("touchend", onEnd);
        window.addEventListener("mouseup", onEnd);
        return () => {
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("touchend", onEnd);
            window.removeEventListener("mouseup", onEnd);
        };
    }, [isDrawingUI, handleDrawMove, handleDrawEnd]);

    // 独立出绘制函数
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || imgLayout.width === 0) return;

        canvas.width = imgLayout.width;
        canvas.height = imgLayout.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const points = pointsRef.current;
        if (points.length < 2) return;

        // 绘制路径
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        if (hasDrawn) {
            // 闭合路径并填充半透明高亮
            ctx.closePath();
            ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
            ctx.fill();
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 3;
            ctx.stroke();

            // 绘制包围框虚线
            const bbox = getBoundingBox();
            if (bbox) {
                ctx.setLineDash([6, 4]);
                ctx.strokeStyle = "#f59e0b";
                ctx.lineWidth = 2;
                ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
                ctx.setLineDash([]);
            }
        } else {
            // 正在绘制 — 实线
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
        }
    }, [imgLayout.width, imgLayout.height, hasDrawn]); // 依赖项改为尺寸和完成状态

    // 窗口尺寸改变或图片加载完成时重绘
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas, imgLayout]);

    // 计算包围盒
    const getBoundingBox = () => {
        const points = pointsRef.current;
        if (points.length < 3) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        // 加 padding
        const pad = 8;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(imgLayout.width, maxX + pad);
        maxY = Math.min(imgLayout.height, maxY + pad);
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    };

    // 确认裁剪
    const confirmCrop = () => {
        const bbox = getBoundingBox();
        if (!bbox || !imgRef.current) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const scaleX = imgLayout.naturalWidth / imgLayout.width;
        const scaleY = imgLayout.naturalHeight / imgLayout.height;

        const sx = bbox.x * scaleX;
        const sy = bbox.y * scaleY;
        const sw = bbox.w * scaleX;
        const sh = bbox.h * scaleY;

        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);

        onCropConfirm(canvas.toDataURL("image/jpeg", 0.9));
    };

    // 重画
    const redraw = () => {
        pointsRef.current = [];
        setHasDrawn(false);
        drawCanvas(); // 清理画布
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* 顶部提示 */}
            <div className="bg-black/80 text-white text-center py-3 px-4 text-sm flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" />
                {hasDrawn ? "黄色虚线框为裁剪区域，确认或重画" : "用手指画圈选题目区域"}
            </div>

            {/* 图片 + 画布 */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden flex items-center justify-center touch-none"
                onMouseDown={handleDrawStart}
                onTouchStart={handleDrawStart}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="待裁剪"
                    onLoad={onImageLoad}
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                    draggable={false}
                />

                {/* 绘图画布覆盖在图片上 */}
                {imgLayout.width > 0 && (
                    <canvas
                        ref={canvasRef}
                        className="absolute pointer-events-none"
                        style={{
                            left: imgLayout.x,
                            top: imgLayout.y,
                            width: imgLayout.width,
                            height: imgLayout.height,
                        }}
                    />
                )}
            </div>

            {/* 底部操作栏 */}
            <div className="bg-black/80 flex items-center justify-center gap-6 py-5 px-6">
                <button
                    onClick={onCancel}
                    className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-colors active:scale-95"
                    title="取消"
                >
                    <X className="w-5 h-5" />
                </button>

                {hasDrawn && (
                    <button
                        onClick={redraw}
                        className="w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center text-white transition-colors active:scale-95"
                        title="重新画"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                )}

                <button
                    onClick={confirmCrop}
                    disabled={!hasDrawn}
                    className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors active:scale-95 shadow-lg shadow-blue-500/40"
                    title="确认选区"
                >
                    <Check className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
