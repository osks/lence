import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'lence/static/js',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'lence/frontend/app.ts'),
      formats: ['es'],
      fileName: () => 'app.js',
    },
    rollupOptions: {
      output: {
        // Keep everything in one file
        inlineDynamicImports: true,
      },
    },
  },
})
