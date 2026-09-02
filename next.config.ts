import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No generar AGENTS.md/CLAUDE.md en cada `next dev`.
  agentRules: false,
};

export default nextConfig;
