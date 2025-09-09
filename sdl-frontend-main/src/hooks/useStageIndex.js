import { useCallback, useSyncExternalStore } from 'react';

// 配置管理，避免硬編碼
const STAGE_CONFIG = {
  STAGE: { MIN: 1, MAX: 5, DEFAULT: 1 },
  SUB_STAGE: { MIN: 1, MAX: 10, DEFAULT: 1 },
  STORAGE_KEYS: {
    STAGE: 'currentStage',
    SUB_STAGE: 'currentSubStage'
  }
};

// HMR 安全的單例模式
const getGlobalStageManager = (() => {
  const GLOBAL_KEY = '__STAGE_MANAGER_SINGLETON__';
  
  return () => {
    if (typeof window !== 'undefined') {
      if (!window[GLOBAL_KEY]) {
        window[GLOBAL_KEY] = new StageManager();
      }
      return window[GLOBAL_KEY];
    }
    // SSR fallback
    return new StageManager();
  };
})();

// 安全的 localStorage 操作，處理所有邊界情況
const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`localStorage.getItem failed for key "${key}":`, error);
      return null;
    }
  },
  
  setItem: (key, value) => {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`localStorage.setItem failed for key "${key}":`, error);
      return false;
    }
  },

  // 原子性批次操作
  setItemsBatch: (operations) => {
    const rollback = [];
    
    try {
      if (typeof window === 'undefined') return false;
      
      // 先備份現有值
      for (const { key } of operations) {
        rollback.push({
          key,
          value: localStorage.getItem(key)
        });
      }
      
      // 批次寫入
      for (const { key, value } of operations) {
        localStorage.setItem(key, value);
      }
      
      return true;
    } catch (error) {
      console.warn('Batch localStorage operation failed, rolling back:', error);
      
      // 出錯時回滾
      try {
        for (const { key, value } of rollback) {
          if (value === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, value);
          }
        }
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      
      return false;
    }
  }
};

// 數值驗證與預設值處理 - 可配置化
const validateStageIndex = (value, config) => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < config.MIN || parsed > config.MAX) {
    return config.DEFAULT;
  }
  return parsed;
};

// 互斥鎖，解決競態條件
class AsyncLock {
  constructor() {
    this.locked = false;
    this.queue = [];
  }
  
  async acquire() {
    if (!this.locked) {
      this.locked = true;
      return () => {
        this.locked = false;
        const next = this.queue.shift();
        if (next) {
          this.locked = true;
          next();
        }
      };
    }
    
    return new Promise(resolve => {
      this.queue.push(() => {
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) {
            this.locked = true;
            next();
          }
        });
      });
    });
  }
}

// React 18 相容的外部狀態儲存器
class StageStore {
  constructor() {
    this.state = this.loadInitialState();
    this.listeners = new Set();
    this.lock = new AsyncLock();
    this.storageListenerRegistered = false;
    
    // 不變式檢查
    this.invariants = [
      () => {
        const { currentStageIndex, currentSubStageIndex } = this.state;
        return currentStageIndex >= STAGE_CONFIG.STAGE.MIN && 
               currentStageIndex <= STAGE_CONFIG.STAGE.MAX &&
               currentSubStageIndex >= STAGE_CONFIG.SUB_STAGE.MIN && 
               currentSubStageIndex <= STAGE_CONFIG.SUB_STAGE.MAX;
      }
    ];
    
    this.registerStorageListener();
  }

  loadInitialState() {
    const currentStage = validateStageIndex(
      safeLocalStorage.getItem(STAGE_CONFIG.STORAGE_KEYS.STAGE), 
      STAGE_CONFIG.STAGE
    );
    const currentSubStage = validateStageIndex(
      safeLocalStorage.getItem(STAGE_CONFIG.STORAGE_KEYS.SUB_STAGE), 
      STAGE_CONFIG.SUB_STAGE
    );
    
    return {
      currentStageIndex: currentStage,
      currentSubStageIndex: currentSubStage
    };
  }

