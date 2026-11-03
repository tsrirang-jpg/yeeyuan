import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  experimental: { cpus: 1 },
  trailingSlash: true,
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};
export default nextConfig;
