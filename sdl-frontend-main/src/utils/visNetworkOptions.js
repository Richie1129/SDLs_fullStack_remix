/**
 * Vis Network 配置選項
 * 優化節點和邊的視覺效果
 */
export const visNetworkOptions = {
    nodes: {
        shape: 'image',
        size: 50,  // 大幅增加節點顯示大小
        borderWidth: 0,
        // 節點陰影效果
        shadow: {
            enabled: true,
            color: 'rgba(0, 0, 0, 0.1)',
            size: 8,
            x: 0,
            y: 2
        },
        // Hover 和選中效果
        chosen: {
            node: function(values, id, selected, hovering) {
                if (hovering) {
                    values.shadow = true;
                    values.shadowSize = 15;
                    values.shadowColor = 'rgba(0, 0, 0, 0.25)';
                }
                if (selected) {
                    values.shadow = true;
                    values.shadowSize = 20;
                    values.shadowColor = 'rgba(59, 130, 246, 0.4)';
                }
            }
        },
        // 字體設置（備用）
        font: {
            size: 14,
            color: '#1E293B',
            face: 'Inter, "Noto Sans TC"'
        }
    },
    edges: {
        width: 2,
        arrows: {
            to: {
                enabled: true,
                scaleFactor: 0.8,
                type: "arrow"
            },
        },
        smooth: {
            enabled: true,
            type: 'dynamic',
            roundness: 0.5
        },
        color: {
            color: '#94A3B8',      // 預設灰色
            highlight: '#3B82F6',  // 選中藍色
            hover: '#60A5FA',      // Hover 淺藍
            opacity: 0.8
        },
        // Hover 效果
        chosen: {
            edge: function(values, id, selected, hovering) {
                if (hovering) {
                    values.width = 3;
                    values.color = '#60A5FA';
                }
                if (selected) {
                    values.width = 4;
                    values.color = '#3B82F6';
                }
            }
        }
    },
    physics: {
        enabled: true,
        barnesHut: {
            gravitationalConstant: -20000,
            centralGravity: 0.2,
            springLength: 350,  // 增加彈簧長度讓節點更分散
            springConstant: 0.05,
            damping: 0.15,
            avoidOverlap: 0.5  // 增加節點間距避免重疊
        },
        stabilization: {
            enabled: true,
            iterations: 200,
            fit: true
        }
    },
    interaction: { 
        hover: true,
        tooltipDelay: 200,
        navigationButtons: false,
        keyboard: {
            enabled: false
        },
        zoomView: true,
        dragView: true
    },
    manipulation: {
        enabled: true,
    },
};