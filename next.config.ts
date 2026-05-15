import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["zableke.duckdns.org", "localhost", "localhost:3000"],
    },
  },
  // Permite que Next.js acepte peticiones desde estos dominios
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Permite que los popups de Google OAuth envíen postMessage de vuelta
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
