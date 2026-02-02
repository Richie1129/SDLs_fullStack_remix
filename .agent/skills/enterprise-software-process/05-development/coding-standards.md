---
description: 制定程式碼規範，包含命名、格式化、註解和最佳實踐
---

# 程式碼規範 (Coding Standards)

## 概述
此 skill 協助制定和實施統一的程式碼規範，涵蓋命名慣例、程式碼格式化、註解標準、程式碼組織、錯誤處理、測試要求等，確保團隊程式碼品質一致、可讀性高、易於維護。

## 適用角色
- **主要負責**: 技術主管、資深工程師
- **協作角色**: 全體開發團隊

## 輸入需求
使用者需要提供：
- 團隊使用的程式語言和框架
- 現有程式碼風格（如有）
- 團隊規模和經驗水平
- 專案類型（前端、後端、全端）
- 自動化工具偏好

範例：`請幫我制定 [語言/框架] 的程式碼規範，團隊有 [人數] 人`

## 執行步驟

### 步驟 1: 選擇基礎風格指南
- 評估業界標準風格指南
- 根據團隊技術棧選擇適合的指南
- 決定是否需要自訂規則

### 步驟 2: 定義命名慣例
- 變數、函式、類別命名規則
- 檔案和目錄命名規則
- 常數和列舉命名規則
- 建立命名詞彙表

### 步驟 3: 制定格式化規則
- 縮排（空格或 Tab）
- 行寬限制
- 空行使用規則
- 括號和分號規則

### 步驟 4: 定義註解標準
- 何時需要註解
- 註解格式和風格
- 文件註解（JSDoc、docstring）
- TODO/FIXME 標記規則

### 步驟 5: 建立程式碼組織規則
- 檔案結構
- Import/Export 順序
- 函式長度限制
- 複雜度控制

### 步驟 6: 設定自動化工具
- Linter 配置（ESLint、Pylint）
- Formatter 配置（Prettier、Black）
- Pre-commit hooks
- CI/CD 整合

## 輸出模板

```markdown
# 程式碼規範文件

**專案名稱**: [專案名稱]  
**版本**: 1.0  
**適用語言**: [JavaScript/TypeScript/Python/Java...]  
**文件日期**: YYYY-MM-DD  
**負責人**: [技術主管姓名]  
**狀態**: 草稿 / 已核准

---

## 目錄

1. [概述](#1-概述)
2. [通用原則](#2-通用原則)
3. [命名慣例](#3-命名慣例)
4. [程式碼格式化](#4-程式碼格式化)
5. [註解與文件](#5-註解與文件)
6. [程式碼組織](#6-程式碼組織)
7. [錯誤處理](#7-錯誤處理)
8. [最佳實踐](#8-最佳實踐)
9. [測試要求](#9-測試要求)
10. [自動化工具](#10-自動化工具)
11. [語言特定規範](#11-語言特定規範)
12. [Code Review 檢查清單](#12-code-review-檢查清單)

---

## 1. 概述

### 1.1 目的
本文件定義團隊的程式碼規範，目標是：
- 提升程式碼可讀性和一致性
- 降低維護成本
- 減少 Bug 和安全漏洞
- 促進團隊協作
- 加速新成員上手

### 1.2 適用範圍
- 所有新撰寫的程式碼
- 重構或大幅修改的舊程式碼
- 所有程式語言和框架

### 1.3 強制性
- **必須 (MUST)**: 強制遵守，違反將不通過 Code Review
- **應該 (SHOULD)**: 強烈建議，除非有充分理由
- **可以 (MAY)**: 選擇性遵守

---

## 2. 通用原則

### 2.1 可讀性優先
> "Programs must be written for people to read, and only incidentally for machines to execute." - Harold Abelson

**核心原則**:
- 程式碼應該像散文一樣易讀
- 偏好清晰勝於簡潔
- 避免過度聰明的寫法

**範例**:
```javascript
// ❌ 不好：過於簡潔難懂
const r = u.filter(x => x.a && x.r === 'a').map(x => x.n);

// ✅ 好：清晰易懂
const activeAdminUsers = users
  .filter(user => user.isActive && user.role === 'admin')
  .map(user => user.name);
