import React from 'react'
import ReactDOMServer from 'react-dom/server'
import dateFormat from 'dateformat';
import { PiNoteFill } from "react-icons/pi";

/**
 * 生成節點 SVG 的工具函數
 * @param {string} title - 節點標題
 * @param {string} owner - 節點建立者
 * @param {string} createdAt - 建立時間
 * @param {string} userColor - 節點顏色（用於邊框和強調色）
 * @param {string} content - 節點內容（可選）
 * @returns {string} SVG Data URL
 */
export default function svgConvertUrl(title, owner, createdAt, userColor, content = "") {
    const svg = (
        <svg xmlns="http://www.w3.org/2000/svg" width="450" height="280">
            {/* 定義陰影濾鏡 */}
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                    <feOffset dx="0" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.2"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            
            {/* 卡片背景 - 圓角矩形 + 彩色邊框 + 陰影 */}
            <rect 
                x="4" 
                y="4" 
                width="442" 
                height="272" 
                rx="12"
                fill="#FFFFFF"
                stroke={userColor}
                strokeWidth="4"
                filter="url(#shadow)"
            />
            
            {/* 內容區域 */}
            <foreignObject x="0" y="0" width="450" height="280">
                <div 
                    xmlns="http://www.w3.org/1999/xhtml" 
                    style={{ 
                        width: "100%", 
                        height: "100%",
                        padding: "24px",
                        display: "flex", 
                        flexDirection: "column",
                        gap: "16px",
                        boxSizing: "border-box"
                    }}
                >
                    {/* 標頭區 - 圖示 + 標題 */}
                    <div style={{ 
                        display: "flex", 
                        alignItems: "flex-start",
                        gap: "16px",
                        borderBottom: `3px solid ${userColor}33`,
                        paddingBottom: "16px"
                    }}>
                        <PiNoteFill 
                            style={{ 
                                width: "48px", 
                                height: "48px", 
                                color: userColor,
                                flexShrink: 0,
                                marginTop: "4px"
                            }}
                        />
                        <span style={{ 
                            fontSize: "32px",
                            fontWeight: "700",
                            color: "#1E293B",
                            lineHeight: "1.25",
                            flex: 1,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word"
                        }}>
                            {title}
                        </span>
                    </div>

                    {/* 內容預覽區 */}
                    {content && (
                        <div style={{
                            fontSize: "20px",
                            color: "#64748B",
                            lineHeight: "1.6",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            flex: 1,
                            wordBreak: "break-word"
                        }}>
                            {content}
                        </div>
                    )}

                    {/* 如果沒有內容，用佔位空間 */}
                    {!content && <div style={{ flex: 1 }} />}

                    {/* 底部資訊 - 建立者 + 時間 */}
                    <div style={{ 
                        fontSize: "18px",
                        color: "#94A3B8",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "auto",
                        paddingTop: "14px",
                        borderTop: "2px solid #E2E8F0"
                    }}>
                        <span style={{ 
                            fontWeight: "700",
                            color: userColor,
                            maxWidth: "240px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                        }}>
                            {owner}
                        </span>
                        <span style={{
                            fontSize: "16px",
                            color: "#94A3B8",
                            fontWeight: "500"
                        }}>
                            {dateFormat(createdAt, "mm/dd HH:MM")}
                        </span>
                    </div>
                </div>
            </foreignObject>
        </svg>
    )
    
    const svgStringify = ReactDOMServer.renderToString(svg);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStringify);

    return url
}
