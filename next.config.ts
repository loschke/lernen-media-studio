import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security & privacy headers. Most are also set in middleware.ts for
  // dynamic routes; the headers() block covers static assets under /public.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Modest CSP — we load images/videos from R2 presigned URLs, fonts
          // from Google, and framework bits from the same origin. No inline
          // script block because Next injects hashes we can't enumerate here.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
