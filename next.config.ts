import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // for dynamic pages, by default stale time is 0 (not cached), that means if you visit a dynamic route and the component takes time to resolve, then you go back to it after visiting another component, it will re-render again
  // experimental: {
  //   staleTimes: {
  //     dynamic: 30
  //   },
  // },

  // by default next prerenders static routes and ignores dynamic components at build time, but with this option enabled, it will try to prerender all components including dynamic ones by partially prerendering them (replacing dynamic holes with static fallback shells)
  cacheComponents: true
};

export default nextConfig;
