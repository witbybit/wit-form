import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

/** @type {import('next').NextConfig} */
const config = {
  // A fully static site in out/, which any static host can serve
  output: 'export',
  // Set DOCS_BASE_PATH when hosting under a sub-path, e.g. /wit-form on GitHub Pages
  basePath: process.env.DOCS_BASE_PATH || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: {
    // The examples import 'wit-form' from ../src, outside this app
    root: repoRoot,
  },
};

export default withMDX(config);
