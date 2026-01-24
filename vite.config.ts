import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

// Figma plugins require two separate bundles:
// 1. Main thread (sandbox) - runs Figma API calls, no DOM access
// 2. UI thread (iframe) - React UI, no direct Figma API access

export default defineConfig(({ mode }) => {
  const isMainBuild = mode === 'main';

  if (isMainBuild) {
    // Main thread build - sandbox environment
    // Must be a plain script, not a module (Figma sandbox doesn't support ES modules)
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(__dirname, 'src/main.ts'),
          output: {
            entryFileNames: 'main.js',
            format: 'iife',
            // No exports - Figma expects plain executable script
            exports: 'none',
            inlineDynamicImports: true,
          },
        },
        target: 'es2017',
        minify: true,
        sourcemap: false,
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, './src'),
        },
      },
    };
  }

  // UI build - iframe with React
  return {
    plugins: [
      react(),
      viteSingleFile(),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(__dirname, 'src/ui/index.html'),
        output: {
          entryFileNames: 'ui.js',
          assetFileNames: 'ui.[ext]',
        },
      },
      minify: true,
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});
