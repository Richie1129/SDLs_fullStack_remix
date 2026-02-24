/**
 * 引導問題配置
 *
 * 符合 108 課綱探究與實作教學目標
 * 每個 Stage/SubStage 的引導問題
 *
 * 重要：fieldName 必須完全對應資料庫 userSubmit 的 key
 */

// 通用的「困難與解決」反思問題模板（加在每個 Stage 最後）
// 對應 108 課綱「後設認知」要求
const COMMON_REFLECTION_QUESTIONS = [
    {
        id: 'challenge',
        question: '這個階段中，你們遇到了什麼困難或挑戰嗎？',
        hint: '就算很小的問題也可以寫，這是教授最想看到的成長過程！例如：「找不到相關文獻」、「組員意見不同」、「實驗結果不如預期」',
        fieldName: '遇到的困難',
        inputType: 'textarea',
        required: false
    },
    {
        id: 'solution',
        question: '你們怎麼解決這個困難的？',
        hint: '過程可以很曲折，多試幾次也沒關係，這些嘗試都值得記錄。例如：「請教老師後調整方向」、「討論後投票決定」、「重新設計實驗」',
        fieldName: '解決方法',
        inputType: 'textarea',
        required: false
    },
    {
        id: 'learning',
        question: '這個經驗讓你學到什麼？',
        hint: '可以是技能上的學習，也可以是心態或方法上的體悟。例如：「學會使用統計軟體」、「了解團隊合作的重要性」、「發現要更仔細確認實驗條件」',
        fieldName: '學習心得',
        inputType: 'textarea',
        required: false
    }
];

/**
 * 所有 Stage 的引導問題配置
 *
 * fieldName 對應 projectController.js 中的 userSubmit key
 */
