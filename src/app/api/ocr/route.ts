import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 阿里云 ACS v3 签名 — 纯 fetch 实现，无需 @alicloud/* SDK
 * 参考：https://help.aliyun.com/document_detail/China/China20210707/China-Doc-Gateways/China.html
 */

const ENDPOINT = "ocr-api.cn-hangzhou.aliyuncs.com";
const API_VERSION = "2021-07-07";
const ACTION = "RecognizeEduPaperCut";

function sha256Hex(data: string | Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: string, data: string): string {
    return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function buildAuthorization(
    accessKeyId: string,
    accessKeySecret: string,
    method: string,
    canonicalUri: string,
    queryString: string,
    headers: Record<string, string>,
    signedHeaderKeys: string[],
    hashedPayload: string
): string {
    // 1. 规范化请求头
    const canonicalHeaders = signedHeaderKeys
        .map((k) => `${k}:${headers[k]}`)
        .join("\n") + "\n";
    const signedHeadersStr = signedHeaderKeys.join(";");

    // 2. 规范化请求
    const canonicalRequest = [
        method,
        canonicalUri,
        queryString,
        canonicalHeaders,
        signedHeadersStr,
        hashedPayload,
    ].join("\n");

    // 3. 待签名字符串
    const stringToSign = `ACS3-HMAC-SHA256\n${sha256Hex(canonicalRequest)}`;

    // 4. 计算签名
    const signature = hmacSha256(accessKeySecret, stringToSign);

    return `ACS3-HMAC-SHA256 Credential=${accessKeyId},SignedHeaders=${signedHeadersStr},Signature=${signature}`;
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

        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;

        if (!accessKeyId || !accessKeySecret) {
            return NextResponse.json(
                { error: "Aliyun credentials are not configured" },
                { status: 500 }
            );
        }

        // 准备请求体 (纯 base64 二进制流)
        const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const bodyBuffer = Buffer.from(rawBase64, "base64");

        // 构建请求参数
        const method = "POST";
        const canonicalUri = "/";
        const queryString = "Action=RecognizeEduPaperCut&CutType=question&ImageType=photo";
        const nonce = crypto.randomUUID();
        const dateISO = new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); // 2026-02-20T03:30:00Z

        // 对 body 做 SHA256
        const hashedPayload = sha256Hex(bodyBuffer);

        // 设置请求头
        const headers: Record<string, string> = {
            "content-type": "application/octet-stream",
            "host": ENDPOINT,
            "x-acs-action": ACTION,
            "x-acs-content-sha256": hashedPayload,
            "x-acs-date": dateISO,
            "x-acs-signature-nonce": nonce,
            "x-acs-version": API_VERSION,
        };

        // 需要签名的头部键（按字母序已排好）
        const signedHeaderKeys = Object.keys(headers).sort();

        // 生成 Authorization
        const authorization = buildAuthorization(
            accessKeyId,
            accessKeySecret,
            method,
            canonicalUri,
            queryString,
            headers,
            signedHeaderKeys,
            hashedPayload
        );

        headers["authorization"] = authorization;

        // 发送请求
        const url = `https://${ENDPOINT}/?${queryString}`;

        const response = await fetch(url, {
            method: "POST",
            headers,
            body: bodyBuffer,
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error("Alicloud OCR Error Response:", response.status, responseText);
            return NextResponse.json(
                { error: "OCR service returned error", details: responseText },
                { status: response.status }
            );
        }

        // 解析响应
        const data = JSON.parse(responseText);

        // Data 可能是 JSON 字符串，需要二次解析
        let ocrData = data.Data;
        if (typeof ocrData === "string") {
            try {
                ocrData = JSON.parse(ocrData);
            } catch {
                // 如果解析失败，直接当文本使用
            }
        }

        // 从 page_list → subject_list 中提取纯文本题目
        const questions: string[] = [];
        if (ocrData?.page_list) {
            for (const page of ocrData.page_list) {
                if (page.subject_list) {
                    for (const subject of page.subject_list) {
                        if (subject.text) {
                            questions.push(subject.text);
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            questions,             // 提取出的纯文本题目数组
            rawData: ocrData,      // 原始结构化数据（备用）
        });
    } catch (error: any) {
        console.error("OCR Error:", error.message || error);
        return NextResponse.json(
            { error: "Failed to process image with OCR", details: error.message },
            { status: 500 }
        );
    }
}
