import { NextRequest, NextResponse } from "next/server";
import OcrApi20210707, * as $OcrApi20210707 from "@alicloud/ocr-api20210707";
import * as $OpenApi from "@alicloud/openapi-client";
import * as $Util from "@alicloud/tea-util";

export const maxDuration = 30; // 允许较长的执行时间

/**
 * 初始化阿里云 OCR 客户端
 */
function createClient(): OcrApi20210707 {
    const config = new $OpenApi.Config({
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    });
    // 访问的域名
    config.endpoint = "ocr-api.cn-hangzhou.aliyuncs.com";
    return new OcrApi20210707(config);
}

export async function POST(req: NextRequest) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json(
                { error: "Image data is required" },
                { status: 400 }
            );
        }

        if (!process.env.ALIYUN_ACCESS_KEY_ID || !process.env.ALIYUN_ACCESS_KEY_SECRET) {
            return NextResponse.json(
                { error: "Aliyun credentials are not configured" },
                { status: 500 }
            );
        }

        const client = createClient();

        // 使用教育试卷切图识别
        const request = new $OcrApi20210707.RecognizeEduPaperCutRequest({
            body: imageBase64.replace(/^data:image\/\w+;base64,/, ""), // 移除前缀
            cutType: "question", // 切分题目
        });
        const runtime = new $Util.RuntimeOptions({});

        const response = await client.recognizeEduPaperCutWithOptions(request, runtime);

        // 返回识别内容
        return NextResponse.json({
            success: true,
            data: response.body?.data,
        });
    } catch (error: any) {
        console.error("OCR Error:", error.message || error);
        return NextResponse.json(
            { error: "Failed to process image with OCR", details: error.message },
            { status: 500 }
        );
    }
}
