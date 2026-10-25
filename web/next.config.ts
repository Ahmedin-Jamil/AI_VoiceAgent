import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase proxy timeout for Whisper STT (can take ~10-20s on first load)
  experimental: {
    proxyTimeout: 60000, // 60 seconds
  },
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "unsuffocative-mikayla-foamily.ngrok-free.dev",
    "localhost:3000",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
