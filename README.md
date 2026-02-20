# Dr. MShout - 高考理科全能解题辅导助理

Dr. MShout 是一个专为河南高考学霸理科生设计的高质量、Mobile-First 的题目诊断助手。

### 技术栈
*   **Next.js 15 (App Router)** - React 基础框架及 API 路由承载
*   **Vercel AI SDK** - 处理 DeepSeek 模型的流式传输与状态
*   **TailwindCSS V4** - 精致极简设计与自适应方案
*   **阿里云 OCR** - 教育试卷智能拆图切题核心服务

---

## 🚀 极速部署指南 (Deploy on Vercel)

本项目已经为您配置好生产级的基础架构，建议采用 **Vercel** 发布以便完美兼容移动端浏览器：

1. **提交代码到 GitHub**
   将本目录的完整代码 Commit 并推送到您自己的 GitHub 仓库。
2. **导入 Vercel**
   在 Vercel 官网创建一个新项目，并且选择 Import 此 GitHub 仓库。
3. **设置环境变量 (Environment Variables)**
   在 Vercel 部署向导的环境变量设定环节，填入以下必选项：
   
   | 变量名 | 必填 | 描述 |
   | :--- | :--- | :--- |
   | `ALIYUN_ACCESS_KEY_ID` | ✅ 是 | 阿里云 API 访问凭证 ID (需开通“教育场景识别”) |
   | `ALIYUN_ACCESS_KEY_SECRET` | ✅ 是 | 阿里云 API 访问凭证密钥 |
   | `SILICONFLOW_API_KEY` | ✅ 是 | 硅基流动平台的 DeepSeek 接口密钥 |

4. **发版**
   点击 **Deploy**，部署成功后即可在移动端访问分配给您的 https://xxx.vercel.app 在线体验拍摄答疑。

---

## 🛠️ 本地运行开发版

如果您需要在本地调试，请先在根目录建立 `.env.local`：

```bash
ALIYUN_ACCESS_KEY_ID="您的AK"
ALIYUN_ACCESS_KEY_SECRET="您的SK"
SILICONFLOW_API_KEY="您的SF_Key"
```

然后利用 npm 构建运行：

```bash
npm run dev
```
并在浏览器打开 [http://localhost:3000](http://localhost:3000)。推荐使用开发者工具切换至 iPhone 断点模拟真实拍摄与触控。
