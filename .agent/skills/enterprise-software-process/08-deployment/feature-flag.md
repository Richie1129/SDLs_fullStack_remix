---
description: Feature Flag 功能開關標準流程與最佳實踐
---

# Feature Flag 功能開關

## 概述

此 skill 提供 Feature Flag 使用指引，實現漸進式發布、A/B 測試、快速回滾。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 開發工程師、產品經理 |
| **協作角色** | QA、DevOps |

---

## 1. Feature Flag 類型

| 類型 | 用途 | 生命週期 |
|------|------|---------|
| **Release Flag** | 隱藏未完成功能 | 短期 |
| **Experiment Flag** | A/B 測試 | 中期 |
| **Ops Flag** | 系統開關 | 長期 |
| **Permission Flag** | 權限控制 | 永久 |

---

## 2. 命名規範

```
[type]_[feature]_[variant]

範例：
release_new_checkout
experiment_pricing_v2
ops_maintenance_mode
permission_beta_access
```

---

## 3. 實作方式

### 基本實作

```typescript
// lib/feature-flags.ts
interface FeatureFlags {
  new_checkout: boolean;
  pricing_v2: 'control' | 'variant_a' | 'variant_b';
  maintenance_mode: boolean;
}

class FeatureFlagService {
  private flags: Map<string, any> = new Map();

  async loadFlags(userId?: string) {
    // 從遠端載入 flags
    const response = await fetch('/api/flags', {
      headers: { 'X-User-Id': userId || '' },
    });
    const data = await response.json();
    this.flags = new Map(Object.entries(data));
  }

  isEnabled(flag: string): boolean {
    return this.flags.get(flag) === true;
  }

  getVariant(flag: string): string {
    return this.flags.get(flag) || 'control';
  }
}

export const featureFlags = new FeatureFlagService();
```

### React 使用

```tsx
// hooks/useFeatureFlag.ts
export function useFeatureFlag(flag: string) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(featureFlags.isEnabled(flag));
  }, [flag]);

  return enabled;
}

// 元件使用
function CheckoutPage() {
  const newCheckout = useFeatureFlag('new_checkout');

  return newCheckout ? <NewCheckout /> : <LegacyCheckout />;
}
```

### 後端使用

```typescript
// 中介軟體
function featureFlagMiddleware(flag: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const enabled = await featureFlags.isEnabled(flag, req.user?.id);
    if (!enabled) {
      return res.status(404).json({ error: 'Not found' });
    }
    next();
  };
}

// 路由使用
app.post('/api/v2/checkout', 
  featureFlagMiddleware('new_checkout'),
  checkoutController
);
```

---

## 4. 漸進式發布

```
┌──────────────────────────────────────────┐
│              發布策略                      │
├──────────────────────────────────────────┤
│  1%  → 5% → 20% → 50% → 100%             │
└──────────────────────────────────────────┘
```

| 階段 | 百分比 | 目標群組 |
|------|--------|---------|
| 1 | 1% | 內部用戶 |
| 2 | 5% | Beta 用戶 |
| 3 | 20% | 早期採用者 |
| 4 | 50% | 一般用戶 |
| 5 | 100% | 全部用戶 |

---

## 5. 管理平台

### 常用服務

| 服務 | 特點 |
|------|------|
| **LaunchDarkly** | 企業級、完整功能 |
| **Flagsmith** | 開源可自架 |
| **ConfigCat** | 簡單易用 |
| **Unleash** | 開源、自架 |

### 自建 Admin UI

```typescript
// API 端點
app.get('/admin/flags', listFlags);
app.put('/admin/flags/:id', updateFlag);

// 資料結構
interface Flag {
  id: string;
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. 清理策略

```markdown
## Flag 生命週期

1. **創建**: 開發時建立 flag
2. **發布**: 漸進式開啟
3. **完成**: 100% 開啟，觀察 1-2 週
4. **清理**: 移除 flag 程式碼

## 清理檢查清單
- [ ] Flag 已 100% 開啟超過 2 週
- [ ] 無相關錯誤報告
- [ ] 移除所有 flag 相關程式碼
- [ ] 刪除 flag 設定
```

---

## 檢查清單

- [ ] 命名符合規範
- [ ] 有預設值（fallback）
- [ ] 監控 flag 狀態
- [ ] 定期清理過期 flag

---

## 相關 Skills

- [release-plan.md](./release-plan.md) - 發布計畫
- [rollback-plan.md](./rollback-plan.md) - 回滾計畫
