import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'lence/static/js',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/app.ts'),
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
