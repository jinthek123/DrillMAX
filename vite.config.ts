import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const host = process.env.TAURI_DEV_HOST

export default defineConfig(({ mode }) => {
  // vite build(설치본)는 production. 개발 서버만 이 저장소의 data 경로를 넣는다.
  const dataFile =
    mode === 'production' ? '' : path.join(rootDir, 'data', 'drillMax.json')
  const appVersion = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version

  return {
  plugins: [react()],
  define: {
    __DRILLMAX_DATA_FILE__: JSON.stringify(dataFile),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  base: './',
  clearScreen: false,
  server: {
    host: host || '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
    fs: {
      allow: [rootDir, path.resolve(rootDir, '../DrillMAX-dev-data')],
    },
    proxy: {
      '/bridge': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bridge/, ''),
      },
      '/hang-proxy': {
        target: 'https://djmax-bf8a54aa6ab0.herokuapp.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/hang-proxy/, ''),
      },
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}})
