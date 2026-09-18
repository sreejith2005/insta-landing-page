import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const policy = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "upgrade-insecure-requests",
      "img-src 'self' data:",
      // Brand/testimonial films: self-hosted or HTTPS-hosted files, and the two
      // supported players (loaded only after the customer presses play).
      "media-src 'self' https:",
      // Booking: Calendly's official inline embed. widget.js (script-src) draws
      // the scheduler in a calendly.com iframe (frame-src) and reports progress
      // by postMessage. Loaded only on the success state, after the lead is saved.
      "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://calendly.com",
      `script-src 'self' 'unsafe-inline' https://assets.calendly.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: policy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
