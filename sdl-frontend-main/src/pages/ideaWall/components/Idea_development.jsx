import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Idea_development = ({ nodeInfo, onClose, onNewNode }) => {
    const [isLoading, setIsLoading] = useState(false);

    const generateIdea = async () => {
        try {
            setIsLoading(true);
            const response = await axios.post('https://sdlswuret.com/api/llm/generate-idea', {
                title: nodeInfo.title,
                content: nodeInfo.content
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data) {
                const newNodeData = {
                    title: response.data.title,
                    content: response.data.content,
                    from_id: nodeInfo.id,
                    ideaWallId: nodeInfo.ideaWallId,
                    owner: "想法發展助手",
                    projectId: nodeInfo.projectId,
                    colorindex: localStorage.getItem("id")
                };
                
                onNewNode(newNodeData);
                onClose();
                toast.success('成功生成新的想法！');
            }
        } catch (error) {
            console.error('Error generating idea:', error);
            toast.error('生成想法時發生錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <h3 className="text-lg font-bold mb-4">AI 輔助想法發展</h3>
            <div className="mb-4">
                <p className="font-semibold">原始想法：</p>
                <p className="text-gray-700">{nodeInfo.title}</p>
                <p className="text-gray-600 mt-2">{nodeInfo.content}</p>
            </div>
            <div className="flex justify-end space-x-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                    取消
                </button>
                <button
                    onClick={generateIdea}
                    disabled={isLoading}
                    className="px-4 py-2 bg-customgreen text-white rounded hover:bg-opacity-90 disabled:opacity-50"
                >
                    {isLoading ? '生成中...' : '生成新想法'}
                </button>
            </div>
        </div>
    );
};

export default Idea_development; 