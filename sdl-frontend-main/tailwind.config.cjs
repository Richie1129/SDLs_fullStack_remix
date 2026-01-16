/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {pattern: /(bg|text|top|left)-./}
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
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease forwards',
      },

      // ========================================
      // 字體系統
      // ========================================
      fontFamily: {
        // 預設字體（UI 元素）：Inter
        sans: ['Inter', 'Noto Sans TC', '微軟正黑體', 'Microsoft JhengHei', 'sans-serif'],
        // 內容字體（中文內容）：Noto Serif TC
        serif: ['Noto Serif TC', 'serif'],
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
        'customgreen': '#5BA491',
        'customgray': '#F6F5F8',
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