```

### 2.2 一致性
- 遵循現有程式碼風格（修改舊程式碼時）
- 團隊風格優先於個人偏好
- 使用自動化工具保持一致性

### 2.3 簡單性 (KISS - Keep It Simple, Stupid)
- 選擇最簡單的解決方案
- 避免過度設計
- 避免不必要的抽象

### 2.4 不重複 (DRY - Don't Repeat Yourself)
- 提取重複邏輯為函式
- 但不要為了 DRY 而過度抽象

### 2.5 SOLID 原則（物件導向）
1. **Single Responsibility**: 單一職責
2. **Open/Closed**: 開放封閉
3. **Liskov Substitution**: 里氏替換
4. **Interface Segregation**: 介面隔離
5. **Dependency Inversion**: 依賴反轉

---

## 3. 命名慣例

### 3.1 通用規則

**清晰且具描述性**:
```javascript
// ❌ 不好：縮寫不清楚
const usrCnt = 10;

// ✅ 好：完整單字
const userCount = 10;
```

**避免誤導**:
```javascript
// ❌ 不好：accountList 實際是 Set 不是 List
const accountList = new Set();

// ✅ 好
const accountSet = new Set();
const accounts = new Set();
```

**可搜尋的名稱**:
```javascript
// ❌ 不好：魔術數字
setTimeout(handler, 86400000);

// ✅ 好：命名常數
const MILLISECONDS_PER_DAY = 86400000;
setTimeout(handler, MILLISECONDS_PER_DAY);
```

### 3.2 JavaScript/TypeScript 命名規則

#### 變數和函式 - camelCase
```javascript
const userName = 'Alice';
let itemCount = 0;

function calculateTotal() { }
function getUserById(id) { }
```

#### 類別和元件 - PascalCase
```javascript
class UserService { }
class DatabaseConnection { }

// React 元件
function UserProfile() { }
function NavBar() { }
```

#### 常數 - UPPER_SNAKE_CASE
```javascript
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT = 5000;
```

#### 私有屬性 - 前綴 `_` 或使用 `#`
```javascript
class User {
  #privateField = 'secret';  // 真正的私有欄位（推薦）
  _privateMethod() { }       // 慣例私有方法
}
```

#### 布林值 - `is`, `has`, `can`, `should` 前綴
```javascript
const isValid = true;
const hasPermission = false;
const canEdit = user.role === 'admin';
const shouldUpdate = isDirty && hasChanges;
```

#### 事件處理 - `handle`, `on` 前綴
```javascript
function handleClick() { }
function onUserLogin() { }
function handleFormSubmit(event) { }
```

### 3.3 Python 命名規則

#### 變數和函式 - snake_case
```python
user_name = 'Alice'
item_count = 0

def calculate_total():
    pass

def get_user_by_id(user_id):
    pass
```

#### 類別 - PascalCase
```python
class UserService:
    pass

class DatabaseConnection:
    pass
```

#### 常數 - UPPER_SNAKE_CASE
```python
MAX_RETRY_COUNT = 3
API_BASE_URL = 'https://api.example.com'
DEFAULT_TIMEOUT = 5000
```

#### 私有屬性 - 前綴 `_`
```python
class User:
    def __init__(self):
        self._private_field = 'secret'
    
    def _private_method(self):
        pass
```

### 3.4 檔案和目錄命名

**檔案命名**:
- JavaScript/TypeScript:
  - 元件: `UserProfile.jsx`, `NavBar.tsx`
  - 服務/工具: `userService.js`, `dateUtils.js`
  - 常數: `constants.js`, `API_ENDPOINTS.js`
  
- Python:
  - 模組: `user_service.py`, `date_utils.py`
  - 測試: `test_user_service.py`

**目錄命名**:
- kebab-case 或 camelCase 一致使用
- 範例: `user-profile/`, `api-endpoints/`

---

## 4. 程式碼格式化

### 4.1 縮排

**JavaScript/TypeScript**: 2 空格
```javascript
function example() {
  if (condition) {
    doSomething();
  }
}
```

**Python**: 4 空格
```python
def example():
    if condition:
        do_something()
```

**絕不混用空格和 Tab**

