#!/bin/bash

# 安裝 Python 依賴的腳本

echo "正在安裝 5Rs 反思功能所需的 Python 依賴..."

# 檢查 Python 是否已安裝
if ! command -v python3 &> /dev/null
then
    echo "錯誤: Python3 未安裝。請先安裝 Python3。"
    exit 1
fi

# 檢查 pip 是否已安裝
if ! command -v pip3 &> /dev/null
then
    echo "錯誤: pip3 未安裝。請先安裝 pip3。"
    exit 1
fi

# 安裝必要的 Python 套件
echo "安裝 python-dotenv..."
pip3 install python-dotenv

echo "安裝 google-genai..."
pip3 install google-genai

echo "安裝完成！"
echo ""
echo "請確保在您的 .env 檔案中設定以下環境變數："
echo "OPENAI_API_KEY=your_openai_api_key_here"
echo "GEMINI_API_KEY=your_gemini_api_key_here"
echo ""
echo "5Rs 反思功能現在已經可以使用了！"
