// 题目类型
export type QuestionType = 'single' | 'multiple' | 'short' | 'unknown';

// 选项类型
export interface Option {
  id: string;
  content: string;
}

// 题目类型
export interface Question {
  id: number;
  type: QuestionType;
  content: string;
  options?: Option[];
  answer: string | string[];
  analysis?: string;
  difficulty: number; // 1-5
  category: string;
  isMarked: boolean;
  isWrong: boolean;
  createdAt: Date;
}

// 考试记录类型
export interface ExamRecord {
  id: number;
  name: string;
  duration: number; // 分钟
  questionCount: number;
  correctCount: number;
  score: number;
  createdAt: Date;
}

// 考试结果类型
export interface ExamResult {
  score: number;
  correctCount: number;
  totalCount: number;
  timeUsed: number;
}

// 答题记录类型
export interface AnswerRecord {
  questionId: number;
  selectedOptions?: string[];
  answerContent?: string;
  isCorrect?: boolean;
}

// 背题进度类型
export interface ReviewProgress {
  filter: {
    type: string;
    category: string;
    difficulty: number;
    onlyMarked: boolean;
    onlyWrong: boolean;
  };
  searchTerm: string;
  currentIndex: number;
  totalQuestions: number;
  updatedAt: Date;
}

// 导入结果类型
export interface ImportResult {
  questions: Omit<Question, 'id' | 'createdAt'>[];
  errors: string[];
}
