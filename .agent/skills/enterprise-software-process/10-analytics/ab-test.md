---
description: A/B 測試（A/B Test）標準流程與最佳實踐
---

# A/B Test A/B 測試

## 概述

此 skill 提供 A/B 測試設計與執行指引，透過實驗驅動產品決策。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 產品經理、數據分析師 |
| **實作者** | 開發工程師 |

---

## 1. A/B 測試流程

```
假設 → 設計 → 實作 → 執行 → 分析 → 決策
```

---

## 2. 實驗設計

### 實驗文件模板

```markdown
# 實驗：[實驗名稱]

## 假設
因為 [觀察]，
我們相信 [改變]，
將會導致 [結果]。
我們會透過 [指標] 來衡量。

## 主要指標
- **Primary**: 轉換率
- **Secondary**: 客單價、跳出率

## 實驗組別
| 組別 | 說明 | 流量 |
|------|------|------|
| Control | 現有版本 | 50% |
| Variant A | 新按鈕顏色 | 50% |

## 樣本量計算
- 預期效果: +5% 轉換率
- 統計顯著性: 95%
- 統計檢定力: 80%
- 所需樣本: 10,000 / 組

## 實驗時長
預估 14 天

## 排除條件
- 新用戶限定
- 排除內部用戶
```

---

## 3. 樣本量計算

```python
from statsmodels.stats.power import TTestIndPower

# 參數
effect_size = 0.05  # 預期效果
alpha = 0.05        # 顯著水準
power = 0.80        # 統計檢定力

# 計算
analysis = TTestIndPower()
sample_size = analysis.solve_power(
    effect_size=effect_size,
    alpha=alpha,
    power=power,
    ratio=1,
    alternative='two-sided'
)

print(f"每組所需樣本: {int(sample_size)}")
```

---

## 4. 實作範例

```typescript
// 實驗分流
function getExperimentVariant(userId: string, experimentId: string) {
  const hash = hashCode(`${userId}:${experimentId}`);
  const bucket = hash % 100;
  
  // 根據設定分流
  const config = getExperimentConfig(experimentId);
  let cumulative = 0;
  
  for (const variant of config.variants) {
    cumulative += variant.percentage;
    if (bucket < cumulative) {
      return variant.name;
    }
  }
  
  return 'control';
}

// 使用
const variant = getExperimentVariant(userId, 'checkout_button_exp');

if (variant === 'variant_a') {
  renderNewButton();
} else {
  renderDefaultButton();
}

// 記錄曝光
track('experiment_exposure', {
  experiment_id: 'checkout_button_exp',
  variant: variant,
});
```

---

## 5. 結果分析

### 統計顯著性檢驗

```python
from scipy import stats

# 假設數據
control_conversions = 500
control_visitors = 10000
variant_conversions = 550
variant_visitors = 10000

# Chi-square test
data = [[control_conversions, control_visitors - control_conversions],
        [variant_conversions, variant_visitors - variant_conversions]]
        
chi2, p_value, dof, expected = stats.chi2_contingency(data)

print(f"P-value: {p_value}")
print(f"顯著: {'是' if p_value < 0.05 else '否'}")
```

### 結果判讀

| P-value | 判定 |
|---------|------|
| < 0.01 | 非常顯著 |
| < 0.05 | 顯著 |
| < 0.10 | 邊緣顯著 |
| ≥ 0.10 | 不顯著 |

---

## 6. 常見陷阱

| 陷阱 | 避免方法 |
|------|---------|
| 過早停止 | 堅持預定樣本量 |
| 多重比較 | 調整顯著水準 |
| 選擇偏誤 | 隨機分流 |
| 新奇效應 | 延長實驗時間 |

---

## 7. 決策與收尾

### 決策框架

| 結果 | 行動 |
|------|------|
| 實驗組明顯勝出 | 全面上線 |
| 無顯著差異 | 維持現狀或延長實驗 |
| 控制組勝出 | 不採用變更 |

### 實驗報告

```markdown
# 實驗報告：結帳按鈕顏色

## 結果摘要
- 實驗組轉換率: 5.5% (+10%)
- P-value: 0.023 (顯著)
- 置信區間: [+3%, +17%]

## 結論
建議全面上線新按鈕顏色。

## 後續追蹤
- 上線後 7 日持續監控
```

---

## 檢查清單

- [ ] 假設明確
- [ ] 樣本量足夠
- [ ] 分流正確
- [ ] 追蹤埋點完整
- [ ] 避免過早停止

---

## 相關 Skills

- [metrics-definition.md](./metrics-definition.md) - 指標定義
- [tracking-plan.md](./tracking-plan.md) - 埋點計畫
