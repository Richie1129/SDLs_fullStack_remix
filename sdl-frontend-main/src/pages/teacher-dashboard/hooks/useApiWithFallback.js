import { useState, useCallback, useRef } from "react";

/**
 * 統一的API呼叫Hook，包含重試、錯誤處理和快取機制
 */
export const useApiWithFallback = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 簡易快取
  const cache = useRef(new Map());
  const cacheTimeout = useRef(new Map());
  
  // 清理過期快取
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    for (const [key, expiry] of cacheTimeout.current.entries()) {
      if (now > expiry) {
        cache.current.delete(key);
        cacheTimeout.current.delete(key);
      }
    }
  }, []);

  // 執行API呼叫的主要方法
  const callApi = useCallback(async (
    apiFunction,
    args = [],
    options = {}
  ) => {
    const {
      cacheKey = null,
      cacheTTL = 5 * 60 * 1000, // 預設快取5分鐘
      retryCount = 3,
      retryDelay = 1000,
      fallbackValue = null,
      loadingState = true
    } = options;

    // 檢查快取
    if (cacheKey && cache.current.has(cacheKey)) {
      const cachedValue = cache.current.get(cacheKey);
      console.log(`✅ 使用快取資料: ${cacheKey}`);
      return { success: true, data: cachedValue, fromCache: true };
    }

    cleanupCache();

    if (loadingState) {
      setLoading(true);
    }
    setError(null);

    let lastError = null;

    // 重試邏輯
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`🔄 API呼叫嘗試 ${attempt}/${retryCount}`);
        
        const result = await apiFunction(...args);
        
        // 成功時快取結果
        if (cacheKey && result) {
          cache.current.set(cacheKey, result);
          cacheTimeout.current.set(cacheKey, Date.now() + cacheTTL);
          console.log(`💾 已快取結果: ${cacheKey}`);
        }

        if (loadingState) {
          setLoading(false);
        }
        
        return { success: true, data: result, fromCache: false };

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ API呼叫失敗 (嘗試 ${attempt}/${retryCount}):`, error.message);

        // 如果不是最後一次嘗試，等待後重試
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    // 所有重試都失敗後
    console.error(`❌ API呼叫完全失敗:`, lastError);
    
    if (loadingState) {
      setLoading(false);
    }
    setError(lastError?.message || "API呼叫失敗");

    // 使用降級值
    return { 
      success: false, 
      data: fallbackValue, 
      error: lastError,
      fromFallback: true 
    };
  }, [cleanupCache]);

  // 批量API呼叫
  const callMultipleApis = useCallback(async (apiCalls, options = {}) => {
    const {
      parallel = true,
      failFast = false,
      loadingState = true
    } = options;

    if (loadingState) {
      setLoading(true);
    }
    setError(null);

    try {
      let results;

      if (parallel) {
        // 並行執行所有API呼叫
        const promises = apiCalls.map(({ apiFunction, args = [], options = {} }) =>
          callApi(apiFunction, args, { ...options, loadingState: false })
        );
        
        if (failFast) {
          results = await Promise.all(promises);
        } else {
          results = await Promise.allSettled(promises);
          results = results.map(result => 
            result.status === 'fulfilled' 
              ? result.value 
              : { success: false, data: null, error: result.reason }
          );
        }
      } else {
        // 順序執行API呼叫
        results = [];
        for (const { apiFunction, args = [], options = {} } of apiCalls) {
          const result = await callApi(apiFunction, args, { ...options, loadingState: false });
          results.push(result);
          
          // 如果設定為fail fast且失敗，則停止後續呼叫
          if (failFast && !result.success) {
            break;
          }
        }
      }

      if (loadingState) {
        setLoading(false);
      }
      
      return { success: true, results };

    } catch (error) {
      console.error("❌ 批量API呼叫失敗:", error);
      
      if (loadingState) {
        setLoading(false);
      }
      setError(error.message || "批量API呼叫失敗");
      
      return { success: false, results: [], error };
    }
  }, [callApi]);

  // 清除快取
  const clearCache = useCallback((key = null) => {
    if (key) {
      cache.current.delete(key);
      cacheTimeout.current.delete(key);
    } else {
      cache.current.clear();
      cacheTimeout.current.clear();
    }
  }, []);

  // 取得快取統計
  const getCacheStats = useCallback(() => {
    return {
      size: cache.current.size,
      keys: Array.from(cache.current.keys())
    };
  }, []);

  return {
    loading,
    error,
    callApi,
    callMultipleApis,
    clearCache,
    getCacheStats
  };
};