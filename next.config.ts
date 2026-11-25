import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth + cookie-backed pages: keep Cache Components off for a predictable MVP.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
