import React, { useState, useEffect } from "react";
import type { Question } from "../types";
import { questionDB, reviewProgressDB } from "../services/db";

const ReviewMode: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  // 默认currentIndex为0，即第一道题目
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [filter, setFilter] = useState({
    type: "",
    category: "",
    difficulty: 0,
    onlyMarked: false,
    onlyWrong: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const categories = [...new Set(questions.map((q) => q.category))];

  // 使用useRef跟踪上一次的筛选条件
  // const previousFilterRef = React.useRef({
  //   filter: filter,
  //   searchTerm: searchTerm,
  //   questionsLength: questions.length,
  // });

  // 获取所有题目
  useEffect(() => {
    const fetchQuestions = async () => {
      const questions = await questionDB.getAll();
      setQuestions(questions);
    };
    fetchQuestions();
  }, []);

  // 使用useMemo计算筛选结果
  const filteredQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      const matchesType = !filter.type || q.type === filter.type;
      const matchesCategory =
        !filter.category || q.category === filter.category;
      const matchesDifficulty =
        !filter.difficulty || q.difficulty === filter.difficulty;
      const matchesMarked = !filter.onlyMarked || q.isMarked;
      const matchesWrong = !filter.onlyWrong || q.isWrong;
      const matchesSearch =
        !searchTerm ||
        q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.analysis &&
          q.analysis.toLowerCase().includes(searchTerm.toLowerCase()));

      return (
        matchesType &&
        matchesCategory &&
        matchesDifficulty &&
        matchesMarked &&
        matchesWrong &&
        matchesSearch
      );
    });
  }, [questions, filter, searchTerm]);

  // 恢复背题进度 - 简化逻辑：有进度就恢复，没有就保持默认值0
  const restoreProgress = React.useCallback(async () => {
    try {
      // 只有在有题目时才恢复进度
      if (filteredQuestions.length > 0) {
        // 先查看db中是否有存在的数据
        const progress = await reviewProgressDB.getProgress();

        if (progress) {
          // 确保progress.currentIndex是有效数字
          const savedIndex = typeof progress.currentIndex === 'number' && !isNaN(progress.currentIndex) ? progress.currentIndex : 0;
          // 如果有进度数据，加载上次的数据，确保索引在有效范围内
          const newIndex = Math.max(0, Math.min(
            savedIndex,
            filteredQuestions.length - 1
          ));
          console.log("恢复进度:", newIndex);

          setCurrentQuestionIndex(newIndex);
        }
        // 没有进度数据时，保持默认值0（第一道题目）
      }
    } catch (error) {
      console.error("恢复背题进度失败:", error);
      // 恢复失败时，设置为0
      setCurrentQuestionIndex(0);
    }
  }, [filteredQuestions.length]);

  // 当过滤后的题目变化时，尝试恢复进度
  useEffect(() => {
    // 只有在有题目时才恢复进度
    if (filteredQuestions.length > 0) {
      // 使用setTimeout异步调用，确保在题目加载完成后执行
      const timer = setTimeout(() => {
        restoreProgress();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [filteredQuestions.length, restoreProgress]);

  // 保存背题进度到本地存储 - 使用useCallback避免重复创建
  const saveProgress = React.useCallback(
    async (currentIndex: number = currentQuestionIndex) => {
      console.log(
        `保存进度: currentIndex=${currentIndex}, totalQuestions=${filteredQuestions.length}`
      );

      if (filteredQuestions.length === 0) return;

      await reviewProgressDB.saveProgress({
        filter,
        searchTerm,
        currentIndex,
        totalQuestions: filteredQuestions.length,
      });
    },
    [filter, searchTerm, currentQuestionIndex, filteredQuestions.length]
  );

  // // 组件卸载前保存进度
  // useEffect(() => {
  //   return () => {
  //     saveProgress();
  //   };
  // }, [saveProgress]);

  // 在渲染时检查筛选条件是否变化，如果变化则保存当前进度
  // React.useLayoutEffect(() => {
  //   const previous = previousFilterRef.current;
  //   const current = {
  //     filter,
  //     searchTerm,
  //     questionsLength: questions.length,
  //   };

  //   // 检查筛选条件是否变化
  //   const filterChanged = JSON.stringify(previous.filter) !== JSON.stringify(current.filter);
  //   const searchTermChanged = previous.searchTerm !== searchTerm;
  //   const questionsLengthChanged = previous.questionsLength !== current.questionsLength;

  //   if (filterChanged || searchTermChanged || questionsLengthChanged) {
  //     // 保存当前进度
  //     saveProgress();

  //     // 筛选条件发生变化，重置答案显示状态
  //     setShowAnswer(false);

  //     // 只有在有题目时才尝试恢复进度
  //     if (filteredQuestions.length > 0) {
  //       // 使用setTimeout异步调用，避免级联渲染
  //       const timer = setTimeout(() => {
  //         restoreProgress();
  //       }, 0);

  //       return () => clearTimeout(timer);
  //     }

  //     // 更新上一次的筛选条件
  //     previousFilterRef.current = current;
  //   }
  // }, [filter, searchTerm, questions.length, saveProgress, filteredQuestions.length, restoreProgress]);

  // 切换答案显示
  const toggleAnswer = () => {
    setShowAnswer((prev) => !prev);
  };

  // 标记题目
  const toggleMark = async () => {
    if (filteredQuestions.length === 0) return;

    const question = filteredQuestions[currentQuestionIndex];
    try {
      await questionDB.update({
        ...question,
        isMarked: !question.isMarked,
      });
      // 更新本地状态
      const updatedQuestions = questions.map((q) =>
        q.id === question.id ? { ...q, isMarked: !q.isMarked } : q
      );
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error("更新题目失败:", error);
    }
  };

  // 标记为错题
  const toggleWrong = async () => {
    if (filteredQuestions.length === 0) return;

    const question = filteredQuestions[currentQuestionIndex];
    try {
      await questionDB.update({
        ...question,
        isWrong: !question.isWrong,
      });
      // 更新本地状态
      const updatedQuestions = questions.map((q) =>
        q.id === question.id ? { ...q, isWrong: !q.isWrong } : q
      );
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error("更新题目失败:", error);
    }
  };

  // 导航到上一题
  const goToPrevious = () => {
    setCurrentQuestionIndex((prev) => {
      // 确保prev是有效数字
      const validPrev = isNaN(prev) ? 0 : prev;
      const newIndex = Math.max(0, validPrev - 1);
      saveProgress(newIndex);
      return newIndex;
    });
    setShowAnswer(false);
  };

  // 导航到下一题
  const goToNext = () => {
    setCurrentQuestionIndex((prev) => {
      // 确保prev是有效数字
      const validPrev = isNaN(prev) ? 0 : prev;
      const newIndex = Math.min(filteredQuestions.length - 1, validPrev + 1);
      saveProgress(newIndex);
      return newIndex;
    });
    setShowAnswer(false);
  };

  // 进度百分比
  const progressPercentage =
    filteredQuestions.length > 0 && !isNaN(currentQuestionIndex)
      ? Math.round(
          ((Math.max(0, currentQuestionIndex) + 1) / filteredQuestions.length) * 100
        )
      : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        背题模式
      </h1>

      {/* 筛选和搜索 - 可折叠设计 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
        {/* 折叠/展开按钮 */}
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center">
            <span className="text-lg font-semibold">筛选条件</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              共找到 {filteredQuestions.length} 道题目
            </span>
          </div>
          <div
            className={`transform transition-transform duration-300 ${
              isFilterExpanded ? "rotate-180" : ""
            }`}
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {/* 筛选内容 - 仅在展开时显示 */}
        {isFilterExpanded && (
          <div className="p-4 pb-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  题目类型
                </label>
                <select
                  value={filter.type}
                  onChange={(e) =>
                    setFilter({ ...filter, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">全部</option>
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                  <option value="short">简答题</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分类
                </label>
                <select
                  value={filter.category}
                  onChange={(e) =>
                    setFilter({ ...filter, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">全部</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  难度
                </label>
                <select
                  value={filter.difficulty}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      difficulty: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value={0}>全部</option>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      {level}星
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  搜索
                </label>
                <input
                  type="text"
                  placeholder="搜索题目内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  特殊筛选
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.onlyMarked}
                      onChange={(e) =>
                        setFilter({ ...filter, onlyMarked: e.target.checked })
                      }
                      className="mr-2 text-blue-600 dark:text-blue-400"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      只看重点题目
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.onlyWrong}
                      onChange={(e) =>
                        setFilter({ ...filter, onlyWrong: e.target.checked })
                      }
                      className="mr-2 text-red-600 dark:text-red-400"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      只看错题
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 背题区域 */}
      {filteredQuestions.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* 可拖拽进度条 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                进度: {currentQuestionIndex + 1} / {filteredQuestions.length}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {progressPercentage}%
              </span>
            </div>

            {/* 可拖拽的进度条容器 */}
            <div className="relative">
              {/* 背景进度条 */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"></div>

              {/* 已完成进度 */}
              <div
                className="absolute top-0 bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>

              {/* 拖拽滑块 */}
              <input
                type="range"
                min="0"
                max={filteredQuestions.length - 1}
                value={currentQuestionIndex}
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value);
                  // 确保newIndex是有效数字
                  const validPrev = isNaN(newIndex) ? 0 : newIndex;
                  const validIndex = Math.max(0, Math.min(validPrev, filteredQuestions.length - 1));
                  setCurrentQuestionIndex(validIndex);
                  saveProgress(validIndex);
                  setShowAnswer(false);
                }}
                className="absolute top-0 w-full h-2 opacity-0 cursor-pointer"
                style={{ zIndex: 1 }}
              />

              {/* 可视化的滑块指示器 */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 bg-blue-600 w-4 h-4 rounded-full transition-all duration-300"
                style={{
                  left: `${progressPercentage}%`,
                  marginLeft: "-8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              ></div>
            </div>
          </div>

          {/* 当前题目 */}
          <div className="mb-8">
            {(() => {
              // 确保当前索引有效
              if (
                currentQuestionIndex < 0 ||
                currentQuestionIndex >= filteredQuestions.length
              ) {
                return null;
              }

              const question = filteredQuestions[currentQuestionIndex];
              if (!question) return null;

              return (
                <div key={question.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          question.type === "single"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : question.type === "multiple"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        }`}
                      >
                        {question.type === "single"
                          ? "单选题"
                          : question.type === "multiple"
                          ? "多选题"
                          : "简答题"}
                      </span>

                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {question.category} · {question.difficulty}星
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={toggleMark}
                        className={`p-2 rounded-md transition-colors ${
                          question.isMarked
                            ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                        title={question.isMarked ? "取消标记" : "标记重点"}
                      >
                        {question.isMarked ? "⭐ 已标记" : "☆ 标记"}
                      </button>

                      <button
                        onClick={toggleWrong}
                        className={`p-2 rounded-md transition-colors ${
                          question.isWrong
                            ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                        title={question.isWrong ? "取消错题" : "标记为错题"}
                      >
                        {question.isWrong ? "❌ 错题" : "✓ 正确"}
                      </button>
                    </div>
                  </div>

                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    {question.content}
                  </p>

                  {question.options && (
                    <div className="mb-4 pl-4 space-y-2">
                      {question.options.map((option) => (
                        <div
                          key={option.id}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          <span className="font-medium">{option.id}.</span>{" "}
                          {option.content}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 答案区域 */}
                  <div className="mb-4">
                    <button
                      onClick={toggleAnswer}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-4"
                    >
                      {showAnswer ? "隐藏答案" : "显示答案"}
                    </button>

                    {showAnswer && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
                            答案
                          </h3>
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            {Array.isArray(question.answer)
                              ? question.answer.join(",")
                              : question.answer}
                          </p>
                        </div>

                        {question.analysis && (
                          <div>
                            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
                              解析
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300">
                              {question.analysis}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between items-center">
            <button
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors flex-1 text-center"
            >
              上一题
            </button>

            <button
              onClick={goToNext}
              disabled={currentQuestionIndex === filteredQuestions.length - 1}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex-1 text-center ml-4"
            >
              下一题
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold mb-2">没有找到题目</h2>
          <p className="text-gray-600 dark:text-gray-400">
            请调整筛选条件或先导入题库
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewMode;
