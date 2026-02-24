/**
 * Discussion Analyzer (Phase 2 - Orchestrator Component)
 * 
 * Linus 式設計哲學：
 * "Talk is cheap. Show me the data."
 * 
 * 職責：分析討論品質，計算三個核心指標
 * - Depth (深度): 平均內容長度，判斷討論是否深入
 * - Diversity (多樣性): 參與者數量，判斷觀點是否多元
 * - Convergence (收斂度): 關鍵詞重複率，判斷是否過度一致
 * 
 * 實用主義原則：
 * - 不做 NLP 模型（過度設計）
 * - 用簡單統計指標（足夠有效）
 * - 可調整門檻值（適應不同情境）
 */

/**
 * 分析結果結構
 * @typedef {Object} AnalysisResult
 * @property {number} depth - 深度分數 (0-100)
 * @property {number} diversity - 多樣性分數 (0-100)
 * @property {number} convergence - 收斂度分數 (0-100)
 * @property {Object} raw - 原始統計數據
 * @property {string} summary - 文字摘要
 */

/**
 * 提取關鍵詞（簡單版本）
 * 
 * Linus: "不要過度設計。中文分詞？那是下個版本的事。"
 * 策略：提取 2-4 字的常見詞彙
 */
function extractKeywords(text) {
    if (!text) return [];
    
    // 移除標點符號和空白
    const cleaned = text.replace(/[,。、;!?!?,.;::\s]/g, '');
    
    // 提取 2-4 字詞
    const keywords = [];
    for (let len = 2; len <= 4; len++) {
        for (let i = 0; i <= cleaned.length - len; i++) {
            const word = cleaned.substr(i, len);
            // 過濾太常見的詞（停用詞）
            if (!isStopWord(word)) {
                keywords.push(word);
            }
        }
    }
    
    return keywords;
}

/**
 * 簡單的停用詞過濾
 */
function isStopWord(word) {
    const stopWords = ['我們', '這個', '那個', '可以', '應該', '因為', '所以', '如果', '但是', '然後', '還是', '不是'];
    return stopWords.includes(word);
}

/**
 * 計算關鍵詞重複率（收斂度指標）
 */
function calculateKeywordRepetition(nodes) {
    if (nodes.length === 0) return 0;
    
    const keywordCounts = new Map();
    let totalKeywords = 0;
    
    // 統計所有關鍵詞出現次數
    nodes.forEach(node => {
        const keywords = extractKeywords(node.content);
        keywords.forEach(kw => {
            keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
            totalKeywords++;
        });
    });
    
    if (totalKeywords === 0) return 0;
    
    // 計算重複率：前 10 個高頻詞佔總詞量的比例
    const topKeywords = Array.from(keywordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const topKeywordCount = topKeywords.reduce((sum, [_, count]) => sum + count, 0);
    return (topKeywordCount / totalKeywords) * 100;
}

/**
 * 分析討論品質
 * 
 * @param {Array} nodes - 節點陣列，每個節點至少包含 {content, owner}
 * @returns {AnalysisResult}
 */
function analyzeDiscussion(nodes) {
    if (!nodes || nodes.length === 0) {
        return {
            depth: 0,
            diversity: 0,
            convergence: 0,
            raw: { nodeCount: 0, avgLength: 0, uniqueAuthors: 0, repetitionRate: 0 },
            summary: '無討論內容'
        };
    }

    // ========================================================================
    // 指標 1: Depth (深度) - 平均內容長度
    // ========================================================================
    const totalLength = nodes.reduce((sum, node) => sum + (node.content?.length || 0), 0);
    const avgLength = totalLength / nodes.length;
    
    // 深度評分邏輯（Linus: 調整門檻以適應中文，平均 100 字是合理的深度討論）
    let depthScore = 0;
    if (avgLength >= 150) depthScore = 100;      // 深度討論
    else if (avgLength >= 80) depthScore = 70;   // 中等深度
    else if (avgLength >= 30) depthScore = 40;   // 淺層討論
    else depthScore = 20;                        // 非常簡短

    // ========================================================================
    // 指標 2: Diversity (多樣性) - 獨特作者數
    // ========================================================================
    const uniqueAuthors = new Set(nodes.map(n => n.owner).filter(Boolean)).size;
    
    // 多樣性評分邏輯
    let diversityScore = 0;
    if (uniqueAuthors >= 5) diversityScore = 100;      // 高度多元
    else if (uniqueAuthors >= 3) diversityScore = 70;  // 中等多元
    else if (uniqueAuthors === 2) diversityScore = 40; // 雙人討論
    else diversityScore = 20;                          // 單一作者

    // ========================================================================
    // 指標 3: Convergence (收斂度) - 關鍵詞重複率
    // ========================================================================
    const repetitionRate = calculateKeywordRepetition(nodes);
    
    // 收斂度評分：重複率越高 = 越收斂（可能是同溫層）
    let convergenceScore = 0;
    if (repetitionRate >= 50) convergenceScore = 100;      // 高度收斂（同溫層風險）
    else if (repetitionRate >= 30) convergenceScore = 70;  // 中度收斂
    else if (repetitionRate >= 15) convergenceScore = 40;  // 輕度收斂
    else convergenceScore = 20;                            // 觀點分散

    // ========================================================================
    // 產生摘要
    // ========================================================================
    const summary = `${nodes.length}篇貼文，${uniqueAuthors}位作者，平均長度${Math.round(avgLength)}字`;

    return {
        depth: depthScore,
        diversity: diversityScore,
        convergence: convergenceScore,
        raw: {
            nodeCount: nodes.length,
            avgLength: Math.round(avgLength),
            uniqueAuthors,
            repetitionRate: Math.round(repetitionRate)
        },
        summary
    };
}

/**
 * 判斷討論品質等級
 * 
 * @param {AnalysisResult} analysis
 * @returns {string} - 'SHALLOW' | 'ECHO_CHAMBER' | 'OVERLOAD' | 'HEALTHY'
 */
function classifyDiscussion(analysis) {
    // 情境 1: 淺層討論（深度不足 + 貼文數量足夠）
    if (analysis.depth < 40 && analysis.raw.nodeCount >= 3) {
        return 'SHALLOW';
    }
    
    // 情境 2: 同溫層（多樣性不足 + 高度收斂）
    if (analysis.diversity <= 40 && analysis.convergence >= 40) {
        return 'ECHO_CHAMBER';
    }
    
    // 情境 3: 資訊過載（貼文太多但未整合 + 觀點分散）
    if (analysis.raw.nodeCount >= 10 && analysis.convergence < 30) {
        return 'OVERLOAD';
    }
    
    // 情境 4: 健康討論
    return 'HEALTHY';
}

module.exports = {
    analyzeDiscussion,
    classifyDiscussion,
    // 匯出供測試使用
    extractKeywords,
    calculateKeywordRepetition
};
