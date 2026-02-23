import React from 'react';

const TEMPLATES = [
  {
    id: 'classic',
    name: '典雅學術版',
    description: '白底深藍，清晰章節，適合備審資料',
    preview: (
      <div style={{ fontFamily: 'serif', padding: '8px', fontSize: '7px', lineHeight: '1.6', color: '#1a1a1a' }}>
        <div style={{ borderBottom: '1.5px solid #1e3a5f', paddingBottom: '4px', marginBottom: '4px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#1e3a5f' }}>專案名稱</div>
          <div style={{ color: '#555' }}>學生姓名 · 個人學習歷程</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '3px' }}>
          <div style={{ width: '2px', height: '8px', background: '#1e3a5f' }} />
          <div style={{ fontWeight: '700', color: '#1e3a5f', fontSize: '7.5px' }}>第一階段 · 定標階段</div>
        </div>
        <div style={{ background: '#1e3a5f', color: '#fff', padding: '2px 4px', borderRadius: '2px', fontSize: '6.5px', marginBottom: '2px' }}>正式提交</div>
        <div style={{ background: '#fafbfd', border: '1px solid #e8edf5', padding: '2px 3px', borderRadius: '2px', fontSize: '6.5px', color: '#555' }}>
          個人反思：「在這個階段我學到...」
        </div>
      </div>
    )
  },
  {
    id: 'modern',
    name: '現代活力版',
    description: '彩色卡片，進度視覺化，適合課堂展示',
    preview: (
      <div style={{ fontFamily: 'sans-serif', padding: '6px', fontSize: '7px' }}>
        <div style={{ background: 'linear-gradient(135deg, #5BA491, #3d8a75)', borderRadius: '4px', padding: '5px', color: '#fff', marginBottom: '4px' }}>
          <div style={{ fontSize: '9px', fontWeight: '800' }}>專案名稱</div>
          <div style={{ fontSize: '6.5px', opacity: 0.85 }}>學生姓名的個人學習歷程</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '4px', padding: '3px 4px', marginBottom: '3px', border: '1px solid #eee' }}>
          <div style={{ background: '#eee', borderRadius: '2px', height: '5px', overflow: 'hidden' }}>
            <div style={{ background: '#5BA491', width: '75%', height: '100%' }} />
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '4px', overflow: 'hidden', border: '1px solid #eee' }}>
          <div style={{ background: '#e8f5f1', borderBottom: '2px solid #5BA491', padding: '2px 4px', fontSize: '6.5px', fontWeight: '700', color: '#2d7a65' }}>
            🎯 定標階段
          </div>
          <div style={{ padding: '2px 4px', fontSize: '6px', color: '#555' }}>
            反思內容摘要...
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'timeline',
    name: '時間軸敘事版',
    description: '故事性時間軸，強調成長弧線',
    preview: (
      <div style={{ fontFamily: 'sans-serif', padding: '6px 6px 6px 14px', fontSize: '7px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '9px', top: '6px', bottom: '6px', width: '1.5px', background: 'linear-gradient(180deg, #5BA491, #9b59b6)' }} />
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontSize: '9px', fontWeight: '800', color: '#2c2c2c' }}>學生姓名</div>
          <div style={{ fontSize: '6.5px', color: '#888' }}>學習歷程紀錄</div>
          <div style={{ height: '2px', background: 'linear-gradient(90deg, #5BA491, #9b59b6)', borderRadius: '1px', marginTop: '2px' }} />
        </div>
        {['🎯 定標階段', '🗺️ 擇策階段'].map((s, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: '4px' }}>
            <div style={{ position: 'absolute', left: '-8.5px', top: '2px', width: '7px', height: '7px', background: ['#5BA491', '#4a7cc7'][i], borderRadius: '50%', border: '1px solid #fff' }} />
            <div style={{ fontWeight: '700', color: ['#2d7a65', '#2a5da8'][i], fontSize: '7px' }}>{s}</div>
            <div style={{ fontSize: '6px', color: '#888' }}>反思與提交摘要...</div>
          </div>
        ))}
      </div>
    )
  }
];

export default function TemplateSelector({ selected, onSelect }) {
  return (
    <div className="flex gap-stack-sm">
      {TEMPLATES.map(tpl => (
        <button
          key={tpl.id}
          onClick={() => onSelect(tpl.id)}
          className={`flex-1 rounded-lg border-2 overflow-hidden text-left transition-shadow duration-fast ${
            selected === tpl.id
              ? 'border-customgreen shadow-lg'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}
        >
          {/* 模板縮圖 */}
          <div className={`bg-gray-50 p-component-xs border-b ${selected === tpl.id ? 'border-customgreen/30' : 'border-gray-100'}`}
               style={{ height: '120px', overflow: 'hidden' }}>
            {tpl.preview}
          </div>

          {/* 模板資訊 */}
          <div className="p-component-sm">
            <div className={`flex items-center justify-between mb-1 ${selected === tpl.id ? 'text-customgreen' : 'text-gray-700'}`}>
              <span className="text-body-sm font-semibold">{tpl.name}</span>
              {selected === tpl.id && (
                <span className="text-xs bg-customgreen/10 text-customgreen px-2 py-0.5 rounded-full">已選</span>
              )}
            </div>
            <p className="text-caption text-gray-500 leading-relaxed">{tpl.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
