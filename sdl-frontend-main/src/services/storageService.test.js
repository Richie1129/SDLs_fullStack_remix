/**
 * StorageService 測試檔案
 * 執行方式: npm test -- storageService.test.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import storageService, { authStorage, userStorage } from '../services/storageService';

describe('StorageService', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('基礎操作', () => {
    it('應該能夠儲存和獲取字串', () => {
      const key = 'testKey';
      const value = 'testValue';
      
      storageService.set(key, value);
      const result = storageService.get(key);
      
      expect(result).toBe(value);
    });

    it('應該在 key 不存在時返回預設值', () => {
      const result = storageService.get('nonExistent', 'default');
      expect(result).toBe('default');
    });

    it('應該能夠刪除項目', () => {
      storageService.set('testKey', 'testValue');
      storageService.remove('testKey');
      
      expect(storageService.has('testKey')).toBe(false);
    });

    it('應該能夠清空所有資料', () => {
      storageService.set('key1', 'value1');
      storageService.set('key2', 'value2');
      
      storageService.clear();
      
      expect(storageService.size()).toBe(0);
    });
  });

  describe('物件操作', () => {
    it('應該能夠儲存和獲取物件', () => {
      const obj = { name: 'Alice', age: 25, role: 'student' };
      
      storageService.setObject('user', obj);
      const result = storageService.getObject('user');
      
      expect(result).toEqual(obj);
    });

    it('應該處理無效的 JSON', () => {
      localStorage.setItem('invalidJson', '{invalid}');
      
      const result = storageService.getObject('invalidJson', { fallback: true });
      
      expect(result).toEqual({ fallback: true });
    });
  });

  describe('類型轉換', () => {
    it('應該正確獲取數字', () => {
      storageService.set('number', '42');
      const result = storageService.getNumber('number');
      
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('應該正確獲取整數', () => {
      storageService.set('int', '42.7');
      const result = storageService.getInt('int');
      
      expect(result).toBe(42);
    });

    it('應該正確獲取布林值', () => {
      storageService.set('bool1', 'true');
      storageService.set('bool2', '1');
      storageService.set('bool3', 'false');
      
      expect(storageService.getBoolean('bool1')).toBe(true);
      expect(storageService.getBoolean('bool2')).toBe(true);
      expect(storageService.getBoolean('bool3')).toBe(false);
    });

    it('應該在無效數字時返回預設值', () => {
      storageService.set('notANumber', 'abc');
      const result = storageService.getNumber('notANumber', 999);
      
      expect(result).toBe(999);
    });
  });

  describe('批量操作', () => {
    it('應該能夠批量設定', () => {
      const items = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      };
      
      storageService.setMultiple(items);
      
      expect(storageService.get('key1')).toBe('value1');
      expect(storageService.get('key2')).toBe('value2');
      expect(storageService.get('key3')).toBe('value3');
    });

    it('應該能夠批量獲取', () => {
      storageService.set('a', '1');
      storageService.set('b', '2');
      storageService.set('c', '3');
      
      const result = storageService.getMultiple(['a', 'b', 'c']);
      
      expect(result).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('應該能夠批量刪除', () => {
      storageService.set('del1', 'value1');
      storageService.set('del2', 'value2');
      
      storageService.removeMultiple(['del1', 'del2']);
      
      expect(storageService.has('del1')).toBe(false);
      expect(storageService.has('del2')).toBe(false);
    });
  });

  describe('命名空間', () => {
    it('應該隔離不同命名空間的資料', () => {
      const ns1 = storageService.namespace('app1');
      const ns2 = storageService.namespace('app2');
      
      ns1.set('key', 'value1');
      ns2.set('key', 'value2');
      
      expect(ns1.get('key')).toBe('value1');
      expect(ns2.get('key')).toBe('value2');
    });

    it('應該能夠清空單個命名空間', () => {
      const ns = storageService.namespace('test');
      
      ns.set('key1', 'value1');
      ns.set('key2', 'value2');
      storageService.set('outsideKey', 'outsideValue');
      
      ns.clear();
      
      expect(ns.get('key1')).toBeNull();
      expect(storageService.get('outsideKey')).toBe('outsideValue');
    });

    it('authStorage 應該正常工作', () => {
      authStorage.set('token', 'abc123');
      expect(authStorage.get('token')).toBe('abc123');
    });

    it('userStorage 應該正常工作', () => {
      userStorage.setObject('profile', { name: 'Bob' });
      expect(userStorage.getObject('profile')).toEqual({ name: 'Bob' });
    });
  });

  describe('工具方法', () => {
    it('應該正確檢查 key 是否存在', () => {
      storageService.set('exists', 'yes');
      
      expect(storageService.has('exists')).toBe(true);
      expect(storageService.has('notExists')).toBe(false);
    });

    it('應該返回所有 keys', () => {
      storageService.set('a', '1');
      storageService.set('b', '2');
      
      const keys = storageService.keys();
      
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });

    it('應該返回正確的大小', () => {
      storageService.clear();
      
      expect(storageService.size()).toBe(0);
      
      storageService.set('key1', 'value1');
      storageService.set('key2', 'value2');
      
      expect(storageService.size()).toBe(2);
    });
  });

  describe('匯入/匯出', () => {
    it('應該能夠匯出所有資料', () => {
      storageService.set('exportKey1', 'value1');
      storageService.set('exportKey2', 'value2');
      
      const exported = storageService.export();
      
      expect(exported).toHaveProperty('exportKey1', 'value1');
      expect(exported).toHaveProperty('exportKey2', 'value2');
    });

    it('應該能夠匯入資料', () => {
      const data = {
        importKey1: 'value1',
        importKey2: 'value2'
      };
      
      storageService.import(data);
      
      expect(storageService.get('importKey1')).toBe('value1');
      expect(storageService.get('importKey2')).toBe('value2');
    });

    it('應該能夠在匯入前清空', () => {
      storageService.set('oldKey', 'oldValue');
      
      const newData = { newKey: 'newValue' };
      storageService.import(newData, true);
      
      expect(storageService.has('oldKey')).toBe(false);
      expect(storageService.get('newKey')).toBe('newValue');
    });
  });

  describe('統計資訊', () => {
    it('應該返回使用統計', () => {
      storageService.set('stat1', 'value1');
      storageService.set('stat2', 'value2');
      
      const stats = storageService.getStats();
      
      expect(stats).toHaveProperty('itemCount');
      expect(stats).toHaveProperty('estimatedSize');
      expect(stats).toHaveProperty('usage');
      expect(stats.itemCount).toBe(2);
    });
  });

  describe('錯誤處理', () => {
    it('應該處理 localStorage 不可用的情況', () => {
      // 模擬 localStorage 拋出錯誤
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      const result = storageService.set('errorKey', 'errorValue');
      
      expect(result).toBe(false);
      
      // 還原
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('真實場景測試', () => {
    it('應該模擬使用者登入流程', () => {
      // 模擬登入
      authStorage.set('accessToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
      authStorage.set('refreshToken', 'refresh_token_123');
      userStorage.setObject('profile', {
        id: 123,
        username: 'testuser',
        email: 'test@example.com',
        role: 'student'
      });
      storageService.set('id', '123');
      storageService.set('role', 'student');
      
      // 驗證
      expect(authStorage.get('accessToken')).toBeTruthy();
      expect(userStorage.getObject('profile').id).toBe(123);
      expect(storageService.getInt('id')).toBe(123);
    });

    it('應該模擬專案狀態管理', () => {
      const projectId = 456;
      storageService.set('currentProjectId', projectId);
      storageService.set('currentStage', '2');
      storageService.set('currentSubStage', '3');
      storageService.set('stageEnd', 'false');
      
      // 獲取狀態
      const currentStage = storageService.getInt('currentStage', 1);
      const currentSubStage = storageService.getInt('currentSubStage', 1);
      const isStageEnd = storageService.getBoolean('stageEnd');
      
      expect(currentStage).toBe(2);
      expect(currentSubStage).toBe(3);
      expect(isStageEnd).toBe(false);
    });

    it('應該模擬登出清理', () => {
      // 設定使用者資料
      authStorage.set('accessToken', 'token123');
      userStorage.set('id', '123');
      storageService.set('currentProjectId', '456');
      
      // 登出 - 只清理認證相關
      authStorage.clear();
      userStorage.clear();
      
      // 驗證
      expect(authStorage.get('accessToken')).toBeNull();
      expect(userStorage.get('id')).toBeNull();
      // 專案資料可能保留 (取決於需求)
      expect(storageService.get('currentProjectId')).toBe('456');
    });
  });
});
