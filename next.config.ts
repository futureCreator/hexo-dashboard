import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // v-gateway가 슬래시 형태(/proxy/hexo/)를 선호하므로 루프 방지.
  // ponytail: basePath 없이 단독 실행할 때도 무해함 (루트 / 는 그대로 서빙).
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
