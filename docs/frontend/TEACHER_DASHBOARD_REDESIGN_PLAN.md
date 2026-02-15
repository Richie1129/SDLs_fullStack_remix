# 教師儀錶板 UI/UX 重新設計計劃

> 基於主流 Dashboard 設計最佳實踐與現代化 UI/UX 原則

## 📋 目錄

- [當前狀況分析](#當前狀況分析)
- [設計參考與研究](#設計參考與研究)
- [設計目標](#設計目標)
- [視覺設計升級](#視覺設計升級)
- [功能性改進](#功能性改進)
- [實施計劃](#實施計劃)
- [技術規格](#技術規格)

---

## 🔍 當前狀況分析

### 現有優點
- ✅ 清晰的模組化架構（使用 hooks 和 components 分離）
- ✅ 完整的設計系統（DESIGN_SYSTEM.md）
- ✅ 多視圖模式（overview, all-students, groups, individual, analytics, help-seeking）
- ✅ 響應式設計基礎
- ✅ 錯誤處理與載入狀態

### 待改進問題
- ❌ 視覺層次不夠清晰，資訊密度過高
- ❌ 色彩系統過於單調（主要是 teal 系列）
- ❌ 缺乏現代化的視覺特效（如 glassmorphism, 微動畫）
- ❌ 統計卡片設計過於簡單，缺乏視覺吸引力
- ❌ 資料視覺化不足（需要更多圖表）
- ❌ 缺乏個性化與互動性
- ❌ 導航切換按鈕在小螢幕上擁擠

---

## 🎨 設計參考與研究

### Dashboard 設計趨勢分析

根據 UI/UX Pro Max 資料庫研究，現代 Dashboard 設計有以下特點：

#### 1. **Analytics Dashboard 風格**
- **主要特點**: Data-Dense + 熱圖視覺化
- **次要風格**: Minimalism, Dark Mode (OLED)
- **色彩方案**: Cool→Hot 漸變 + 中性灰
- **Dashboard 類型**: Drill-Down Analytics + Comparative

#### 2. **色彩系統建議** (SaaS 產品導向)
```css
Primary:    #2563EB  /* Trust Blue - 信任感 */
Secondary:  #3B82F6  /* Light Blue - 輔助 */
CTA:        #F97316  /* Orange - 行動呼籲 */
Background: #F8FAFC  /* Off-White - 背景 */
Text:       #1E293B  /* Dark Slate - 文字 */
Border:     #E2E8F0  /* Light Gray - 邊框 */
```

**當前顏色**:
```css
Primary:    #5BA491  /* Custom Green - 保留作為品牌色 */
```

#### 3. **推薦 UI 風格**
- **主要風格**: Modern Minimalism + Data-Dense
- **次要效果**: Glassmorphism (玻璃擬態) 用於卡片
- **配色策略**: 保留品牌 teal 色，引入藍色系增加信任感

#### 4. **字體建議** (Professional Modern)
```javascript
// 當前已在使用
Heading: 'Noto Serif TC'  // 保持
Body: 'Inter'             // 保持

// 建議補充
Data/Numbers: 'Poppins'   // 數字更清晰
```

#### 5. **圖表類型建議**
- **趨勢分析**: Line Chart (學生進度趨勢)
- **比較分析**: Bar Chart (學生間比較)
- **多變量比較**: Radar/Spider Chart (學生能力雷達圖)
- **分佈狀態**: Progress Rings (進度環形圖)

---

## 🎯 設計目標

### 主要目標
1. **提升視覺吸引力** - 現代化、專業感強
2. **改善資訊層次** - 清晰的視覺層級
3. **增強互動性** - 微動畫、hover 效果
4. **優化資料視覺化** - 引入多種圖表類型
5. **提升可用性** - 更直觀的導航與操作

### 用戶體驗目標
- 教師能在 5 秒內掌握班級整體狀況
- 快速識別需要關注的學生
- 流暢的視圖切換體驗
- 資料洞察一目了然

---

## 🎨 視覺設計升級

### 1. 色彩系統重構

#### 主色系（保留品牌色）
```javascript
// tailwind.config.cjs 新增
colors: {
  // 品牌色保留
  'customgreen': '#5BA491',
  'customgray': '#F6F5F8',
  
  // 新增藍色系（信任感）
  'trust-blue': {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // 主要
    600: '#2563EB',  // Primary
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // 新增橙色系（警示/CTA）
  'action-orange': {
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
  },
  
  // 狀態色優化
  'status': {
    excellent: '#10B981',  // Green
    active: '#3B82F6',     // Blue
    attention: '#F59E0B',  // Amber
    inactive: '#EF4444',   // Red
  }
}
```

#### 色彩使用策略
```css
/* 導航與品牌 */
navbar: customgreen (保持品牌識別)

/* 統計卡片 */
card-1: trust-blue-500 → trust-blue-600 (gradient)
card-2: trust-blue-400 → trust-blue-500
card-3: customgreen (保持)
card-4: trust-blue-600 → trust-blue-700
card-5: teal-500 → customgreen (gradient)

/* 狀態指示 */
excellent: status-excellent
active: status-active
attention: status-attention
inactive: status-inactive

/* 互動元素 */
primary-button: customgreen (品牌一致性)
secondary-button: trust-blue-600
cta-button: action-orange-500
```

### 2. Glassmorphism 效果

#### 應用場景
- 統計卡片背景
- 懸浮卡片
- Modal 背景

```css
/* Glassmorphism 基礎樣式 */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

/* Dark Glassmorphism (可選) */
.glass-card-dark {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```

### 3. 統計卡片重新設計

#### 當前問題
- 視覺單調（只有漸變背景）
- 缺乏層次感
- 數字不夠突出

#### 新設計方案
```jsx
// StatsCards.jsx - 新版本
const StatsCard = ({ title, value, subtitle, icon, trend, color }) => {
  return (
    <div className="group relative">
      {/* Glassmorphism 背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl rounded-2xl"></div>
      
      {/* 主要內容 */}
      <div className="relative p-component-md rounded-2xl border border-white/50 shadow-lg hover:shadow-2xl transition-all duration-normal">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-body-sm font-medium text-gray-600">{title}</h3>
          
          {/* Icon with animated background */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} text-white group-hover:scale-110 transition-transform duration-fast`}>
            {icon}
          </div>
        </div>
        
        {/* Main Value */}
        <div className="mb-2">
          <p className="text-h1 font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {value}
          </p>
        </div>
        
        {/* Subtitle with Trend */}
        <div className="flex items-center justify-between">
          <p className="text-caption text-gray-500">{subtitle}</p>
          
          {trend && (
            <span className={`flex items-center text-caption font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        
        {/* Bottom Progress Bar (optional) */}
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${color} transition-all duration-slow`}
            style={{ width: `${Math.random() * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

### 4. 導航按鈕優化

#### 當前問題
- 在小螢幕上擁擠
- 視覺層次不明顯

#### 新設計方案
```jsx
// ViewModeButtons.jsx - 新版本

{/* 桌面版：水平 Tab 樣式 */}
<div className="hidden lg:flex bg-white rounded-xl shadow-md p-1 border border-gray-200">
  {modes.map(({ key, label, icon }) => (
    <button
      key={key}
      className={`
        flex items-center space-x-2 px-4 py-2.5 rounded-lg
        font-medium text-body-sm transition-all duration-normal
        ${viewMode === key
          ? 'bg-gradient-to-r from-customgreen to-teal-600 text-white shadow-md'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  ))}
</div>

{/* 移動版：Dropdown 選單 */}
<div className="lg:hidden">
  <select 
    value={viewMode}
    onChange={(e) => setViewMode(e.target.value)}
    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-body-sm font-medium shadow-sm focus:ring-2 focus:ring-customgreen focus:border-transparent"
  >
    {modes.map(({ key, label }) => (
      <option key={key} value={key}>{label}</option>
    ))}
  </select>
</div>
```

### 5. 資料視覺化增強

#### 新增圖表組件

##### A. 班級進度分佈圖（Donut Chart）
```jsx
// components/ProgressDistributionChart.jsx
import { Doughnut } from 'react-chartjs-2';

const ProgressDistributionChart = ({ data }) => {
  const chartData = {
    labels: ['優秀 (80%+)', '良好 (60-79%)', '需關注 (<60%)'],
    datasets: [{
      data: [
        data.excellent,
        data.active,
        data.attention
      ],
      backgroundColor: [
        '#10B981', // Green
        '#3B82F6', // Blue
        '#F59E0B', // Amber
      ],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  const options = {
    cutout: '70%',
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.label}: ${context.parsed} 人`;
          }
        }
      }
    }
  };

  return (
    <div className="relative">
      <Doughnut data={chartData} options={options} />
      {/* Center Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-h1 font-bold text-gray-800">{data.total}</p>
          <p className="text-caption text-gray-500">總學生數</p>
        </div>
      </div>
    </div>
  );
};
```

##### B. 學習趨勢圖（Line Chart）
```jsx
// components/LearningTrendChart.jsx
import { Line } from 'react-chartjs-2';

const LearningTrendChart = ({ weeklyData }) => {
  const chartData = {
    labels: ['週一', '週二', '週三', '週四', '週五', '週六', '週日'],
    datasets: [
      {
        label: '反思記錄',
        data: weeklyData.reflections,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: '想法節點',
        data: weeklyData.ideaNodes,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: '看板任務',
        data: weeklyData.kanbanTasks,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  return <Line data={chartData} options={options} />;
};
```

##### C. 學生能力雷達圖（Radar Chart）
```jsx
// components/StudentRadarChart.jsx
import { Radar } from 'react-chartjs-2';

const StudentRadarChart = ({ studentData }) => {
  const chartData = {
    labels: ['反思能力', '創意發想', '任務執行', '協作溝通', '自主學習'],
    datasets: [{
      label: studentData.name,
      data: [
        studentData.reflectionScore,
        studentData.ideaScore,
        studentData.taskScore,
        studentData.collaborationScore,
        studentData.selfLearningScore
      ],
      backgroundColor: 'rgba(91, 164, 145, 0.2)',
      borderColor: '#5BA491',
      pointBackgroundColor: '#5BA491',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#5BA491'
    }]
  };

  const options = {
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  return <Radar data={chartData} options={options} />;
};
```

### 6. 微動畫與互動效果

#### Hover 動畫
```css
/* 卡片懸浮效果 */
.card-hover {
  @apply transition-all duration-normal;
  @apply hover:scale-105 hover:shadow-2xl;
  @apply hover:-translate-y-1;
}

/* 按鈕漣漪效果 */
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn-ripple:active::after {
  width: 300px;
  height: 300px;
}
```

#### 載入骨架屏
```jsx
// components/SkeletonLoader.jsx
const SkeletonCard = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-2xl h-32"></div>
    </div>
  );
};

const SkeletonTable = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="bg-gray-200 h-12 flex-1 rounded"></div>
          <div className="bg-gray-200 h-12 w-20 rounded"></div>
        </div>
      ))}
    </div>
  );
};
```

### 7. 響應式優化

#### 移動端優先策略
```jsx
// 統計卡片響應式
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-stack-sm">
  {/* 手機：1列 */}
  {/* 平板：2列 */}
  {/* 桌面：3列 */}
  {/* 大螢幕：5列 */}
</div>

// 表格響應式
{/* 桌面：完整表格 */}
<div className="hidden lg:block">
  <table>...</table>
</div>

{/* 移動端：卡片式布局 */}
<div className="lg:hidden space-y-stack-sm">
  {students.map(student => (
    <StudentCard key={student.id} data={student} />
  ))}
</div>
```

---

## 🚀 功能性改進

### 1. 智能過濾與搜尋

#### 新增功能
- **即時搜尋**: 學生姓名、專案名稱
- **多維度篩選**: 狀態、進度範圍、活動時間
- **排序選項**: 進度、活躍度、最後活動時間

```jsx
// components/FilterBar.jsx
const FilterBar = ({ onFilterChange }) => {
  return (
    <div className="bg-white p-component-md rounded-xl shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-sm">
        {/* 搜尋框 */}
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="🔍 搜尋學生姓名或專案..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-customgreen/50 focus:border-customgreen"
          />
        </div>
        
        {/* 狀態篩選 */}
        <select className="px-4 py-2.5 rounded-lg border border-gray-300">
          <option value="">所有狀態</option>
          <option value="excellent">優秀</option>
          <option value="active">良好</option>
          <option value="attention">需關注</option>
        </select>
        
        {/* 排序 */}
        <select className="px-4 py-2.5 rounded-lg border border-gray-300">
          <option value="progress">依進度排序</option>
          <option value="activity">依活躍度</option>
          <option value="name">依姓名排序</option>
        </select>
      </div>
    </div>
  );
};
```

### 2. 資料匯出功能

```jsx
// utils/dataExport.js
export const exportToCSV = (data, filename) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
};

export const exportToPDF = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF();
  pdf.addImage(imgData, 'PNG', 0, 0);
  pdf.save(`${filename}.pdf`);
};
```

### 3. 快速操作面板

```jsx
// components/QuickActions.jsx
const QuickActions = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-full shadow-2xl p-2 flex space-x-2">
        <button className="w-12 h-12 rounded-full bg-customgreen text-white hover:bg-customgreen/90 transition-colors" title="匯出報告">
          <FiDownload className="w-5 h-5 mx-auto" />
        </button>
        <button className="w-12 h-12 rounded-full bg-trust-blue-600 text-white hover:bg-trust-blue-700 transition-colors" title="發送通知">
          <FiBell className="w-5 h-5 mx-auto" />
        </button>
        <button className="w-12 h-12 rounded-full bg-action-orange-500 text-white hover:bg-action-orange-600 transition-colors" title="快速筆記">
          <FiEdit className="w-5 h-5 mx-auto" />
        </button>
      </div>
    </div>
  );
};
```

### 4. 個性化儀錶板

```jsx
// 允許教師自訂卡片順序、隱藏/顯示
const [dashboardLayout, setDashboardLayout] = useState({
  statsCards: { visible: true, order: 1 },
  chartView: { visible: true, order: 2 },
  recentActivity: { visible: true, order: 3 },
  studentTable: { visible: true, order: 4 }
});
```

---

## 📋 實施計劃

### Phase 1: 基礎視覺升級 (Week 1-2)

#### 任務清單
- [ ] 1.1 更新 `tailwind.config.cjs` - 新增色彩系統
- [ ] 1.2 創建 Glassmorphism 工具類
- [ ] 1.3 重構 `StatsCards.jsx` 組件
- [ ] 1.4 重構 `ViewModeButtons.jsx` 組件
- [ ] 1.5 更新載入與錯誤狀態 UI

#### 檔案修改
```bash
修改:
- sdl-frontend-main/tailwind.config.cjs
- sdl-frontend-main/src/pages/teacher-dashboard/components/StatsCards.jsx
- sdl-frontend-main/src/pages/teacher-dashboard/components/ViewModeButtons.jsx
- sdl-frontend-main/src/pages/teacher-dashboard/index.jsx

