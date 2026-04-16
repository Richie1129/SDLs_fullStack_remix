import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import {
  FiTarget, FiMap, FiBarChart2, FiRefreshCw,
  FiCheckCircle, FiAlertTriangle, FiClock, FiEye,
  FiX, FiChevronRight, FiLayout, FiMessageSquare
} from "react-icons/fi";
import TopBar from "../../components/TopBar";
import { getCurrentUsername } from "../../utils/userUtils";
import { getTeacherProjectsSummary } from "../../api/project";
import { getAllSubmit } from "../../api/submit";
import { formatRelativeTime } from "../../utils/timeUtils";

// SDL 四階段定義
const STAGES = [
  { key: 1, name: "定標", icon: FiTarget, color: "blue" },
  { key: 2, name: "擇策", icon: FiMap, color: "teal" },
  { key: 3, name: "監評", icon: FiBarChart2, color: "amber" },
  { key: 4, name: "調節", icon: FiRefreshCw, color: "purple" },
];

const SUB_STAGE_LABELS = {
  "1-1": "提出研究主題",
  "1-2": "提出研究目的",
  "1-3": "提出研究問題",
  "2-1": "訂定研究構想表",
  "2-2": "設計研究記錄表",
  "2-3": "規劃研究排程",
  "3-1": "進行嘗試性研究",
  "3-2": "分析資料與繪圖",
  "3-3": "撰寫研究結果",
  "4-1": "檢視研究進度",
  "4-2": "進行研究討論",
  "4-3": "撰寫研究結論",
};

// 顏色映射
const COLOR_MAP = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   pill: "bg-blue-100 text-blue-700",   dot: "bg-blue-400" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   pill: "bg-teal-100 text-teal-700",   dot: "bg-teal-400" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  pill: "bg-amber-100 text-amber-700",  dot: "bg-amber-400" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", pill: "bg-purple-100 text-purple-700", dot: "bg-purple-400" },
};

/** 格式化階段顯示：「定標 · 提出研究主題 (1-1)」 */
function formatStageLabel(currentStage, currentSubStage) {
  const stage = STAGES.find((s) => s.key === currentStage);
  const key = `${currentStage}-${currentSubStage}`;
  const subLabel = SUB_STAGE_LABELS[key];
  if (stage && subLabel) return `${stage.name} · ${subLabel} (${key})`;
  if (stage) return `${stage.name} (${key})`;
  return key;
}

// ─── 子元件 ───

