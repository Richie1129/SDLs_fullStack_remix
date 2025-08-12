//Reflection
import React, { useState, useEffect } from "react";
import Modal from "../../components/Modal";
import { GrFormClose } from "react-icons/gr";
import { useParams } from "react-router-dom";
import {
  getAllPersonalDaily,
  createPersonalDaily,
  getAllTeamDaily,
  createTeamDaily,
  updatePersonalDaily,
  updateTeamDaily,
} from "../../api/reflection";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast, { Toaster } from "react-hot-toast";
import { GrCircleQuestion } from "react-icons/gr";
import { motion } from "framer-motion";
import { socket } from "../../utils/socket";
import personalDailyIcon from "../../assets/AnimationPersonalDaily.json";
import teamDailyIcon from "../../assets/AnimationTeamDaily.json";
// 5Rs 相關導入
import FiveRsReflectionForm from "@/components/FiveRsReflectionForm.jsx";
import FiveRsReflectionDisplay from "@/components/FiveRsReflectionDisplay.jsx";
import { is5RsFormat, parse5RsContent } from "@/utils/5RsUtils.js";

import { analyze5RsReflection } from "@/api/llm5Rs.js";
// 新的組件導入
import LogSection from "../../components/reflection/LogSection";

// Animation configuration
const fadeInOut = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};
export default function Reflection() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();

  // 資料狀態
  const [personalDaily, setPersonalDaily] = useState([]);
  const [teamDaily, setTeamDaily] = useState([]);
  const [dailyData, setDailyData] = useState({});
  const [attachFile, setAttachFile] = useState(null);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);

  // Modal 狀態
  const [personalDailyModalOpen, setPersonalDailyModalOpen] = useState(false);
  const [teamDailyModalOpen, setTeamDailyModalOpen] = useState(false);
  const [is5RsModalOpen, setIs5RsModalOpen] = useState(false);
  const [viewReflectionModalOpen, setViewReflectionModalOpen] = useState(false);

  // 表單狀態
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  // 5Rs 相關狀態
  const [editingReflectionData, setEditingReflectionData] = useState({});
  const [selectedReflectionForView, setSelectedReflectionForView] =
    useState(null);

  // 輔助函數
  const toggleTooltip = () => setIsTooltipVisible(!isTooltipVisible);
  const closeTooltip = () => setIsTooltipVisible(false);
  const errorNotify = (toastContent) => toast.error(toastContent);
  const sucesssNotify = (toastContent) => toast.success(toastContent);

  const userRole = localStorage.getItem("role");

  const { isLoading, isError, error } = useQuery(
    ["personalDaily", { projectId, isTeacher: userRole === "teacher" }],
    () =>
      getAllPersonalDaily({
        projectId: projectId,
        userId: localStorage.getItem("id"),
        isTeacher: userRole === "teacher",
      }),
    {
      onSuccess: setPersonalDaily,
      enabled: !!projectId,
    }
  );

  // 小組日誌查詢
  const teamDailyQuery = useQuery({
    queryKey: ["teamDaily"],
    queryFn: () => getAllTeamDaily({ params: { projectId: projectId } }),
    onSuccess: setTeamDaily,
    enabled: !!projectId,
  });

  // 空狀態消息控制
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        personalDaily.length === 0 &&
        teamDaily.length === 0 &&
        !isLoading &&
        !isError
      ) {
        setShowEmptyMessage(true);
      }
    }, 20); // 延迟500毫秒显示空状态消息

    return () => clearTimeout(timer);
  }, [personalDaily.length, teamDaily.length, isLoading, isError]);

  const { mutate } = useMutation(createPersonalDaily, {
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries("personalDaily");
      sucesssNotify(res.message);
    },
    onError: (error) => {
      console.log(error);
      errorNotify(error.response.data.message);
    },
  });

  const { mutate: teamDailyMutate } = useMutation(createTeamDaily, {
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries(["teamDaily"]);
      sucesssNotify(res.message);
    },
    onError: (error) => {
      console.log(error);
      errorNotify(error.response.data.message);
    },
  });

  const { mutate: updateDaily } = useMutation(
    (data) => {
      // 檢查 data 是否為 FormData 且包含 id
      if (data instanceof FormData) {
        const id = data.get("id");
        data.delete("id"); // 從 FormData 中移除 id，因為它應該在 URL 中
        return updatePersonalDaily(id, data);
      } else {
        // 傳統的物件格式
        const { id, ...restData } = data;
        return updatePersonalDaily(id, restData);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("personalDaily");
        sucesssNotify("更新成功");
      },
      onError: (error) => {
        console.log(error);
        errorNotify("更新失敗");
      },
    }
  );

  const { mutate: updateTeamDailyMutate } = useMutation(
    ({ id, ...data }) => updateTeamDaily(id, data),
    {
      onSuccess: (res) => {
        console.log("更新成功:", res);
        queryClient.invalidateQueries("teamDaily");
        sucesssNotify("小組日誌更新成功");
      },
      onError: (error) => {
        console.log("更新失敗:", error);
        errorNotify("小組日誌更新失敗");
      },
    }
  );

  const handleCreateOrUpdateTeamDaily = (e) => {
    e.preventDefault();

    if (editingId) {
      handleSaveTeamEdit();
      return;
    }

    if (title.trim() !== "" && content.trim() !== "") {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("creator", localStorage.getItem("username"));
      if (attachFile) {
        for (let i = 0; i < attachFile.length; i++) {
          formData.append("attachFile", attachFile[i]);
        }
      }
      for (let key in dailyData) {
        formData.append(key, dailyData[key]);
      }
      teamDailyMutate(formData);
      setTeamDailyModalOpen(false);
    } else {
      toast.error("標題及內容請填寫完整!");
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) {
      toast.error("未選擇日誌");
      return;
    }

    const updatedData = {
      id: Number(editingId), // 確保 id 是數字
      title: title,
      content: content,
    };

    console.log("更新日誌:", updatedData);
    updateDaily(updatedData, {
      onSuccess: () => {
        setEditingId(null); // 更新後清除 editingId
        setPersonalDailyModalOpen(false);
        sucesssNotify("日誌更新成功");
      },
      onError: (error) => {
        console.log(error);
        errorNotify("更新失敗");
      },
    });
  };

  const handleSaveTeamEdit = () => {
    if (!editingId) {
      toast.error("未選擇日誌");
      return;
    }

    const updatedData = {
      id: Number(editingId), // 確保 id 是數字
      title: title,
      content: content,
    };

    console.log("更新日誌:", updatedData);
    updateTeamDailyMutate(updatedData, {
      onSuccess: () => {
        setEditingId(null);
        setTeamDailyModalOpen(false);
        sucesssNotify("小組日誌更新成功");
      },
      onError: (error) => {
        console.log(error);
        errorNotify("小組日誌更新失敗");
      },
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDailyData((prev) => ({
      ...prev,
      [name]: value,
      userId: localStorage.getItem("id"),
    }));
    if (name === "title") setTitle(value);
    if (name === "content") setContent(value);
  };
  const handleAddFileChange = (e) => {
    setAttachFile(e.target.files);
  };
  const handleCreateOrUpdatePersonalDaily = (e) => {
    e.preventDefault();

    if (editingId) {
      handleSaveEdit();
      return;
    }

    if (title.trim() !== "" && content.trim() !== "") {
      const formData = new FormData();
      formData.append("projectId", projectId);
      if (attachFile) {
        for (let i = 0; i < attachFile.length; i++) {
          formData.append("attachFile", attachFile[i]);
        }
      }
      for (let key in dailyData) {
        formData.append(key, dailyData[key]);
      }
      console.log("創建日誌:", ...formData);
      mutate(formData);
      setPersonalDailyModalOpen(false);
    } else {
      toast.error("標題及內容請填寫完整!");
    }
  };

  // const handleChangeSelectDaily = e => {
  //     const { name, value } = e.target;
  //     setSelectedDaily(prev => ({
  //         ...prev,
  //         [name]: value,
  //     }));
  // }

  // const handleTeamDailyChange = e => {
  //     const { name, value } = e.target;
  //     setDailyData(prev => ({
  //         ...prev,
  //         [name]: value,
  //         userId: localStorage.getItem("id")
  //     }));
  // }

  // 5Rs 反思相關處理函式
  const handle5RsSave = (data) => {
    console.log("儲存 5Rs 反思:", data);

    if (editingId) {
      // 更新現有的 5Rs 反思
      const formData = new FormData();
      formData.append("id", Number(editingId));
      formData.append("title", data.title);
      formData.append("content", data.content);

      // 如果有附加檔案，添加到 FormData
      if (data.attachFile && data.attachFile.length > 0) {
        for (let i = 0; i < data.attachFile.length; i++) {
          formData.append("attachFile", data.attachFile[i]);
        }
      }

      updateDaily(formData, {
        onSuccess: () => {
          setEditingId(null);
          setIs5RsModalOpen(false);
          setEditingReflectionData({});
          setAttachFile(null);
          sucesssNotify("5Rs 反思更新成功");
        },
        onError: (error) => {
          console.log(error);
          errorNotify("5Rs 反思更新失敗");
        },
      });
    } else {
      // 創建新的 5Rs 反思
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("title", data.title);
      formData.append("content", data.content);
      formData.append("userId", localStorage.getItem("id"));

      // 如果有附加檔案，添加到 FormData
      if (data.attachFile && data.attachFile.length > 0) {
        for (let i = 0; i < data.attachFile.length; i++) {
          formData.append("attachFile", data.attachFile[i]);
        }
      }

      mutate(formData, {
        onSuccess: () => {
          setIs5RsModalOpen(false);
          setEditingReflectionData({});
          setAttachFile(null);
        },
        onError: (error) => {
          console.log(error);
          errorNotify("5Rs 反思創建失敗");
        },
      });
    }
  };

  const handle5RsCancel = () => {
    setIs5RsModalOpen(false);
    setEditingId(null);
    setEditingReflectionData({});
    setTitle("");
    setAttachFile(null);
  };

  const Tooltip = ({ children, content }) => {
    return (
      <div className="relative group">
        {children}
        <div className="absolute  hidden group-hover:block">
          <div className="bg-gray-700 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap">
            {content}
          </div>
        </div>
      </div>
    );
  };


  // socket
  useEffect(() => {
    socket.connect();
    // socket.on("receive_message", receive_message);

    // return () => {
    //     socket.disconnect();
    // }
  }, [socket]);

  // Button configurations for cleaner component usage
  const personalLogButtons = [
    {
      text: "傳統日誌",
      variant: "primary",
      onClick: () => {
        setTitle("");
        setContent("");
        setAttachFile(null);
        setEditingId(null);
        setPersonalDailyModalOpen(true);
      },
    },
    {
      text: "5Rs 反思",
      variant: "teal",
      onClick: () => {
        setTitle("");
        setEditingReflectionData({});
        setEditingId(null);
        setIs5RsModalOpen(true);
      },
    },
  ];

  const teamLogButtons = [
    {
      text: "新增",
      variant: "primary",
      onClick: () => {
        setTitle("");
        setContent("");
        setAttachFile(null);
        setTeamDailyModalOpen(true);
        setDailyData((prev) => ({
          ...prev,
          type: "discuss",
        }));
      },
    },
  ];

  // Handler functions for LogSection
  const handleEditClick = (item) => {
    console.log("編輯的日誌:", item);
    setTitle(item.title);
    setContent(item.content);
    setAttachFile(null);
    setEditingId(item.id);
    setPersonalDailyModalOpen(true);
  };

  const handleEdit5Rs = (item) => {
    console.log("編輯 5Rs 反思:", item);
    const parsedContent = parse5RsContent(item.content);
    if (parsedContent) {
      setEditingReflectionData(parsedContent.data);
    } else {
      setEditingReflectionData({});
    }
    setTitle(item.title);
    setEditingId(item.id);
    setIs5RsModalOpen(true);
  };

  const handleView5Rs = (item) => {
    setSelectedReflectionForView(item);
    setViewReflectionModalOpen(true);
  };

  const handleRequestAIAnalysis = async (item) => {
    console.log("=== 前端 AI 分析請求開始 ===");
    console.log("選中的日誌項目:", item);

    const parsedContent = parse5RsContent(item.content);
    console.log("解析後的內容:", parsedContent);

    if (!parsedContent || !parsedContent.data) {
      console.error("解析 5Rs 內容失敗");
      toast.error("無法解析 5Rs 反思內容");
      return;
    }

    // 檢查是否已有 AI 反饋
    if (
      parsedContent.feedback &&
      (parsedContent.feedback.overall ||
        parsedContent.feedback.suggestions?.length > 0)
    ) {
      console.log("已有 AI 反饋，跳過分析");
      toast.info("此反思已有 AI 分析結果");
      return;
    }

    console.log("準備發送的反思資料:", parsedContent.data);

    try {
      toast.loading("正在請求 AI 分析...", { id: "ai-analysis" });

      console.log("呼叫 AI 分析 API...");
      const result = await analyze5RsReflection(parsedContent.data, "auto");
      console.log("AI 分析 API 回應:", result);

      if (result.success) {
        console.log("AI 分析成功，提供者:", result.provider);
        console.log("AI 回饋內容:", result.feedback);

        // 將 AI 反饋整合到現有內容中
        const updatedContent = JSON.parse(item.content);
        updatedContent.feedback = {
          ...result.feedback,
          provider: result.provider,
          analysisDate: result.analysisDate || new Date().toISOString(),
        };

        console.log("更新後的內容:", updatedContent);

        // 更新日記內容
        const updatedData = {
          id: Number(item.id),
          title: item.title,
          content: JSON.stringify(updatedContent, null, 2),
        };

        console.log("準備更新的資料:", updatedData);

        updateDaily(updatedData, {
          onSuccess: () => {
            console.log("AI 分析結果保存成功");
            toast.success(`AI 分析完成！使用 ${result.provider}`, {
              id: "ai-analysis",
            });
          },
          onError: (error) => {
            console.error("儲存 AI 分析結果失敗:", error);
            toast.error("儲存 AI 分析結果失敗", { id: "ai-analysis" });
          },
        });
      } else {
        console.error("AI 分析失敗:", result);
        toast.error("AI 分析失敗", { id: "ai-analysis" });
      }
    } catch (error) {
      console.error("AI 分析過程發生錯誤:", error);
      toast.error("AI 分析過程中發生錯誤", { id: "ai-analysis" });
    }

    console.log("=== 前端 AI 分析請求結束 ===");
  };

  const handlePersonalLogEdit = (item) => {
    if (is5RsFormat(item.content)) {
      handleEdit5Rs(item);
    } else {
      handleEditClick(item);
    }
  };

  const handleEditTeamClick = (item) => {
    if (!item) {
      console.error("選擇的日誌為 undefined，請確認 teamDaily 是否有資料");
      return;
    }

    console.log("編輯的小組日誌:", item);
    setTitle(item.title || "");
    setContent(item.content || "");
    setAttachFile(null);
    setEditingId(item.id);
    setTeamDailyModalOpen(true);
  };

  const handleTeamLogEdit = (item) => {
    handleEditTeamClick(item);
  };

  return (
    <div className="h-full w-full bg-gray-50">
      {/* 雙欄佈局容器 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
        {/* 左側欄位 - 個人日誌 */}
        <div className="flex flex-col lg:border-r border-gray-200 bg-white">
          {/* 標題區塊 */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
                個人日誌
              </h2>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setTitle("");
                    setContent("");
                    setAttachFile(null);
                    setEditingId(null);
                    setPersonalDailyModalOpen(true);
                  }}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm text-sm sm:text-base"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  傳統日誌
                </button>

                <button
                  onClick={() => {
                    setTitle("");
                    setEditingReflectionData({});
                    setEditingId(null);
                    setIs5RsModalOpen(true);
                  }}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-[#5BA491]/80 hover:bg-[#5BA491] text-white font-medium rounded-lg transition-colors duration-200 shadow-sm text-sm sm:text-base"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  +5Rs 反思
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              記錄個人的學習心得和反思，可以選擇傳統日誌或 5Rs 反思格式
            </p>
          </div>

          {/* 內容區塊 */}
          <div className="flex-1 overflow-y-auto">
            <LogSection
              title=""
              items={personalDaily}
              isLoading={isLoading}
              isError={isError}
              error={error}
              showEmptyMessage={showEmptyMessage}
              emptyStateConfig={{
                animationData: personalDailyIcon,
                message:
                  "還沒新增過個人日誌 ! 趕快新增你的第一個【個人日誌】吧 ~",
              }}
              buttons={[]}
              onEdit={handlePersonalLogEdit}
              onView5Rs={handleView5Rs}
              onRequestAIAnalysis={handleRequestAIAnalysis}
              showAIAnalysis={true}
              showCreator={false}
              className="h-full flex flex-col"
            />
          </div>
        </div>

        {/* 右側欄位 - 小組日誌 */}
        <div className="flex flex-col bg-white border-t lg:border-t-0 border-gray-200">
          {/* 標題區塊 */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
                小組日誌
              </h2>

              {/* Action Button */}
              <div className="flex">
                <button
                  onClick={() => {
                    setTitle("");
                    setContent("");
                    setAttachFile(null);
                    setTeamDailyModalOpen(true);
                    setDailyData((prev) => ({
                      ...prev,
                      type: "discuss",
                    }));
                  }}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm text-sm sm:text-base w-full sm:w-auto"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  新增
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              記錄小組討論和協作的成果，與團隊成員分享經驗
            </p>
          </div>

          {/* 內容區塊 */}
          <div className="flex-1 overflow-y-auto">
            <LogSection
              title=""
              items={teamDaily}
              isLoading={teamDailyQuery.isLoading}
              isError={teamDailyQuery.isError}
              error={error}
              showEmptyMessage={showEmptyMessage}
              emptyStateConfig={{
                animationData: teamDailyIcon,
                message:
                  "還沒新增過小組日誌 ! 趕快新增你的第一個【小組日誌】吧 ~",
              }}
              buttons={[]}
              onEdit={handleTeamLogEdit}
              showAIAnalysis={false}
              showCreator={true}
              className="h-full flex flex-col"
            />
          </div>
        </div>
      </div>

      {/* 個人反思日誌 */}
      <Modal
        open={personalDailyModalOpen}
        onClose={() => setPersonalDailyModalOpen(false)}
        opacity={true}
        position={"justify-center items-center"}
      >
        <button
          onClick={() => setPersonalDailyModalOpen(false)}
          className="absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200"
        >
          <GrFormClose className="w-6 h-6" />
        </button>
        <div className="flex flex-col px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
          <h3 className="font-bold text-base sm:text-lg mb-3 text-center">
            個人反思日誌
          </h3>
          <div className="flex items-center mb-3">
            <p className="font-bold text-sm sm:text-base">日誌內容</p>
            <button onClick={toggleTooltip} className="ml-2 p-1">
              <GrCircleQuestion className="w-4 h-4 text-[#5BA491] hover:text-[#5BA491]/60" />
            </button>
          </div>
          {isTooltipVisible && (
            <motion.div
              className="absolute z-10 bg-white p-6 rounded shadow-lg text-sm"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeInOut}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <button onClick={closeTooltip} className="absolute top-1 right-1">
                <GrFormClose className="w-4 h-4" />
              </button>
              <p className=" font-bold text-base ">日誌內容可以撰寫以下項目:</p>
              <ul>
                <li className="  text-sm pt-2">1.最近完成的進度內容。</li>
                <li className="  text-sm ">2.完成的心得反思。</li>
                <li className="  text-sm ">3.下次的預計完成的進度內容。</li>
                <li className="  text-sm ">4.是否遇到新的問題。</li>
              </ul>
            </motion.div>
          )}
          <input
            className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
            type="text"
            placeholder="日誌名稱..."
            name="title"
            value={title}
            onChange={handleChange}
            required
          />
          <textarea
            className="rounded outline-none ring-2 ring-[#5BA491] w-full mb-3 p-1 resize-none overflow-auto"
            rows={10}
            placeholder="撰寫您的日誌..."
            name="content"
            value={content}
            onChange={handleChange}
          />
          <input
            className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
            type="file"
            name="filename"
            onChange={handleAddFileChange}
            multiple
          />
          <div className="flex justify-end m-2">
            <button
              onClick={() => setPersonalDailyModalOpen(false)}
              className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2"
            >
              取消
            </button>
            <button
              onClick={(e) => {
                editingId
                  ? handleSaveEdit()
                  : handleCreateOrUpdatePersonalDaily(e);
              }}
              type="submit"
              className="mx-auto w-full h-7 mb-2 bg-[#5BA491] rounded font-bold text-xs sm:text-sm text-white"
            >
              {editingId ? "更新" : "儲存"}
            </button>
          </div>
        </div>
      </Modal>
      {/* 小組反思日誌 */}
      <Modal
        open={teamDailyModalOpen}
        onClose={() => setTeamDailyModalOpen(false)}
        opacity={true}
        position={"justify-center items-center"}
      >
        <button
          onClick={() => setTeamDailyModalOpen(false)}
          className="absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200"
        >
          <GrFormClose className="w-6 h-6" />
        </button>
        <div className="flex flex-col px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
          <h3 className="font-bold text-base sm:text-lg mb-3 text-center">
            小組反思日誌
          </h3>
          <div className="flex items-center mb-3">
            <p className="font-bold text-sm sm:text-base">日誌內容</p>
            <button onClick={toggleTooltip} className="ml-2 p-1 ">
              <GrCircleQuestion className="w-4 h-4 text-[#5BA491] hover:text-[#5BA491]/60" />
            </button>
          </div>
          {isTooltipVisible && (
            <motion.div
              className="absolute z-10 bg-white p-6 rounded shadow-lg text-sm"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeInOut}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <button onClick={closeTooltip} className="absolute top-1 right-1">
                <GrFormClose className="w-4 h-4" />
              </button>
              <p className=" font-bold text-base ">日誌內容可以撰寫以下項目:</p>
              <ul>
                <li className="  text-sm pt-2">1.最近完成的進度內容。</li>
                <li className="  text-sm ">2.完成的心得反思。</li>
                <li className="  text-sm ">3.下次的預計完成的進度內容。</li>
                <li className="  text-sm ">4.是否遇到新的問題。</li>
              </ul>
            </motion.div>
          )}
          <input
            className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
            type="text"
            placeholder="日誌名稱..."
            name="title"
            value={title}
            onChange={handleChange}
            required
          />
          <textarea
            className="rounded outline-none ring-2 ring-[#5BA491] w-full mb-3 p-1 resize-none overflow-auto"
            rows={10}
            placeholder="撰寫您的日誌..."
            name="content"
            value={content}
            onChange={handleChange}
          />
          <input
            className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
            type="file"
            name="filename"
            onChange={handleAddFileChange}
            multiple
          />
          <div className="flex justify-end m-2">
            <button
              onClick={() => setTeamDailyModalOpen(false)}
              className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2"
            >
              取消
            </button>
            <button
              onClick={(e) => {
                editingId
                  ? handleSaveTeamEdit()
                  : handleCreateOrUpdateTeamDaily(e);
              }}
              type="submit"
              className="mx-auto w-full h-7 mb-2 bg-[#5BA491] rounded font-bold text-xs sm:text-sm text-white"
            >
              {editingId ? "更新" : "儲存"}
            </button>
          </div>
        </div>
      </Modal>
      {/* 檢視 */}
      {/* {
                selectedDaily &&
                <Modal open={inspectDailyModalOpen} onClose={() => setInspectDailyModalOpen(false)} opacity={true} position={"justify-center items-center"}>
                    <div className='flex flex-col p-3'>
                        <h3 className='  font-bold text-lg mb-3 text-center'>檢視日誌</h3>
                        <p className=' font-bold text-base mb-3'>標題</p>
                        <input className=" rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
                            type="text"
                            placeholder="標題"
                            name='title'
                            value={selectedDaily.title}
                            onChange={handleChangeSelectDaily}
                            disabled
                        />
                        <p className=' font-bold text-base mb-3'>內容</p>
                        <textarea className=" rounded outline-none ring-2 ring-[#5BA491] w-full p-1 resize-none overflow-auto"
                            rows={10}
                            placeholder="內容"
                            name='content'
                            value={selectedDaily.content}
                            onChange={handleChangeSelectDaily}
                            disabled
                        />
                        {selectedDaily.fileData && (
                            <div className='flex justify-between items-center p-3 bg-gray-100 rounded-lg mt-5'>
                                <span className="font-semibold text-gray-700">附加檔案: {selectedDaily.filename}</span>
                                <button
                                    className="flex items-center justify-center px-3 py-1 bg-[#5BA491] text-white rounded-md hover:bg-[#487e6c] transition-colors duration-300 ease-in-out"
                                    onClick={() => {
                                        const buffer = new Uint8Array(selectedDaily.fileData.data);
                                        const blob = new Blob([buffer], { type: "application/octet-stream" });
                                        FileDownload(blob, selectedDaily.filename);
                                    }}
                                >
                                    <AiOutlineCloudDownload size={24} className="mr-2" />
                                    下載附件
                                </button>
                            </div>
                        )}
                    </div>
                    <div className='flex justify-end m-2'>

                        <button onClick={() => setInspectDailyModalOpen(false)} className="inline-flex items-center justify-center px-4 py-2 bg-[#5BA491] text-white rounded-md hover:bg-[#487e6c] transition-colors duration-300 ease-in-out" >
                            關閉
                        </button>
                    </div>
                </Modal>
            } */}

      <Modal
        open={is5RsModalOpen}
        onClose={() => handle5RsCancel()}
        opacity={true}
        position={"justify-center items-center"}
        custom="w-[60vw] max-w-none"
      >
        <div>
          <FiveRsReflectionForm
            initialData={editingReflectionData}
            onSave={handle5RsSave}
            onCancel={handle5RsCancel}
            isEditing={!!editingId}
            title={title}
            onTitleChange={setTitle}
            attachFile={attachFile}
            onFileChange={handleAddFileChange}
          />
        </div>
      </Modal>

      {/* 5Rs 反思檢視 Modal */}
      <Modal
        open={viewReflectionModalOpen}
        onClose={() => setViewReflectionModalOpen(false)}
        opacity={true}
        position={"justify-center items-center"}
        custom="w-[60vw] max-w-none"
      >
        <div className="max-w-6xl max-h-[90vh]">
          <div className="flex justify-between items-center mb-4 p-4 border-b">
            <h2 className="text-2xl font-bold text-gray-800">
              {selectedReflectionForView?.title || "5Rs 反思檢視"}
            </h2>
            <button
              onClick={() => setViewReflectionModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <GrFormClose size={24} />
            </button>
          </div>
          {selectedReflectionForView && (
            <FiveRsReflectionDisplay
              content={selectedReflectionForView.content}
              showFeedback={true}
              isTeacher={userRole === "teacher"}
            />
          )}
        </div>
      </Modal>

      <Toaster />
    </div>
  );
			
}
