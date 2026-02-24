/**
 * Cooldown Manager (Phase 2 - Orchestrator Component)
 * 
 * Linus 式設計原則：
 * 1. 用最簡單的資料結構：Map<ideaWallId, InterventionState>
 * 2. 不做過度設計：先用記憶體，真有需要再上 Redis
 * 3. 清晰的職責：只管「能不能介入」，不管「介入什麼」
 * 
 * 冷卻規則：
 * - 時間維度：同一討論串 AI 介入後需等待 COOLDOWN_MINUTES 分鐘
 * - 活動維度：或者至少新增 MIN_NEW_POSTS 篇貼文
 * - 目的：避免 AI 洗版，保持適當的介入頻率
 */

// ============================================================================
// 配置參數 (可調整)
// ============================================================================
const COOLDOWN_MINUTES = 20;        // 冷卻時間（分鐘）
const MIN_NEW_POSTS = 3;            // 最少新增貼文數才能再次介入
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 每小時清理過期記錄

/**
 * 介入狀態結構
 * @typedef {Object} InterventionState
 * @property {Date} lastInterventionTime - 最後一次介入時間
 * @property {number} postCountAtIntervention - 介入時的貼文總數
 */

/**
 * CooldownManager Class
 * 
 * 職責：
 * 1. 記錄每個討論串的最後介入時間
 * 2. 判斷是否允許再次介入
 * 3. 定期清理過期記錄（避免記憶體洩漏）
 */
class CooldownManager {
    constructor() {
        // 核心資料結構：Map<ideaWallId, InterventionState>
        this.interventions = new Map();
        
        // 清理計時器 ID（用於測試環境手動停止）
        this.cleanupTimer = null;
        
        // 只在生產環境啟動定期清理
        // Linus: "測試腳本不需要背景任務，別綁架進程！"
        if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CLEANUP === 'true') {
            this.startCleanup();
        }
        
        console.log(`✅ CooldownManager initialized (Cooldown: ${COOLDOWN_MINUTES}min, Min Posts: ${MIN_NEW_POSTS})`);
    }

    /**
     * 檢查是否允許介入
     * 
     * @param {number} ideaWallId - 討論串 ID
     * @param {number} currentPostCount - 當前貼文總數
     * @returns {boolean} - true = 可以介入, false = 仍在冷卻中
     */
    canIntervene(ideaWallId, currentPostCount) {
        const state = this.interventions.get(ideaWallId);
        
        // 情況 1: 從未介入過，放行
        if (!state) {
            return true;
        }

        const now = new Date();
        const timeSinceLastIntervention = (now - state.lastInterventionTime) / 1000 / 60; // 分鐘
        const newPostsSinceIntervention = currentPostCount - state.postCountAtIntervention;

        // 情況 2: 時間冷卻已過
        if (timeSinceLastIntervention >= COOLDOWN_MINUTES) {
            return true;
        }

        // 情況 3: 新增貼文數達標（即使時間未到，也允許介入）
        if (newPostsSinceIntervention >= MIN_NEW_POSTS) {
            return true;
        }

        // 仍在冷卻中
        return false;
    }

    /**
     * 記錄一次介入
     * 
     * @param {number} ideaWallId - 討論串 ID
     * @param {number} currentPostCount - 當前貼文總數
     */
    recordIntervention(ideaWallId, currentPostCount) {
        this.interventions.set(ideaWallId, {
            lastInterventionTime: new Date(),
            postCountAtIntervention: currentPostCount
        });
    }

    /**
     * 取得當前冷卻狀態（Debug 用）
     * 
     * @param {number} ideaWallId - 討論串 ID
     * @returns {Object|null}
     */
    getStatus(ideaWallId) {
        const state = this.interventions.get(ideaWallId);
        if (!state) return null;

        const now = new Date();
        const minutesSince = (now - state.lastInterventionTime) / 1000 / 60;
        
        return {
            lastIntervention: state.lastInterventionTime.toISOString(),
            minutesSince: Math.round(minutesSince),
            postCountAtIntervention: state.postCountAtIntervention,
            cooldownRemaining: Math.max(0, COOLDOWN_MINUTES - minutesSince)
        };
    }

    /**
     * 清理過期記錄
     * 
     * Linus 原則：避免記憶體洩漏，但不要過度清理
     * 策略：清除超過 24 小時未活動的記錄
     */
    cleanup() {
        const now = new Date();
        const expirationTime = 24 * 60 * 60 * 1000; // 24 小時
        let cleaned = 0;

        for (const [ideaWallId, state] of this.interventions.entries()) {
            const age = now - state.lastInterventionTime;
            if (age > expirationTime) {
                this.interventions.delete(ideaWallId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 CooldownManager: Cleaned ${cleaned} expired records. Active: ${this.interventions.size}`);
        }
    }

    /**
     * 啟動定期清理任務
     */
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, CLEANUP_INTERVAL);
        
        // 允許 Node.js 在沒有其他任務時退出（測試環境必要）
        // Linus: "讓進程能正常退出，這是基本常識"
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * 停止定期清理（測試/關機時使用）
     */
    stopCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * 重置特定討論串的冷卻（管理員功能）
     * 
     * @param {number} ideaWallId
     */
    reset(ideaWallId) {
        this.interventions.delete(ideaWallId);
    }

    /**
     * 取得統計資訊
     */
    getStats() {
        return {
            totalTracked: this.interventions.size,
            config: {
                cooldownMinutes: COOLDOWN_MINUTES,
                minNewPosts: MIN_NEW_POSTS
            },
            cleanupEnabled: this.cleanupTimer !== null
        };
    }
}

// 單例模式：全域共享一個 CooldownManager 實例
let instance = null;

module.exports = {
    /**
     * 取得 CooldownManager 單例
     */
    getCooldownManager: () => {
        if (!instance) {
            instance = new CooldownManager();
        }
        return instance;
    },
    
    // 匯出常數供測試使用
    COOLDOWN_MINUTES,
    MIN_NEW_POSTS
};
