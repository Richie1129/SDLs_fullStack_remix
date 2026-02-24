---
description: 單元測試（Unit Test）標準流程與最佳實踐
---

# Unit Test 單元測試

## 概述

此 skill 提供單元測試的完整指引，包含測試框架選擇、測試撰寫模式、Mock 策略、覆蓋率目標，確保程式碼品質。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 開發工程師 |
| **協作角色** | QA 工程師 |

---

## 1. 測試金字塔

```
         ╱╲
        ╱  ╲  E2E Tests (少量)
       ╱────╲
      ╱      ╲  Integration Tests (中量)
     ╱────────╲
    ╱          ╲  Unit Tests (大量) ← 基礎
   ╱────────────╲
```

## 2. 測試框架

### JavaScript/TypeScript

| 框架 | 特點 | 適用場景 |
|------|------|---------|
| **Jest** | 內建 Mock/Coverage | 通用首選 |
| **Vitest** | 快速、ESM 原生支援 | Vite 專案 |
| **Mocha + Chai** | 靈活可組合 | 需自訂配置 |

### 後端 (Node.js)

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 3. AAA 測試模式

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange (準備)
      const dto = { email: 'test@example.com', name: 'Test User' };
      const mockUser = { id: '1', ...dto };
      userRepository.create.mockResolvedValue(mockUser);

      // Act (執行)
      const result = await userService.createUser(dto);

      // Assert (驗證)
      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});
```

---

## 4. Mock 策略

### 4.1 依賴注入 Mock

```typescript
// 手動 Mock
const mockUserRepository = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const userService = new UserService(mockUserRepository);

// 測試
it('should return user when found', async () => {
  mockUserRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });
  
  const result = await userService.findById('1');
  
  expect(result.name).toBe('Test');
});
```

### 4.2 模組 Mock

```typescript
// 自動 Mock 模組
jest.mock('@/repositories/user.repository');

// 部分 Mock
jest.mock('@/utils/logger', () => ({
  ...jest.requireActual('@/utils/logger'),
  info: jest.fn(),
}));
```

### 4.3 時間/定時器 Mock

```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-15'));
});

afterEach(() => {
  jest.useRealTimers();
});

it('should expire after 24 hours', () => {
  const token = createToken();
  jest.advanceTimersByTime(24 * 60 * 60 * 1000);
  expect(isTokenValid(token)).toBe(false);
});
```

---

## 5. 測試案例設計

### 正向測試

```typescript
it('should return user when valid ID provided', async () => {
  const result = await userService.findById('valid-id');
  expect(result).toBeDefined();
});
```

### 邊界測試

```typescript
it('should handle empty string', () => {
  expect(validateName('')).toBe(false);
});

it('should handle max length', () => {
  expect(validateName('a'.repeat(100))).toBe(true);
  expect(validateName('a'.repeat(101))).toBe(false);
});
```

### 錯誤測試

```typescript
it('should throw NotFoundError when user not exists', async () => {
  mockUserRepository.findById.mockResolvedValue(null);
  
  await expect(userService.findById('invalid')).rejects.toThrow(NotFoundError);
});
```

---

## 6. React 元件測試

### React Testing Library

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Hook 測試

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter(0));
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

---

## 7. 覆蓋率要求

### 目標指標

| 指標 | 最低 | 建議 |
|------|------|------|
| Statements | 70% | 80%+ |
| Branches | 60% | 75%+ |
| Functions | 70% | 80%+ |
| Lines | 70% | 80%+ |

### Jest 配置

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
```

---

## 8. 最佳實踐

### ✅ 好的測試

```typescript
// 清楚的測試名稱
it('should throw ValidationError when email format is invalid', ...);

// 測試行為，非實作
it('should notify user after order placed', ...);

// 獨立的測試
beforeEach(() => { /* 重置狀態 */ });
```

### ❌ 不好的測試

```typescript
// 模糊的名稱
it('should work', ...);

// 測試實作細節
it('should call sendEmail function', ...);

// 依賴其他測試
it('should use user created in previous test', ...);
```

---

## 檢查清單

- [ ] 遵循 AAA 模式
- [ ] 測試名稱清楚描述行為
- [ ] 覆蓋正向/負向/邊界案例
- [ ] Mock 外部依賴
- [ ] 測試獨立可重複執行
- [ ] 覆蓋率達標

---

## 相關 Skills

- [integration-test.md](./integration-test.md) - 整合測試
- [test-case.md](./test-case.md) - 測試案例設計
- [../05-development/code-review.md](../05-development/code-review.md) - 程式碼審查
