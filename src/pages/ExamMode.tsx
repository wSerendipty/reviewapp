import React, { useState, useEffect, useRef } from 'react';
import type { Question, AnswerRecord, ExamResult } from '../types';
import { questionDB, examRecordDB } from '../services/db';

// 考试状态
type ExamStatus = 'setup' | 'taking' | 'finished';

const ExamMode: React.FC = () => {
  const [status, setStatus] = useState<ExamStatus>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, AnswerRecord>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 默认60分钟，转换为秒
  const [examName, setExamName] = useState('');
  const [examSettings, setExamSettings] = useState({
    questionCount: 20,
    duration: 60,
    includeSingle: true,
    includeMultiple: true,
    includeShort: true,
  });
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isQuestionListExpanded, setIsQuestionListExpanded] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  // 提取关键词的辅助函数
  const extractKeywords = (text: string): Set<string> => {
    // 转换为小写，去除标点符号，分词
    const keywords = text.toLowerCase()
      .replace(/[.,!?;:'"()[\]{}_-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1); // 过滤掉单个字符
    
    return new Set(keywords);
  };

  // 完成考试
  const handleFinish = React.useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // 批改试卷，计算总得分和正确题数
    let totalScore = 0;
    let correctCount = 0;
    const totalPossible = questions.length;
    
    questions.forEach((q) => {
      const answer = answers.get(q.id);
      if (!answer) {
        return;
      }
      
      if (q.type === 'single') {
        // 单选题：正确得1分，错误得0分
        const isCorrect = answer.selectedOptions?.[0] === q.answer;
        totalScore += isCorrect ? 1 : 0;
        if (isCorrect) correctCount++;
      } else if (q.type === 'multiple') {
        // 多选题：完全正确得1分，否则得0分
        const selected = new Set(answer.selectedOptions || []);
        const correct = new Set(q.answer as string[]);
        const isCorrect = selected.size === correct.size && [...selected].every(s => correct.has(s));
        totalScore += isCorrect ? 1 : 0;
        if (isCorrect) correctCount++;
      } else {
        // 简答题：关键词匹配，按比例给分
        const correctAnswer = Array.isArray(q.answer) ? q.answer.join(' ') : q.answer;
        const userAnswer = answer.answerContent || '';
        
        if (!userAnswer.trim()) {
          totalScore += 0;
          return;
        }
        
        // 提取关键词
        const correctKeywords = extractKeywords(correctAnswer);
        const userKeywords = extractKeywords(userAnswer);
        
        // 计算匹配的关键词数量
        let matchedCount = 0;
        userKeywords.forEach(keyword => {
          if (correctKeywords.has(keyword)) {
            matchedCount++;
          }
        });
        
        // 计算匹配率
        const matchRate = correctKeywords.size > 0 ? matchedCount / correctKeywords.size : 0;
        // 根据匹配率给分，保留一位小数
        totalScore += Math.round(matchRate * 10) / 10;
        // 简答题：匹配率达到60%及以上算正确
        if (matchRate >= 0.6) correctCount++;
      }
    });
    
    // 计算最终得分（百分制）
    const score = Math.round((totalScore / totalPossible) * 100);
    
    // 保存考试记录
    await examRecordDB.add({
      name: examName,
      duration: examSettings.duration,
      questionCount: questions.length,
      correctCount,
      score,
    });
    
    // 计算用时：总时长（分钟）转换为秒，减去剩余秒数，再转换回分钟
    const timeUsedInMinutes = (examSettings.duration * 60 - timeRemaining) / 60;
    
    setResult({
      score,
      correctCount,
      totalCount: questions.length,
      timeUsed: Math.round(timeUsedInMinutes),
    });
    
    setStatus('finished');
  }, [questions, answers, examName, examSettings.duration, timeRemaining]);

  // 获取所有题目
  useEffect(() => {
    const fetchQuestions = async () => {
      const questions = await questionDB.getAll();
      setAllQuestions(questions);
    };
    fetchQuestions();
  }, []);

  // 倒计时
  useEffect(() => {
    if (status === 'taking' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          // 当时间用完时，在下一个渲染周期调用handleFinish
          if (newTime <= 0) {
            // 使用setTimeout延迟调用，避免在setState中直接调用另一个setState
            setTimeout(() => {
              if (status === 'taking') {
                handleFinish();
              }
            }, 0);
          }
          return newTime;
        });
      }, 1000); // 每秒减少1
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status, timeRemaining, handleFinish]);

  // 开始考试
  const handleStart = () => {
    if (!examName.trim()) {
      alert('请输入考试名称');
      return;
    }
    
    // 筛选符合条件的题目
    const eligibleQuestions = allQuestions.filter(q => {
      if (q.type === 'single' && !examSettings.includeSingle) return false;
      if (q.type === 'multiple' && !examSettings.includeMultiple) return false;
      if (q.type === 'short' && !examSettings.includeShort) return false;
      return true;
    });
    
    if (eligibleQuestions.length < examSettings.questionCount) {
      alert(`符合条件的题目不足，只有 ${eligibleQuestions.length} 道`);
      return;
    }
    
    // 随机抽取题目
    const shuffled = [...eligibleQuestions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, examSettings.questionCount);
    
    setQuestions(selectedQuestions);
    setCurrentQuestionIndex(0);
    setAnswers(new Map());
    setTimeRemaining(examSettings.duration * 60); // 将分钟转换为秒
    setStatus('taking');
  };

  // 处理答题
  const handleAnswer = (questionId: number, answer: AnswerRecord) => {
    setAnswers(prev => new Map(prev).set(questionId, answer));
  };

  // 格式化时间：将秒转换为 MM:SS 格式
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        考试模式
      </h1>

      {/* 考试设置 */}
      {status === 'setup' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">考试设置</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                考试名称
              </label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="输入考试名称"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  题目数量
                </label>
                <input
                  type="number"
                  min="1"
                  max={allQuestions.length}
                  value={examSettings.questionCount}
                  onChange={(e) => setExamSettings({
                    ...examSettings,
                    questionCount: parseInt(e.target.value),
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  考试时长（分钟）
                </label>
                <input
                  type="number"
                  min="1"
                  value={examSettings.duration}
                  onChange={(e) => setExamSettings({
                    ...examSettings,
                    duration: parseInt(e.target.value),
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                题目类型
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={examSettings.includeSingle}
                    onChange={(e) => setExamSettings({
                      ...examSettings,
                      includeSingle: e.target.checked,
                    })}
                    className="mr-2 text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-gray-700 dark:text-gray-300">单选题</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={examSettings.includeMultiple}
                    onChange={(e) => setExamSettings({
                      ...examSettings,
                      includeMultiple: e.target.checked,
                    })}
                    className="mr-2 text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-gray-700 dark:text-gray-300">多选题</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={examSettings.includeShort}
                    onChange={(e) => setExamSettings({
                      ...examSettings,
                      includeShort: e.target.checked,
                    })}
                    className="mr-2 text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-gray-700 dark:text-gray-300">简答题</span>
                </label>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              可用题目：{allQuestions.length} 道
            </div>
            
            <button
              onClick={handleStart}
              disabled={!examSettings.includeSingle && !examSettings.includeMultiple && !examSettings.includeShort}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              开始考试
            </button>
          </div>
        </div>
      )}

      {/* 考试进行中 */}
      {status === 'taking' && questions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* 顶部信息 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">{examName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                第 {currentQuestionIndex + 1} / {questions.length} 题
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <div className="text-lg font-bold text-red-500">
                剩余时间: {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          {/* 移动端：可折叠的题目列表 */}
          <div className="mb-6 lg:hidden">
            {/* 折叠/展开按钮 */}
            <button
              onClick={() => setIsQuestionListExpanded(!isQuestionListExpanded)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-left"
            >
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">题目列表</span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {answers.size} / {questions.length} 已答
                </span>
              </div>
              <div className={`transform transition-transform duration-300 ${
                isQuestionListExpanded ? 'rotate-180' : ''
              }`}>
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {/* 题目列表内容 - 仅在展开时显示 */}
            {isQuestionListExpanded && (
              <div className="mt-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-5 gap-1">
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        index === currentQuestionIndex
                          ? 'bg-blue-600 text-white'
                          : answers.has(questions[index].id)
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                    <span>当前题目</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900"></span>
                    <span>已答</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-100 dark:bg-gray-600"></span>
                    <span>未答</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 左右结构：左侧题目内容，右侧图例（仅桌面端） */}
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            {/* 左侧：当前题目 */}
            <div className="flex-1">
              {(() => {
                const question = questions[currentQuestionIndex];
                const currentAnswer = answers.get(question.id) as AnswerRecord || { questionId: question.id };
                
                return (
                  <div key={question.id}>
                    <div className="mb-4">
                      <span className={`px-2 py-1 text-xs rounded-full mr-2 ${
                        question.type === 'single' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                          : question.type === 'multiple' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                          : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {question.type === 'single' ? '单选题' : 
                         question.type === 'multiple' ? '多选题' : '简答题'}
                      </span>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {question.content}
                      </h3>
                    </div>

                    {/* 选项 */}
                    {question.options && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option) => {
                          const isSelected = currentAnswer.selectedOptions?.includes(option.id) || false;
                          
                          return (
                            <label
                              key={option.id}
                              className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30' 
                                  : 'border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-600'
                              }`}
                            >
                              <input
                                type={question.type === 'single' ? 'radio' : 'checkbox'}
                                name={`question-${question.id}`}
                                checked={isSelected}
                                onChange={() => {
                                  const selectedOptions = question.type === 'single' 
                                    ? [option.id]
                                    : isSelected
                                    ? currentAnswer.selectedOptions?.filter((id: string) => id !== option.id) || []
                                    : [...(currentAnswer.selectedOptions || []), option.id];
                                  
                                  handleAnswer(question.id, {
                                    questionId: question.id,
                                    selectedOptions,
                                  });
                                }}
                                className="mr-3 text-blue-600 dark:text-blue-400"
                              />
                              <span className="text-gray-700 dark:text-gray-300">
                                {option.content}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* 简答题输入 */}
                    {question.type === 'short' && (
                      <div className="mb-4">
                        <textarea
                          value={currentAnswer.answerContent || ''}
                          onChange={(e) => {
                            handleAnswer(question.id, {
                              questionId: question.id,
                              answerContent: e.target.value,
                            });
                          }}
                          placeholder="请输入答案..."
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 右侧：图例（仅桌面端） */}
            <div className="hidden lg:block lg:w-64">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">题目列表</h3>
                <div className="grid grid-cols-5 gap-1">
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        index === currentQuestionIndex
                          ? 'bg-blue-600 text-white'
                          : answers.has(questions[index].id)
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                    <span>当前题目</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900"></span>
                    <span>已答</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-100 dark:bg-gray-600"></span>
                    <span>未答</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部：只留左右切换和提交按钮 */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              上一题
            </button>
            
            <button
              onClick={handleFinish}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              提交试卷
            </button>
            
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              下一题
            </button>
          </div>
        </div>
      )}

      {/* 考试结果 */}
      {status === 'finished' && result && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              考试结束
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {examName}
            </p>
          </div>

          {/* 成绩概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {result.score} 分
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                总分
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {result.correctCount} / {result.totalCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                答对题数
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {result.timeUsed} 分钟
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                用时
              </div>
            </div>
          </div>

          {/* 错题分析 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">错题分析</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questions.map((question) => {
                const answer = answers.get(question.id);
                let isCorrect = false;
                
                if (question.type === 'single') {
                  isCorrect = answer?.selectedOptions?.[0] === question.answer;
                } else if (question.type === 'multiple') {
                  const selected = new Set(answer?.selectedOptions || []);
                  const correct = new Set(question.answer as string[]);
                  isCorrect = selected.size === correct.size && [...selected].every(s => correct.has(s));
                }
                
                if (!isCorrect) {
                  return (
                    <div key={question.id} className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                      <p className="mb-2 text-gray-900 dark:text-gray-100">
                        {question.content}
                      </p>
                      
                      {question.options && (
                        <div className="mb-2 pl-4 space-y-1">
                          {question.options.map((option) => (
                            <div key={option.id} className="text-sm">
                              <span className={`font-medium ${
                                (Array.isArray(question.answer) && question.answer.includes(option.id)) ||
                                (!Array.isArray(question.answer) && question.answer === option.id)
                                  ? 'text-green-600 dark:text-green-400'
                                  : answer?.selectedOptions?.includes(option.id)
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {option.id}.</span> {option.content}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">正确答案: </span>
                        <span className="text-green-600 dark:text-green-400">
                          {Array.isArray(question.answer) ? question.answer.join(',') : question.answer}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }).filter(Boolean)}
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setStatus('setup')}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              返回设置
            </button>
            
            <button
              onClick={() => {
                // 重新开始同一考试
                setCurrentQuestionIndex(0);
                setAnswers(new Map());
                setTimeRemaining(examSettings.duration);
                setStatus('taking');
              }}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              重新考试
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamMode;
