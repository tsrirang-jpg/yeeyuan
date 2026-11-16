import type { NextConfig } from "next";
const serverDeployment = process.env.NEXT_DEPLOYMENT_MODE === "server";
const apiProxyTarget =
  process.env.API_PROXY_TARGET || "http://127.0.0.1:8080/api/v1";
const nextConfig: NextConfig = {
  ...(serverDeployment ? {} : { output: "export" as const }),
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: { cpus: 1 },
  trailingSlash: true,
  ...(serverDeployment
    ? {
        async rewrites() {
          return [
            {
              source: "/api/v1/:path*",
              destination: `${apiProxyTarget}/:path*`,
            },
          ];
        },
      }
    : {}),
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};
export default nextConfig;
