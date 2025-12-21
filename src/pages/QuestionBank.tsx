import React, { useState, useEffect } from 'react';
import type { Question } from '../types';
import { questionDB } from '../services/db';

const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: '',
    category: '',
    difficulty: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectStats, setSubjectStats] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const allQuestions = await questionDB.getAll();
      setQuestions(allQuestions);
      
      // 计算科目统计
      const stats = new Map<string, number>();
      allQuestions.forEach(q => {
        stats.set(q.category, (stats.get(q.category) || 0) + 1);
      });
      setSubjectStats(stats);
    } catch (error) {
      console.error('获取题目失败:', error);
    } finally {
      setLoading(false);
    }
  };



  // 按科目删除题目
  const handleDeleteBySubject = async (subject: string) => {
    if (!window.confirm(`确定要删除"${subject}"科目下的所有题目吗？`)) return;
    
    try {
      const allQuestions = await questionDB.getAll();
      const subjectQuestions = allQuestions.filter(q => q.category === subject);
      const ids = subjectQuestions.map(q => q.id);
      await questionDB.bulkDelete(ids);
      fetchQuestions();
    } catch (error) {
      console.error('删除科目题目失败:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这道题目吗？')) {
      try {
        await questionDB.delete(id);
        fetchQuestions();
      } catch (error) {
        console.error('删除题目失败:', error);
      }
    }
  };

  const handleToggleMark = async (question: Question) => {
    try {
      await questionDB.update({
        ...question,
        isMarked: !question.isMarked,
      });
      fetchQuestions();
    } catch (error) {
      console.error('更新题目失败:', error);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesType = !filter.type || q.type === filter.type;
    const matchesCategory = !filter.category || q.category === filter.category;
    const matchesDifficulty = !filter.difficulty || q.difficulty === filter.difficulty;
    const matchesSearch = !searchTerm || 
      q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.analysis && q.analysis.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesType && matchesCategory && matchesDifficulty && matchesSearch;
  });

  const categories = [...new Set(questions.map(q => q.category))];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        题库管理
      </h1>

      {/* 筛选和搜索 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              题目类型
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
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
              科目
            </label>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">全部</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category} ({subjectStats.get(category) || 0}道)
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
              onChange={(e) => setFilter({ ...filter, difficulty: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value={0}>全部</option>
              {[1, 2, 3, 4, 5].map(level => (
                <option key={level} value={level}>
                  {level}星
                </option>
              ))}
            </select>
          </div>

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
        </div>
      </div>

      {/* 科目管理 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">科目管理</h2>
          <p className="text-gray-600 dark:text-gray-400">
            共 {subjectStats.size} 个科目
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...subjectStats.entries()].map(([subject, count]) => (
            <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium">{subject}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{count}道题目</p>
              </div>
              <button
                onClick={() => handleDeleteBySubject(subject)}
                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                title="删除科目"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 题目列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">题目列表</h2>
          <p className="text-gray-600 dark:text-gray-400">
            共 {filteredQuestions.length} 道题目
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            加载中...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            没有找到匹配的题目
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredQuestions.map((question) => (
              <div
                key={question.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      question.type === 'single' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : question.type === 'multiple' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    }`}>
                      {question.type === 'single' ? '单选题' : 
                       question.type === 'multiple' ? '多选题' : '简答题'}
                    </span>
                    
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {question.category} · {question.difficulty}星
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleMark(question)}
                      className={`p-1 rounded-full ${
                        question.isMarked 
                          ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                      title={question.isMarked ? '取消标记' : '标记重点'}
                    >
                      {question.isMarked ? '⭐' : '☆'}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="p-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <p className="mb-2 text-gray-900 dark:text-gray-100">
                  {question.content}
                </p>
                
                {question.options && (
                  <div className="mb-2 pl-4 space-y-1">
                    {question.options.map((option) => (
                      <div key={option.id} className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{option.id}.</span> {option.content}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">答案: </span>
                  <span className="text-green-600 dark:text-green-400">
                    {Array.isArray(question.answer) ? question.answer.join(',') : question.answer}
                  </span>
                </div>
                
                {question.analysis && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">解析: </span>{question.analysis}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;
