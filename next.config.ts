import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@alicloud/ocr-api20210707",
    "@alicloud/openapi-client",
    "@alicloud/tea-util",
    "@alicloud/tea-typescript",
    "@alicloud/credential",
    "@alicloud/credentials",
  ],
};

export default nextConfig;