/** SDL 階段總覽 — 水平 pipeline + 每階段組名 */
const StagePipeline = ({ projects, activeStageFilter, onStageClick }) => {
  const grouped = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [] };
    projects.forEach((p) => {
      if (map[p.currentStage]) map[p.currentStage].push(p);
    });
    return map;
  }, [projects]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-component-base sm:p-component-md-lg">
      <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4">
        SDL 階段總覽
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-sm">
        {STAGES.map((stage) => {
          const c = COLOR_MAP[stage.color];
          const isActive = activeStageFilter === stage.key;
          const stageProjects = grouped[stage.key] || [];
          const Icon = stage.icon;

          return (
            <button
              key={stage.key}
              onClick={() => onStageClick(stage.key)}
              className={`text-left rounded-xl p-component-sm sm:p-component-base border-2 transition-all duration-fast ${
                isActive
                  ? `${c.border} ${c.bg} ring-2 ring-offset-1 ring-${stage.color}-300`
                  : "border-gray-100 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-body-sm font-bold ${c.text}`}>
                    {stage.name}
                  </span>
                  <span className="text-caption text-gray-400 ml-1">
                    {stageProjects.length} 組
                  </span>
                </div>
              </div>
              {/* 組名列表 */}
              <div className="flex flex-wrap gap-1 min-h-[28px]">
                {stageProjects.length === 0 ? (
                  <span className="text-caption text-gray-300">尚無</span>
                ) : (
                  stageProjects.map((p) => (
                    <span
                      key={p.id}
                      className={`text-caption px-1.5 py-0.5 rounded-md ${c.pill} font-medium truncate max-w-[200px]`}
                      title={`${p.name} — ${formatStageLabel(p.currentStage, p.currentSubStage)}`}
                    >
                      {p.name.length > 6 ? p.name.slice(0, 6) + "…" : p.name}
                      <span className="opacity-60 ml-1">
                        {SUB_STAGE_LABELS[`${p.currentStage}-${p.currentSubStage}`]
                          ? `${p.currentStage}-${p.currentSubStage}`
                          : p.currentSubStage}
                      </span>
                    </span>
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>
      {activeStageFilter && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => onStageClick(null)}
            className="text-caption text-gray-400 hover:text-gray-600 transition-colors"
          >
            清除篩選
          </button>
        </div>
      )}
    </div>
  );
};

/** 活動狀態指示器 */
const ActivityIndicator = ({ lastActivityAt, label }) => {
  if (!lastActivityAt) {
    return (
      <div className="flex items-center gap-1.5">
        <FiAlertTriangle className="w-3.5 h-3.5 text-red-400" />
        <span className="text-caption text-red-500">尚無{label}活動</span>
      </div>
    );
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince <= 3) {
    return (
      <div className="flex items-center gap-1.5">
        <FiCheckCircle className="w-3.5 h-3.5 text-[#5BA491]" />
        <span className="text-caption text-[#5BA491]">
          {label}活躍（{formatRelativeTime(lastActivityAt)}）
        </span>
      </div>
    );
  }

  if (daysSince <= 7) {
    return (
      <div className="flex items-center gap-1.5">
        <FiClock className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-caption text-amber-600">
          {label} {daysSince} 天前
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <FiAlertTriangle className="w-3.5 h-3.5 text-red-400" />
      <span className="text-caption text-red-500">
        {label}沉寂 {daysSince} 天
      </span>
    </div>
  );
};

/** 小組狀態卡片 */
const GroupCard = ({ project, onPreview, onNavigate }) => {
  const stage = STAGES.find((s) => s.key === project.currentStage);
  const c = stage ? COLOR_MAP[stage.color] : COLOR_MAP.blue;

  const { submitStatus, kanban, ideaWall, members } = project;
  const reachedCount = submitStatus.reached.length;
  const submittedCount = submitStatus.submitted.length;
  const missingCount = submitStatus.missing.length;

  // 計算缺少項目數用於排序
  const totalIssues = missingCount
    + (!kanban.lastActivityAt ? 1 : 0)
    + (ideaWall.nodeCount === 0 ? 1 : 0);

  return (
    <div
      className={`bg-white rounded-xl border ${
        totalIssues > 2
          ? "border-red-200"
          : totalIssues > 0
          ? "border-amber-200"
          : "border-gray-200"
      } hover:shadow-md transition-shadow duration-fast`}
    >
      {/* 卡片標題 */}
      <div className="p-component-sm sm:p-component-base border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-body font-semibold text-gray-800 truncate flex-1 mr-2">
            {project.name}
          </h3>
          <span
            className={`shrink-0 text-caption px-2 py-0.5 rounded-full font-medium ${c.pill}`}
            title={formatStageLabel(project.currentStage, project.currentSubStage)}
          >
            {stage?.name} · {SUB_STAGE_LABELS[`${project.currentStage}-${project.currentSubStage}`] || project.currentSubStage} ({project.currentStage}-{project.currentSubStage})
          </span>
        </div>
        {/* 班級 + 成員 */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {(() => {
            const classes = [...new Set(members.map((m) => m.class).filter(Boolean))];
            return classes.length > 0 ? (
              classes.map((cls) => (
                <span key={cls} className="text-caption bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                  {cls}
                </span>
              ))
            ) : null;
          })()}
          {members.map((m) => (
            <span
              key={m.id}
              className="text-caption bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
            >
              {m.username}
            </span>
          ))}
        </div>
      </div>

      {/* 完成度檢查 */}
      <div className="p-component-sm sm:p-component-base space-y-2">
        {/* 歷程檔案 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-caption text-gray-500 font-medium">歷程檔案</span>
            {reachedCount > 0 ? (
              <span className={`text-caption font-bold ${
                missingCount === 0 ? "text-[#5BA491]" : "text-amber-600"
              }`}>
                {submittedCount}/{reachedCount}
              </span>
            ) : (
              <span className="text-caption font-bold text-gray-400">—</span>
            )}
          </div>
          {reachedCount === 0 && submittedCount === 0 ? (
            <p className="text-caption text-gray-400">尚未有任何歷程檔案</p>
          ) : reachedCount > 0 ? (
            <>
              <div className="flex gap-0.5">
                {submitStatus.reached.map((key) => {
                  const isFilled = submitStatus.submitted.includes(key);
                  return (
                    <div
                      key={key}
                      className={`h-1.5 flex-1 rounded-full ${
                        isFilled ? "bg-[#5BA491]" : "bg-red-300"
                      }`}
                      title={`${SUB_STAGE_LABELS[key] || key} — ${isFilled ? "已填" : "未填"}`}
                    />
                  );
                })}
              </div>
              {missingCount > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {submitStatus.missing.map((key) => (
                    <span
                      key={key}
                      className="text-caption text-red-500 bg-red-50 px-1 py-0.5 rounded"
                    >
                      {SUB_STAGE_LABELS[key] || key}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Kanban */}
        <ActivityIndicator
          lastActivityAt={kanban.lastActivityAt}
          label="Kanban"
        />

        {/* Idea Wall */}
        <div className="flex items-center gap-1.5">
          {ideaWall.nodeCount > 0 ? (
            <>
              <FiMessageSquare className="w-3.5 h-3.5 text-[#5BA491]" />
              <span className="text-caption text-[#5BA491]">
                Idea Wall {ideaWall.nodeCount} 則
              </span>
            </>
          ) : (
            <>
              <FiAlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-caption text-red-500">Idea Wall 無內容</span>
            </>
          )}
        </div>
      </div>

      {/* 動作按鈕 */}
      <div className="p-component-sm sm:p-component-base border-t border-gray-100 flex gap-2">
        <button
          onClick={() => onPreview(project)}
          className="flex-1 text-caption py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors duration-fast flex items-center justify-center gap-1"
        >
          <FiEye className="w-3.5 h-3.5" />
          預覽歷程
        </button>
        <button
          onClick={() => onNavigate(project.id)}
          className="flex-1 text-caption py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-600/90 hover:shadow-lg transition-all duration-fast flex items-center justify-center gap-1"
        >
          <FiLayout className="w-3.5 h-3.5" />
          進入專案
        </button>
      </div>
    </div>
  );
};

/** 解析 submit content — 可能是 JSON 字串或物件 */
function parseSubmitContent(content) {
  if (!content) return null;
  if (typeof content === "object") return content;
  try {
    return JSON.parse(content);
  } catch {
    return { 內容: content }; // 純文字 fallback
  }
}

/** 歷程預覽抽屜 */
const PortfolioDrawer = ({ project, onClose }) => {
  const { data: submits, isLoading } = useQuery(
    ["portfolioPreview", project?.id],
    () => getAllSubmit({ params: { projectId: project.id } }),
    { enabled: !!project }
  );

  if (!project) return null;

  // 建立子階段到提交內容的映射
  const submitMap = useMemo(() => {
    const map = {};
    if (submits) {
      submits.forEach((s) => {
        if (!map[s.stage] || new Date(s.createdAt) > new Date(map[s.stage].createdAt)) {
          map[s.stage] = s;
        }
      });
    }
    return map;
  }, [submits]);

  // 列出到目前階段為止的所有子階段
  const allSubStages = useMemo(() => {
    const result = [];
    for (let s = 1; s <= project.currentStage; s++) {
      const maxSub = s < project.currentStage ? 3 : project.currentSubStage;
      for (let sub = 1; sub <= maxSub; sub++) {
        result.push(`${s}-${sub}`);
      }
    }
    return result;
  }, [project.currentStage, project.currentSubStage]);

  // 按主階段分組
  const stageGroups = useMemo(() => {
    const groups = {};
    allSubStages.forEach((key) => {
      const mainStage = parseInt(key.split("-")[0]);
      if (!groups[mainStage]) groups[mainStage] = [];
      groups[mainStage].push(key);
    });
    return groups;
  }, [allSubStages]);

  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      {/* 抽屜面板 */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-gray-50 shadow-xl z-50 flex flex-col">
        {/* 標題 */}
        <div className="flex items-center justify-between p-component-base bg-white border-b border-gray-200">
          <div className="min-w-0">
            <h3 className="text-h3 font-semibold text-gray-800 truncate">
              {project.name}
            </h3>
            <p className="text-caption text-gray-500">
              歷程檔案預覽 · {STAGES.find((s) => s.key === project.currentStage)?.name} {project.currentStage}-{project.currentSubStage}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* 內容 — 按主階段分組 */}
        <div className="flex-1 overflow-y-auto p-component-sm sm:p-component-base">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : allSubStages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FiAlertTriangle className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-body text-gray-500 font-medium">尚未有任何歷程檔案</p>
              <p className="text-caption text-gray-400 mt-1">此專案目前尚未到達需提交歷程的階段</p>
            </div>
          ) : (
            Object.entries(stageGroups).map(([mainStageStr, subStageKeys]) => {
              const mainStage = parseInt(mainStageStr);
              const stage = STAGES.find((s) => s.key === mainStage);
              const c = stage ? COLOR_MAP[stage.color] : COLOR_MAP.blue;

              return (
                <div key={mainStage} className="mb-4">
                  {/* 主階段標題 */}
                  <div className="flex items-center gap-2 mb-2 sticky top-0 bg-gray-50 py-1 z-10">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${c.bg} ${c.text}`}>
                      {React.createElement(stage?.icon || FiTarget, { className: "w-3.5 h-3.5" })}
                    </div>
                    <span className={`text-body-sm font-bold ${c.text}`}>
                      {stage?.name}階段
                    </span>
                  </div>

                  {/* 子階段卡片 */}
                  <div className="space-y-2">
                    {subStageKeys.map((key) => {
                      const submit = submitMap[key];
                      const stageName = SUB_STAGE_LABELS[key] || key;
                      const parsed = submit ? parseSubmitContent(submit.content) : null;

                      return (
                        <div
                          key={key}
                          className={`rounded-lg border ${
                            submit ? "border-gray-200 bg-white" : "border-amber-200 bg-amber-50/50"
                          } p-component-sm`}
                        >
                          {/* 子階段標頭 */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-caption px-1.5 py-0.5 rounded ${c.pill} font-medium`}>
                              {key}
                            </span>
                            <span className="text-body-sm font-medium text-gray-700">
                              {stageName}
                            </span>
                            {submit ? (
                              <FiCheckCircle className="w-4 h-4 text-[#5BA491] ml-auto shrink-0" />
                            ) : (
                              <FiAlertTriangle className="w-4 h-4 text-amber-500 ml-auto shrink-0" />
                            )}
                          </div>

                          {submit && parsed ? (
                            <div className="space-y-2">
                              {Object.entries(parsed).map(([fieldName, fieldValue]) => (
                                <div key={fieldName}>
                                  <label className="block text-caption font-semibold text-gray-500 mb-0.5">
                                    {fieldName}
                                  </label>
                                  <div className="text-body-sm text-gray-700 leading-relaxed bg-gray-50 rounded-md p-component-xs border border-gray-100 whitespace-pre-wrap break-words">
                                    {fieldValue || "（空白）"}
                                  </div>
                                </div>
                              ))}
                              <div className="text-caption text-gray-400 pt-1 border-t border-gray-100">
                                {formatRelativeTime(submit.createdAt)}
                                {submit.User?.username && ` · ${submit.User.username}`}
                                {submit.originalName && (
                                  <span className="ml-2">
                                    附件：{submit.originalName}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : !submit ? (
                            <p className="text-body-sm text-amber-600">尚未填寫</p>
                          ) : (
                            <p className="text-body-sm text-gray-400">（無內容）</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-gray-200 p-component-base bg-white">
          <button
            onClick={() =>
              window.open(`/project/${project.id}/teacherDashboard`, "_blank")
            }
            className="w-full py-2 rounded-lg bg-teal-600 text-white text-body-sm font-medium hover:bg-teal-600/90 hover:shadow-lg transition-all duration-fast flex items-center justify-center gap-2"
          >
            進入專案詳細頁
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

// ─── 主元件 ───

const TeacherOverview = () => {
  const navigate = useNavigate();
  const userName = getCurrentUsername();

  const [selectedSemester, setSelectedSemester] = useState(null); // null = 尚未初始化
  const [selectedClass, setSelectedClass] = useState("all");
  const [activeStageFilter, setActiveStageFilter] = useState(null);
  const [previewProject, setPreviewProject] = useState(null);

  // 永遠取得全部學期的專案（學期篩選在前端做）
  const { data, isLoading } = useQuery(
    ["teacherOverviewSummary"],
    () => getTeacherProjectsSummary("all"),
    { staleTime: 30000 }
  );

  const allProjects = data?.projects || [];

  // 從全部專案中提取可用學期（降序，最新在前）
  const availableSemesters = useMemo(() => {
    const semesters = [...new Set(allProjects.map((p) => p.semester).filter(Boolean))];
    return semesters.sort((a, b) => b.localeCompare(a));
  }, [allProjects]);

  // 預設選最新學期（資料載入後自動設定一次）
  const effectiveSemester = selectedSemester ?? availableSemesters[0] ?? "all";

  // 按學期篩選
  const semesterProjects = useMemo(() => {
    if (effectiveSemester === "all") return allProjects;
    return allProjects.filter((p) => p.semester === effectiveSemester);
  }, [allProjects, effectiveSemester]);

  // 從當前學期的專案中提取可用班級
  const availableClasses = useMemo(() => {
    const classSet = new Set();
    semesterProjects.forEach((p) => {
      (p.members || []).forEach((m) => {
        if (m.class) classSet.add(m.class);
      });
    });
    return [...classSet].sort((a, b) => a.localeCompare(b));
  }, [semesterProjects]);

  // 按班級篩選
  const projects = useMemo(() => {
    if (selectedClass === "all") return semesterProjects;
    return semesterProjects.filter((p) =>
      (p.members || []).some((m) => m.class === selectedClass)
    );
  }, [semesterProjects, selectedClass]);

  // 按階段篩選
  const filteredProjects = useMemo(() => {
    if (!activeStageFilter) return projects;
    return projects.filter((p) => p.currentStage === activeStageFilter);
  }, [projects, activeStageFilter]);

  // 排序：缺少項目最多的排前面
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      const issuesA =
        a.submitStatus.missing.length +
        (!a.kanban.lastActivityAt ? 1 : 0) +
        (a.ideaWall.nodeCount === 0 ? 1 : 0);
      const issuesB =
        b.submitStatus.missing.length +
        (!b.kanban.lastActivityAt ? 1 : 0) +
        (b.ideaWall.nodeCount === 0 ? 1 : 0);
      return issuesB - issuesA;
    });
  }, [filteredProjects]);

  const handleStageClick = useCallback((stageKey) => {
    setActiveStageFilter((prev) => (prev === stageKey ? null : stageKey));
  }, []);

  const handleNavigate = useCallback(
    (projectId) => navigate(`/project/${projectId}/teacherDashboard`),
    [navigate]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-gray-50 overflow-hidden flex flex-col">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-component-sm sm:p-component-md-lg">
          <div className="max-w-7xl mx-auto">
            {/* 標題與返回 */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => navigate("/homepage")}
                  className="flex items-center p-component-xs mr-3 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="返回首頁"
                >
                  <HiArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-h2 sm:text-h1 font-extrabold text-teal-600 mb-1">
                    各組狀態總覽
                  </h1>
                  <p className="text-body-sm sm:text-body text-gray-500">
                    {userName} 老師，快速掌握各組的歷程填寫、看板與 Idea Wall 狀態
                  </p>
                </div>
              </div>

              {/* 學期 + 班級篩選 */}
              {availableSemesters.length > 0 && (
                <div className="space-y-2">
                  {/* 學期 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-sm text-gray-500 font-medium shrink-0">學期：</span>
                    <button
                      onClick={() => { setSelectedSemester("all"); setSelectedClass("all"); }}
                      className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                        effectiveSemester === "all"
                          ? "bg-teal-600 text-white"
                          : "bg-white text-gray-600 border border-gray-300 hover:border-teal-500 hover:text-teal-600"
                      }`}
                    >
                      全部學期
                    </button>
                    {availableSemesters.map((sem) => (
                      <button
                        key={sem}
                        onClick={() => { setSelectedSemester(sem); setSelectedClass("all"); }}
                        className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                          effectiveSemester === sem
                            ? "bg-teal-600 text-white"
                            : "bg-white text-gray-600 border border-gray-300 hover:border-teal-500 hover:text-teal-600"
                        }`}
                      >
                        {sem}
                      </button>
                    ))}
                  </div>
                  {/* 班級 */}
                  {availableClasses.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body-sm text-gray-500 font-medium shrink-0">班級：</span>
                      <button
                        onClick={() => setSelectedClass("all")}
                        className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                          selectedClass === "all"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-600 border border-gray-300 hover:border-blue-500 hover:text-blue-600"
                        }`}
                      >
                        全部班級
                      </button>
                      {availableClasses.map((cls) => (
                        <button
                          key={cls}
                          onClick={() => setSelectedClass(cls)}
                          className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                            selectedClass === cls
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-600 border border-gray-300 hover:border-blue-500 hover:text-blue-600"
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 1: SDL 階段總覽 */}
            <div className="mb-6">
              <StagePipeline
                projects={projects}
                activeStageFilter={activeStageFilter}
                onStageClick={handleStageClick}
              />
            </div>

            {/* Section 2: 小組狀態卡片 */}
            {sortedProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-stack-sm sm:gap-stack-md">
                {sortedProjects.map((project) => (
                  <GroupCard
                    key={project.id}
                    project={project}
                    onPreview={setPreviewProject}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-component-lg text-center">
                <p className="text-body text-gray-400">
                  {activeStageFilter
                    ? "此階段尚無專案"
                    : "尚未指導任何專案"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 歷程預覽抽屜 */}
      {previewProject && (
        <PortfolioDrawer
          project={previewProject}
          onClose={() => setPreviewProject(null)}
        />
      )}
    </div>
  );
};

export default TeacherOverview;
