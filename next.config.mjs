import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  turbopack: {
    root: rootDir
  },
  async headers() {
    const privateHeaders = [
      {
        key: "Cache-Control",
        value: "no-store, max-age=0"
      },
      {
        key: "Pragma",
        value: "no-cache"
      },
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive"
      },
      {
        key: "Referrer-Policy",
        value: "no-referrer"
      },
      {
        key: "X-Frame-Options",
        value: "DENY"
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()"
      }
    ];

    return [
      {
        source: "/area",
        headers: privateHeaders
      },
      {
        source: "/api/member/:path*",
        headers: privateHeaders
      }
    ];
  }
};

export default nextConfig;
