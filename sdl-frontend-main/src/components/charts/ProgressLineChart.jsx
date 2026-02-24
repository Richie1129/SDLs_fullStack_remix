import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { FiTrendingUp } from 'react-icons/fi';
import ChartContainer from './ChartContainer';
import { lineChartOptions, COLORS, addAlpha } from './chartConfig';

/**
 * 學習進度折線圖
 * 顯示學生在不同時間點的學習活動趨勢
 */
const ProgressLineChart = ({ enhancedStudents, realData }) => {
  const chartData = useMemo(() => {
    if (!realData || !enhancedStudents) {
      return null;
    }

    // 獲取最近 7 天的日期標籤
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date);
    }

    const labels = last7Days.map(date => 
      `${date.getMonth() + 1}/${date.getDate()}`
    );

    // 計算每天的活動數量
    const nodesPerDay = new Array(7).fill(0);
    const tasksPerDay = new Array(7).fill(0);
    const reflectionsPerDay = new Array(7).fill(0);

    // 統計節點
    if (realData.nodes && Array.isArray(realData.nodes)) {
      realData.nodes.forEach(node => {
        if (node.createdAt) {
          const nodeDate = new Date(node.createdAt);
          const dayIndex = last7Days.findIndex(date => 
            date.toDateString() === nodeDate.toDateString()
          );
          if (dayIndex !== -1) {
            nodesPerDay[dayIndex]++;
          }
        }
      });
    }

    // 統計任務
    if (realData.tasks && Array.isArray(realData.tasks)) {
      realData.tasks.forEach(task => {
        if (task.createdAt) {
          const taskDate = new Date(task.createdAt);
          const dayIndex = last7Days.findIndex(date => 
            date.toDateString() === taskDate.toDateString()
          );
          if (dayIndex !== -1) {
            tasksPerDay[dayIndex]++;
          }
        }
      });
    }

    // 統計反思
    if (realData.reflections && Array.isArray(realData.reflections)) {
      realData.reflections.forEach(reflection => {
        if (reflection.createdAt) {
          const reflectionDate = new Date(reflection.createdAt);
          const dayIndex = last7Days.findIndex(date => 
            date.toDateString() === reflectionDate.toDateString()
          );
          if (dayIndex !== -1) {
            reflectionsPerDay[dayIndex]++;
          }
        }
      });
    }

    return {
      labels,
      datasets: [
        {
          label: '學習節點',
          data: nodesPerDay,
          borderColor: COLORS.trustBlue[500],
          backgroundColor: addAlpha(COLORS.trustBlue[500], 0.1),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: COLORS.trustBlue[500],
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '學習任務',
          data: tasksPerDay,
          borderColor: COLORS.actionOrange[500],
          backgroundColor: addAlpha(COLORS.actionOrange[500], 0.1),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: COLORS.actionOrange[500],
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '學習反思',
          data: reflectionsPerDay,
          borderColor: COLORS.customGreen,
          backgroundColor: addAlpha(COLORS.customGreen, 0.1),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: COLORS.customGreen,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    };
  }, [enhancedStudents, realData]);

  if (!chartData) {
    return (
      <ChartContainer
        title="學習進度趨勢"
        subtitle="最近 7 天的學習活動統計"
        icon={FiTrendingUp}
        iconColor="trust-blue"
      >
        <div className="flex items-center justify-center h-64 text-gray-500">
          無可用數據
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="學習進度趨勢"
      subtitle="最近 7 天的學習活動統計"
      icon={FiTrendingUp}
      iconColor="trust-blue"
    >
      <div className="w-full h-64 md:h-80">
        <Line data={chartData} options={lineChartOptions} />
      </div>
    </ChartContainer>
  );
};

export default ProgressLineChart;
