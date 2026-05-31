import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// @next/bundle-analyzer — включается через ANALYZE=true
import withBundleAnalyzer from "@next/bundle-analyzer";

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  output: process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" }
    ]
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns", "recharts", "@radix-ui/react-*"],
  },
  outputFileTracingIncludes: {
    "app/api/v1/certificates/[certificateId]/pdf/route": [
      "public/assets/fonts/NotoSans-Regular.ttf",
      "public/assets/fonts/NotoSans-Bold.ttf",
      "public/assets/fonts/NotoSans-Italic.ttf",
      "public/assets/certificates/border.png",
      "public/assets/certificates/signature.png",
      "public/assets/certificates/seal.png"
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default withSentryConfig(analyze(nextConfig));
