import React from 'react';
import PropTypes from 'prop-types';

/**
 * 通用表單輸入元件
 *
 * 根據 type 渲染不同的輸入元素：
 * - input: 單行文字輸入
 * - textarea: 多行文字輸入
 * - file: 檔案上傳
 */
export default function CommonInput({ handleChange, type, name, index }) {
    // 多行文字輸入
    if (type === 'textarea') {
        return (
            <div className="mb-4">
                <label className="block font-bold text-body text-gray-700 mb-2">
                    {name}
                </label>
                <textarea
                    className="w-full rounded-lg outline-none ring-2 ring-customgreen p-3
                               min-h-[120px] resize-y text-body-sm
                               focus:ring-customgreen/80 focus:shadow-md
                               transition-shadow duration-fast
                               placeholder:text-gray-400"
                    name={index}
                    onChange={handleChange}
                    placeholder={`請輸入${name}...`}
                    rows={4}
                />
            </div>
        );
    }

    // 檔案上傳
    if (type === 'file') {
        return (
            <div className="mb-4">
                <label className="block font-bold text-body text-gray-700 mb-2">
                    {name}
                </label>
                <div className="relative">
                    <input
                        className="w-full rounded-lg outline-none ring-2 ring-customgreen p-2
                                   text-body-sm file:mr-4 file:py-2 file:px-4
                                   file:rounded-lg file:border-0
                                   file:text-body-sm file:font-semibold
                                   file:bg-customgreen/10 file:text-customgreen
                                   hover:file:bg-customgreen/20
                                   cursor-pointer"
                        type="file"
                        name={index}
                        onChange={handleChange}
                    />
                </div>
                <p className="mt-1 text-caption text-gray-500">
                    支援 PDF、Word、Excel、圖片等格式，單檔最大 100MB
                </p>
            </div>
        );
    }

    // 單行文字輸入（預設）
    return (
        <div className="mb-4">
            <label className="block font-bold text-body text-gray-700 mb-2">
                {name}
            </label>
            <input
                className="w-full rounded-lg outline-none ring-2 ring-customgreen p-2
                           text-body-sm
                           focus:ring-customgreen/80 focus:shadow-md
                           transition-shadow duration-fast
                           placeholder:text-gray-400"
                type="text"
                name={index}
                onChange={handleChange}
                placeholder={`請輸入${name}...`}
            />
        </div>
    );
}

CommonInput.propTypes = {
    handleChange: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['input', 'textarea', 'file']).isRequired,
    name: PropTypes.string.isRequired,
    index: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};
