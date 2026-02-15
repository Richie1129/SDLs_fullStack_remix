import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// 註冊 Chart.js 元件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Tailwind 色彩常數（對應 tailwind.config.cjs）
export const COLORS = {
  trustBlue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#2563EB', // 主色
    600: '#1d4ed8',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#1e3a70'
  },
  actionOrange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#F97316', // 主色
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12'
  },
  customGreen: '#5BA491',
  teal: {
    500: '#14b8a6',
    600: '#0d9488'
  },
  statusColors: {
    excellent: '#10b981',
    active: '#3b82f6',
    attention: '#f59e0b',
    inactive: '#6b7280'
  }
};

// 通用圖表配置
export const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        font: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: '500'
        },
        color: '#374151',
        padding: 15,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#111827',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      titleFont: {
        family: "'Inter', sans-serif",
        size: 14,
        weight: '600'
      },
      bodyFont: {
        family: "'Inter', sans-serif",
        size: 13,
        weight: '500'
      },
      cornerRadius: 8
    }
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart'
  }
};

// 折線圖專用配置
export const lineChartOptions = {
  ...commonChartOptions,
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11
        },
        color: '#6b7280'
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(229, 231, 235, 0.5)',
        drawBorder: false
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11
        },
        color: '#6b7280',
        padding: 8
      }
    }
  }
};

// 長條圖專用配置
export const barChartOptions = {
  ...commonChartOptions,
  aspectRatio: 1.8,
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11
        },
        color: '#6b7280'
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(229, 231, 235, 0.5)',
        drawBorder: false
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11
        },
        color: '#6b7280',
        padding: 8,
        stepSize: 1
      }
    }
  }
};

// 圓餅圖/甜甜圈圖專用配置
export const pieChartOptions = {
  ...commonChartOptions,
  aspectRatio: 1.5,
  plugins: {
    ...commonChartOptions.plugins,
    legend: {
      ...commonChartOptions.plugins.legend,
      position: 'right',
      labels: {
        ...commonChartOptions.plugins.legend.labels,
        generateLabels: (chart) => {
          const data = chart.data;
          if (data.labels.length && data.datasets.length) {
            return data.labels.map((label, i) => {
              const value = data.datasets[0].data[i];
              const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              
              return {
                text: `${label} (${percentage}%)`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i
              };
            });
          }
          return [];
        }
      }
    }
  }
};

// 漸層色生成函數
export const createGradient = (ctx, color1, color2) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
};

// 透明度調整函數
export const addAlpha = (color, alpha) => {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
};

export default ChartJS;
