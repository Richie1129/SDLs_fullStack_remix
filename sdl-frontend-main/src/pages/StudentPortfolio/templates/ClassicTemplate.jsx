/**
 * 模板 A：典雅學術版
 * 白底深藍，清晰章節結構，適合備審資料與正式評量
 */

import React from 'react';
import NarrativeRenderer from '../components/NarrativeRenderer';

const STAGE_COLORS = {
  1: '#1e3a5f',
  2: '#1e3a5f',
  3: '#1e3a5f',
  4: '#1e3a5f'
};

export default function ClassicTemplate({ data, narrative }) {
  if (!data) return null;
  const { student, project, stages, freeReflections, completeness, ideaWallChats, aiAssistantSessions } = data;

  return (
    <div className="classic-template" style={{
      fontFamily: '"Noto Serif TC", "Georgia", serif',
      color: '#1a1a1a',
      background: '#fff',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '20mm 18mm',
      boxSizing: 'border-box',
      fontSize: '10.5pt',
      lineHeight: '1.8'
    }}>

      {/* 封面 — 佔滿整頁 (高度 = 297mm - 上下 padding 40mm = 257mm) */}
      <div style={{
        height: '257mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        borderBottom: '2px solid #1e3a5f',
        pageBreakAfter: 'always'
      }}>
        {/* 頂部裝飾 */}
        <div style={{ marginBottom: '16mm' }}>
          <div style={{ width: '60px', height: '4px', background: '#1e3a5f', borderRadius: '2px', margin: '0 auto 4mm' }} />
          <div style={{ fontSize: '9pt', letterSpacing: '5px', color: '#888', textTransform: 'uppercase' }}>
            Personal Learning Portfolio
          </div>
        </div>

        {/* 主標題區塊 */}
        <div style={{ marginBottom: '12mm' }}>
          <div style={{ fontSize: '9pt', letterSpacing: '3px', color: '#999', marginBottom: '5mm' }}>
            自主學習歷程檔案
          </div>
          <div style={{ fontSize: '24pt', fontWeight: '700', color: '#1e3a5f', lineHeight: '1.3', marginBottom: '4mm', maxWidth: '140mm' }}>
            {project.name}
          </div>
          <div style={{ width: '40px', height: '2px', background: '#1e3a5f50', margin: '0 auto 5mm' }} />
          <div style={{ fontSize: '15pt', color: '#333', fontWeight: '400' }}>
            {student.username} 個人學習歷程
          </div>
        </div>

        {/* 個人資訊 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10mm', fontSize: '9.5pt', color: '#555', marginBottom: '8mm', flexWrap: 'wrap' }}>
          {student.class && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
              <span style={{ color: '#1e3a5f', fontWeight: '600' }}>班級</span>　{student.class}
            </span>
          )}
          {student.seatNumber && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
              <span style={{ color: '#1e3a5f', fontWeight: '600' }}>座號</span>　{student.seatNumber}
            </span>
          )}
          {project.mentor && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
              <span style={{ color: '#1e3a5f', fontWeight: '600' }}>指導教師</span>　{project.mentor}
            </span>
          )}
        </div>

        {/* 完成度徽章 */}
        <div style={{
          display: 'inline-block',
          border: '1px solid #c8d4e8',
          borderRadius: '20px',
          padding: '2mm 8mm',
          fontSize: '9pt',
          color: '#1e3a5f',
          background: '#f0f4fa',
          marginBottom: '16mm'
        }}>
          已完成 {completeness.completedSubmitCount} / {completeness.totalSubStages} 個子階段提交
        </div>

        {/* 底部日期 */}
        <div style={{ fontSize: '8.5pt', color: '#bbb', letterSpacing: '1px' }}>
          {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* AI 生成學習敘事 */}
      {narrative && (
        <div style={{ marginBottom: '10mm' }}>
          <SectionTitle>學習歷程總述</SectionTitle>
          <div style={{ background: '#f8f9fc', borderLeft: '4px solid #1e3a5f', padding: '6mm 8mm' }}>
            <NarrativeRenderer narrative={narrative} accentColor="#1e3a5f" baseFontSize="10pt" />
          </div>
        </div>
      )}

      {/* 四個階段 */}
      {stages.map(stage => (
        <StageSection key={stage.stageNumber} stage={stage} />
      ))}

      {/* 自由反思 */}
      {freeReflections.length > 0 && (
        <div style={{ marginBottom: '8mm' }}>
          <SectionTitle>跨階段自由省思</SectionTitle>
          {freeReflections.map((r, i) => (
            <ReflectionCard key={i} reflection={r} />
          ))}
        </div>
      )}

      {/* 想法牆討論記錄 */}
      {ideaWallChats && ideaWallChats.length > 0 && (
        <div style={{ marginBottom: '8mm' }}>
          <SectionTitle>想法牆記錄</SectionTitle>
          {ideaWallChats.map((iw, i) => (
            <div key={i} style={{ marginBottom: '5mm', border: '1px solid #d0d7e3', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: '#f0f4fa', padding: '2.5mm 6mm', fontSize: '9.5pt', fontWeight: '700', color: '#1e3a5f', borderBottom: '1px solid #d0d7e3' }}>
                {iw.ideaWallName}
                {iw.ideaWallStage && <span style={{ fontWeight: '400', color: '#888', marginLeft: '3mm', fontSize: '9pt' }}>（{iw.ideaWallStage}）</span>}
                <span style={{ fontWeight: '400', color: '#aaa', fontSize: '8.5pt', marginLeft: '3mm' }}>
                  {iw.nodes.length > 0 && `${iw.nodes.length} 個節點`}
                  {iw.nodes.length > 0 && iw.messages.filter(m => !m.isAiIntervention).length > 0 && '・'}
                  {iw.messages.filter(m => !m.isAiIntervention).length > 0 && `${iw.messages.filter(m => !m.isAiIntervention).length} 則討論`}
                </span>
              </div>
              <div style={{ padding: '4mm 6mm' }}>
                {/* 節點內容 */}
                {iw.nodes.length > 0 && (
                  <div style={{ marginBottom: iw.messages.filter(m => !m.isAiIntervention).length > 0 ? '4mm' : '0' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2.5mm' }}>想法節點</div>
                    {iw.nodes.map((n, j) => (
                      <div key={j} style={{ marginBottom: '2.5mm', paddingLeft: '3mm', borderLeft: '2px solid #1e3a5f40' }}>
                        <div style={{ fontWeight: '600', fontSize: '9.5pt', color: '#1e3a5f' }}>💡 {n.title}</div>
                        {n.content && <div style={{ fontSize: '9pt', color: '#444', marginTop: '0.5mm' }}>{String(n.content).slice(0, 250)}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {/* 討論訊息 */}
                {iw.messages.filter(m => !m.isAiIntervention).length > 0 && (
                  <div>
                    <div style={{ fontSize: '8.5pt', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2.5mm' }}>討論留言</div>
                    {iw.messages.filter(m => !m.isAiIntervention).slice(0, 6).map((m, j) => (
                      <div key={j} style={{ marginBottom: '2mm', paddingLeft: '3mm', borderLeft: '2px solid #c8d4e8', fontSize: '9pt', color: '#333' }}>
                        {m.content.slice(0, 200)}
                        <span style={{ color: '#ccc', fontSize: '8pt', marginLeft: '2mm' }}>
                          {new Date(m.createdAt).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                    ))}
                    {iw.messages.filter(m => !m.isAiIntervention).length > 6 && (
                      <div style={{ fontSize: '8.5pt', color: '#aaa', marginTop: '1mm' }}>...共 {iw.messages.filter(m => !m.isAiIntervention).length} 則</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 科學助手對話摘要 */}
      {aiAssistantSessions && aiAssistantSessions.length > 0 && (() => {
        const totalQ = aiAssistantSessions.reduce((acc, s) => acc + s.exchanges.length, 0);
        const allQuestions = aiAssistantSessions.flatMap(s => s.exchanges.map(e => e.question));
        const displayQ = allQuestions.slice(0, 18);
        return (
          <div style={{ marginBottom: '8mm' }}>
            <SectionTitle>科學助手提問記錄</SectionTitle>
            <div style={{ border: '1px solid #d0d7e3', borderRadius: '4px', overflow: 'hidden' }}>
              {/* 統計列 */}
              <div style={{ background: '#f0f4fa', padding: '3mm 6mm', display: 'flex', gap: '8mm', alignItems: 'center', borderBottom: '1px solid #d0d7e3' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16pt', fontWeight: '700', color: '#1e3a5f', lineHeight: '1' }}>{aiAssistantSessions.length}</div>
                  <div style={{ fontSize: '8pt', color: '#888', marginTop: '0.5mm' }}>次對話</div>
                </div>
                <div style={{ width: '1px', height: '10mm', background: '#d0d7e3' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16pt', fontWeight: '700', color: '#1e3a5f', lineHeight: '1' }}>{totalQ}</div>
                  <div style={{ fontSize: '8pt', color: '#888', marginTop: '0.5mm' }}>個提問</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '8.5pt', color: '#aaa' }}>
                  {new Date(aiAssistantSessions[0].createdAt).toLocaleDateString('zh-TW')} 起
                </div>
              </div>
              {/* 提問列表 */}
              <div style={{ padding: '4mm 6mm' }}>
                <div style={{ fontSize: '8.5pt', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3mm' }}>提問紀錄</div>
                <div style={{ columns: '2', columnGap: '6mm' }}>
                  {displayQ.map((q, i) => (
                    <div key={i} style={{ breakInside: 'avoid', marginBottom: '2mm', fontSize: '9pt', color: '#333', display: 'flex', gap: '2mm' }}>
                      <span style={{ color: '#1e3a5f', fontWeight: '600', flexShrink: 0 }}>{i + 1}.</span>
                      <span>{q.slice(0, 80)}{q.length > 80 ? '…' : ''}</span>
                    </div>
                  ))}
                </div>
                {allQuestions.length > 18 && (
                  <div style={{ fontSize: '8.5pt', color: '#aaa', marginTop: '2mm' }}>...及另外 {allQuestions.length - 18} 個提問</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 頁腳 */}
      <div style={{ borderTop: '1px solid #ddd', marginTop: '12mm', paddingTop: '4mm', fontSize: '8pt', color: '#aaa', textAlign: 'center' }}>
        {student.username} · {project.name} · 個人學習歷程 · 製作於 {new Date().toLocaleDateString('zh-TW')}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginBottom: '5mm', marginTop: '8mm' }}>
      <div style={{ width: '4px', height: '18px', background: '#1e3a5f', borderRadius: '2px' }} />
      <h2 style={{ margin: 0, fontSize: '13pt', fontWeight: '700', color: '#1e3a5f' }}>{children}</h2>
    </div>
  );
}

function StageSection({ stage }) {
  const hasContent = stage.reflections.length > 0 || stage.submits.length > 0 || stage.nodes.length > 0;

  return (
    <div style={{ marginBottom: '10mm', pageBreakInside: 'avoid' }}>
      <div style={{ background: '#1e3a5f', color: '#fff', padding: '3mm 6mm', borderRadius: '4px 4px 0 0', fontSize: '11pt', fontWeight: '700' }}>
        第 {stage.stageNumber} 階段 · {stage.stageTitle}
      </div>
      <div style={{ border: '1px solid #d0d7e3', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '6mm 8mm' }}>
        {!hasContent && (
          <p style={{ color: '#aaa', fontSize: '9pt', margin: 0 }}>本階段尚無記錄</p>
        )}

        {/* 正式提交 */}
        {stage.submits.length > 0 && (
          <div style={{ marginBottom: '5mm' }}>
            <SubTitle>正式提交</SubTitle>
            {stage.submits.map((s, i) => (
              <div key={i} style={{ marginBottom: '3mm', paddingLeft: '4mm', borderLeft: '2px solid #c8d4e8' }}>
                <div style={{ fontWeight: '600', fontSize: '9.5pt', color: '#1e3a5f' }}>{s.stage} {s.stageTitle}</div>
                {s.content && typeof s.content === 'object'
                  ? Object.entries(s.content).map(([k, v]) => v ? (
                      <div key={k} style={{ fontSize: '9pt', color: '#333', marginTop: '1mm' }}>
                        <span style={{ color: '#666' }}>{k}：</span>{String(v).slice(0, 400)}
                      </div>
                    ) : null)
                  : <div style={{ fontSize: '9pt', color: '#333' }}>{String(s.content || '').slice(0, 400)}</div>
                }
              </div>
            ))}
          </div>
        )}

        {/* 個人反思 */}
        {stage.reflections.length > 0 && (
          <div style={{ marginBottom: '5mm' }}>
            <SubTitle>個人反思</SubTitle>
            {stage.reflections.map((r, i) => (
              <ReflectionCard key={i} reflection={r} />
            ))}
          </div>
        )}

        {/* 想法牆貢獻 */}
        {stage.nodes.length > 0 && (
          <div>
            <SubTitle>想法牆貢獻節點</SubTitle>
            {stage.nodes.map((n, i) => (
              <div key={i} style={{ marginBottom: '3mm', paddingLeft: '4mm', borderLeft: '2px solid #c8d4e8' }}>
                <div style={{ fontWeight: '600', fontSize: '9.5pt', color: '#1e3a5f', marginBottom: '0.5mm' }}>💡 {n.title}</div>
                {n.content && (
                  <div style={{ fontSize: '9pt', color: '#444', lineHeight: '1.6' }}>{String(n.content).slice(0, 300)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubTitle({ children }) {
  return <div style={{ fontSize: '9pt', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3mm' }}>{children}</div>;
}

function ReflectionCard({ reflection }) {
  return (
    <div style={{ marginBottom: '4mm', padding: '4mm 5mm', background: '#fafbfd', border: '1px solid #e8edf5', borderRadius: '4px' }}>
      <div style={{ fontWeight: '600', fontSize: '9.5pt', color: '#333', marginBottom: '2mm' }}>
        {reflection.title}
        <span style={{ fontWeight: '400', color: '#aaa', fontSize: '8.5pt', marginLeft: '3mm' }}>
          {new Date(reflection.createdAt).toLocaleDateString('zh-TW')}
        </span>
      </div>
      {reflection.is5Rs && reflection.data5Rs ? (
        <div style={{ fontSize: '9pt' }}>
          {Object.entries(reflection.data5Rs).map(([key, val]) => val ? (
            <div key={key} style={{ marginBottom: '1.5mm' }}>
              <span style={{ color: '#1e3a5f', fontWeight: '600', textTransform: 'capitalize' }}>{key}：</span>
              <span style={{ color: '#333' }}>「{String(val).slice(0, 200)}」</span>
            </div>
          ) : null)}
        </div>
      ) : (
        <div style={{ fontSize: '9pt', color: '#444', fontStyle: 'italic' }}>
          「{reflection.textContent.slice(0, 300)}」
        </div>
      )}
    </div>
  );
}
