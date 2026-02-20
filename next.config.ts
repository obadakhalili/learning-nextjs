import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // for dynamic pages, by default stale time is 0 (not cached), that means if you visit a dynamic route and the component takes time to resolve, then you go back to it after visiting another component, it will re-render again
  // experimental: {
  //   staleTimes: {
  //     dynamic: 30
  //   },
  // },
};

export default nextConfig;
