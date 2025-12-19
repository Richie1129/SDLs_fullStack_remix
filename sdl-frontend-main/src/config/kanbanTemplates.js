export const PHASE_TEMPLATES = {
  "GOAL_SETTING": {
    label: "定標",
    columns: [
      { 
        title: "🎯 靈感池", 
        isSystem: true, 
        defaultCards: [
          { title: "範例：我想研究校園植物", type: "example" }
        ]
      },
      { title: "🔍 篩選區", isSystem: true },
      { title: "🏆 最終目標", isSystem: true },
      { 
        title: "📏 成功標準", 
        isSystem: true,
        defaultCards: [
          { title: "範例：能成功辨識 5 種植物", type: "example" }
        ]
      }
    ],
    cardPlaceholder: "寫下一個具體的目標..." 
  },
  "STRATEGY": {
    label: "擇策",
    columns: [
      { title: "📚 資源盤點", isSystem: true },
      { title: "🚧 潛在困難", isSystem: true },
      { title: "🆘 求助策略", isSystem: true },
      { title: "📅 行動計畫", isSystem: true }
    ],
    cardPlaceholder: "新增一個策略或資源..."
  },
  "MONITORING": {
    label: "監評",
    columns: [
      { title: "📋 待辦清單", type: "todo" },
      { title: "🔥 進行中", type: "doing", limit: 3 },
      { title: "⛔ 卡關中", type: "blocked" },
      { title: "✅ 已完成", type: "done" }
    ],
    cardPlaceholder: "新增待辦事項..."
  },
  "REGULATION": {
    label: "調節",
    columns: [
      { title: "👍 做得好的", isSystem: true },
      { title: "👎 需要改進的", isSystem: true },
      { title: "💡 下次調整", isSystem: true },
      { title: "📝 結案報告", isSystem: true }
    ],
    cardPlaceholder: "寫下反思..."
  }
};

export const PHASES = Object.keys(PHASE_TEMPLATES);
