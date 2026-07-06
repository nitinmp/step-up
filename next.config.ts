import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone/other devices on the LAN to load dev client bundles.
  allowedDevOrigins: ["192.168.1.150", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
