import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { QueryClient, QueryClientProvider } from 'react-query'
import { TrackingProvider } from './providers/TrackingProvider.jsx'

// 全域預設：1 分鐘內視為新鮮、切回分頁不自動重打、失敗只重試 1 次
// 需要切回分頁自動更新的 query 請在該 useQuery 局部設 refetchOnWindowFocus: true
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 部署後，舊分頁要的 lazy chunk 已不存在（伺服器回 404），重新整理一次拿新版 index.html。
// 10 秒內只重整一次，避免新版本本身壞掉時無限重整；sessionStorage 不可用時不重整，交給 ErrorBoundary。
// 不呼叫 preventDefault：否則 lazy() 會拿到 undefined，丟出更難判讀的錯誤
const CHUNK_RELOAD_KEY = 'chunk-reload-at';
window.addEventListener('vite:preloadError', () => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0;
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TrackingProvider>
        <App />
      </TrackingProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
