import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * useDataCache - 數據快取 Hook
 * 用於快取複雜計算結果，提升效能
 */
export const useDataCache = (data, computeFn, dependencies = []) => {
  const cacheRef = useRef(new Map());
  const lastDataRef = useRef(null);

  return useMemo(() => {
    // 生成快取鍵
    const cacheKey = JSON.stringify(dependencies);
    
    // 檢查資料是否變更
    const dataChanged = lastDataRef.current !== data;
    
    // 如果有快取且資料未變更，直接返回快取結果
    if (!dataChanged && cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }
    
    // 計算新結果
    const result = computeFn(data);
    
    // 更新快取
    cacheRef.current.set(cacheKey, result);
    lastDataRef.current = data;
    
    // 限制快取大小（最多 10 個項目）
    if (cacheRef.current.size > 10) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    return result;
  }, [data, ...dependencies]);
};

/**
 * useFilteredData - 數據篩選 Hook
 * 根據篩選條件過濾數據
 */
export const useFilteredData = (data, filterOptions) => {
  return useMemo(() => {
    if (!data || !filterOptions) return data;

    const getItemDate = (item) => {
      const rawDate = item?.createdAt || item?.created_at || item?.updatedAt || item?.updated_at || item?.timestamp;
      if (!rawDate) return null;
      const parsedDate = new Date(rawDate);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    };

    const itemBelongsToStudents = (item, selectedStudents) => {
      const candidateIds = [
        item?.owner,
        item?.userId,
        item?.user_id,
        item?.created_by,
        item?.assigned_to
      ].filter(Boolean).map((value) => String(value));

      const studentIdSet = new Set(selectedStudents.map((value) => String(value)));
      return candidateIds.some((value) => studentIdSet.has(value));
    };
    
    const { timeRange, students } = filterOptions;
    let filtered = { ...data };
    
    // 時間範圍篩選
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (timeRange) {
        case '7days':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30days':
          cutoffDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90days':
          cutoffDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case 'semester':
          // 假設學期為 6 個月
          cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        // 篩選各類資料
        if (filtered.nodes) {
          filtered.nodes = filtered.nodes.filter(node => 
            !getItemDate(node) || getItemDate(node) >= cutoffDate
          );
        }
        if (filtered.tasks) {
          filtered.tasks = filtered.tasks.filter(task => 
            !getItemDate(task) || getItemDate(task) >= cutoffDate
          );
        }
        if (filtered.reflections) {
          filtered.reflections = filtered.reflections.filter(reflection => 
            !getItemDate(reflection) || getItemDate(reflection) >= cutoffDate
          );
        }
      }
    }
    
    // 學生篩選
    if (students && students.length > 0) {
      if (filtered.nodes) {
        filtered.nodes = filtered.nodes.filter(node => 
          itemBelongsToStudents(node, students)
        );
      }
      if (filtered.tasks) {
        filtered.tasks = filtered.tasks.filter(task => 
          itemBelongsToStudents(task, students)
        );
      }
      if (filtered.reflections) {
        filtered.reflections = filtered.reflections.filter(reflection => 
          itemBelongsToStudents(reflection, students)
        );
      }
    }
    
    return filtered;
  }, [data, filterOptions]);
};

/**
 * useDebounce - 防抖 Hook
 * 延遲執行函數，避免頻繁觸發
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * useChartInteraction - 圖表互動 Hook
 * 處理圖表點擊、hover 等互動事件
 */
export const useChartInteraction = () => {
  const [activeElement, setActiveElement] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  
  const handleChartClick = useCallback((event, elements) => {
    if (elements && elements.length > 0) {
      setActiveElement(elements[0]);
    } else {
      setActiveElement(null);
    }
  }, []);
  
  const handleChartHover = useCallback((event, elements) => {
    if (elements && elements.length > 0) {
      const element = elements[0];
      setTooltipData({
        index: element.index,
        datasetIndex: element.datasetIndex
      });
    } else {
      setTooltipData(null);
    }
  }, []);
  
  const resetInteraction = useCallback(() => {
    setActiveElement(null);
    setTooltipData(null);
  }, []);
  
  return {
    activeElement,
    tooltipData,
    handleChartClick,
    handleChartHover,
    resetInteraction
  };
};

/**
 * usePerformanceMonitor - 效能監控 Hook
 * 監控組件渲染效能
 */
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    // 開發環境下輸出效能資訊
    if (process.env.NODE_ENV === 'development') {
      if (renderTime > 16) { // 超過一幀（16ms）
        console.warn(
          `⚠️ ${componentName} 渲染較慢: ${renderTime.toFixed(2)}ms (第 ${renderCount.current} 次渲染)`
        );
      }
    }
    
    startTime.current = performance.now();
  });
  
  return {
    renderCount: renderCount.current
  };
};

/**
 * useLazyLoad - 延遲載入 Hook
 * 用於大量資料的分批載入
 */
export const useLazyLoad = (data, itemsPerPage = 20) => {
  const [displayedItems, setDisplayedItems] = useState(itemsPerPage);
  
  const visibleData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.slice(0, displayedItems);
  }, [data, displayedItems]);
  
  const loadMore = useCallback(() => {
    setDisplayedItems(prev => Math.min(prev + itemsPerPage, data.length));
  }, [data.length, itemsPerPage]);
  
  const hasMore = displayedItems < data.length;
  
  return {
    visibleData,
    loadMore,
    hasMore,
    totalItems: data.length,
    displayedItems
  };
};
