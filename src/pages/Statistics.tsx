import React, { useState, useEffect } from 'react';
import type { Question, ExamRecord } from '../types';
import { questionDB, examRecordDB } from '../services/db';

const Statistics: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      const [questions, examRecords] = await Promise.all([
        questionDB.getAll(),
        examRecordDB.getAll(),
      ]);
      setQuestions(questions);
      setExamRecords(examRecords);
      setLoading(false);
    };
    fetchData();
  }, []);

  // 计算统计数据
  const stats = {
    totalQuestions: questions.length,
    singleCount: questions.filter(q => q.type === 'single').length,
    multipleCount: questions.filter(q => q.type === 'multiple').length,
    shortCount: questions.filter(q => q.type === 'short').length,
    markedCount: questions.filter(q => q.isMarked).length,
    wrongCount: questions.filter(q => q.isWrong).length,
    totalExams: examRecords.length,
    averageScore: examRecords.length > 0 
      ? Math.round(examRecords.reduce((sum, record) => sum + record.score, 0) / examRecords.length)
      : 0,
    highestScore: examRecords.length > 0 
      ? Math.max(...examRecords.map(record => record.score))
      : 0,
  };

  // 按难度分布
  const difficultyDistribution = {
    1: questions.filter(q => q.difficulty === 1).length,
    2: questions.filter(q => q.difficulty === 2).length,
    3: questions.filter(q => q.difficulty === 3).length,
    4: questions.filter(q => q.difficulty === 4).length,
    5: questions.filter(q => q.difficulty === 5).length,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        统计分析
      </h1>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : (
        <div className="space-y-8">
          {/* 概览统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                题库概览
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">题目总数</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalQuestions}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">重点标记</span>
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.markedCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">错题数量</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.wrongCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                题型分布
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600 dark:text-gray-400">单选题</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {stats.singleCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${stats.totalQuestions > 0 ? (stats.singleCount / stats.totalQuestions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600 dark:text-gray-400">多选题</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {stats.multipleCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${stats.totalQuestions > 0 ? (stats.multipleCount / stats.totalQuestions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600 dark:text-gray-400">简答题</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {stats.shortCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${stats.totalQuestions > 0 ? (stats.shortCount / stats.totalQuestions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                考试统计
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">考试次数</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalExams}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">平均分数</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.averageScore} 分
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">最高分数</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.highestScore} 分
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 难度分布 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                难度分布
              </h2>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(difficulty => (
                  <div key={difficulty}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        {difficulty}星难度
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {difficultyDistribution[difficulty as keyof typeof difficultyDistribution]}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          difficulty === 1 ? 'bg-green-600' :
                          difficulty === 2 ? 'bg-blue-600' :
                          difficulty === 3 ? 'bg-yellow-600' :
                          difficulty === 4 ? 'bg-orange-600' :
                          'bg-red-600'
                        }`} 
                        style={{ 
                          width: `${stats.totalQuestions > 0 ? 
                            (difficultyDistribution[difficulty as keyof typeof difficultyDistribution] / stats.totalQuestions) * 100 
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 考试记录 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
                考试记录
              </h2>
              {examRecords.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          考试名称
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          分数
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          题目数
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          日期
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {examRecords
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, 10)
                        .map((record) => (
                          <tr key={record.id}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {record.name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                record.score >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                record.score >= 80 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                record.score >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {record.score} 分
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {record.questionCount}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  暂无考试记录
                </div>
              )}
            </div>
          </div>

          {/* 学习建议 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
              学习建议
            </h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              {stats.totalQuestions === 0 ? (
                <p>建议您先导入题库，开始刷题之旅！</p>
              ) : (
                <>
                  {stats.wrongCount > 0 && (
                    <p>
                      <span className="font-medium text-red-600 dark:text-red-400">错题数量较多</span>，
                      建议您在背题模式中重点复习错题集，加深理解。
                    </p>
                  )}
                  {stats.markedCount === 0 && (
                    <p>
                      建议您在刷题过程中，将重点题目标记为重点，方便后续复习。
                    </p>
                  )}
                  {stats.singleCount > stats.multipleCount + stats.shortCount && (
                    <p>
                      单选题数量较多，建议您适当增加多选题和简答题的练习，
                      提高综合答题能力。
                    </p>
                  )}
                  {stats.totalExams < 5 && (
                    <p>
                      建议您多使用考试模式进行模拟考试，熟悉考试节奏，
                      提高答题速度和准确率。
                    </p>
                  )}
                  {stats.averageScore < 80 && (
                    <p>
                      目前平均分数还有提升空间，建议您针对薄弱环节加强练习，
                      提高整体水平。
                    </p>
                  )}
                  {stats.averageScore >= 90 && (
                    <p className="text-green-600 dark:text-green-400">
                      您的平均分数很高，继续保持！建议尝试更高难度的题目，
                      进一步提升自己的能力。
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
