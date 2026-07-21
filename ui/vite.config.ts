import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { wippyComponentPlugin } from '@wippy-fe/vite-plugin'
import { defineConfig } from 'vite'

const moduleRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (t) => t.startsWith('wc-') } } }), wippyComponentPlugin()],
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(moduleRoot, 'src/index.ts'),
      name: 'AcmeStarter',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      input: { index: resolve(moduleRoot, 'src/index.ts') },
      external: ['vue', '@iconify/vue', '@wippy-fe/proxy'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      },
      preserveEntrySignatures: false,
    },
    sourcemap: true,
  },
})
