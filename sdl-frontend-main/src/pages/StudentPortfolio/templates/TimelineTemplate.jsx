/**
 * 模板 C：時間軸敘事版
 * 左側時間軸貫穿，強調成長弧線與學習故事，適合自我回顧
 */

import React from 'react';
import NarrativeRenderer from '../components/NarrativeRenderer';

const TIMELINE_COLORS = ['#5BA491', '#4a7cc7', '#e08b2a', '#9b59b6'];
const STAGE_ICONS = { 1: '🎯', 2: '🗺️', 3: '🔬', 4: '🔄' };

export default function TimelineTemplate({ data, narrative }) {
  if (!data) return null;
  const { student, project, stages, freeReflections, completeness, ideaWallChats, aiAssistantSessions } = data;

  return (
    <div style={{
      fontFamily: '"Noto Sans TC", "system-ui", sans-serif',
      color: '#2c2c2c',
      background: '#fff',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '16mm 16mm',
      boxSizing: 'border-box',
      fontSize: '10pt',
      lineHeight: '1.8'
    }}>

      {/* 封面 */}
      <div style={{ marginBottom: '12mm' }}>
        <div style={{ fontSize: '8pt', letterSpacing: '4px', color: '#aaa', marginBottom: '3mm' }}>
          PERSONAL LEARNING PORTFOLIO
        </div>
        <div style={{ fontSize: '24pt', fontWeight: '800', color: '#2c2c2c', lineHeight: '1.2', marginBottom: '3mm' }}>
          {student.username} 的<br />學習歷程紀錄
        </div>
        <div style={{ fontSize: '11pt', color: '#666', marginBottom: '6mm' }}>{project.name}</div>
        <div style={{ display: 'flex', gap: '6mm', fontSize: '9pt', color: '#888', flexWrap: 'wrap' }}>
          {student.class && <span>班級：{student.class}</span>}
          {student.seatNumber && <span>座號：{student.seatNumber}</span>}
          {project.mentor && <span>指導：{project.mentor}</span>}
          <span>完成 {completeness.completedSubmitCount}/{completeness.totalSubStages} 項提交</span>
        </div>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #5BA491, #9b59b6)', borderRadius: '2px', marginTop: '5mm' }} />
      </div>

      {/* AI 學習敘事 */}
      {narrative && (
        <div style={{ marginBottom: '10mm', padding: '6mm 8mm', background: '#f8fdfb', border: '1px solid #c8e6dc', borderRadius: '8px' }}>
          <div style={{ fontSize: '11pt', fontWeight: '700', color: '#5BA491', marginBottom: '4mm' }}>✨ 學習旅程總述</div>
          <NarrativeRenderer narrative={narrative} accentColor="#5BA491" baseFontSize="10pt" />
        </div>
      )}

      {/* 時間軸主體 */}
      <div style={{ position: 'relative', paddingLeft: '14mm' }}>

        {/* 左側垂直軸線 */}
        <div style={{
          position: 'absolute', left: '5mm', top: '0', bottom: '0',
          width: '2px',
          background: 'linear-gradient(180deg, #5BA491, #4a7cc7, #e08b2a, #9b59b6)',
          borderRadius: '2px'
        }} />

        {stages.map((stage, index) => {
          const color = TIMELINE_COLORS[index];
          const hasContent = stage.reflections.length > 0 || stage.submits.length > 0 || stage.nodes.length > 0;

          return (
            <div key={stage.stageNumber} style={{ marginBottom: '10mm', position: 'relative', pageBreakInside: 'avoid' }}>
              {/* 時間軸節點 */}
              <div style={{
                position: 'absolute', left: '-10.5mm', top: '3mm',
                width: '11px', height: '11px',
                background: color, borderRadius: '50%',
                border: '2px solid #fff',
                boxShadow: `0 0 0 2px ${color}`
              }} />

              {/* 階段標題 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginBottom: '4mm' }}>
                <span style={{ fontSize: '16pt' }}>{STAGE_ICONS[stage.stageNumber]}</span>
                <div>
                  <div style={{ fontSize: '8pt', color: color, fontWeight: '700', letterSpacing: '1px' }}>
                    STAGE {stage.stageNumber}
                  </div>
                  <div style={{ fontSize: '14pt', fontWeight: '800', color: '#2c2c2c' }}>
                    {stage.stageTitle}
                  </div>
                </div>
              </div>

              {!hasContent ? (
                <div style={{ padding: '3mm 5mm', background: '#f8f8f8', borderRadius: '6px', fontSize: '9pt', color: '#bbb', fontStyle: 'italic' }}>
                  本階段尚無個人記錄
                </div>
              ) : (
                <div>
                  {/* 正式提交 */}
                  {stage.submits.length > 0 && (
                    <div style={{ marginBottom: '4mm' }}>
                      <TimelineSubTitle color={color}>正式提交成果</TimelineSubTitle>
                      {stage.submits.map((s, i) => (
                        <div key={i} style={{ marginBottom: '2mm', paddingLeft: '4mm', borderLeft: `2px solid ${color}33`, fontSize: '9pt' }}>
                          <span style={{ fontWeight: '700', color }}>{s.stage} {s.stageTitle}：</span>
                          {s.content && typeof s.content === 'object'
                            ? Object.entries(s.content)
                                .filter(([, v]) => v)
                                .slice(0, 2)
                                .map(([k, v]) => (
                                  <span key={k} style={{ color: '#555' }}>{String(v).slice(0, 150)} </span>
                                ))
                            : <span style={{ color: '#555' }}>{String(s.content || '').slice(0, 200)}</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 反思 */}
                  {stage.reflections.length > 0 && (
                    <div style={{ marginBottom: '4mm' }}>
                      <TimelineSubTitle color={color}>個人反思與省思</TimelineSubTitle>
                      {stage.reflections.map((r, i) => (
                        <TimelineReflectionCard key={i} reflection={r} color={color} />
                      ))}
                    </div>
                  )}

                  {/* 想法牆 */}
                  {stage.nodes.length > 0 && (
                    <div>
                      <TimelineSubTitle color={color}>想法牆貢獻</TimelineSubTitle>
                      {stage.nodes.map((n, i) => (
                        <div key={i} style={{ marginBottom: '2mm', paddingLeft: '4mm', borderLeft: `2px solid ${color}50`, fontSize: '9pt' }}>
                          <div style={{ fontWeight: '700', color }}>💡 {n.title}</div>
                          {n.content && <div style={{ color: '#555', marginTop: '0.5mm' }}>{String(n.content).slice(0, 200)}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 自由反思節點 */}
        {freeReflections.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '6mm' }}>
            <div style={{
              position: 'absolute', left: '-10.5mm', top: '3mm',
              width: '11px', height: '11px',
              background: '#888', borderRadius: '50%',
              border: '2px solid #fff', boxShadow: '0 0 0 2px #888'
            }} />
            <div style={{ fontSize: '12pt', fontWeight: '700', color: '#666', marginBottom: '4mm' }}>🌟 跨階段自由省思</div>
            {freeReflections.map((r, i) => (
              <TimelineReflectionCard key={i} reflection={r} color="#888" />
            ))}
          </div>
        )}

        {/* 想法牆記錄 */}
        {ideaWallChats && ideaWallChats.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '8mm' }}>
            <div style={{
              position: 'absolute', left: '-10.5mm', top: '3mm',
              width: '11px', height: '11px',
              background: '#4a7cc7', borderRadius: '50%',
              border: '2px solid #fff', boxShadow: '0 0 0 2px #4a7cc7'
            }} />
            <div style={{ fontSize: '12pt', fontWeight: '700', color: '#4a7cc7', marginBottom: '4mm' }}>📌 想法牆記錄</div>
            {ideaWallChats.map((iw, i) => (
              <div key={i} style={{ marginBottom: '3mm', padding: '3mm 5mm', background: '#f0f5fd', borderRadius: '6px', borderLeft: '3px solid #4a7cc7' }}>
                <div style={{ fontWeight: '700', fontSize: '9.5pt', color: '#2a5da8', marginBottom: '2mm', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{iw.ideaWallName}{iw.ideaWallStage && <span style={{ fontWeight: '400', color: '#999', marginLeft: '2mm', fontSize: '8.5pt' }}>· {iw.ideaWallStage}</span>}</span>
                  <span style={{ fontWeight: '400', color: '#aaa', fontSize: '8.5pt' }}>{iw.nodes.length > 0 && `${iw.nodes.length}節點`}{iw.nodes.length > 0 && iw.messages.filter(m=>!m.isAiIntervention).length > 0 && ' · '}{iw.messages.filter(m=>!m.isAiIntervention).length > 0 && `${iw.messages.filter(m=>!m.isAiIntervention).length}則討論`}</span>
                </div>
                {iw.nodes.length > 0 && (
                  <div style={{ marginBottom: iw.messages.filter(m=>!m.isAiIntervention).length > 0 ? '3mm' : '0' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: '700', color: '#4a7cc7', marginBottom: '1.5mm' }}>想法節點</div>
                    {iw.nodes.map((n, j) => (
                      <div key={j} style={{ marginBottom: '2mm', paddingLeft: '3mm', borderLeft: '1px solid #4a7cc750', fontSize: '9pt' }}>
                        <div style={{ fontWeight: '700', color: '#2a5da8' }}>💡 {n.title}</div>
                        {n.content && <div style={{ color: '#555', marginTop: '0.5mm' }}>{String(n.content).slice(0, 180)}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {iw.messages.filter(m => !m.isAiIntervention).slice(0, 4).map((m, j) => (
                  <div key={j} style={{ fontSize: '9pt', color: '#444', marginBottom: '1.5mm', paddingLeft: '3mm', borderLeft: '1px solid #4a7cc730' }}>
                    {m.content.slice(0, 180)}
                  </div>
                ))}
                {iw.messages.filter(m => !m.isAiIntervention).length > 4 && (
                  <div style={{ fontSize: '8.5pt', color: '#aaa' }}>...共 {iw.messages.filter(m => !m.isAiIntervention).length} 則</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 科學助手對話摘要 */}
        {aiAssistantSessions && aiAssistantSessions.length > 0 && (() => {
          const totalQ = aiAssistantSessions.reduce((acc, s) => acc + s.exchanges.length, 0);
          const allQuestions = aiAssistantSessions.flatMap(s => s.exchanges.map(e => e.question));
          const displayQ = allQuestions.slice(0, 16);
          return (
            <div style={{ position: 'relative', marginBottom: '8mm' }}>
              <div style={{
                position: 'absolute', left: '-10.5mm', top: '3mm',
                width: '11px', height: '11px',
                background: '#5BA491', borderRadius: '50%',
                border: '2px solid #fff', boxShadow: '0 0 0 2px #5BA491'
              }} />
              <div style={{ fontSize: '12pt', fontWeight: '700', color: '#5BA491', marginBottom: '4mm' }}>🤖 科學助手對話摘要</div>
              <div style={{ padding: '4mm 5mm', background: '#f8fdfb', borderRadius: '6px', borderLeft: '3px solid #5BA491' }}>
                {/* 統計 */}
                <div style={{ display: 'flex', gap: '8mm', marginBottom: '4mm' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18pt', fontWeight: '800', color: '#5BA491', lineHeight: '1' }}>{aiAssistantSessions.length}</div>
                    <div style={{ fontSize: '8pt', color: '#888' }}>次對話</div>
                  </div>
                  <div style={{ width: '1px', height: '10mm', background: '#c8e6dc', alignSelf: 'center' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18pt', fontWeight: '800', color: '#5BA491', lineHeight: '1' }}>{totalQ}</div>
                    <div style={{ fontSize: '8pt', color: '#888' }}>個提問</div>
                  </div>
                </div>
                {/* 提問列表 */}
                <div style={{ fontSize: '8.5pt', fontWeight: '700', color: '#5BA491', marginBottom: '2mm' }}>歷次提問</div>
                {displayQ.map((q, i) => (
                  <div key={i} style={{ marginBottom: '1.5mm', fontSize: '9pt', color: '#444', display: 'flex', gap: '2mm' }}>
                    <span style={{ color: '#5BA491', fontWeight: '700', flexShrink: 0 }}>{i + 1}.</span>
                    <span>{q.slice(0, 80)}{q.length > 80 ? '…' : ''}</span>
                  </div>
                ))}
                {allQuestions.length > 16 && (
                  <div style={{ fontSize: '8.5pt', color: '#aaa', marginTop: '1.5mm' }}>...及另外 {allQuestions.length - 16} 個提問</div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 結尾節點 */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', left: '-11mm', top: '2mm',
            width: '12px', height: '12px',
            background: '#fff', border: '3px solid #5BA491', borderRadius: '50%'
          }} />
          <div style={{ fontSize: '9pt', color: '#5BA491', fontStyle: 'italic', paddingTop: '1mm' }}>
            學習旅程持續進行中...
          </div>
        </div>
      </div>

      {/* 頁腳 */}
      <div style={{ borderTop: '1px solid #eee', marginTop: '10mm', paddingTop: '4mm', fontSize: '8pt', color: '#ccc', textAlign: 'center' }}>
        {student.username} · {project.name} · 製作於 {new Date().toLocaleDateString('zh-TW')}
      </div>
    </div>
  );
}

function TimelineSubTitle({ children, color }) {
  return (
    <div style={{ fontSize: '8.5pt', fontWeight: '700', color, letterSpacing: '0.5px', marginBottom: '2mm' }}>
      ▸ {children}
    </div>
  );
}

function TimelineReflectionCard({ reflection, color }) {
  return (
    <div style={{ marginBottom: '3mm', padding: '3mm 5mm', background: `${color}08`, borderRadius: '6px', borderLeft: `3px solid ${color}`, fontSize: '9pt' }}>
      <div style={{ fontWeight: '700', color: '#333', marginBottom: '1.5mm' }}>
        {reflection.title}
        <span style={{ fontWeight: '400', color: '#ccc', fontSize: '8pt', marginLeft: '3mm' }}>
          {new Date(reflection.createdAt).toLocaleDateString('zh-TW')}
        </span>
      </div>
      {reflection.is5Rs && reflection.data5Rs ? (
        <div style={{ color: '#555' }}>
          {reflection.data5Rs.reasoning && (
            <div style={{ marginBottom: '1mm' }}>
              <span style={{ color, fontWeight: '600' }}>分析：</span>「{String(reflection.data5Rs.reasoning).slice(0, 150)}」
            </div>
          )}
          {reflection.data5Rs.reconstructing && (
            <div>
              <span style={{ color, fontWeight: '600' }}>重建：</span>「{String(reflection.data5Rs.reconstructing).slice(0, 150)}」
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#555' }}>「{reflection.textContent.slice(0, 250)}」</div>
      )}
    </div>
  );
}
