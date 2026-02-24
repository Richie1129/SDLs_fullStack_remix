---
description: 環境配置（Environment Config）標準流程與最佳實踐
---

# Environment Config 環境配置

## 概述

此 skill 提供多環境配置管理指引，確保各環境的配置安全、一致且可追蹤。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | DevOps 工程師 |
| **協作角色** | 開發工程師、安全工程師 |

---

## 1. 環境分類

| 環境 | 用途 | 資料 |
|------|------|------|
| **Development** | 本地開發 | 假資料 |
| **Test/QA** | 自動化測試 | 測試資料 |
| **Staging** | 預發布驗證 | 脫敏資料 |
| **Production** | 正式營運 | 真實資料 |

---

## 2. 環境變數管理

### 分類原則

| 類型 | 範例 | 儲存方式 |
|------|------|---------|
| **公開配置** | PORT, LOG_LEVEL | 版控 (.env.example) |
| **敏感機密** | API_KEY, DB_PASSWORD | Secret Manager |
| **環境特定** | DATABASE_URL | 環境變數 |

### 命名規範

```bash
# 格式：[CATEGORY]_[NAME]
DATABASE_URL=postgresql://...
REDIS_HOST=redis.example.com
JWT_SECRET=xxx

# API Keys
STRIPE_API_KEY=sk_live_...
SENDGRID_API_KEY=SG...

# Feature Flags
FF_NEW_CHECKOUT=true
```

---

## 3. Secret 管理

### AWS Secrets Manager

```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string) {
  const client = new SecretsManager({ region: 'ap-northeast-1' });
  const response = await client.getSecretValue({ SecretId: secretName });
  return JSON.parse(response.SecretString!);
}

// 使用
const dbCredentials = await getSecret('prod/database');
```

### HashiCorp Vault

```bash
# 寫入 secret
vault kv put secret/myapp/database username="admin" password="xxx"

# 讀取
vault kv get -format=json secret/myapp/database
```

---

## 4. 配置檔案結構

```
config/
├── default.ts          # 預設值
├── development.ts      # 開發環境
├── staging.ts          # 預發布
├── production.ts       # 正式環境
└── index.ts            # 導出配置
```

```typescript
// config/index.ts
import { z } from 'zod';

const configSchema = z.object({
  env: z.enum(['development', 'staging', 'production']),
  port: z.coerce.number().default(3000),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().default(10),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number().default(6379),
  }),
});

export const config = configSchema.parse({
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  database: {
    url: process.env.DATABASE_URL,
    poolSize: process.env.DB_POOL_SIZE,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});
```

---

## 5. Kubernetes ConfigMap & Secret

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: "info"
  API_TIMEOUT: "30000"

---
# secret.yaml (值需 base64 編碼)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DATABASE_URL: cG9zdGdyZXNxbDovLy4uLg==
  JWT_SECRET: c2VjcmV0LWtleQ==
```

```yaml
# deployment.yaml
spec:
  containers:
    - name: app
      envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

---

## 6. 環境差異比較

| 項目 | Dev | Staging | Prod |
|------|-----|---------|------|
| 資料庫 | 本地/Docker | RDS (small) | RDS (large) |
| Redis | Docker | ElastiCache (small) | ElastiCache (cluster) |
| Log Level | debug | info | warn |
| Debug 工具 | 啟用 | 啟用 | 停用 |
| SSL | 選用 | 必須 | 必須 |

---

## 7. 驗證檢查

```bash
#!/bin/bash
# scripts/validate-env.sh

required_vars=(
  "DATABASE_URL"
  "REDIS_URL"
  "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required: $var"
    exit 1
  fi
done

echo "✅ All required env vars are set"
```

---

## 檢查清單

- [ ] 敏感資訊不進版控
- [ ] 使用 Secret Manager
- [ ] 各環境配置獨立
- [ ] 配置有型別驗證
- [ ] 啟動時驗證必要配置

---

## 相關 Skills

- [cicd-pipeline.md](./cicd-pipeline.md) - CI/CD Pipeline
- [../05-development/dev-environment-setup.md](../05-development/dev-environment-setup.md) - 開發環境設定
