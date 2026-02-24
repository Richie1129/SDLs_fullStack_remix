const axios = require('axios');
require('dotenv').config();

// 測試函數
async function testVLLMAPI(baseUrl, modelName, apiKey, name) {
  console.log(`\n=== 測試 ${name} ===`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Model: ${modelName}`);
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'Not set'}`);
  
  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: '你是一位專業的助手。請使用繁體中文回答。'
          },
          {
            role: 'user',
            content: '請用一句話介紹自己。'
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超時
      }
    );
    
    console.log('✅ 成功！');
    console.log('回應:', response.data.choices[0].message.content);
    console.log('模型:', response.data.model);
    return true;
  } catch (error) {
    console.error('❌ 失敗！');
    if (error.response) {
      console.error('狀態碼:', error.response.status);
      console.error('錯誤訊息:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('無回應（可能是網路問題或 URL 錯誤）');
      console.error('錯誤:', error.message);
    } else {
      console.error('錯誤:', error.message);
    }
    return false;
  }
}

// 測試 Gemma-3 (earth-vllmapi)
async function testGemma3Earth() {
  return await testVLLMAPI(
    'https://earth-vllmapi.agenticgrader.com/v1',
    'ISTA-DASLab/gemma-3-27b-it-GPTQ-4b-128g',
    process.env.VLLM_API_KEY,
    'Gemma-3 (earth-vllmapi)'
  );
}

// 測試當前環境變數配置
async function testCurrentVLLM() {
  return await testVLLMAPI(
    process.env.VLLM_BASE_URL,
    process.env.VLLM_MODEL_NAME,
    process.env.VLLM_API_KEY,
    'Current VLLM Config (.env)'
  );
}

// 測試 GPT-OSS-20b
async function testGPTOSS() {
  return await testVLLMAPI(
    process.env.HSUEH_VLLM_BASE_URL,
    process.env.HSUEH_VLLM_MODEL_NAME,
    process.env.HSUEH_VLLM_API_KEY,
    'GPT-OSS-20b (Hsueh)'
  );
}

// 列出可用模型
async function listModels(baseUrl, apiKey, name) {
  console.log(`\n=== 列出 ${name} 可用模型 ===`);
  try {
    const response = await axios.get(
      `${baseUrl}/models`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 10000
      }
    );
    console.log('✅ 可用模型:');
    response.data.data.forEach(model => {
      console.log(`  - ${model.id}`);
    });
    return true;
  } catch (error) {
    console.error('❌ 無法列出模型');
    console.error('錯誤:', error.message);
    return false;
  }
}

// 主測試流程
async function main() {
  console.log('========================================');
  console.log('🧪 vLLM API 連線測試');
  console.log('========================================');
  
  // 測試當前配置
  const currentSuccess = await testCurrentVLLM();
  
  // 測試 Gemma-3 Earth
  const gemma3Success = await testGemma3Earth();
  
  // 測試 GPT-OSS-20b
  const gptOssSuccess = await testGPTOSS();
  
  // 列出可用模型
  await listModels(process.env.VLLM_BASE_URL, process.env.VLLM_API_KEY, 'VLLM');
  await listModels('https://earth-vllmapi.agenticgrader.com/v1', process.env.VLLM_API_KEY, 'Earth-VLLM');
  await listModels(process.env.HSUEH_VLLM_BASE_URL, process.env.HSUEH_VLLM_API_KEY, 'Hsueh-VLLM');
  
  // 總結
  console.log('\n========================================');
  console.log('📊 測試總結');
  console.log('========================================');
  console.log(`當前 VLLM 配置: ${currentSuccess ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`Gemma-3 (earth-vllmapi): ${gemma3Success ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`GPT-OSS-20b (Hsueh): ${gptOssSuccess ? '✅ 可用' : '❌ 不可用'}`);
  
  if (!gemma3Success) {
    console.log('\n⚠️  Gemma-3 連線失敗可能原因：');
    console.log('1. API Key 不正確或已過期');
    console.log('2. 模型名稱錯誤（需要確認正確的模型 ID）');
    console.log('3. Base URL 不正確');
    console.log('4. 網路連線問題');
    console.log('\n建議：請檢查 earth-vllmapi.agenticgrader.com 是否支援 Gemma-3 模型');
  }
}

// 執行測試
main().catch(console.error);
