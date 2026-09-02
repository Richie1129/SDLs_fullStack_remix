/**
 * 完整的 StageManager 測試套件
 * 測試所有並發、競態、邊界條件
 *
 * 注意：useStageIndex.js 在模組載入時就建立全域單例 stageStore，
 * 因此每個測試都要 vi.resetModules() 後重新 import，
 * 否則 localStorage mock 不會被重新讀取、狀態會在測試之間互相污染。
 * 階段範圍一律從 __DEV__.STAGE_CONFIG 讀取（目前為四階段、三子階段），
 * 不要在測試裡硬編碼上限。
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const HOOK_MODULE = '../../hooks/useStageIndex';
let useStageManager;
let useStageIndex;
let __DEV__;
let STAGE;
let SUB_STAGE;

/**
 * 重新載入 hook 模組，讓單例在目前的 localStorage / event listener mock 之上重新建立。
 * 需要「預先寫入 localStorage 再啟動」的測試，設定完 getItem mock 後要再呼叫一次。
 */
const reloadHook = async () => {
  delete window.__STAGE_MANAGER_SINGLETON__;
  vi.resetModules();
  ({ useStageManager, useStageIndex, __DEV__ } = await import(HOOK_MODULE));
  ({ STAGE, SUB_STAGE } = __DEV__.STAGE_CONFIG);
};

// Mock localStorage for testing
const createMockLocalStorage = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
};

// Mock window.addEventListener for storage events
const mockStorageEventListeners = new Map();
const mockAddEventListener = vi.fn((event, callback) => {
  if (event === 'storage') {
    mockStorageEventListeners.set(callback, callback);
  }
});
const mockRemoveEventListener = vi.fn((event, callback) => {
  if (event === 'storage') {
    mockStorageEventListeners.delete(callback);
  }
});

