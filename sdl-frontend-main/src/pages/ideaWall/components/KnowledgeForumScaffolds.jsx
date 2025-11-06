import React from 'react';

/**
 * Knowledge Forum 思考鷹架按鈕組
 *
 * @param {Object} props
 * @param {string} props.currentContent - 當前內容
 * @param {function} props.onInsert - 插入文字的回調函數
 */
export default function KnowledgeForumScaffolds({ currentContent, onInsert }) {
    const scaffolds = [
        { text: "我的理論：", label: "我的理論", color: "bg-blue-100 hover:bg-blue-200" },
        { text: "我需要了解：", label: "我需要了解", color: "bg-green-100 hover:bg-green-200" },
        { text: "新資訊：", label: "新資訊", color: "bg-yellow-100 hover:bg-yellow-200" },
        { text: "這種理論無法解釋：", label: "這種理論無法解釋", color: "bg-red-100 hover:bg-red-200" },
        { text: "更好的理論：", label: "更好的理論", color: "bg-purple-100 hover:bg-purple-200" },
        { text: "整合我們的知識：", label: "整合我們的知識", color: "bg-pink-100 hover:bg-pink-200" }
    ];

    return (
        <div className="mb-3">
            <label className="font-bold text-sm mb-2 block">思考鷹架（點擊插入到內容）</label>
            <div className="flex flex-wrap gap-2">
                {scaffolds.map((scaffold) => (
                    <button
                        key={scaffold.text}
                        type="button"
                        onClick={() => onInsert(currentContent + scaffold.text)}
                        className={`px-3 py-1 ${scaffold.color} rounded text-sm transition-colors`}
                    >
                        {scaffold.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
