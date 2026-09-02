/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 只列「執行期才拼出來、Tailwind 掃描不到」的類名；靜態字串（含常數對照表）會被自動掃描，不需列入。
  // - src/pages/overview/StudentOverview.jsx: s.text.replace('text-', 'bg-')
  // - src/pages/overview/TeacherOverview.jsx: `ring-${stage.color}-300`
  safelist: [
    'bg-blue-700', 'bg-teal-700', 'bg-amber-700', 'bg-purple-700',
    'ring-blue-300', 'ring-teal-300', 'ring-amber-300', 'ring-purple-300',
  ],
  theme: {
    extend: {
      // ========================================
      // 動畫系統
      // ========================================
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        // 浮動效果（裝飾元素）
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-14px)' },
        },
        // 上升淡入（英雄區塊登場動畫）
        'rise': {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.3s ease forwards',
        'slide-up':   'slide-up 0.3s ease-out forwards',
        'float':      'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        // 'both' = 延遲期間保持初始狀態，結束後停在終止狀態
        'rise':       'rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
      },

      // ========================================
      // 字體系統
      // ========================================
      fontFamily: {
        sans: ['Noto Serif TC', 'sans-serif'],
        serif: ['Playfair Display', 'Noto Serif TC', 'serif'],
      },
      fontSize: {
        // 語意化字體大小
        'display': ['2.5rem', { lineHeight: '1.2', fontWeight: '900' }],      // 40px - 用於大標題
        'h1': ['2rem', { lineHeight: '1.3', fontWeight: '700' }],             // 32px - 頁面標題
        'h2': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],           // 24px - 區塊標題
        'h3': ['1.25rem', { lineHeight: '1.5', fontWeight: '600' }],          // 20px - 卡片標題
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],    // 18px - 大字正文（對應 text-lg）
        'body': ['1rem', { lineHeight: '1.75', fontWeight: '400' }],          // 16px - 內容正文（加大行高適合中文）
        'body-sm': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],    // 14px - 小字正文
        'caption': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],     // 12px - 說明文字
        'ui': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],         // 14px - UI 控制元素（按鈕、標籤）
      },

      // ========================================
      // 色彩系統
      // ========================================
      colors: {
        // 品牌色（保留）
        'customgreen': '#5BA491',
        'customgray': '#F6F5F8',

        // Anthropic-style 暖色調（paper / ink / line）
        'paper': '#F5F4EE',         // 暖米白主背景
        'paper-dark': '#EDEBE3',    // 暖米白次層背景
        'paper-soft': '#FBFAF6',    // 最淺的暖白（卡片用）
        'ink': '#1F1E1D',           // 深墨棕主文字
        'ink-muted': '#6B6763',     // 次級文字
        'ink-subtle': '#8F8A83',    // 輔助文字
        'line': '#E4DFD4',          // 細邊框
        'line-strong': '#CFC8B9',   // 強邊框（input）
        
        // 新增信任藍色系
        'trust-blue': {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        
        // 行動橙色系
        'action-orange': {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        
        // 狀態色
        'status': {
          excellent: '#10B981',
          active: '#3B82F6',
          attention: '#F59E0B',
          inactive: '#EF4444',
        }
      },

      // ========================================
      // 間距系統
      // ========================================
      spacing: {
        // 元件內邊距
        'component-xs': '8px',      // 對應 p-2
        'component-sm': '12px',     // 對應 p-3
        'component-base': '16px',   // 對應 p-4 (新增)
        'component-md': '20px',     // 對應 p-5
        'component-md-lg': '24px',  // 對應 p-6 (新增)
        'component-lg': '32px',     // 對應 p-8
        'component-xl': '40px',     // 對應 p-10

        // 元件間距（堆疊）
        'stack-xs': '8px',          // 對應 gap-2
        'stack-sm': '16px',         // 對應 gap-4
        'stack-md': '24px',         // 對應 gap-6
        'stack-md-lg': '32px',      // 對應 gap-8 (新增)
        'stack-lg': '40px',         // 對應 gap-10
        'stack-xl': '64px',         // 對應 gap-16

        // 按鈕內邊距
        'btn-x-sm': '12px',
        'btn-y-sm': '6px',
        'btn-x': '16px',
        'btn-y': '8px',
        'btn-x-lg': '24px',
        'btn-y-lg': '12px',
      },

      // ========================================
      // 動畫速度系統
      // ========================================
      transitionDuration: {
        'fast': '150ms',      // 微互動（hover, focus）
        'normal': '250ms',    // 一般過渡（modal 淡入淡出）
        'slow': '400ms',      // 複雜動畫（抽屜滑動）
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
  variants: {
    scrollbar: ['rounded']
  }
};