export const GUIDED_QUESTIONS = {
    // ============================================
    // Stage 1: 定標
    // ============================================
    '1-1': [
        {
            id: 'topic',
            question: '你想研究什麼主題？',
            hint: '盡量明確具體。例如：「探討高中生使用社群媒體對睡眠品質的影響」而不是「社群媒體研究」',
            fieldName: '提議主題',
            inputType: 'input',
            required: true
        },
        {
            id: 'source',
            question: '這個主題是從哪裡想到的？',
            hint: '可以是：課堂學習、生活觀察、新聞報導、書籍雜誌、或是想解決的問題',
            fieldName: '主題來源',
            inputType: 'input',
            required: true
        },
        {
            id: 'reason',
            question: '為什麼想研究這個主題？',
            hint: '說明你的興趣點、這個主題對你或社會的意義、或你想透過研究解決什麼問題',
            fieldName: '提議原因',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '1-2': [
        {
            id: 'title',
            question: '你的研究題目是什麼？',
            hint: '題目要能清楚表達研究的核心。格式建議：「探討 A 對 B 的影響」或「比較 X 與 Y 的差異」',
            fieldName: '提議題目',
            inputType: 'input',
            required: true
        },
        {
            id: 'purpose_reason',
            question: '為什麼這個研究目的很重要？',
            hint: '說明這個研究的價值：對知識的貢獻、對實務的幫助、或對社會的意義',
            fieldName: '提議原因',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'related',
            question: '你找到哪些相關資料或文獻？',
            hint: '列出你參考的書籍、論文、網站等，說明這些資料如何幫助你理解這個主題',
            fieldName: '相關資料',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '1-3': [
        {
            id: 'hypothesis',
            question: '你的研究假設是什麼？',
            hint: '用「如果...那麼...」的句型。例如：「如果光照時間越長，那麼綠豆發芽率會越高」',
            fieldName: '研究假設',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'variables',
            question: '你的研究有哪些變因？',
            hint: '操縱變因（你改變的）、應變變因（你測量的）、控制變因（你保持不變的）各是什麼？',
            fieldName: '對應的研究變因',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    // ============================================
    // Stage 2: 擇策
    // ============================================
    '2-1': [
        {
            id: 'materials',
            question: '你需要哪些研究材料和工具？',
            hint: '列出所有需要的器材、設備、材料。例如：「綠豆 100 顆、培養皿 10 個、LED 燈具、溫濕度計」',
            fieldName: '研究材料與工具',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'steps',
            question: '你的研究步驟是什麼？',
            hint: '按順序列出每個步驟，越詳細越好。想像你要讓別人能照著做出一樣的實驗',
            fieldName: '研究步驟',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'record_method',
            question: '你打算如何記錄研究過程和數據？',
            hint: '說明記錄的方式：用什麼表格、多久記錄一次、記錄哪些項目',
            fieldName: '記錄方式',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '2-2': [
        {
            id: 'data_collection',
            question: '你打算收集什麼資料？如何記錄？',
            hint: '說明你會記錄哪些數據或資訊，以及用什麼表格/工具記錄。例如：「使用 Google 表單收集問卷回應，每題記錄選項和數量」',
            fieldName: '資料收集方式',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'record_design',
            question: '請說明你設計的記錄表有哪些欄位？為什麼這樣設計？',
            hint: '說明表格的欄位設計邏輯。例如：「設計了日期、溫度、濕度、發芽數四個欄位，因為這些是控制變因和應變變因」',
            fieldName: '記錄表設計說明',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'sample_size',
            question: '你預計的樣本數量或資料規模是多少？',
            hint: '例如：「預計調查 50 人」、「觀察 10 次」、「收集 100 筆資料」、「重複實驗 3 次」',
            fieldName: '預計樣本規模',
            inputType: 'input',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '2-3': [
        {
            id: 'timeline',
            question: '你的研究時程規劃是什麼？',
            hint: '列出每週/每階段預計完成的工作。例如：「第 1-2 週：文獻回顧；第 3-4 週：實驗設計；第 5-8 週：資料收集」',
            fieldName: '時程規劃說明',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'division',
            question: '團隊成員的分工是什麼？誰負責什麼？',
            hint: '說明每個人的角色和責任。例如：「小明：實驗操作；小華：資料記錄；小美：資料分析」',
            fieldName: '團隊分工',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'milestones',
            question: '有哪些重要的里程碑或檢核點？',
            hint: '列出關鍵的時間節點和預期完成的事項。例如：「第 3 週完成問卷設計、第 5 週完成資料收集、第 7 週完成初稿」',
            fieldName: '重要里程碑',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    // ============================================
    // Stage 3: 監評
    // ============================================
    '3-1': [
        {
            id: 'pilot_process',
            question: '請描述這次嘗試性研究的做法',
            hint: '你們實際做了什麼？用什麼步驟進行？遇到什麼狀況？這是驗證研究方法是否可行的重要過程',
            fieldName: '嘗試性研究過程',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'pilot_result',
            question: '嘗試的結果如何？有什麼初步發現？',
            hint: '可以是成功的部分，也可以是發現的問題。例如：「發現問卷題目太多，受訪者容易失去耐心」',
            fieldName: '初步結果',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'adjustment',
            question: '根據嘗試結果，你們打算做什麼調整？',
            hint: '例如：「修改問卷題目」、「改變實驗條件」、「調整抽樣方式」、「增加樣本數」',
            fieldName: '調整計畫',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '3-2': [
        {
            id: 'data_description',
            question: '你們收集到了什麼資料？',
            hint: '描述資料的類型、數量、來源。例如：「收集了 52 份有效問卷，包含 15 道選擇題和 3 道開放題」',
            fieldName: '資料描述',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'analysis_method',
            question: '你們如何分析這些資料？',
            hint: '例如：「計算各選項的百分比」、「使用 Excel 計算平均值和標準差」、「進行 t 檢定比較兩組差異」',
            fieldName: '分析方法',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'chart_explanation',
            question: '你們製作了什麼圖表？圖表顯示了什麼？',
            hint: '描述圖表的類型和呈現的趨勢或發現。例如：「長條圖顯示男生比女生更常使用社群媒體」',
            fieldName: '圖表說明',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '3-3': [
        {
            id: 'result',
            question: '你們的主要研究成果是什麼？',
            hint: '用一句話概括你們最重要的發現',
            fieldName: '研究成果',
            inputType: 'input',
            required: true
        },
        {
            id: 'result_explanation',
            question: '請詳細說明這個成果的意義',
            hint: '用具體數據或事實來說明。這些發現代表什麼意義？為什麼會有這樣的結果？',
            fieldName: '結果說明',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'improvement',
            question: '研究過程中有什麼需要注意或改進的地方？',
            hint: '例如：「樣本數可以再增加」、「問卷題目可以更精確」、「實驗控制可以更嚴謹」',
            fieldName: '應注意和改進事項',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    // ============================================
    // Stage 4: 調節
    // ============================================
    '4-1': [
        {
            id: 'progress_check',
            question: '對照原本的計畫，目前的進度如何？',
            hint: '哪些完成了？哪些還沒完成？有延遲嗎？簡短回答即可',
            fieldName: '進度是否按規劃完成?',
            inputType: 'input',
            required: true
        },
        {
            id: 'improvement_plan',
            question: '如果有落後或問題，你們打算如何改進？',
            hint: '說明計畫與實際的差異，以及後續的調整方案。例如：「資料收集比預期慢，計畫延長一週，並增加組員幫忙」',
            fieldName: '如何改進獲改善?',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '4-2': [
        {
            id: 'discussion_content',
            question: '你們討論了什麼？有什麼重要的對話或決定？',
            hint: '記錄團隊討論的重點和達成的共識。例如：「討論了結論的寫法，決定先呈現主要發現再討論限制」',
            fieldName: '討論內容',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'different_views',
            question: '團隊成員有不同的看法嗎？如何協調？',
            hint: '記錄不同意見以及如何取得共識。不同的觀點是科學討論的重要部分',
            fieldName: '不同觀點',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'improvement_ideas',
            question: '討論後對研究有什麼改進的想法？',
            hint: '例如：「修正研究方法」、「補充資料」、「調整結論的陳述方式」',
            fieldName: '改進想法',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ],

    '4-3': [
        {
            id: 'conclusion',
            question: '你們的研究結論是什麼？',
            hint: '針對最初的研究問題，歸納出你們的答案。結論要能回應假設，並以數據支持',
            fieldName: '研究結論',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'contribution',
            question: '這個研究有什麼貢獻或價值？',
            hint: '說明這個研究對知識、實務、或社會的貢獻。例如：「提供了高中生社群媒體使用的實證資料」',
            fieldName: '研究貢獻',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'limitations',
            question: '這個研究有什麼限制或不足之處？',
            hint: '誠實說明研究的局限，這是學術誠信的表現。例如：「樣本只來自一所學校，可能無法推論到其他學校」',
            fieldName: '研究限制',
            inputType: 'textarea',
            required: true
        },
        {
            id: 'future_suggestions',
            question: '如果有人要繼續這個研究，你有什麼建議？',
            hint: '提出未來可以深入探討的方向。例如：「可以增加不同學校的樣本」、「可以使用質性訪談深入了解原因」',
            fieldName: '未來建議',
            inputType: 'textarea',
            required: true
        },
        ...COMMON_REFLECTION_QUESTIONS
    ]
};

/**
 * 取得特定 Stage 的引導問題
 * @param {string} stageKey - Stage key, 例如 '3-1'
 * @returns {Array} 引導問題陣列
 */
export const getGuidedQuestions = (stageKey) => {
    return GUIDED_QUESTIONS[stageKey] || [];
};

/**
 * Stage 名稱對照（對應 Portfolio 頁面的 stageDescriptions）
 */
export const STAGE_NAMES = {
    '1-1': '提出研究主題',
    '1-2': '提出研究目的',
    '1-3': '提出研究問題',
    '2-1': '訂定研究構想表',
    '2-2': '設計研究記錄表格',
    '2-3': '規劃研究排程',
    '3-1': '進行嘗試性研究',
    '3-2': '分析資料與繪圖',
    '3-3': '撰寫研究成果',
    '4-1': '檢視研究進度',
    '4-2': '進行研究討論',
    '4-3': '撰寫研究結論'
};

export default GUIDED_QUESTIONS;
