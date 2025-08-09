/// <reference types="vite/client" />

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    nodePolyfills()
  ],
  resolve: {
    alias: {
      "@": __dirname
    },
  },
  // Optimize Three.js imports
  optimizeDeps: {
    include: ['three']
  },
  // Configure build for better Three.js performance
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three']
        }
      }
    }
  },
  // Enable source maps for development
  css: {
    devSourcemap: true
  }
})