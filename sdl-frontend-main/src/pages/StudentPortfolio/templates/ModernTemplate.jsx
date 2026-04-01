/**
 * 模板 B：現代活力版
 * 彩色階段標籤、卡片式排版、進度視覺化，適合班級分享與課堂展示
 */

import React from 'react';
import NarrativeRenderer from '../components/NarrativeRenderer';

const STAGE_PALETTE = {
  1: { bg: '#e8f5f1', border: '#5BA491', text: '#2d7a65', light: '#f0faf7' },
  2: { bg: '#e8f0fb', border: '#4a7cc7', text: '#2a5da8', light: '#f0f5fd' },
  3: { bg: '#fdf3e7', border: '#e08b2a', text: '#b86e0f', light: '#fef9f1' },
  4: { bg: '#f3e8fb', border: '#9b59b6', text: '#7d3f99', light: '#f9f3fd' }
};

const STAGE_ICONS = { 1: '🎯', 2: '🗺️', 3: '🔬', 4: '🔄' };

export default function ModernTemplate({ data, narrative }) {
  if (!data) return null;
  const { student, project, stages, freeReflections, completeness, ideaWallChats, aiAssistantSessions } = data;

  const completionPct = Math.round(
    (completeness.completedSubmitCount / completeness.totalSubStages) * 100
  );

  return (
    <div style={{
      fontFamily: '"Noto Sans TC", "system-ui", sans-serif',
      color: '#1a1a1a',
      background: '#f7f9fc',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '0 14mm',
      boxSizing: 'border-box',
      fontSize: '10pt',
      lineHeight: '1.75'
    }}>

      {/* 封面橫幅 */}
      <div style={{ background: 'linear-gradient(135deg, #5BA491 0%, #3d8a75 100%)', borderRadius: '8px', padding: '10mm 12mm', marginBottom: '8mm', color: '#fff' }}>
        <div style={{ fontSize: '8pt', letterSpacing: '3px', opacity: 0.8, marginBottom: '2mm' }}>LEARNING PORTFOLIO</div>
        <div style={{ fontSize: '20pt', fontWeight: '800', marginBottom: '2mm' }}>{project.name}</div>
        <div style={{ fontSize: '13pt', opacity: 0.9 }}>{student.username} 的個人學習歷程</div>
        <div style={{ display: 'flex', gap: '8mm', marginTop: '4mm', fontSize: '9pt', opacity: 0.8 }}>
          {student.class && <span>📚 {student.class}</span>}
          {project.mentor && <span>👩‍🏫 {project.mentor}</span>}
          <span>📅 {new Date().toLocaleDateString('zh-TW')}</span>
        </div>
      </div>

      {/* 完成度橫條 */}
      <div style={{ background: '#fff', borderRadius: '8px', padding: '5mm 8mm', marginBottom: '8mm', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '6mm' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9pt', color: '#666', marginBottom: '2mm' }}>
            正式提交完成度 {completeness.completedSubmitCount}/{completeness.totalSubStages} 個子階段
          </div>
          <div style={{ background: '#eee', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#5BA491', width: `${completionPct}%`, height: '100%', borderRadius: '4px', transition: 'width 0.5s' }} />
          </div>
        </div>
        <div style={{ fontSize: '18pt', fontWeight: '800', color: '#5BA491' }}>{completionPct}%</div>
      </div>

      {/* AI 敘事 */}
      {narrative && (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '6mm 8mm', marginBottom: '8mm', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #5BA491' }}>
          <div style={{ fontSize: '11pt', fontWeight: '700', color: '#5BA491', marginBottom: '4mm' }}>✨ AI 學習敘事</div>
          <NarrativeRenderer narrative={narrative} accentColor="#5BA491" baseFontSize="9.5pt" />
        </div>
      )}

      {/* 四階段 */}
      {stages.filter(s => s.hasContent).map(stage => {
        const palette = STAGE_PALETTE[stage.stageNumber];
        const hasContent = stage.reflections.length > 0 || stage.submits.length > 0 || stage.nodes.length > 0;

        return (
          <div key={stage.stageNumber} style={{ background: '#fff', borderRadius: '8px', marginBottom: '6mm', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {/* 階段標頭 */}
            <div style={{ background: palette.bg, borderBottom: `3px solid ${palette.border}`, padding: '4mm 8mm', display: 'flex', alignItems: 'center', gap: '3mm', breakAfter: 'avoid' }}>
              <span style={{ fontSize: '16pt' }}>{STAGE_ICONS[stage.stageNumber]}</span>
              <div>
                <div style={{ fontSize: '8pt', color: palette.text, fontWeight: '600', letterSpacing: '1px' }}>STAGE {stage.stageNumber}</div>
                <div style={{ fontSize: '13pt', fontWeight: '800', color: palette.text }}>{stage.stageTitle}</div>
              </div>
              {!hasContent && (
                <span style={{ marginLeft: 'auto', fontSize: '8pt', background: '#f0f0f0', color: '#aaa', padding: '1mm 4mm', borderRadius: '12px' }}>尚無記錄</span>
              )}
            </div>

            <div style={{ padding: '5mm 8mm' }}>
              {/* 正式提交 */}
              {stage.submits.length > 0 && (
                <div style={{ marginBottom: '5mm' }}>
                  <TagLabel color={palette.text} bg={palette.light}>📋 正式提交</TagLabel>
                  {stage.submits.map((s, i) => (
                    <div key={i} style={{ marginBottom: '3mm', padding: '3mm 5mm', background: palette.light, borderRadius: '6px', borderLeft: `3px solid ${palette.border}`, breakInside: 'avoid' }}>
                      <div style={{ fontWeight: '700', fontSize: '9.5pt', color: palette.text, marginBottom: '1.5mm' }}>{s.stage} · {s.stageTitle}</div>
                      {s.content && typeof s.content === 'object'
                        ? Object.entries(s.content).map(([k, v]) => v ? (
                            <div key={k} style={{ fontSize: '9pt', color: '#444' }}><span style={{ color: '#888' }}>{k}：</span>{String(v).slice(0, 300)}</div>
                          ) : null)
                        : <div style={{ fontSize: '9pt', color: '#444' }}>{String(s.content || '').slice(0, 300)}</div>
                      }
                    </div>
                  ))}
                </div>
              )}

              {/* 反思 */}
              {stage.reflections.length > 0 && (
                <div style={{ marginBottom: '5mm' }}>
                  <TagLabel color={palette.text} bg={palette.light}>💭 個人反思</TagLabel>
                  {stage.reflections.map((r, i) => (
                    <ModernReflectionCard key={i} reflection={r} palette={palette} />
                  ))}
                </div>
              )}

              {/* 想法牆節點 */}
              {stage.nodes.length > 0 && (
                <div>
                  <TagLabel color={palette.text} bg={palette.light}>💡 想法牆貢獻</TagLabel>
                  {stage.nodes.map((n, i) => (
                    <div key={i} style={{ marginBottom: '2.5mm', padding: '2.5mm 4mm', background: palette.bg, borderRadius: '6px', borderLeft: `3px solid ${palette.border}`, breakInside: 'avoid' }}>
                      <div style={{ fontWeight: '700', fontSize: '9.5pt', color: palette.text, marginBottom: '0.5mm' }}>💡 {n.title}</div>
                      {n.content && <div style={{ fontSize: '9pt', color: '#444' }}>{String(n.content).slice(0, 250)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 自由反思 */}
      {freeReflections.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '5mm 8mm', marginBottom: '6mm', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '11pt', fontWeight: '700', color: '#555', marginBottom: '4mm', breakAfter: 'avoid' }}>🌟 跨階段自由省思</div>
          {freeReflections.map((r, i) => (
            <ModernReflectionCard key={i} reflection={r} palette={{ bg: '#f5f5f5', border: '#aaa', text: '#555', light: '#fafafa' }} />
          ))}
        </div>
      )}

      {/* 想法牆記錄 */}
      {ideaWallChats && ideaWallChats.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '5mm 8mm', marginBottom: '6mm', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #4a7cc7' }}>
          <div style={{ fontSize: '11pt', fontWeight: '700', color: '#4a7cc7', marginBottom: '4mm', breakAfter: 'avoid' }}>📌 想法牆記錄</div>
          {ideaWallChats.map((iw, i) => (
            <div key={i} style={{ marginBottom: '4mm', background: '#f0f5fd', borderRadius: '6px', breakInside: 'avoid' }}>
              <div style={{ padding: '2.5mm 5mm', fontWeight: '700', fontSize: '9.5pt', color: '#2a5da8', borderBottom: '1px solid #d4e3f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{iw.ideaWallName}{iw.ideaWallStage && <span style={{ fontWeight: '400', color: '#888', marginLeft: '2mm', fontSize: '8.5pt' }}>· {iw.ideaWallStage}</span>}</span>
                <span style={{ fontSize: '8.5pt', color: '#aaa', fontWeight: '400' }}>
                  {iw.nodes.length > 0 && `${iw.nodes.length}節點`}
                  {iw.nodes.length > 0 && iw.messages.filter(m => !m.isAiIntervention).length > 0 && ' · '}
                  {iw.messages.filter(m => !m.isAiIntervention).length > 0 && `${iw.messages.filter(m => !m.isAiIntervention).length}則討論`}
                </span>
              </div>
              <div style={{ padding: '3mm 5mm' }}>
                {iw.nodes.length > 0 && (
                  <div style={{ marginBottom: iw.messages.filter(m => !m.isAiIntervention).length > 0 ? '3mm' : '0' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: '700', color: '#4a7cc7', marginBottom: '2mm', breakAfter: 'avoid' }}>想法節點</div>
                    {iw.nodes.map((n, j) => (
                      <div key={j} style={{ marginBottom: '2mm', padding: '2mm 3mm', background: '#e8f0fb', borderRadius: '4px', borderLeft: '2px solid #4a7cc7', breakInside: 'avoid' }}>
                        <div style={{ fontWeight: '700', fontSize: '9pt', color: '#2a5da8' }}>💡 {n.title}</div>
                        {n.content && <div style={{ fontSize: '8.5pt', color: '#555', marginTop: '0.5mm' }}>{String(n.content).slice(0, 200)}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {iw.messages.filter(m => !m.isAiIntervention).length > 0 && (
                  <div>
                    <div style={{ fontSize: '8.5pt', fontWeight: '700', color: '#4a7cc7', marginBottom: '2mm' }}>討論留言</div>
                    {iw.messages.filter(m => !m.isAiIntervention).slice(0, 5).map((m, j) => (
                      <div key={j} style={{ marginBottom: '2mm', fontSize: '9pt', color: '#444', paddingLeft: '3mm', borderLeft: '2px solid #4a7cc750', breakInside: 'avoid' }}>
                        {m.content.slice(0, 180)}
                      </div>
                    ))}
                    {iw.messages.filter(m => !m.isAiIntervention).length > 5 && (
                      <div style={{ fontSize: '8.5pt', color: '#aaa' }}>...共 {iw.messages.filter(m => !m.isAiIntervention).length} 則</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 科學助手提問摘要 */}
      {aiAssistantSessions && aiAssistantSessions.length > 0 && (() => {
        const totalQ = aiAssistantSessions.reduce((acc, s) => acc + s.exchanges.length, 0);
        const allQuestions = aiAssistantSessions.flatMap(s => s.exchanges.map(e => e.question));
        const displayQ = allQuestions.slice(0, 16);
        return (
          <div style={{ background: '#fff', borderRadius: '8px', padding: '5mm 8mm', marginBottom: '6mm', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #5BA491' }}>
            <div style={{ fontSize: '11pt', fontWeight: '700', color: '#2d7a65', marginBottom: '4mm', breakAfter: 'avoid' }}>🤖 科學助手對話摘要</div>
            {/* 統計 */}
            <div style={{ display: 'flex', gap: '5mm', marginBottom: '4mm' }}>
              <div style={{ background: '#f0faf7', borderRadius: '6px', padding: '3mm 6mm', textAlign: 'center', minWidth: '20mm' }}>
                <div style={{ fontSize: '18pt', fontWeight: '800', color: '#5BA491', lineHeight: '1' }}>{aiAssistantSessions.length}</div>
                <div style={{ fontSize: '8pt', color: '#888', marginTop: '0.5mm' }}>次對話</div>
              </div>
              <div style={{ background: '#f0faf7', borderRadius: '6px', padding: '3mm 6mm', textAlign: 'center', minWidth: '20mm' }}>
                <div style={{ fontSize: '18pt', fontWeight: '800', color: '#5BA491', lineHeight: '1' }}>{totalQ}</div>
                <div style={{ fontSize: '8pt', color: '#888', marginTop: '0.5mm' }}>個提問</div>
              </div>
              <div style={{ fontSize: '8.5pt', color: '#aaa', alignSelf: 'flex-end', paddingBottom: '3mm' }}>
                {new Date(aiAssistantSessions[0].createdAt).toLocaleDateString('zh-TW')} 起
              </div>
            </div>
            {/* 提問列表 */}
            <div style={{ fontSize: '9pt', fontWeight: '700', color: '#2d7a65', marginBottom: '2mm', breakAfter: 'avoid' }}>歷次提問</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm 5mm' }}>
              {displayQ.map((q, i) => (
                <div key={i} style={{ breakInside: 'avoid', marginBottom: '2mm', fontSize: '9pt', color: '#444', display: 'flex', gap: '1.5mm' }}>
                  <span style={{ color: '#5BA491', fontWeight: '700', flexShrink: 0 }}>{i + 1}.</span>
                  <span>{q.slice(0, 75)}{q.length > 75 ? '…' : ''}</span>
                </div>
              ))}
            </div>
            {allQuestions.length > 16 && (
              <div style={{ fontSize: '8.5pt', color: '#aaa', marginTop: '2mm' }}>...及另外 {allQuestions.length - 16} 個提問</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function TagLabel({ children, color, bg }) {
  return (
    <div style={{ display: 'inline-block', background: bg, color, fontWeight: '700', fontSize: '8.5pt', padding: '1mm 3mm', borderRadius: '4px', marginBottom: '3mm', breakAfter: 'avoid' }}>
      {children}
    </div>
  );
}

function ModernReflectionCard({ reflection, palette }) {
  return (
    <div style={{ marginBottom: '3mm', padding: '3mm 5mm', background: palette.light, borderRadius: '6px', fontSize: '9pt', breakInside: 'avoid' }}>
      <div style={{ fontWeight: '700', color: '#333', marginBottom: '1.5mm' }}>
        {reflection.title}
        <span style={{ fontWeight: '400', color: '#bbb', fontSize: '8pt', marginLeft: '3mm' }}>
          {new Date(reflection.createdAt).toLocaleDateString('zh-TW')}
        </span>
      </div>
      {reflection.is5Rs && reflection.data5Rs ? (
        <div>
          {Object.entries(reflection.data5Rs).map(([key, val]) => val ? (
            <div key={key} style={{ color: '#555', marginBottom: '1mm' }}>
              <span style={{ color: palette.text, fontWeight: '600', fontSize: '8.5pt', textTransform: 'capitalize' }}>{key}：</span>
              {String(val).slice(0, 200)}
            </div>
          ) : null)}
        </div>
      ) : (
        <div style={{ color: '#555', lineHeight: '1.7' }}>{reflection.textContent.slice(0, 300)}</div>
      )}
    </div>
  );
}
