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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TrackingProvider>
        <App />
      </TrackingProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
