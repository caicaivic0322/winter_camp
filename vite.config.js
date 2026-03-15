import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 自定义插件：加载 markdown 文件内容
function markdownPlugin() {
  return {
    name: 'markdown-loader',
    transform(code, id) {
      if (id.endsWith('.md')) {
        const content = readFileSync(id, 'utf-8')
        return {
          code: `export default ${JSON.stringify(content)}`,
          map: null
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
    markdownPlugin()
  ],
  assetsInclude: ['**/*.md'],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[proxy:req]', req.method, req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[proxy:res]', proxyRes.statusCode, req.url)
          })
          proxy.on('error', (err, req) => {
            console.log('[proxy:error]', err?.message, req.url)
          })
        }
      },
    },
  },
})

