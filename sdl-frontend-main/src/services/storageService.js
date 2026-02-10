/**
 * StorageService - 統一的 localStorage 管理服務
 * 
 * 功能:
 * - 自動序列化/反序列化 JSON
 * - 錯誤處理與降級
 * - 類型安全的取值
 * - 批量操作支援
 * - 命名空間隔離
 * 
 * 使用範例:
 * ```js
 * import storageService from '@/services/storageService';
 * 
 * // 基礎操作
 * storageService.set('userId', 123);
 * const userId = storageService.get('userId', 0); // 預設值 0
 * 
 * // 物件操作
 * storageService.setObject('userProfile', { name: 'Alice', role: 'student' });
 * const profile = storageService.getObject('userProfile');
 * 
 * // 批量操作
 * storageService.setMultiple({ userId: 123, role: 'teacher', class: 'A1' });
 * const data = storageService.getMultiple(['userId', 'role']); // { userId: 123, role: 'teacher' }
 * ```
 */

class StorageService {
  constructor() {
    this.storage = this._getStorage();
    this.isAvailable = this.storage !== null;
    
    // 敏感資料 key (不會在日誌中顯示完整內容)
    this.sensitiveKeys = ['accessToken', 'refreshToken', 'password', 'token'];
  }

  /**
   * 檢測並獲取可用的 storage (降級策略)
   * @private
   */
  _getStorage() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return localStorage;
    } catch (e) {
      console.warn('⚠️ localStorage 不可用，使用記憶體儲存降級', e);
      // 降級到記憶體儲存
      return this._createMemoryStorage();
    }
  }

  /**
   * 記憶體儲存降級方案 (當 localStorage 被禁用時)
   * @private
   */
  _createMemoryStorage() {
    const store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = String(value); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      get length() { return Object.keys(store).length; },
      key: (index) => Object.keys(store)[index] || null
    };
  }

  /**
   * 檢查 key 是否為敏感資料
   * @private
   */
  _isSensitiveKey(key) {
    return this.sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()));
  }

  /**
   * 安全日誌 (遮蔽敏感資料)
   * @private
   */
  _safeLog(level, message, key, value) {
    if (this._isSensitiveKey(key)) {
      console[level](`${message} [${key}]: ***REDACTED***`);
    } else {
      console[level](`${message} [${key}]:`, value);
    }
  }

  /**
   * 儲存原始字串
   * @param {string} key - 儲存鍵
   * @param {string|number|boolean} value - 要儲存的值
   * @returns {boolean} 是否成功
   */
  set(key, value) {
    if (!this.isAvailable) {
      console.warn('⚠️ Storage 不可用');
      return false;
    }

    try {
      this.storage.setItem(key, String(value));
      return true;
    } catch (error) {
      console.error('❌ Storage.set 失敗:', error);
      // QuotaExceededError 處理
      if (error.name === 'QuotaExceededError') {
        console.warn('💾 Storage 空間不足，嘗試清理...');
        this._cleanupOldData();
      }
      return false;
    }
  }

  /**
   * 獲取原始字串
   * @param {string} key - 儲存鍵
   * @param {any} defaultValue - 預設值
   * @returns {string|any} 儲存的值或預設值
   */
  get(key, defaultValue = null) {
    if (!this.isAvailable) return defaultValue;

    try {
      const value = this.storage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error('❌ Storage.get 失敗:', error);
      return defaultValue;
    }
  }

  /**
   * 儲存物件 (自動 JSON 序列化)
   * @param {string} key - 儲存鍵
   * @param {object} value - 要儲存的物件
   * @returns {boolean} 是否成功
   */
  setObject(key, value) {
    try {
      const json = JSON.stringify(value);
      return this.set(key, json);
    } catch (error) {
      console.error('❌ Storage.setObject 序列化失敗:', error);
      return false;
    }
  }

  /**
   * 獲取物件 (自動 JSON 反序列化)
   * @param {string} key - 儲存鍵
   * @param {object} defaultValue - 預設值
   * @returns {object|any} 反序列化的物件或預設值
   */
  getObject(key, defaultValue = null) {
    const raw = this.get(key);
    if (raw === null) return defaultValue;

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error(`❌ Storage.getObject 反序列化失敗 [${key}]:`, error);
      return defaultValue;
    }
  }

  /**
   * 獲取數字類型
   * @param {string} key - 儲存鍵
   * @param {number} defaultValue - 預設值
   * @returns {number} 數字或預設值
   */
  getNumber(key, defaultValue = 0) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 獲取整數類型
   * @param {string} key - 儲存鍵
   * @param {number} defaultValue - 預設值
   * @returns {number} 整數或預設值
   */
  getInt(key, defaultValue = 0) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 獲取布林類型
   * @param {string} key - 儲存鍵
   * @param {boolean} defaultValue - 預設值
   * @returns {boolean} 布林值或預設值
   */
  getBoolean(key, defaultValue = false) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    
    return value === 'true' || value === '1';
  }

  /**
   * 刪除單個項目
   * @param {string} key - 儲存鍵
   * @returns {boolean} 是否成功
   */
  remove(key) {
    if (!this.isAvailable) return false;

    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('❌ Storage.remove 失敗:', error);
      return false;
    }
  }

  /**
   * 批量設定
   * @param {object} items - key-value 對象
   * @returns {boolean} 是否全部成功
   */
  setMultiple(items) {
    if (!items || typeof items !== 'object') return false;

    let success = true;
    Object.entries(items).forEach(([key, value]) => {
      if (typeof value === 'object') {
        success = this.setObject(key, value) && success;
      } else {
        success = this.set(key, value) && success;
      }
    });

    return success;
  }

  /**
   * 批量獲取
   * @param {string[]} keys - 鍵陣列
   * @returns {object} key-value 對象
   */
  getMultiple(keys) {
    if (!Array.isArray(keys)) return {};

    const result = {};
    keys.forEach(key => {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * 批量刪除
   * @param {string[]} keys - 鍵陣列
   * @returns {boolean} 是否全部成功
   */
  removeMultiple(keys) {
    if (!Array.isArray(keys)) return false;

    let success = true;
    keys.forEach(key => {
      success = this.remove(key) && success;
    });

    return success;
  }

  /**
   * 清空所有資料
   * @returns {boolean} 是否成功
   */
  clear() {
    if (!this.isAvailable) return false;

    try {
      this.storage.clear();
      console.info('🗑️ Storage 已清空');
      return true;
    } catch (error) {
      console.error('❌ Storage.clear 失敗:', error);
      return false;
    }
  }

  /**
   * 檢查 key 是否存在
   * @param {string} key - 儲存鍵
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * 獲取所有 key
   * @returns {string[]}
   */
  keys() {
    if (!this.isAvailable) return [];

    try {
      return Object.keys(this.storage);
    } catch (error) {
      console.error('❌ Storage.keys 失敗:', error);
      return [];
    }
  }

  /**
   * 獲取儲存項目數量
   * @returns {number}
   */
  size() {
    return this.keys().length;
  }

  /**
   * 帶命名空間的 key
   * @param {string} namespace - 命名空間
   * @param {string} key - 鍵
   * @returns {string}
   */
  _namespacedKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  /**
   * 命名空間操作 (避免 key 衝突)
   * @param {string} namespace - 命名空間
   * @returns {object} 命名空間操作物件
   */
  namespace(namespace) {
    return {
      set: (key, value) => this.set(this._namespacedKey(namespace, key), value),
      get: (key, defaultValue) => this.get(this._namespacedKey(namespace, key), defaultValue),
      setObject: (key, value) => this.setObject(this._namespacedKey(namespace, key), value),
      getObject: (key, defaultValue) => this.getObject(this._namespacedKey(namespace, key), defaultValue),
      getInt: (key, defaultValue = 0) => this.getInt(this._namespacedKey(namespace, key), defaultValue),
      getNumber: (key, defaultValue = 0) => this.getNumber(this._namespacedKey(namespace, key), defaultValue),
      getBoolean: (key, defaultValue = false) => this.getBoolean(this._namespacedKey(namespace, key), defaultValue),
      setMultiple: (items) => {
        const namespacedItems = {};
        Object.entries(items).forEach(([key, value]) => {
          namespacedItems[this._namespacedKey(namespace, key)] = value;
        });
        return this.setMultiple(namespacedItems);
      },
      getMultiple: (keys) => {
        const namespacedKeys = keys.map(k => this._namespacedKey(namespace, k));
        const results = this.getMultiple(namespacedKeys);
        // 移除命名空間前綴
        const cleaned = {};
        Object.entries(results).forEach(([key, value]) => {
          const cleanKey = key.replace(`${namespace}:`, '');
          cleaned[cleanKey] = value;
        });
        return cleaned;
      },
      has: (key) => this.has(this._namespacedKey(namespace, key)),
      remove: (key) => this.remove(this._namespacedKey(namespace, key)),
      clear: () => {
        const prefix = `${namespace}:`;
        this.keys()
          .filter(k => k.startsWith(prefix))
          .forEach(k => this.remove(k));
      }
    };
  }

  /**
   * 清理舊資料 (當空間不足時)
   * @private
   */
  _cleanupOldData() {
    // 優先清理可能過期的資料
    const cleanupTargets = [
      'cache:', 'temp:', 'old_', 'backup_'
    ];

    const keys = this.keys();
    let cleaned = 0;

    keys.forEach(key => {
      if (cleanupTargets.some(prefix => key.startsWith(prefix))) {
        this.remove(key);
        cleaned++;
      }
    });

    console.info(`🧹 清理了 ${cleaned} 個舊資料項目`);
  }

  /**
   * 匯出所有資料 (用於備份)
   * @returns {object}
   */
  export() {
    const data = {};
    this.keys().forEach(key => {
      data[key] = this.get(key);
    });
    return data;
  }

  /**
   * 匯入資料 (用於還原)
   * @param {object} data - 資料物件
   * @param {boolean} clearFirst - 是否先清空
   * @returns {boolean}
   */
  import(data, clearFirst = false) {
    if (!data || typeof data !== 'object') return false;

    if (clearFirst) {
      this.clear();
    }

    return this.setMultiple(data);
  }

  /**
   * 獲取使用統計
   * @returns {object}
   */
  getStats() {
    const keys = this.keys();
    let totalSize = 0;

    keys.forEach(key => {
      const value = this.get(key) || '';
      totalSize += key.length + value.length;
    });

    return {
      itemCount: keys.length,
      estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
      estimatedQuota: '5-10 MB (browser dependent)',
      usage: `${((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2)}%`
    };
  }
}

// 單例模式
const storageService = new StorageService();

// 便捷的命名空間別名
export const authStorage = storageService.namespace('auth');
export const userStorage = storageService.namespace('user');
export const projectStorage = storageService.namespace('project');
export const stageStorage = storageService.namespace('stage');
export const consentStorage = storageService.namespace('consent'); // Phase 6: 隱私合規

export default storageService;
