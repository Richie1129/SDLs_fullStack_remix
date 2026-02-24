---
description: 建立設計系統，定義設計原則和元件庫
---

# 設計系統

## 概述
此 skill 協助建立完整的設計系統，包括設計原則、色彩系統、字型系統、間距系統和元件庫。

## 適用角色
- **主要負責**: UI 設計師、設計主管
- **協作角色**: 前端工程師、品牌設計師

## 輸入需求
- 品牌指南
- 產品需求
- 技術限制

## 執行步驟

### 步驟 1: 定義設計原則
### 步驟 2: 建立設計 Token
### 步驟 3: 建立元件庫
### 步驟 4: 撰寫使用指南
### 步驟 5: 維護和演進

## 輸出模板

```markdown
# 設計系統文件

## 1. 設計原則

1. **簡潔明確**: 避免不必要的複雜性
2. **一致性**: 相同的問題用相同的方式解決
3. **無障礙**: 人人都能使用
4. **效率優先**: 幫助用戶快速完成任務

---

## 2. 色彩系統

### 主色調
- Primary: #2563EB (藍色)
- Secondary: #10B981 (綠色)

### 語意色彩
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Info: #3B82F6

### 中性色
- Gray-50 到 Gray-900

### 深色模式
- 定義對應的深色版本

---

## 3. 字型系統

### 字型家族
- 中文: Noto Sans TC
- 英文: Inter
- 等寬: Fira Code

### 字級規範
- H1: 32px / 2rem
- H2: 24px / 1.5rem
- Body: 16px / 1rem
- Caption: 14px / 0.875rem

### 行高
- 標題: 1.2
- 正文: 1.6

---

## 4. 間距系統

基於 8px 網格系統:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

---

## 5. 元件庫

### Button (按鈕)

**變體**:
- Primary
- Secondary
- Outline
- Ghost

**尺寸**:
- Small: 32px 高
- Medium: 40px 高
- Large: 48px 高

**狀態**:
- Default
- Hover
- Active
- Disabled
- Loading

### Input (輸入框)

**類型**:
- Text
- Email
- Password
- Number

**狀態**:
- Default
- Focus
- Error
- Disabled

### Card (卡片)

**變體**:
- Default
- Elevated
- Outlined

---

## 6. 圖示系統

**風格**: Line (線條風格)
**尺寸**: 16px, 20px, 24px
**來源**: [圖示庫名稱]

---

## 7. 使用指南

### Do's (建議做法)
- ✅ 使用語意化色彩
- ✅ 遵循間距系統
- ✅ 優先使用現有元件

### Don'ts (避免做法)
- ❌ 自定義顏色
- ❌ 使用非標準間距
- ❌ 重複造輪子

---

## 8. 實作

### Figma
[Figma 元件庫連結]

### Code
```jsx
import { Button } from '@/components/ui/button';

<Button variant="primary" size="medium">
  點擊我
</Button>
```

---

## 9. 維護

**更新頻率**: 每季度檢視
**版本控制**: 語意化版本
**貢獻流程**: [說明如何提議新元件]
```

---

## 相關 Skills
- `ui-specification.md` - UI 規格
- `wireframe.md` - 線框圖
- `accessibility-checklist.md` - 無障礙檢查
