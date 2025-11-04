/**
 * 學習歷程匯出預覽頁面
 *
 * 功能：展示專案的完整學習歷程，支援列印/匯出 PDF
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExportData } from '../../api/export';
import Loader from '../../components/Loader';
import './ExportPreview.css';

export default function ExportPreview() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const contentRef = useRef(null);

  // 區塊順序管理
  const defaultSectionOrder = [
    { id: 'kanban', label: '看板任務', icon: '📋' },
    { id: 'ideaWalls', label: '想法牆', icon: '💡' },
    { id: 'submits', label: '五階段學習歷程', icon: '📝' },
    { id: 'personalReflections', label: '個人反思記錄', icon: '🤔' },
    { id: 'teamReflections', label: '團隊反思記錄', icon: '👥' }
  ];
  const [sectionOrder, setSectionOrder] = useState(defaultSectionOrder);
  const [isReorderMode, setIsReorderMode] = useState(false);

  useEffect(() => {
    loadExportData();
  }, [projectId]);

  const loadExportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getExportData(projectId);

      if (response.success) {
        setExportData(response.data);
      } else {
        setError('獲取資料失敗');
      }
    } catch (err) {
      console.error('載入匯出資料失敗:', err);
      setError(err.response?.data?.message || '載入資料時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current || isGenerating) return;

    // 如果在調整順序模式，先退出
    if (isReorderMode) {
      setIsReorderMode(false);
    }

    try {
      setIsGenerating(true);

      // 動態載入 html2pdf.js
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = contentRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `學習歷程_${exportData?.basicInfo?.name || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();

    } catch (error) {
      console.error('PDF 生成失敗:', error);
      alert('PDF 生成失敗，請稍後再試');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // 切換調整順序模式
  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode);
    // 如果取消調整，重置為預設順序
    if (isReorderMode) {
      setSectionOrder(defaultSectionOrder);
    }
  };

  // 向上移動區塊
  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newOrder = [...sectionOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setSectionOrder(newOrder);
  };

  // 向下移動區塊
  const moveSectionDown = (index) => {
    if (index === sectionOrder.length - 1) return;
    const newOrder = [...sectionOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setSectionOrder(newOrder);
  };

  // 渲染指定區塊內容
  const renderSection = (sectionId) => {
    if (!exportData) return null;

    const { submits, reflections, ideaWalls, kanban } = exportData;

    switch (sectionId) {
      case 'kanban':
        return kanban && kanban.columns && kanban.columns.length > 0 && (
          <div key="kanban" className="export-page">
            <h2 className="export-section-title">看板任務</h2>
            {kanban.columns.map((column) => (
              <div key={column.id} className="export-kanban-column">
                <h3>{column.name} ({column.taskCount})</h3>
                {column.tasks && column.tasks.length > 0 && (
                  <div className="export-tasks-list">
                    {column.tasks.map((task) => (
                      <div key={task.id} className="export-task-item">
                        <div className="task-title">{task.title}</div>
                        {task.content && <div className="task-content">{task.content}</div>}
                        <div className="task-meta">
                          {task.owner && <span>負責人：{task.owner}</span>}
                          {task.createdAtShort && <span>建立：{task.createdAtShort}</span>}
                        </div>
                        {task.labels && task.labels.length > 0 && (
                          <div className="task-labels">
                            {task.labels.map((label, idx) => (
                              <span key={idx} className="task-label">
                                {typeof label === 'object' ? label.name || label.label : label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'ideaWalls':
        return ideaWalls && ideaWalls.all && ideaWalls.all.length > 0 && (
          <div key="ideaWalls" className="export-page">
            <h2 className="export-section-title">想法牆</h2>
            {ideaWalls.all.map((ideaWall) => (
              <div key={ideaWall.id} className="export-ideawall-section">
                {ideaWall.nodes && ideaWall.nodes.length > 0 && (
                  <div className="export-nodes-grid">
                    {ideaWall.nodes.map((node) => (
                      <div key={node.id} className="export-node-card">
                        <div className="node-title">{node.title}</div>
                        <div className="node-content">{node.content}</div>
                        {node.owner && <div className="node-owner">擁有者：{node.owner}</div>}
                        {(node.successors && node.successors.length > 0) && (
                          <div className="node-relations">
                            <strong>關聯到：</strong>
                            {node.successors.map(s => s.title).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'submits':
        return submits && submits.all && submits.all.length > 0 && (
          <div key="submits" className="export-page">
            <h2 className="export-section-title">五階段學習歷程</h2>
            {['1', '2', '3', '4', '5'].map(stage => {
              const stageSubmits = submits.byStage[stage] || [];
              if (stageSubmits.length === 0) return null;
              const mainStageName = stageSubmits[0]?.mainStageName || `階段 ${stage}`;
              return (
                <div key={stage} className="export-stage-section">
                  <h3 className="export-stage-title">{mainStageName}</h3>
                  <div className="export-timeline">
                    {stageSubmits.map((submit, index) => (
                      <div key={submit.id} className="export-timeline-item">
                        <div className="timeline-marker">{index + 1}</div>
                        <div className="timeline-content">
                          <div className="timeline-substage">
                            {submit.subStageName || submit.stage}
                          </div>
                          <div className="timeline-date">{submit.createdAtShort}</div>
                          {submit.hasContent && submit.content && typeof submit.content === 'object' && (
                            <div className="submit-content">
                              {Object.entries(submit.content).map(([key, value]) => (
                                <div key={key} className="submit-field">
                                  <strong>{key}:</strong>
                                  <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {!submit.hasContent && (
                            <div className="submit-file-info">
                              {submit.hasFile ? (
                                <div className="submit-attachment">
                                  📎 檔案：{submit.originalName || submit.fileName}
                                </div>
                              ) : (
                                <div className="submit-no-content">無內容或檔案</div>
                              )}
                            </div>
                          )}
                          {submit.hasContent && submit.hasFile && (
                            <div className="submit-attachment">
                              📎 附件：{submit.originalName || submit.fileName}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'personalReflections':
        return reflections && reflections.personal && reflections.personal.length > 0 && (
          <div key="personalReflections" className="export-page">
            <h2 className="export-section-title">個人反思記錄</h2>
            {reflections.personal.map((reflection) => (
              <div key={reflection.id} className="export-reflection-item">
                <div className="reflection-header">
                  <h4>{reflection.title}</h4>
                  <span className="reflection-date">{reflection.createdAtShort}</span>
                </div>
                {reflection.is5Rs && reflection.data5Rs ? (
                  <div className="reflection-5rs">
                    {Object.entries(reflection.data5Rs).map(([key, value]) => (
                      <div key={key} className="rs-section">
                        <div className="rs-label">
                          {key === 'reporting' && '描述 (Reporting)'}
                          {key === 'responding' && '反應 (Responding)'}
                          {key === 'relating' && '關聯 (Relating)'}
                          {key === 'reasoning' && '分析 (Reasoning)'}
                          {key === 'reconstructing' && '重建 (Reconstructing)'}
                        </div>
                        <div className="rs-content">{value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="reflection-text">{reflection.textContent}</div>
                )}
                {reflection.author && (
                  <div className="reflection-author">
                    作者：{reflection.author.username}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'teamReflections':
        return reflections && reflections.team && reflections.team.length > 0 && (
          <div key="teamReflections" className="export-page">
            <h2 className="export-section-title">團隊反思記錄</h2>
            {reflections.team.map((reflection) => (
              <div key={reflection.id} className="export-reflection-item">
                <div className="reflection-header">
                  <h4>{reflection.title}</h4>
                  <span className="reflection-date">{reflection.createdAtShort}</span>
                </div>
                {reflection.is5Rs && reflection.data5Rs ? (
                  <div className="reflection-5rs">
                    {Object.entries(reflection.data5Rs).map(([key, value]) => (
                      <div key={key} className="rs-section">
                        <div className="rs-label">
                          {key === 'reporting' && '描述 (Reporting)'}
                          {key === 'responding' && '反應 (Responding)'}
                          {key === 'relating' && '關聯 (Relating)'}
                          {key === 'reasoning' && '分析 (Reasoning)'}
                          {key === 'reconstructing' && '重建 (Reconstructing)'}
                        </div>
                        <div className="rs-content">{value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="reflection-text">{reflection.textContent}</div>
                )}
                <div className="reflection-author">
                  創建者：{reflection.creator || reflection.author?.username}
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="export-error">
        <h2>錯誤</h2>
        <p>{error}</p>
        <button onClick={handleBack} className="btn-back">返回</button>
      </div>
    );
  }

  if (!exportData) {
    return null;
  }

  const { basicInfo, currentStageInfo, members, submits, reflections, ideaWalls, kanban, statistics } = exportData;

  return (
    <div className="export-preview-container">
      {/* 操作按鈕（只在螢幕上顯示，列印時隱藏） */}
      <div className="export-actions no-print">
        <button onClick={handleBack} className="btn-secondary">
          返回
        </button>
        <button
          onClick={toggleReorderMode}
          className={isReorderMode ? 'btn-warning' : 'btn-secondary'}
        >
          {isReorderMode ? '取消調整' : '調整順序'}
        </button>
        <button
          onClick={handleDownloadPDF}
          className="btn-primary"
          disabled={isGenerating}
        >
          {isGenerating ? '生成中...' : '下載 PDF'}
        </button>
      </div>

      {/* 順序調整面板 */}
      {isReorderMode && (
        <div className="reorder-panel no-print">
          <h3>📋 調整區塊順序</h3>
          <p className="reorder-hint">使用上下箭頭調整順序，完成後點擊「下載 PDF」按鈕即可生成自訂順序的 PDF（順序不會儲存）</p>
          <div className="reorder-list">
            {sectionOrder.map((section, index) => (
              <div key={section.id} className="reorder-item">
                <span className="reorder-icon">{section.icon}</span>
                <span className="reorder-label">{section.label}</span>
                <div className="reorder-controls">
                  <button
                    onClick={() => moveSectionUp(index)}
                    disabled={index === 0}
                    className="btn-reorder"
                    title="向上移動"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveSectionDown(index)}
                    disabled={index === sectionOrder.length - 1}
                    className="btn-reorder"
                    title="向下移動"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF 內容容器 */}
      <div ref={contentRef} className="export-content">
        {/* 封面頁 */}
        <div className="export-page export-cover">
        <div className="export-cover-content">
          <h1 className="export-title">學習歷程檔案</h1>
          <div className="export-cover-info">
            <h2>{basicInfo.name}</h2>
            <p className="export-description">{basicInfo.description}</p>

            {members && members.length > 0 && (
              <div className="export-members">
                <h3>專案成員</h3>
                <ul>
                  {members.map((member, index) => (
                    <li key={member.id}>
                      {member.username}
                      {member.class && member.seatNumber && ` (${member.class} ${member.seatNumber}號)`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="export-meta">
              <p><strong>導師：</strong>{basicInfo.mentor || 'N/A'}</p>
              <p><strong>當前階段：</strong>{currentStageInfo.displayName}</p>
              <p><strong>建立日期：</strong>{basicInfo.createdAt}</p>
              <p><strong>匯出日期：</strong>{basicInfo.exportedAt}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 統計概覽 */}
      <div className="export-page">
        <h2 className="export-section-title">學習成果統計</h2>
        <div className="export-statistics">
          <div className="stat-card">
            <div className="stat-value">{statistics.totalSubmits}</div>
            <div className="stat-label">階段提交</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.totalPersonalReflections}</div>
            <div className="stat-label">個人反思</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.totalTeamReflections}</div>
            <div className="stat-label">團隊反思</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.totalTasks}</div>
            <div className="stat-label">總任務數</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.completedTasks}</div>
            <div className="stat-label">已完成</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.totalIdeaNodes}</div>
            <div className="stat-label">想法節點</div>
          </div>
        </div>
      </div>

      {/* 動態渲染區塊（根據 sectionOrder 順序） */}
      {sectionOrder.map(section => renderSection(section.id))}

      {/* 總結頁 */}
      <div className="export-page export-footer">
        <h2>學習歷程總結</h2>
        <div className="export-summary">
          <p>本專案共歷經 <strong>{statistics.currentStage || 1}</strong> 個學習階段，</p>
          <p>累積 <strong>{statistics.totalSubmits}</strong> 次提交記錄，</p>
          <p>完成 <strong>{statistics.totalPersonalReflections + statistics.totalTeamReflections}</strong> 篇反思，</p>
          <p>建立 <strong>{statistics.totalIdeaNodes}</strong> 個想法節點，</p>
          <p>執行 <strong>{statistics.totalTasks}</strong> 項任務（已完成 <strong>{statistics.completedTasks}</strong> 項）。</p>
          <p className="export-final-text">
            感謝您使用本系統記錄學習歷程，祝您未來學習順利！
          </p>
        </div>
      </div>
      {/* 結束 export-content */}
      </div>
    </div>
  );
}