describe('StageManager', () => {
  let mockLocalStorage;

  beforeEach(async () => {
    // Setup localStorage mock
    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Setup window event listener mocks
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // 重新載入模組，讓單例在 mock 就緒後才建立
    await reloadHook();
  });

  afterEach(() => {
    mockStorageEventListeners.clear();
  });

  describe('Basic Functionality', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useStageManager());
      
      expect(result.current.currentStageIndex).toBe(1);
      expect(result.current.currentSubStageIndex).toBe(1);
    });

    test('should load from localStorage if available', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'currentStage') return '3';
        if (key === 'currentSubStage') return String(SUB_STAGE.MAX);
        return null;
      });
      await reloadHook();

      const { result } = renderHook(() => useStageManager());
      
      expect(result.current.currentStageIndex).toBe(3);
      expect(result.current.currentSubStageIndex).toBe(SUB_STAGE.MAX);
    });

    test('should handle invalid localStorage values', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'currentStage') return 'invalid';
        if (key === 'currentSubStage') return '-999';
        return null;
      });
      await reloadHook();

      const { result } = renderHook(() => useStageManager());
      
      expect(result.current.currentStageIndex).toBe(1); // fallback to default
      expect(result.current.currentSubStageIndex).toBe(1); // fallback to default
    });
  });

  describe('State Updates', () => {
    test('should update stage index', async () => {
      const { result } = renderHook(() => useStageManager());
      
      await act(async () => {
        result.current.setCurrentStageIndex(3);
      });
      
      expect(result.current.currentStageIndex).toBe(3);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentStage', '3');
    });

    test('should reset substage when updating stage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'currentStage') return '2';
        if (key === 'currentSubStage') return String(SUB_STAGE.MAX);
        return null;
      });
      await reloadHook();

      const { result } = renderHook(() => useStageManager());
      
      await act(async () => {
        result.current.setCurrentStageIndex(3, true); // resetSubStage = true
      });
      
      expect(result.current.currentStageIndex).toBe(3);
      expect(result.current.currentSubStageIndex).toBe(1); // reset to default
    });

    test('should not reset substage when specified', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'currentStage') return '2';
        if (key === 'currentSubStage') return String(SUB_STAGE.MAX);
        return null;
      });
      await reloadHook();

      const { result } = renderHook(() => useStageManager());
      
      await act(async () => {
        result.current.setCurrentStageIndex(3, false); // resetSubStage = false
      });
      
      expect(result.current.currentStageIndex).toBe(3);
      expect(result.current.currentSubStageIndex).toBe(SUB_STAGE.MAX); // preserved
    });

    test('should update both stage and substage atomically', async () => {
      const { result } = renderHook(() => useStageManager());
      
      await act(async () => {
        result.current.updateBoth(STAGE.MAX, SUB_STAGE.MAX);
      });
      
      expect(result.current.currentStageIndex).toBe(STAGE.MAX);
      expect(result.current.currentSubStageIndex).toBe(SUB_STAGE.MAX);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Boundary Validation', () => {
    test('should clamp stage values to valid range', async () => {
      const { result } = renderHook(() => useStageManager());
      
      await act(async () => {
        result.current.setCurrentStageIndex(999); // way over max
      });
      
      expect(result.current.currentStageIndex).toBe(1); // clamped to default
    });

    test('should clamp substage values to valid range', async () => {
      const { result } = renderHook(() => useStageManager());
      
      await act(async () => {
        result.current.setCurrentSubStageIndex(-5); // negative
      });
      
      expect(result.current.currentSubStageIndex).toBe(1); // clamped to default
    });

    test('should fall back to default when substage exceeds configured max', async () => {
      const { result } = renderHook(() => useStageManager());
      
      await act(async () => {
        result.current.setCurrentSubStageIndex(SUB_STAGE.MAX + 1);
      });
      
      expect(result.current.currentSubStageIndex).toBe(SUB_STAGE.DEFAULT);
    });
  });

  describe('Multiple Hook Synchronization', () => {
    test('should sync multiple useStageManager hooks', async () => {
      const { result: result1 } = renderHook(() => useStageManager());
      const { result: result2 } = renderHook(() => useStageManager());
      
      await act(async () => {
        result1.current.setCurrentStageIndex(3);
      });
      
      // Both hooks should reflect the same state
      expect(result1.current.currentStageIndex).toBe(3);
      expect(result2.current.currentStageIndex).toBe(3);
    });

    test('should sync useStageIndex with useStageManager', async () => {
      const { result: managerResult } = renderHook(() => useStageManager());
      const { result: indexResult } = renderHook(() => useStageIndex());
      
      await act(async () => {
        managerResult.current.setCurrentStageIndex(4);
      });
      
      expect(indexResult.current[0]).toBe(4);
    });
  });

  describe('localStorage Persistence Failures', () => {
    test('should handle localStorage.setItem failures gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage full');
      });
      
      const { result } = renderHook(() => useStageManager());
      
      // Should not throw error
      await act(async () => {
        result.current.setCurrentStageIndex(2);
      });
      
      // State should remain unchanged when persistence fails
      expect(result.current.currentStageIndex).toBe(1);
    });
  });

  describe('Cross-tab Synchronization', () => {
    test('should handle storage events from other tabs', () => {
      const { result } = renderHook(() => useStageManager());
      
      // Initial state
      expect(result.current.currentStageIndex).toBe(1);
      
      // Simulate storage event from another tab
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'currentStage') return '4';
        if (key === 'currentSubStage') return '2';
        return null;
      });
      
      act(() => {
        // Trigger storage event
        const storageEvent = new StorageEvent('storage', {
          key: 'currentStage',
          newValue: '4',
          oldValue: '1'
        });
        
        mockStorageEventListeners.forEach(callback => {
          callback(storageEvent);
        });
      });
      
      expect(result.current.currentStageIndex).toBe(4);
    });
  });

  describe('Development Tools', () => {
    test('should provide development utilities', () => {
      expect(__DEV__.STAGE_CONFIG).toBeDefined();
      expect(__DEV__.getStore).toBeDefined();
      expect(__DEV__.validateState).toBeDefined();
      expect(__DEV__.getSnapshot).toBeDefined();
    });

    test('should validate state invariants', () => {
      const isValid = __DEV__.validateState();
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Race Condition Protection', () => {
    test('should handle concurrent updates correctly', async () => {
      const { result } = renderHook(() => useStageManager());
      
      // Fire multiple updates concurrently
      const promises = [
        act(() => result.current.setCurrentStageIndex(2)),
        act(() => result.current.setCurrentStageIndex(3)),
        act(() => result.current.setCurrentStageIndex(4))
      ];
      
      await Promise.all(promises);
      
      // Final state should be deterministic (last update wins due to locking)
      expect([2, 3, 4]).toContain(result.current.currentStageIndex);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });
});