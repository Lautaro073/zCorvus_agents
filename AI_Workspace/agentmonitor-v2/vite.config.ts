import path from 'path'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, type PluginOption } from 'vite'

const shouldAnalyze = process.env.ANALYZE === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    shouldAnalyze
      ? (visualizer({
          filename: 'dist/stats.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: false,
        }) as PluginOption)
      : null,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'vendor-recharts'
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix'
          if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query'
          if (id.includes('node_modules/react-window')) return 'vendor-virtual'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
})
