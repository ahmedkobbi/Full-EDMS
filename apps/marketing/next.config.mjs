/**
 * Smart EDMS marketing Next.js config (spec §7.5, §12.11).
 *
 * - Transpile Mantine + workspace packages (they ship ESM TypeScript source).
 * - Set.reactStrictMode for safer rendering.
 * - Webpack `extensionAlias` so that imports like `./locales.js` resolve to
 *   `./locales.ts` — needed because `@smart-edms/i18n` uses ESM `.js`
 *   extension convention (required by NodeNext module resolution) but ships
 *   TypeScript source. Without this, Next.js's webpack resolver fails to
 *   find the imported modules.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Mantine v7 ships ESM that Next's bundler must transpile.
  transpilePackages: [
    '@mantine/core',
    '@mantine/hooks',
    '@smart-edms/i18n',
    '@smart-edms/types',
    '@smart-edms/schemas',
  ],
  // The marketing site is purely static content + two API routes; no images
  // are served from third-party domains.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // Server components are the default — this just makes the intent explicit
    // for reviewers reading the config.
    optimizePackageImports: ['lucide-react', '@mantine/core'],
  },
  webpack: (config) => {
    // Allow `import ... from './foo.js'` to resolve to `./foo.ts`.
    // This is the ESM convention used by `@smart-edms/i18n`'s source files.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default nextConfig;
