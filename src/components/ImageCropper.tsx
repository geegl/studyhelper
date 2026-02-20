"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Check, X, Move } from "lucide-react";

interface ImageCropperProps {
    imageSrc: string;
    onCropConfirm: (croppedBase64: string) => void;
    onCancel: () => void;
}

interface CropBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export default function ImageCropper({ imageSrc, onCropConfirm, onCancel }: ImageCropperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [imgSize, setImgSize] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
    const [dragging, setDragging] = useState<"move" | "resize" | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });

    // 图片加载后初始化裁剪框（居中 80%）
    const onImageLoad = useCallback(() => {
        const img = imgRef.current;
        if (!img) return;

        const rect = img.getBoundingClientRect();
        const s = {
            width: rect.width,
            height: rect.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
        };
        setImgSize(s);

        // 默认选框居中占 80%
        const pad = 0.1;
        setCropBox({
            x: s.width * pad,
            y: s.height * pad,
            w: s.width * (1 - 2 * pad),
            h: s.height * (1 - 2 * pad),
        });
    }, []);

    // 获取 pointer 坐标（兼容触摸和鼠标）
    const getPointerPos = (e: React.TouchEvent | React.MouseEvent) => {
        const container = containerRef.current;
        if (!container) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        if ("touches" in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    // 拖拽开始
    const handleDragStart = (type: "move" | "resize") => (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = getPointerPos(e);
        setDragging(type);
        setDragStart({ x: pos.x, y: pos.y, boxX: cropBox.x, boxY: cropBox.y, boxW: cropBox.w, boxH: cropBox.h });
    };

    // 拖拽移动
    const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (!dragging) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const dx = pos.x - dragStart.x;
        const dy = pos.y - dragStart.y;

        if (dragging === "move") {
            const newX = Math.max(0, Math.min(imgSize.width - dragStart.boxW, dragStart.boxX + dx));
            const newY = Math.max(0, Math.min(imgSize.height - dragStart.boxH, dragStart.boxY + dy));
            setCropBox({ x: newX, y: newY, w: dragStart.boxW, h: dragStart.boxH });
        } else {
            // resize：右下角拖拽
            const newW = Math.max(60, Math.min(imgSize.width - dragStart.boxX, dragStart.boxW + dx));
            const newH = Math.max(60, Math.min(imgSize.height - dragStart.boxY, dragStart.boxH + dy));
            setCropBox({ x: dragStart.boxX, y: dragStart.boxY, w: newW, h: newH });
        }
    }, [dragging, dragStart, imgSize]);

    const handleDragEnd = useCallback(() => {
        setDragging(false as any);
    }, []);

    // 全局触摸/鼠标事件监听
    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: TouchEvent | MouseEvent) => handleDragMove(e as any);
        const onEnd = () => handleDragEnd();
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
    }, [dragging, handleDragMove, handleDragEnd]);

    // 确认裁剪
    const confirmCrop = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx || !imgRef.current) return;

        // 计算实际像素坐标
        const scaleX = imgSize.naturalWidth / imgSize.width;
        const scaleY = imgSize.naturalHeight / imgSize.height;

        const sx = cropBox.x * scaleX;
        const sy = cropBox.y * scaleY;
        const sw = cropBox.w * scaleX;
        const sh = cropBox.h * scaleY;

        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);

        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
        onCropConfirm(croppedBase64);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* 顶部提示 */}
            <div className="bg-black/80 text-white text-center py-3 px-4 text-sm">
                <Move className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                拖动选框框选题目，拖拽右下角调整大小
            </div>

            {/* 图片 + 裁剪框 */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden flex items-center justify-center"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="待裁剪"
                    onLoad={onImageLoad}
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                />

                {imgSize.width > 0 && (
                    <>
                        {/* 遮罩层（裁剪框外部变暗） */}
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                left: 0, top: 0,
                                width: imgSize.width, height: imgSize.height,
                                // 只让图片区域定位
                                transform: `translate(${(containerRef.current?.clientWidth || 0) / 2 - imgSize.width / 2}px, ${(containerRef.current?.clientHeight || 0) / 2 - imgSize.height / 2}px)`,
                            }}
                        >
                            {/* 上 */}
                            <div className="absolute bg-black/50" style={{ left: 0, top: 0, width: imgSize.width, height: cropBox.y }} />
                            {/* 下 */}
                            <div className="absolute bg-black/50" style={{ left: 0, top: cropBox.y + cropBox.h, width: imgSize.width, height: imgSize.height - cropBox.y - cropBox.h }} />
                            {/* 左 */}
                            <div className="absolute bg-black/50" style={{ left: 0, top: cropBox.y, width: cropBox.x, height: cropBox.h }} />
                            {/* 右 */}
                            <div className="absolute bg-black/50" style={{ left: cropBox.x + cropBox.w, top: cropBox.y, width: imgSize.width - cropBox.x - cropBox.w, height: cropBox.h }} />
                        </div>

                        {/* 裁剪框本体 */}
                        <div
                            style={{
                                position: "absolute",
                                left: (containerRef.current?.clientWidth || 0) / 2 - imgSize.width / 2 + cropBox.x,
                                top: (containerRef.current?.clientHeight || 0) / 2 - imgSize.height / 2 + cropBox.y,
                                width: cropBox.w,
                                height: cropBox.h,
                            }}
                            className="border-2 border-blue-400 rounded-sm"
                        >
                            {/* 移动手柄（整个框可拖拽） */}
                            <div
                                className="absolute inset-0 cursor-move touch-none"
                                onMouseDown={handleDragStart("move")}
                                onTouchStart={handleDragStart("move")}
                            />

                            {/* 右下角 resize 手柄 */}
                            <div
                                className="absolute -right-3 -bottom-3 w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-se-resize touch-none flex items-center justify-center"
                                onMouseDown={handleDragStart("resize")}
                                onTouchStart={handleDragStart("resize")}
                            >
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path d="M21 21l-9-9m9 0v9h-9" />
                                </svg>
                            </div>

                            {/* 角标 */}
                            <div className="absolute -left-0.5 -top-0.5 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl" />
                            <div className="absolute -right-0.5 -top-0.5 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr" />
                            <div className="absolute -left-0.5 -bottom-0.5 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl" />
                        </div>
                    </>
                )}
            </div>

            {/* 底部操作栏 */}
            <div className="bg-black/80 flex items-center justify-center gap-8 py-5 px-6 safe-area-bottom">
                <button
                    onClick={onCancel}
                    className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-colors active:scale-95"
                    title="取消"
                >
                    <X className="w-6 h-6" />
                </button>
                <button
                    onClick={confirmCrop}
                    className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white transition-colors active:scale-95 shadow-lg shadow-blue-500/40"
                    title="确认选区"
                >
                    <Check className="w-7 h-7" />
                </button>
            </div>
        </div>
    );
}