新增:
- sdl-frontend-main/src/styles/glassmorphism.css
- sdl-frontend-main/src/components/SkeletonLoader.jsx
```

### Phase 2: 資料視覺化 (Week 3-4)

#### 任務清單
- [ ] 2.1 安裝 Chart.js 相關套件
  ```bash
  npm install chart.js react-chartjs-2
  ```
- [ ] 2.2 創建 `ProgressDistributionChart.jsx`
- [ ] 2.3 創建 `LearningTrendChart.jsx`
- [ ] 2.4 創建 `StudentRadarChart.jsx`
- [ ] 2.5 整合圖表到 `OverviewView.jsx` 和 `AnalyticsView.jsx`

#### 檔案修改
```bash
新增:
- sdl-frontend-main/src/pages/teacher-dashboard/components/charts/
  - ProgressDistributionChart.jsx
  - LearningTrendChart.jsx
  - StudentRadarChart.jsx
  - index.js

修改:
- sdl-frontend-main/src/pages/teacher-dashboard/components/OverviewView.jsx
- sdl-frontend-main/src/pages/teacher-dashboard/components/AnalyticsView.jsx
- sdl-frontend-main/package.json
```

### Phase 3: 互動性增強 (Week 5)

#### 任務清單
- [ ] 3.1 創建 `FilterBar.jsx` 組件
- [ ] 3.2 創建 `QuickActions.jsx` 組件
- [ ] 3.3 實作搜尋與過濾邏輯
- [ ] 3.4 實作資料匯出功能
- [ ] 3.5 添加微動畫效果

#### 檔案修改
```bash
新增:
- sdl-frontend-main/src/pages/teacher-dashboard/components/FilterBar.jsx
- sdl-frontend-main/src/pages/teacher-dashboard/components/QuickActions.jsx
- sdl-frontend-main/src/pages/teacher-dashboard/utils/dataExport.js
- sdl-frontend-main/src/styles/animations.css