### 4.2 行寬

**最大行寬**: 80-100 字元（推薦 80）

**原因**: 方便並排查看程式碼、Code Review

**例外**: 
- 長字串（URL、錯誤訊息）
- Import 語句

### 4.3 空行使用

**函式間**: 1-2 個空行
```javascript
function functionA() {
  // code
}

function functionB() {
  // code
}
```

**邏輯區塊間**: 1 個空行
```javascript
function processUser(user) {
  // 驗證
  if (!user) return null;
  
  // 處理資料
  const processed = transform(user);
  
  // 返回結果
  return processed;
}
```

**類別內**: 方法間 1 個空行
```javascript
class User {
  constructor() { }
  
  getName() { }
  
  setName(name) { }
}
```

### 4.4 括號和分號

**JavaScript**: 始終使用分號
```javascript
// ✅ 好
const user = getUser();
const name = user.name;

// ❌ 不好（雖然 JavaScript 有 ASI）
const user = getUser()
const name = user.name
```

**大括號風格**: K&R style
```javascript
// ✅ 好
if (condition) {
  doSomething();
}

// ❌ 不好
if (condition)
{
  doSomething();
}
```

**單行 if 也要括號**:
```javascript
// ✅ 好
if (condition) {
  doSomething();
}

// ❌ 不好（容易出錯）
if (condition) doSomething();
```

### 4.5 字串

**使用一致的引號**:
- JavaScript: 單引號 `'` 或樣板字串 `` ` ``
- Python: 單引號 `'`
- JSON: 雙引號 `"`

```javascript
// ✅ 好
const name = 'Alice';
const message = `Hello, ${name}!`;

// ❌ 不好：混用
const name = "Alice";
const greeting = 'Hello';
```

### 4.6 物件和陣列

**尾隨逗號**（推薦）:
```javascript
const user = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com', // 尾隨逗號
};

const numbers = [
  1,
  2,
  3, // 尾隨逗號
];
```

**優點**: Git diff 更清晰、易於增刪

---

## 5. 註解與文件

### 5.1 何時註解

**應該註解**:
- 為什麼這樣做（Why）而非做什麼（What）
- 複雜演算法的解釋
- 非顯而易見的業務邏輯
- Workaround 和已知限制
- TODO、FIXME、HACK 標記

**不應該註解**:
- 顯而易見的程式碼
- 被註解掉的程式碼（應刪除）
- 過時的註解

### 5.2 註解風格

#### 單行註解
```javascript
// 使用雙斜線，空格分隔
// 不要使用 /* */ 做單行註解

// ✅ 好：解釋 Why
// 使用 setTimeout 而非 setInterval 避免重疊執行
setTimeout(fetchData, 1000);

// ❌ 不好：重複程式碼內容
// 設定超時為 1000 毫秒
setTimeout(fetchData, 1000);
```

#### 多行註解
```javascript
/*
 * 複雜演算法說明：
 * 1. 首先做 A
 * 2. 然後做 B
 * 3. 最後做 C
 */
```

### 5.3 文件註解（JSDoc）

**函式文件**:
```javascript
/**
 * 計算兩個數字的和
 * 
 * @param {number} a - 第一個加數
 * @param {number} b - 第二個加數
 * @returns {number} 兩數之和
 * @throws {TypeError} 當參數不是數字時
 * @example
 * add(2, 3); // 返回 5
 */
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('參數必須是數字');
  }
  return a + b;
}
```

**類別文件**:
```javascript
/**
 * 表示系統用戶
 * 
 * @class
 * @property {string} name - 用戶姓名
 * @property {string} email - 用戶 Email
 */
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}
```

### 5.4 TODO 標記

```javascript
// TODO: 實作快取機制提升效能
// FIXME: 修正並發情況下的競爭條件
// HACK: 臨時解決方案，應重構
// NOTE: 重要說明
// OPTIMIZE: 效能優化點

// ✅ 好：包含負責人和時間
// TODO(alice, 2024-01-18): 實作快取機制

// TODO: 加上 issue 連結
// TODO: https://github.com/org/repo/issues/123
```

---

## 6. 程式碼組織

### 6.1 檔案結構

