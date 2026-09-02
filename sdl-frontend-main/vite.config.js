import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * 從 Rollup module id 取出 npm 套件名稱（支援 scoped package 與 pnpm 巢狀路徑）。
 * 非 node_modules 的模組回傳 null，交給 Rollup 預設切法。
 */
function packageNameOf(id) {
  const match = id.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/)
  return match ? match[1] : null
}

// 穩定的第三方套件分組：這些套件版本很少變動，獨立成 chunk 後可跨部署長期快取，
// 也避免任一路由改動就讓整包 vendor hash 失效。
// 以 function 依 module id 判斷：套件不存在時只是不會命中，不會讓 build 失敗。
// 注意：markdown 管線（react-markdown / remark / rehype / unified）不放進 vendor-streamdown，
// 因為 ChatContent / MessageContent 也用它們，放進去會讓 Kanban 連帶載入 streamdown。
const VENDOR_GROUPS = [
  {
    name: 'vendor-react',
    match: (pkg) => ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler', '@remix-run/router'].includes(pkg),
  },
  {
    name: 'vendor-query',
    match: (pkg) => pkg === 'react-query',
  },
  {
    name: 'vendor-vis',
    match: (pkg) => pkg.startsWith('vis-') || ['keycharm', 'timsort', 'component-emitter', '@egjs/hammerjs'].includes(pkg),
  },
  {
    name: 'vendor-recharts',
    match: (pkg) =>
      ['recharts', 'recharts-scale', 'victory-vendor', 'internmap', 'react-smooth', 'fast-equals', 'decimal.js-light'].includes(pkg) ||
      pkg.startsWith('d3-'),
  },
  {
    name: 'vendor-chartjs',
    match: (pkg) => ['chart.js', 'react-chartjs-2', '@kurkle/color'].includes(pkg),
  },
  {
    name: 'vendor-motion',
    match: (pkg) => ['framer-motion', 'motion-dom', 'motion-utils'].includes(pkg),
  },
  {
    name: 'vendor-streamdown',
    match: (pkg) =>
      ['streamdown', 'shiki', 'mermaid', 'katex', 'cytoscape'].includes(pkg) ||
      pkg.startsWith('@shikijs/') ||
      pkg.startsWith('@mermaid-js/') ||
      pkg.startsWith('cytoscape-'),
  },
]

function manualChunks(id) {
  const pkg = packageNameOf(id)
  if (!pkg) return undefined
  const group = VENDOR_GROUPS.find((g) => g.match(pkg))
  return group ? group.name : undefined
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  server:{
    host:'0.0.0.0',
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
