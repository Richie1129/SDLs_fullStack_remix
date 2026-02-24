import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { FiBarChart2 } from 'react-icons/fi';
import ChartContainer from './ChartContainer';
import { barChartOptions, COLORS, addAlpha } from './chartConfig';

/**
 * 反思品質長條圖
 * 顯示不同學生的反思數量和品質分布
 */
const ReflectionBarChart = ({ enhancedStudents, realData }) => {
  const chartData = useMemo(() => {
    if (!enhancedStudents || !Array.isArray(enhancedStudents) || enhancedStudents.length === 0) {
      return null;
    }

    // 取前 10 個最活躍的學生（依反思數量排序）
    const topStudents = [...enhancedStudents]
      .sort((a, b) => (b.reflectionCount || 0) - (a.reflectionCount || 0))
      .slice(0, 10);

    if (topStudents.length === 0) {
      return null;
    }

    // 計算每個學生的反思品質分布
    const labels = topStudents.map(student => 
      student.displayName || student.name || `學生${student.id}`
    );

    // 品質分類：優秀、良好、一般、待加強
    const excellentReflections = new Array(topStudents.length).fill(0);
    const goodReflections = new Array(topStudents.length).fill(0);
    const averageReflections = new Array(topStudents.length).fill(0);
    const needsWorkReflections = new Array(topStudents.length).fill(0);

    topStudents.forEach((student, index) => {
      if (realData?.reflections && Array.isArray(realData.reflections)) {
        const studentReflections = realData.reflections.filter(
          reflection => reflection.owner === student.id || reflection.userId === student.id
        );

        studentReflections.forEach(reflection => {
          // 根據內容長度簡單分類品質（實際應用可用更複雜的演算法）
          const contentLength = reflection.content?.length || 0;
          
          if (contentLength >= 300) {
            excellentReflections[index]++;
          } else if (contentLength >= 150) {
            goodReflections[index]++;
          } else if (contentLength >= 50) {
            averageReflections[index]++;
          } else {
            needsWorkReflections[index]++;
          }
        });
      }
    });

    return {
      labels,
      datasets: [
        {
          label: '優秀 (≥300字)',
          data: excellentReflections,
          backgroundColor: addAlpha(COLORS.statusColors.excellent, 0.8),
          borderColor: COLORS.statusColors.excellent,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: '良好 (150-299字)',
          data: goodReflections,
          backgroundColor: addAlpha(COLORS.statusColors.active, 0.8),
          borderColor: COLORS.statusColors.active,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: '一般 (50-149字)',
          data: averageReflections,
          backgroundColor: addAlpha(COLORS.statusColors.attention, 0.8),
          borderColor: COLORS.statusColors.attention,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: '待加強 (<50字)',
          data: needsWorkReflections,
          backgroundColor: addAlpha(COLORS.statusColors.inactive, 0.8),
          borderColor: COLORS.statusColors.inactive,
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };
  }, [enhancedStudents, realData]);

  if (!chartData) {
    return (
      <ChartContainer
        title="反思品質分析"
        subtitle="學生反思內容品質分布（依字數統計）"
        icon={FiBarChart2}
        iconColor="action-orange"
      >
        <div className="flex items-center justify-center h-64 text-gray-500">
          無可用數據
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="反思品質分析"
      subtitle="學生反思內容品質分布（依字數統計）"
      icon={FiBarChart2}
      iconColor="action-orange"
    >
      <div className="w-full h-96">
        <Bar data={chartData} options={{
          ...barChartOptions,
          scales: {
            ...barChartOptions.scales,
            x: {
              ...barChartOptions.scales.x,
              stacked: true
            },
            y: {
              ...barChartOptions.scales.y,
              stacked: true
            }
          }
        }} />
      </div>
    </ChartContainer>
  );
};

export default ReflectionBarChart;