#### JavaScript/TypeScript 模組
```javascript
// 1. Import 外部依賴
import React from 'react';
import { useState, useEffect } from 'react';

// 2. Import 第三方套件
import axios from 'axios';
import dayjs from 'dayjs';

// 3. Import 本地模組
import UserService from '@/services/UserService';
import { formatDate } from '@/utils/dateUtils';

// 4. Import 樣式
import './UserProfile.css';

// 5. 常數定義
const MAX_RETRY = 3;
const API_URL = '/api/users';

// 6. 類型定義（TypeScript）
interface User {
  id: number;
  name: string;
}

// 7. 元件/函式定義
function UserProfile() {
  // ...
}

// 8. Export
export default UserProfile;
```

#### Python 模組
```python
"""
模組文件字串
描述此模組的用途
"""

# 1. 標準函式庫
import os
import sys
from datetime import datetime

# 2. 第三方套件
import requests
from flask import Flask

# 3. 本地模組
from .services import UserService
from .utils import format_date

# 4. 常數
MAX_RETRY = 3
API_URL = '/api/users'

# 5. 類別和函式定義
class UserProfile:
    pass

def get_user():
    pass
```

### 6.2 函式長度

**建議**: 單一函式不超過 50 行

**理由**: 超過通常表示職責過多，應拆分

**範例**:
```javascript
// ❌ 不好：函式過長且職責不清
function processUserData(user) {
  // 50+ 行程式碼混雜驗證、轉換、儲存邏輯
}

// ✅ 好：拆分為小函式
function processUserData(user) {
  validateUser(user);
  const transformed = transformUser(user);
  saveUser(transformed);
}

function validateUser(user) { /* ... */ }
function transformUser(user) { /* ... */ }
function saveUser(user) { /* ... */ }
```

### 6.3 函式參數

**建議**: 不超過 3-4 個參數

**太多參數**: 使用物件
```javascript
// ❌ 不好：參數過多
function createUser(name, email, age, address, phone, role) { }

// ✅ 好：使用物件
function createUser({ name, email, age, address, phone, role }) { }

// 使用
createUser({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  // 其他參數可選
});
```

### 6.4 巢狀深度

**建議**: 不超過 3-4 層

**過深巢狀**: 提前返回（Guard Clauses）
```javascript
// ❌ 不好：巢狀過深
function processOrder(order) {
  if (order) {
    if (order.items) {
      if (order.items.length > 0) {
        if (order.user) {
          // 處理邏輯
        }
      }
    }
  }
}

// ✅ 好：提前返回
function processOrder(order) {
  if (!order) return;
  if (!order.items || order.items.length === 0) return;
  if (!order.user) return;
  
  // 處理邏輯（只有 1 層縮排）
}
```

---

## 7. 錯誤處理

### 7.1 使用 try-catch

```javascript
// ✅ 好：完整的錯誤處理
async function fetchUser(id) {
  try {
    const response = await axios.get(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('獲取用戶失敗:', error);
    
    if (error.response?.status === 404) {
      throw new Error(`用戶 ${id} 不存在`);
    }
    
    throw new Error('伺服器錯誤，請稍後再試');
  }
}
```

### 7.2 自訂錯誤類別

```javascript
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

// 使用
if (!user) {
  throw new NotFoundError('User', userId);
}
```

### 7.3 不要忽略錯誤

```javascript
// ❌ 不好：吞掉錯誤
try {
  riskyOperation();
} catch (error) {
  // 空的 catch block
}

// ✅ 好：至少記錄錯誤
try {
  riskyOperation();
} catch (error) {
  console.error('操作失敗:', error);
  // 或重新拋出
  throw error;
}
```

---

## 8. 最佳實踐

### 8.1 使用現代語法

**解構賦值**:
```javascript
// ✅ 好
const { name, email } = user;
const [first, second] = array;

// ❌ 不好
const name = user.name;
const email = user.email;
```

**展開運算子**:
```javascript
// ✅ 好：複製陣列
const newArray = [...oldArray];

// ✅ 好：合併物件
const merged = { ...defaults, ...options };
```

