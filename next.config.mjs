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
  experimental: {
    // Enable the Next.js instrumentation hook (src/instrumentation.ts) so
    // the production server can swap the active ObservabilitySink from the
    // console sink to the API sink on startup. The hook itself gates on
    // runtime + NODE_ENV + NEXT_PUBLIC_MOCK, so test/mock environments stay
    // on console. Issue #36.
    instrumentationHook: true,
  },
  webpack(config, { isServer }) {
    // The SC-5 server recorder (`src/lib/sc5/server-recorder.ts`) is
    // reachable from `src/instrumentation.ts`. When webpack processes the
    // server graph, it tries to resolve `fs/promises` and `path` from the
    // bundled scope, even though `import "server-only"` keeps the file
    // out of the client graph. Mark them external so webpack leaves them
    // as Node built-in `require()` calls — both for the server bundle and
    // for the `serverComponentsExternalPackages` graph. Issue #T-482.
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(({ request }, callback) => {
          if (request === "fs/promises" || request === "fs" || request === "path") {
            return callback(null, `commonjs ${request}`);
          }
          return callback();
        });
      }
    }
    return config;
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

export default withBundleAnalyzer(baseConfig);