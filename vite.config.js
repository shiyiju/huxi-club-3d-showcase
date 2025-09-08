import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'



export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src') // 关键配置
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 后端地址
        changeOrigin: true,
      },
    },
  },
})