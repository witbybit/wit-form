import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // The published build, exactly as users get it from npm
      {
        find: /^wit-form$/,
        replacement: path.resolve(__dirname, '../dist/index.js'),
      },
      // React's profiling build: production speed, but <Profiler> still reports commits
      { find: /^react-dom\/client$/, replacement: 'react-dom/profiling' },
    ],
    // dist/ sits outside this package, so make sure everything shares one React and one Jotai
    dedupe: ['react', 'react-dom', 'jotai'],
  },
});
