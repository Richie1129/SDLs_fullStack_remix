---
description: 前端元件開發標準流程與最佳實踐
---

# Frontend Component 前端元件開發

## 概述

此 skill 提供 React 前端元件開發的完整指引，包含元件設計原則、目錄結構、狀態管理、樣式方案及測試策略。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 前端工程師 |
| **協作角色** | UI/UX 設計師、後端工程師 |

---

## 1. 元件設計原則

### SOLID 原則應用

| 原則 | 前端應用 |
|------|---------|
| **單一職責** | 每個元件只負責一件事 |
| **開放封閉** | 透過 props 擴展，不修改原始碼 |
| **里氏替換** | 子元件可替換父元件 |
| **介面隔離** | props 只包含必要屬性 |
| **依賴反轉** | 依賴抽象（Context/Hooks） |

### 元件分類

```
┌─────────────────────────────────────────┐
│              Page Components            │  路由頁面
├─────────────────────────────────────────┤
│           Feature Components            │  業務功能
├─────────────────────────────────────────┤
│             UI Components               │  通用 UI
├─────────────────────────────────────────┤
│            Base Components              │  原子元件
└─────────────────────────────────────────┘
```

---

## 2. 目錄結構

```
src/
├── components/
│   ├── ui/                    # 基礎 UI 元件
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Input/
│   │   └── Modal/
│   └── features/              # 業務功能元件
│       ├── UserProfile/
│       └── OrderList/
├── pages/                     # 頁面元件
├── hooks/                     # 自訂 Hooks
├── contexts/                  # React Context
├── services/                  # API 服務
├── utils/                     # 工具函數
└── types/                     # TypeScript 型別
```

---

## 3. 元件實作範例

### 3.1 基礎 UI 元件

```tsx
// components/ui/Button/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          loading && styles.loading,
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className={styles.spinner} />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

```css
/* components/ui/Button/Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Variants */
.primary { background: var(--color-primary); color: white; }
.secondary { background: var(--color-gray-100); color: var(--color-gray-800); }
.danger { background: var(--color-red-500); color: white; }

/* Sizes */
.sm { padding: 0.5rem 1rem; font-size: 0.875rem; }
.md { padding: 0.75rem 1.5rem; font-size: 1rem; }
.lg { padding: 1rem 2rem; font-size: 1.125rem; }

/* Loading */
.loading { pointer-events: none; }
.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 3.2 業務功能元件

```tsx
// components/features/UserCard/UserCard.tsx
import { User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import styles from './UserCard.module.css';

interface UserCardProps {
  user: User;
  onClick?: (user: User) => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  return (
    <article 
      className={styles.card}
      onClick={() => onClick?.(user)}
      role="button"
      tabIndex={0}
    >
      <Avatar src={user.avatar} alt={user.name} size="lg" />
      <div className={styles.info}>
        <h3 className={styles.name}>{user.name}</h3>
        <p className={styles.email}>{user.email}</p>
      </div>
      <Badge variant={user.status === 'active' ? 'success' : 'gray'}>
        {user.status}
      </Badge>
    </article>
  );
}
```

---

## 4. 狀態管理

### 4.1 本地狀態（useState）

```tsx
// 簡單狀態
const [isOpen, setIsOpen] = useState(false);

// 物件狀態
const [form, setForm] = useState({ name: '', email: '' });
const updateField = (field: string, value: string) => {
  setForm(prev => ({ ...prev, [field]: value }));
};
```

### 4.2 複雜狀態（useReducer）

```tsx
type State = { status: 'idle' | 'loading' | 'success' | 'error'; data?: User[]; error?: string };
type Action = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: User[] }
  | { type: 'FETCH_ERROR'; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START': return { status: 'loading' };
    case 'FETCH_SUCCESS': return { status: 'success', data: action.payload };
    case 'FETCH_ERROR': return { status: 'error', error: action.error };
  }
}

const [state, dispatch] = useReducer(reducer, { status: 'idle' });
```

### 4.3 全域狀態（React Query）

```tsx
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/user';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: userService.getAll,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

---

## 5. 自訂 Hooks

### 常用 Hooks 範例

```tsx
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue] as const;
}

// hooks/useMediaQuery.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

---

## 6. 表單處理

### React Hook Form 範例

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(8, '密碼至少 8 個字元'),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await loginUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('email')} error={errors.email?.message} />
      <Input {...register('password')} type="password" error={errors.password?.message} />
      <Button type="submit" loading={isSubmitting}>登入</Button>
    </form>
  );
}
```

---

## 7. 效能優化

### 優化技巧

```tsx
// 1. React.memo - 防止不必要的重渲染
const UserCard = memo(function UserCard({ user }: Props) {
  return <div>{user.name}</div>;
});

// 2. useMemo - 快取計算結果
const filteredUsers = useMemo(
  () => users.filter(u => u.name.includes(search)),
  [users, search]
);

// 3. useCallback - 快取函數參考
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);

// 4. 懶加載
const UserProfile = lazy(() => import('./UserProfile'));

<Suspense fallback={<Spinner />}>
  <UserProfile />
</Suspense>
```

---

## 8. 無障礙設計 (a11y)

### 基本原則

```tsx
// ✅ 正確
<button onClick={handleClick}>提交</button>

// ❌ 錯誤
<div onClick={handleClick}>提交</div>

// ✅ 提供 alt
<img src={user.avatar} alt={`${user.name} 的大頭照`} />

// ✅ 表單標籤
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-describedby="email-error" />
{error && <span id="email-error" role="alert">{error}</span>}

// ✅ ARIA 屬性
<button aria-expanded={isOpen} aria-controls="menu">選單</button>
<ul id="menu" role="menu" hidden={!isOpen}>...</ul>
```

---

## 輸出模板

```markdown
# [元件名稱] Component

## 用途
[元件功能描述]

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| variant | 'primary' \| 'secondary' | No | 'primary' | 元件樣式 |

## 使用範例
\`\`\`tsx
<Button variant="primary" onClick={handleClick}>
  Click me
</Button>
\`\`\`

## 無障礙考量
- [a11y 相關說明]
```

---

## 檢查清單

- [ ] 元件職責單一
- [ ] Props 有 TypeScript 型別定義
- [ ] 處理 loading/error 狀態
- [ ] 支援鍵盤操作
- [ ] 通過 a11y 檢查
- [ ] 有單元測試
- [ ] 有 Storybook 文件

---

## 相關 Skills

- [coding-standards.md](./coding-standards.md) - 程式碼規範
- [../03-design/ui-specification.md](../03-design/ui-specification.md) - UI 規格
- [../06-quality-assurance/unit-test.md](../06-quality-assurance/unit-test.md) - 單元測試
