import React, { useState, useEffect } from 'react';
import { parseFile } from '../services/fileParser';
import { questionDB } from '../services/db';
import type { ImportResult, Question } from '../types';

const Import: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 获取现有科目列表
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const allQuestions = await questionDB.getAll();
        const subjectsSet = new Set(allQuestions.map(q => q.category));
        setSubjects([...subjectsSet]);
      } catch (error) {
        console.error('获取科目列表失败:', error);
      }
    };
    fetchSubjects();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseResult(null);
      setMessage('');
      setErrors([]);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setMessage('请先选择文件');
      return;
    }

    setIsParsing(true);
    setMessage('正在解析文件...');
    setErrors([]);

    try {
      const result = await parseFile(file);
      setParseResult(result);
      
      if (result.errors.length > 0) {
        setErrors(result.errors);
        setMessage(`解析完成，发现 ${result.errors.length} 个错误`);
      } else {
        setMessage(`解析完成，共找到 ${result.questions.length} 道题目`);
      }
    } catch (error) {
      setMessage(`解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setErrors([`解析失败: ${error instanceof Error ? error.message : '未知错误'}`]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || !parseResult.questions.length) {
      setMessage('没有可导入的题目');
      return;
    }

    // 检查是否选择了科目
    if (!selectedSubject) {
      setMessage('请先选择或创建一个科目');
      return;
    }

    setIsImporting(true);
    setMessage('正在导入题目...');

    try {
      // 为所有题目添加选中的科目
      const questionsWithSubject = parseResult.questions.map(q => ({
        ...q,
        category: selectedSubject
      }));
      
      const ids = await questionDB.bulkAdd(questionsWithSubject);
      setMessage(`导入成功，共导入 ${ids.length} 道题目到"${selectedSubject}"科目`);
      setParseResult(null);
      setFile(null);
      
      // 更新科目列表
      const allQuestions = await questionDB.getAll();
      const subjectsSet = new Set(allQuestions.map(q => q.category));
      setSubjects([...subjectsSet]);
    } catch (error) {
      setMessage(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        导入题库
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">选择文件</h2>
        
        <div className="mb-4">
            <input
              type="file"
              accept=".docx,.xlsx,.pdf,.md"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-600 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-700"
            />
          </div>

        {file && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="font-medium">已选择文件:</p>
            <p>{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {/* 科目选择 - 可输入可选择的组合框 */}
        <div className="mb-4 relative" onClick={() => setShowSuggestions(true)}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            选择导入科目
          </label>
          
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="请输入或选择科目"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                onKeyPress={(e) => {
                  // 按回车键创建新科目
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (selectedSubject.trim() && !subjects.includes(selectedSubject.trim())) {
                      const trimmedName = selectedSubject.trim();
                      setSubjects([...subjects, trimmedName]);
                      setSelectedSubject(trimmedName);
                    }
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // 延迟关闭，确保点击建议项能触发
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              {/* 下拉箭头指示器 */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${showSuggestions ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* 下拉建议列表 - 只在 showSuggestions 为 true 时显示 */}
            {showSuggestions && (
              <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg bg-white dark:bg-gray-800 z-10 absolute w-full">
                {/* 显示所有科目，突出匹配的选项 */}
                {subjects.length > 0 ? (
                  subjects.map(subject => (
                    <div
                      key={subject}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setShowSuggestions(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${subject.toLowerCase().includes(selectedSubject.toLowerCase()) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {subject}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                    暂无科目，请创建新科目
                  </div>
                )}
                
                {/* 新增科目选项 */}
                {selectedSubject.trim() && !subjects.includes(selectedSubject.trim()) && (
                  <div
                    key="new-subject"
                    onClick={() => {
                      const trimmedName = selectedSubject.trim();
                      setSubjects([...subjects, trimmedName]);
                      setSelectedSubject(trimmedName);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors border-t border-gray-200 dark:border-gray-700 mt-2"
                  >
                    <span className="text-blue-600 dark:text-blue-400">+ 创建新科目: {selectedSubject.trim()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleParse}
            disabled={!file || isParsing || isImporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isParsing ? '解析中...' : '解析文件'}
          </button>
          
          {parseResult && parseResult.questions.length > 0 && (
            <button
              onClick={handleImport}
              disabled={isParsing || isImporting || !selectedSubject}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
            >
              {isImporting ? '导入中...' : '导入题库'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${message.includes('成功') ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
            解析错误
          </h3>
          <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-400">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {parseResult && parseResult.questions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">解析结果预览</h3>
          <p className="mb-4">共解析到 {parseResult.questions.length} 道题目</p>
          
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    题目
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    答案
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {parseResult.questions.slice(0, 10).map((question: Omit<Question, 'id' | 'createdAt'>, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {question.type === 'single' ? '单选题' : 
                       question.type === 'multiple' ? '多选题' : '简答题'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {question.content.substring(0, 50)}{question.content.length > 50 ? '...' : ''}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {Array.isArray(question.answer) ? question.answer.join(',') : question.answer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {parseResult.questions.length > 10 && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              显示前10道题目，共 {parseResult.questions.length} 道
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Import;
