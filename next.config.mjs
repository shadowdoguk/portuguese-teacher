import bundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The standalone output bundles only the runtime + the routes this app
  // actually uses (server + client), which keeps the production Docker
  // image lean (~150 MB vs ~500 MB). Traced static + public assets still
  // need to be copied alongside .next/standalone — see Dockerfile.
  output: "standalone",
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

export default withBundleAnalyzer(baseConfig);