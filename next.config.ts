import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Keep the app root inside this repo so the lockfile in E:\laragon\www is not considered.
  turbopack: {
    root: path.resolve("."),
  },
  // The dev server allows localhost; browsers and Laragon often use 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
