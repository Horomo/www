import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: false,

  // ── Turbopack (Next.js 16 default) ──────────────────────────────────────
  // An explicit turbopack key is required in Next.js 16 whenever a webpack()
  // function is also present; otherwise the build errors with a hard stop.
  // Turbopack resolves modules relative to the next.config.ts location so it
  // finds node_modules correctly without further configuration.
  turbopack: {
    // When Next.js is invoked from a directory above the project root
    // (e.g. C:\src\Horomo instead of C:\src\Horomo\www), Turbopack's CSS
    // resolver picks up the wrong context and cannot find 'tailwindcss'.
    // Pinning the alias to an absolute path ensures resolution always
    // succeeds regardless of the working directory.
    resolveAlias: {
      tailwindcss: path.resolve(__dirname, 'node_modules/tailwindcss'),
    },
  },

  // ── Webpack (legacy / --webpack flag) ───────────────────────────────────
  webpack(config) {
    // When Next.js is invoked from a directory above the project root
    // (e.g. C:\src\Horomo instead of C:\src\Horomo\www), webpack's
    // enhanced-resolve sets its context to that parent directory.
    // Because there is no node_modules there, it cannot find packages such
    // as 'tailwindcss' that exist only in this package's own node_modules.
    //
    // Fix: prepend the absolute path to this config file's directory so the
    // correct node_modules is always the first place webpack looks, regardless
    // of the working directory used to start the server.
    // Pin tailwindcss alias for CSS @import resolution (same problem as above).
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined ?? {}),
      tailwindcss: path.resolve(__dirname, 'node_modules/tailwindcss'),
    };

    const existingModules = (config.resolve.modules as string[] | undefined) ?? ['node_modules'];
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'), // C:\src\Horomo\www\node_modules
      ...existingModules,
    ];
    return config;
  },

  async redirects() {
    return [
      { source: '/compatibility', destination: '/', permanent: false },
      { source: '/match', destination: '/', permanent: false },
      { source: '/relationship', destination: '/', permanent: false },
      { source: '/compare', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
