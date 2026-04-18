import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["retell-client-js-sdk", "livekit-client"],
};

export default nextConfig;
