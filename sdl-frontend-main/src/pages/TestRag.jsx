import React, { useState } from 'react';
import axios from 'axios';

const TestRag = () => {
    const [question, setQuestion] = useState('');
    const [datasetIds, setDatasetIds] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            // Parse dataset IDs
            const ids = datasetIds.split(',').map(id => id.trim()).filter(id => id);
            
            if (ids.length === 0) {
                throw new Error("請輸入至少一個 Dataset ID");
            }

            // Call the backend proxy
            // Note: The proxy is mounted at /proxy/api/v1/chats
            // And we added /retrieval to the router
            // We use axios directly to avoid apiClient's /api baseURL prefix
            const response = await axios.post('/proxy/api/v1/chats/retrieval', {
                question: question,
                dataset_ids: ids
            });

            setResults(response.data);
        } catch (err) {
            console.error("Search failed:", err);
            setError(err.message || "搜尋失敗");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-component-lg max-w-4xl mx-auto">
            <h1 className="text-h2 font-bold mb-6">RAGFlow 召回測試 (Retrieval Test)</h1>
            
            <div className="bg-white p-component-md-lg rounded-lg shadow-md mb-6">
                <div className="mb-4">
                    <label className="block text-body-sm font-medium text-gray-700 mb-1">
                        查詢詞 (Question)
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="w-full p-component-xs border border-gray-300 rounded-md"
                        placeholder="輸入你想查詢的問題..."
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-body-sm font-medium text-gray-700 mb-1">
                        Dataset IDs (逗號分隔)
                    </label>
                    <input
                        type="text"
                        value={datasetIds}
                        onChange={(e) => setDatasetIds(e.target.value)}
                        className="w-full p-component-xs border border-gray-300 rounded-md"
                        placeholder="例如: dataset_1, dataset_2"
                    />
                    <p className="text-caption text-gray-500 mt-1">
                        請輸入目標知識庫的 ID。
                    </p>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={loading || !question || !datasetIds}
                    className={`px-4 py-2 rounded-md text-white ${
                        loading || !question || !datasetIds
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {loading ? '搜尋中...' : '開始召回測試'}
                </button>

                {error && (
                    <div className="mt-4 p-component-sm bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}
            </div>

            {results && (
                <div className="bg-white p-component-md-lg rounded-lg shadow-md">
                    <h2 className="text-h3 font-semibold mb-4">搜尋結果</h2>
                    
                    {results.chunks && results.chunks.length > 0 ? (
                        <div className="space-y-stack-sm">
                            {results.chunks.map((chunk, index) => (
                                <div key={index} className="border p-component-base rounded-md hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-block px-2 py-1 text-caption font-semibold bg-blue-100 text-blue-800 rounded">
                                            相似度: {(chunk.similarity * 100).toFixed(1)}%
                                        </span>
                                        <span className="text-caption text-gray-500">
                                            {chunk.document_name || '未知文件'}
                                        </span>
                                    </div>
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                        {chunk.content_with_weight || chunk.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">沒有找到相關結果。</p>
                    )}

                    <div className="mt-6 p-component-base bg-gray-100 rounded overflow-auto max-h-60">
                        <h3 className="text-body-sm font-bold mb-2">原始 JSON 回應:</h3>
                        <pre className="text-caption">{JSON.stringify(results, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestRag;