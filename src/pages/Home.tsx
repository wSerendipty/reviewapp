import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-blue-600 dark:text-blue-400">
          欢迎使用刷题软件
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          高效复习，轻松备考，助你渡过期末难关
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 功能卡片 */}
        <Link
          to="/import"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">导入题库</h3>
              <p className="text-gray-600 dark:text-gray-400">
                支持Word、Excel、PDF格式，轻松导入你的题库
              </p>
            </div>
            <div className="text-4xl text-blue-500">📁</div>
          </div>
        </Link>

        <Link
          to="/exam-mode"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">考试模式</h3>
              <p className="text-gray-600 dark:text-gray-400">
                模拟真实考试环境，定时答题，自动批改
              </p>
            </div>
            <div className="text-4xl text-red-500">⏰</div>
          </div>
        </Link>

        <Link
          to="/review-mode"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">背题模式</h3>
              <p className="text-gray-600 dark:text-gray-400">
                查看题目及答案，标记重点，反复练习
              </p>
            </div>
            <div className="text-4xl text-green-500">📚</div>
          </div>
        </Link>

        <Link
          to="/question-bank"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">题库管理</h3>
              <p className="text-gray-600 dark:text-gray-400">
                管理你的题目，分类、筛选、编辑
              </p>
            </div>
            <div className="text-4xl text-purple-500">🗂️</div>
          </div>
        </Link>
      </div>

      <div className="mt-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">
          使用指南
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>首先点击「导入题库」，上传你的Word、Excel或PDF文件</li>
          <li>在「题库管理」中查看和编辑导入的题目</li>
          <li>选择「考试模式」进行模拟考试，或「背题模式」进行重点复习</li>
          <li>在「统计分析」中查看你的学习进度和成绩</li>
        </ol>
      </div>
    </div>
  );
};

export default Home;
