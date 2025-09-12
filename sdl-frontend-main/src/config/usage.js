// Usage tracking config (frontend)
// 調整心跳頻率至 75 秒，配合後端 45 秒去抖邏輯
// 這樣確保心跳會被記錄，同時減少數據庫壓力
export const HEARTBEAT_INTERVAL_MS = 75000; // 75s (75 > 45s debounce)