**箭頭函式**:
```javascript
// ✅ 好：簡潔
const double = x => x * 2;
const sum = (a, b) => a + b;

// 但複雜邏輯用一般函式
function complexLogic() {
  // 多行邏輯
}
```

### 8.2 避免魔術數字和字串

```javascript
// ❌ 不好
if (user.status === 1) { }
setTimeout(handler, 86400000);

// ✅ 好
const USER_STATUS = {
  ACTIVE: 1,
  INACTIVE: 0,
  SUSPENDED: 2
};

const MILLISECONDS_PER_DAY = 86400000;

if (user.status === USER_STATUS.ACTIVE) { }
setTimeout(handler, MILLISECONDS_PER_DAY);
```

### 8.3 使用不可變資料

```javascript
// ❌ 不好：直接修改
function addItem(array, item) {
  array.push(item);
  return array;
}

// ✅ 好：返回新陣列
function addItem(array, item) {
  return [...array, item];
}

// ✅ 好：使用 map 而非 forEach + push
const doubled = numbers.map(n => n * 2);
```

### 8.4 函式應該純粹（Functional Programming）

```javascript
// ❌ 不好：有副作用
let total = 0;
function addToTotal(value) {
  total += value;
}

// ✅ 好：純函式
function add(a, b) {
  return a + b;
}
```

### 8.5 使用 Async/Await 而非 Callbacks

```javascript
// ❌ 不好：Callback Hell
getData(function(a) {
  getMoreData(a, function(b) {
    getMoreData(b, function(c) {
      // ...
    });
  });
});

// ✅ 好：Async/Await
async function processData() {
  const a = await getData();
  const b = await getMoreData(a);
  const c = await getMoreData(b);
  return c;
}
```

---

## 9. 測試要求

### 9.1 測試覆蓋率

**最低要求**:
- 整體覆蓋率 > 80%
- 核心業務邏輯 > 90%
- 工具函式 > 95%

### 9.2 測試命名

```javascript
// ✅ 好：描述性測試名稱
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', () => {
      // ...
    });
    
    it('should throw ValidationError when email is invalid', () => {
      // ...
    });
    
    it('should hash password before saving', () => {
      // ...
    });
  });
});
```

### 9.3 AAA 模式

```javascript
it('should calculate total price correctly', () => {
  // Arrange（準備）
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 3 }
  ];
  
  // Act（執行）
  const total = calculateTotal(items);
  
  // Assert（斷言）
  expect(total).toBe(350);
});
```

---

## 10. 自動化工具

### 10.1 ESLint 配置（JavaScript/TypeScript）

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'prettier' // 必須放最後
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'max-len': ['warn', { code: 100 }],
    'max-lines-per-function': ['warn', 50]
  }
};
```

### 10.2 Prettier 配置

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### 10.3 Pre-commit Hook（Husky + lint-staged）

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

### 10.4 Python - Pylint + Black

```ini
# .pylintrc
[MESSAGES CONTROL]
max-line-length=100

[FORMAT]
indent-string='    '

# pyproject.toml (Black)
[tool.black]
line-length = 100
target-version = ['py39']
```

---

## 11. 語言特定規範

### 11.1 JavaScript/TypeScript

#### 使用 TypeScript 的優勢
```typescript
// ✅ 好：類型安全
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): Promise<User> {
  // 實作
}

// ❌ 不好：使用 any
function processData(data: any) {
  // 失去類型檢查
}
```

#### 避免 `var`，使用 `const` 和 `let`
```javascript
// ✅ 好
const MAX_ITEMS = 100;
let counter = 0;

// ❌ 不好
var MAX_ITEMS = 100;
var counter = 0;
```

### 11.2 Python

#### 使用類型提示（Type Hints）
```python
# ✅ 好
def greet(name: str) -> str:
    return f"Hello, {name}"

# Python 3.9+
def process_items(items: list[int]) -> int:
    return sum(items)
```

#### 遵循 PEP 8
```python
# ✅ 好
def calculate_total_price(items):
    total = 0
    for item in items:
        total += item.price * item.quantity
    return total

# ❌ 不好：命名和格式
def CalculateTotalPrice( items ):
    total=0
    for item in items:
        total+=item.price*item.quantity
    return total