  // HMR 安全的 storage 監聽器註冊
  registerStorageListener() {
    if (typeof window === 'undefined' || this.storageListenerRegistered) {
      return;
    }
    
    const handleStorageChange = (e) => {
      if (e.key === STAGE_CONFIG.STORAGE_KEYS.STAGE || 
          e.key === STAGE_CONFIG.STORAGE_KEYS.SUB_STAGE) {
        // 重新載入狀態並同步
        const newState = this.loadInitialState();
        if (this.validateInvariants(newState)) {
          this.state = newState;
          this.notifyListeners();
        }
      }
    };
    
    // 移除可能存在的舊監聽器
    window.removeEventListener('storage', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    this.storageListenerRegistered = true;
    
    // HMR 清理
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        window.removeEventListener('storage', handleStorageChange);
        this.storageListenerRegistered = false;
      });
    }
  }

  validateInvariants(state = this.state) {
    return this.invariants.every(invariant => {
      try {
        return invariant(state);
      } catch (error) {
        console.error('Invariant check failed:', error);
        return false;
      }
    });
  }

  // React 18 useSyncExternalStore 相容介面
  getSnapshot = () => {
    return JSON.stringify(this.state); // 序列化確保穩定參考
  }

  getServerSnapshot = () => {
    // SSR 初始狀態
    return JSON.stringify({
      currentStageIndex: STAGE_CONFIG.STAGE.DEFAULT,
      currentSubStageIndex: STAGE_CONFIG.SUB_STAGE.DEFAULT
    });
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // 原子性更新，帶鎖保護
  async updateStage(newStageIndex, resetSubStage = true) {
    const release = await this.lock.acquire();
    
    try {
      const validStage = validateStageIndex(newStageIndex, STAGE_CONFIG.STAGE);
      const newSubStage = resetSubStage ? STAGE_CONFIG.SUB_STAGE.DEFAULT : this.state.currentSubStageIndex;
      
      const operations = [
        { key: STAGE_CONFIG.STORAGE_KEYS.STAGE, value: validStage.toString() }
      ];
      
      if (resetSubStage) {
        operations.push({ 
          key: STAGE_CONFIG.STORAGE_KEYS.SUB_STAGE, 
          value: STAGE_CONFIG.SUB_STAGE.DEFAULT.toString() 
        });
      }
      
      const success = safeLocalStorage.setItemsBatch(operations);
      
      if (success) {
        const newState = {
          currentStageIndex: validStage,
          currentSubStageIndex: newSubStage
        };
        
        if (this.validateInvariants(newState)) {
          this.state = newState;
          this.notifyListeners();
        } else {
          throw new Error('State invariant violation after stage update');
        }
      } else {
        console.error('Failed to persist stage update to localStorage');
      }
    } finally {
      release();
    }
  }

  async updateSubStage(newSubStageIndex) {
    const release = await this.lock.acquire();
    
    try {
      const validSubStage = validateStageIndex(newSubStageIndex, STAGE_CONFIG.SUB_STAGE);
      
      const success = safeLocalStorage.setItem(
        STAGE_CONFIG.STORAGE_KEYS.SUB_STAGE, 
        validSubStage.toString()
      );
      
      if (success) {
        const newState = {
          ...this.state,
          currentSubStageIndex: validSubStage
        };
        
        if (this.validateInvariants(newState)) {
          this.state = newState;
          this.notifyListeners();
        } else {
          throw new Error('State invariant violation after subStage update');
        }
      } else {
        console.error('Failed to persist subStage update to localStorage');
      }
    } finally {
      release();
    }
  }

  async updateBoth(newStageIndex, newSubStageIndex) {
    const release = await this.lock.acquire();
    
    try {
      const validStage = validateStageIndex(newStageIndex, STAGE_CONFIG.STAGE);
      const validSubStage = validateStageIndex(newSubStageIndex, STAGE_CONFIG.SUB_STAGE);
      
      const operations = [
        { key: STAGE_CONFIG.STORAGE_KEYS.STAGE, value: validStage.toString() },
        { key: STAGE_CONFIG.STORAGE_KEYS.SUB_STAGE, value: validSubStage.toString() }
      ];
      
      const success = safeLocalStorage.setItemsBatch(operations);
      
      if (success) {
        const newState = {
          currentStageIndex: validStage,
          currentSubStageIndex: validSubStage
        };
        
        if (this.validateInvariants(newState)) {
          this.state = newState;
          this.notifyListeners();
        } else {
          throw new Error('State invariant violation after batch update');
        }
      } else {
        console.error('Failed to persist batch update to localStorage');
      }
    } finally {
      release();
    }
  }

  getRawState() {
    return { ...this.state };
  }
}

// 重構 StageManager 為 StageStore
class StageManager extends StageStore {}

// 全域單例，HMR 安全
const stageStore = getGlobalStageManager();

// React 18 相容的 Hook
export const useStageManager = () => {
  // 使用 React 18 的 useSyncExternalStore，解決並發渲染問題
  const snapshot = useSyncExternalStore(
    stageStore.subscribe,
    stageStore.getSnapshot,
    stageStore.getServerSnapshot
  );
  
  const state = JSON.parse(snapshot);
  
  const updateStage = useCallback((newIndex, resetSubStage = true) => {
    stageStore.updateStage(newIndex, resetSubStage);
  }, []);

  const updateSubStage = useCallback((newIndex) => {
    stageStore.updateSubStage(newIndex);
  }, []);

  const updateBoth = useCallback((stageIndex, subStageIndex) => {
    stageStore.updateBoth(stageIndex, subStageIndex);
  }, []);

  return {
    currentStageIndex: state.currentStageIndex,
    currentSubStageIndex: state.currentSubStageIndex,
    setCurrentStageIndex: updateStage,
    setCurrentSubStageIndex: updateSubStage,
    updateBoth
  };
};

// 向後兼容的單一 hooks
export const useStageIndex = () => {
  const { currentStageIndex, setCurrentStageIndex } = useStageManager();
  return [currentStageIndex, setCurrentStageIndex];
};

export const useSubStageIndex = () => {
  const { currentSubStageIndex, setCurrentSubStageIndex } = useStageManager();
  return [currentSubStageIndex, setCurrentSubStageIndex];
};

// 開發工具 - 暴露配置和診斷
export const __DEV__ = {
  STAGE_CONFIG,
  getStore: () => stageStore,
  validateState: () => stageStore.validateInvariants(),
  getSnapshot: () => stageStore.getRawState()
};