修改:
- sdl-frontend-main/src/pages/teacher-dashboard/components/AllStudentsView.jsx
- sdl-frontend-main/src/pages/teacher-dashboard/hooks/useTeacherDashboard.js
```

### Phase 4: 響應式優化與測試 (Week 6)

#### 任務清單
- [ ] 4.1 移動端 UI 優化
- [ ] 4.2 平板端 UI 優化
- [ ] 4.3 跨瀏覽器測試
- [ ] 4.4 性能優化（虛擬滾動、懶加載）
- [ ] 4.5 無障礙性測試（a11y）

---

## 🔧 技術規格

### 依賴套件

```json
{
  "dependencies": {
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    "framer-motion": "^10.16.4"  // 可選：進階動畫
  }
}
```

### 性能考量

#### 1. 虛擬滾動（學生列表超過 100 人）
```bash
npm install react-window
```

```jsx
import { FixedSizeList } from 'react-window';

const VirtualizedStudentList = ({ students }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <StudentCard student={students[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={students.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

#### 2. 圖表懶加載
```jsx
import { lazy, Suspense } from 'react';

const LearningTrendChart = lazy(() => 
  import('./components/charts/LearningTrendChart')
);

// 使用
<Suspense fallback={<SkeletonChart />}>
  <LearningTrendChart data={trendData} />
</Suspense>
```

#### 3. Memo 優化
```jsx
import { memo } from 'react';

export const StatsCard = memo(({ title, value, color }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value;
});
```

### 無障礙性（Accessibility）

#### ARIA 標籤
```jsx
<button
  aria-label="切換到總覽視圖"
  aria-pressed={viewMode === 'overview'}
  role="tab"
>
  總覽
</button>

<div
  role="region"
  aria-label="學生統計卡片"
  aria-live="polite"
>
  <StatsCards data={stats} />
</div>
```

#### 鍵盤導航
```jsx
const handleKeyDown = (e) => {
  if (e.key === 'ArrowRight') {
    setViewMode(nextView);
  } else if (e.key === 'ArrowLeft') {
    setViewMode(prevView);
  }
};
```

#### 色彩對比度
- 確保文字與背景對比度符合 WCAG AA 標準（4.5:1）
- 狀態色不僅依賴顏色，還有圖示輔助

---

## 📊 成功指標

### 量化指標
- [ ] **載入速度**: 首次內容繪製 < 1.5s
- [ ] **互動時間**: 可互動時間 < 2.5s
- [ ] **視覺穩定性**: CLS < 0.1
- [ ] **無障礙分數**: Lighthouse Accessibility > 95

### 質化指標
- [ ] 教師能在 5 秒內找到需要的資訊
- [ ] 視覺吸引力提升（用戶反饋）
- [ ] 操作流暢度提升（用戶反饋）
- [ ] 移動端體驗改善（用戶反饋）

---

## 📝 注意事項

### 1. 保持品牌一致性
- 主要品牌色 `#5BA491` (customgreen) 必須保留
- 在導航、主要 CTAs 保持使用品牌色

### 2. 漸進式增強
- 確保在舊瀏覽器上功能可用（降級體驗）
- Glassmorphism 在不支援 backdrop-filter 的瀏覽器上有備用樣式

### 3. 性能優先
- 圖表數據點過多時啟用數據抽樣
- 大量學生數據啟用虛擬滾動
- 圖片/圖表懶加載

### 4. 測試覆蓋
- 單元測試：工具函數、hooks
- 組件測試：視覺回歸測試
- E2E 測試：關鍵用戶流程

---

## 🎯 下一步行動

1. **立即開始**: Phase 1 基礎視覺升級
2. **團隊協作**: 設計師 Review 色彩系統與視覺設計
3. **用戶驗證**: 與 2-3 位教師進行原型測試
4. **迭代優化**: 根據反饋調整設計方案

---

## 📚 參考資源

### 設計靈感
- [Dribbble - Dashboard UI](https://dribbble.com/search/dashboard)
- [Behance - Analytics Dashboard](https://www.behance.net/search/projects?search=analytics%20dashboard)
- [Tailwind UI - Application UI](https://tailwindui.com/components/application-ui)

### 技術文檔
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

### UX 研究
- [Nielsen Norman Group - Dashboard Design](https://www.nngroup.com/articles/dashboard-design/)
- [Material Design - Data Visualization](https://m3.material.io/foundations/data-visualization/overview)

---

**文件版本**: 1.0  
**創建日期**: 2026-02-12  
**最後更新**: 2026-02-12  
**負責人**: Development Team