```

---

## 12. Code Review 檢查清單

### 12.1 功能性
- [ ] 程式碼符合需求和規格
- [ ] 邊界條件處理正確
- [ ] 錯誤處理完整
- [ ] 沒有明顯的 Bug

### 12.2 可讀性
- [ ] 命名清晰且一致
- [ ] 註解適當且有用
- [ ] 程式碼易於理解
- [ ] 沒有過度複雜的邏輯

### 12.3 可維護性
- [ ] 函式職責單一
- [ ] 沒有重複程式碼
- [ ] 模組化良好
- [ ] 易於修改和擴展

### 12.4 效能
- [ ] 沒有明顯的效能問題
- [ ] 演算法複雜度合理
- [ ] 避免不必要的運算
- [ ] 資料庫查詢優化

### 12.5 安全性
- [ ] 輸入驗證完整
- [ ] 沒有 SQL 注入風險
- [ ] 沒有 XSS 風險
- [ ] 敏感資料加密處理

### 12.6 測試
- [ ] 單元測試覆蓋關鍵邏輯
- [ ] 測試案例充分
- [ ] 測試通過
- [ ] 沒有被跳過的測試

### 12.7 文件
- [ ] 公開 API 有文件註解
- [ ] README 更新（如需要）
- [ ] 變更日誌更新（如需要）

---

## 附錄

### A. 常見反模式

#### Anti-Pattern 1: 過早優化
```javascript
// ❌ 不好：過早優化，降低可讀性
const result = arr.reduce((a,b)=>a+b[0].x*b[1].y,0);

// ✅ 好：先保持清晰，確認瓶頸後再優化
const result = items.reduce((sum, item) => {
  return sum + item.price * item.quantity;
}, 0);
```

#### Anti-Pattern 2: 神奇類別（God Class）
```javascript
// ❌ 不好：一個類別做太多事
class UserManager {
  createUser() { }
  deleteUser() { }
  sendEmail() { }
  generateReport() { }
  processPayment() { }
  // 50+ 方法...
}

// ✅ 好：職責分離
class UserService { }
class EmailService { }
class ReportService { }
class PaymentService { }
```

### B. 推薦工具

**Linter / Formatter**:
- JavaScript: ESLint + Prettier
- TypeScript: ESLint + Prettier
- Python: Pylint / Flake8 + Black
- Java: Checkstyle + Google Java Format

**靜態分析**:
- SonarQube
- CodeClimate
- DeepSource

**Git Hooks**:
- Husky
- lint-staged
- pre-commit (Python)

### C. 參考資源

- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Google Style Guides](https://google.github.io/styleguide/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [PEP 8 - Python Style Guide](https://peps.python.org/pep-0008/)

---

**最後更新**: YYYY-MM-DD  
**版本**: 1.0  
**維護者**: [技術主管]
```

---

## 品質檢查清單

- [ ] 涵蓋所有主要程式語言
- [ ] 命名慣例清晰且有範例
- [ ] 格式化規則具體可執行
- [ ] 註解標準明確
- [ ] 提供正反範例對比
- [ ] 包含自動化工具配置
- [ ] 有 Code Review 檢查清單
- [ ] 引用業界標準和最佳實踐
- [ ] 已由團隊審核並同意

---

## 相關 Skills
- `code-review.md` - 程式碼審查（實施規範）
- `git-workflow.md` - Git 工作流程（配合使用）
- `unit-test.md` - 單元測試（測試規範）
- `frontend-component.md` - 前端元件開發（前端規範）
- `backend-service.md` - 後端服務開發（後端規範）

---

## 範例

### 輸入範例
```
請幫我制定 Node.js + TypeScript 的程式碼規範，
團隊有 10 人，使用 React + Express。
```

### 輸出範例
[生成完整規範文件，包含：]
- **命名規則**: camelCase 變數、PascalCase 元件、UPPER_SNAKE_CASE 常數
- **格式化**: 2 空格縮排、100 字元行寬、分號必須
- **TypeScript**: 強制類型定義、避免 any
- **React**: Hooks 規則、元件組織、PropTypes
- **Express**: 路由結構、中介軟體、錯誤處理
- **工具配置**: ESLint + Prettier + Husky
