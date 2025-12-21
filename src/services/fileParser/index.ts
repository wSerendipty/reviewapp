import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfParse from 'pdf-parse';
import type { Question, ImportResult, QuestionType, Option } from '../../types';



// 解析Word文件
export const parseWordFile = async (file: File): Promise<ImportResult> => {
  const questions: Omit<Question, 'id' | 'createdAt'>[] = [];
  const errors: string[] = [];
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    // 使用通用文本解析函数
    const { questions: parsedQuestions, errors: parseErrors } = parseTextQuestions(text);
    questions.push(...parsedQuestions);
    errors.push(...parseErrors);
    
  } catch (error) {
    errors.push(`Word解析错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return {
    questions,
    errors,
  };
};

// 解析Excel文件
export const parseExcelFile = async (file: File): Promise<ImportResult> => {
  const questions: Omit<Question, 'id' | 'createdAt'>[] = [];
  const errors: string[] = [];
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // 假设Excel表头格式：类型,题目,选项A,选项B,选项C,选项D,答案,解析,难度,分类
    jsonData.forEach((value, index: number) => {
      // 假设Excel行包含的字段
      const row = value as {
        '类型'?: string;
        '题目'?: string;
        '选项A'?: string;
        '选项B'?: string;
        '选项C'?: string;
        '选项D'?: string;
        '答案'?: string;
        '解析'?: string;
        '难度'?: number;
        '分类'?: string;
        [key: string]: unknown;
      };
      try {
        const type = row['类型'] as string;
        let questionType: QuestionType;
        
        switch (type?.toLowerCase()) {
          case '单选':
          case 'single':
            questionType = 'single';
            break;
          case '多选':
          case 'multiple':
            questionType = 'multiple';
            break;
          case '简答':
          case 'short':
            questionType = 'short';
            break;
          default:
            throw new Error(`无效的题目类型: ${type}`);
        }
        
        const options: Option[] = [];
        if (questionType !== 'short') {
          // 提取选项
          for (let i = 0; i < 10; i++) {
            const optionKey = String.fromCharCode(65 + i); // A, B, C, ...
            const optionContent = row[`选项${optionKey}`];
            if (optionContent) {
              options.push({
                id: optionKey,
                content: String(optionContent),
              });
            }
          }
        }
        
        let answer: string | string[];
        const answerStr = row['答案'];
        if (questionType === 'multiple') {
          // 多选题答案格式：A,B,C
          answer = String(answerStr).split(',').map(a => a.trim());
        } else {
          answer = String(answerStr);
        }
        
        questions.push({
          type: questionType,
          content: String(row['题目']),
          options: options.length > 0 ? options : undefined,
          answer,
          analysis: row['解析'] ? String(row['解析']) : undefined,
          difficulty: Number(row['难度']) || 3,
          category: row['分类'] ? String(row['分类']) : '默认分类',
          isMarked: false,
          isWrong: false,
        });
        
      } catch (error) {
        errors.push(`第${index + 2}行解析错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
    
  } catch (error) {
    errors.push(`Excel解析错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return {
    questions,
    errors,
  };
};

// 解析PDF文件
export const parsePDFFile = async (file: File): Promise<ImportResult> => {
  const questions: Omit<Question, 'id' | 'createdAt'>[] = [];
  const errors: string[] = [];
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    // 使用pdf-parse的正确调用方式
    // 使用类型断言处理pdf-parse的调用
    const pdfParseFunc = (pdfParse as unknown as (data: Uint8Array) => Promise<{ text: string }>);
    const result = await pdfParseFunc(data);
    const text = result.text;
    
    // 使用通用文本解析函数
    const { questions: parsedQuestions, errors: parseErrors } = parseTextQuestions(text);
    questions.push(...parsedQuestions);
    errors.push(...parseErrors);
    
  } catch (error) {
    errors.push(`PDF解析错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return {
    questions,
    errors,
  };
};

// 解析Markdown文件
export const parseMarkdownFile = async (file: File): Promise<ImportResult> => {
  const questions: Omit<Question, 'id' | 'createdAt'>[] = [];
  const errors: string[] = [];
  
  try {
    const text = await file.text();
    
    // 使用通用文本解析函数
    const { questions: parsedQuestions, errors: parseErrors } = parseTextQuestions(text);
    questions.push(...parsedQuestions);
    errors.push(...parseErrors);
    
  } catch (error) {
    errors.push(`Markdown解析错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return {
    questions,
    errors,
  };
};

// 导出parseTextQuestions函数，用于测试和其他模块使用
export const parseTextQuestions = (text: string): { questions: Omit<Question, 'id' | 'createdAt'>[], errors: string[] } => {
  const questions: Omit<Question, 'id' | 'createdAt'>[] = [];
  const errors: string[] = [];
  
  try {
    // 预处理文本：合并因换行断裂的句子，移除多余空行
    const processedText = text
      // 合并因换行断裂的句子（不包含选项行和答案行）
      .replace(/(?<!\s[A-Z]\.|\s*答案：?)\n(?![A-Z]\.|\d+\.|\d+\)|第\s*\d+\s*题|\s*答案：|$)/g, ' ')
      // 移除多余空行
      .replace(/\n{3,}/g, '\n\n')
      // 移除页眉页脚和页码干扰
      .replace(/(\n\s*第\s*\d+\s*页\s*\n|\n\s*页码\s*\d+\s*\n)/g, '')
      // 移除多余空格
      .trim();
    
    // 按题号分割题目
    // 支持格式：1. 题目, 1.题目, 2) 题目, 2)题目, 第3题 题目, 第3题题目
    // 标号前后允许有任意空格，标号可以不按顺序
    const questionSplits = processedText.split(/\n(?=\s*(?:\d+\.|\d+\)|第\s*\d+\s*题)\s*)/g);
    
    // 处理每道题目
    questionSplits.forEach((questionText, index) => {
      try {
        // 跳过空行
        if (!questionText.trim()) {
          return;
        }
        
        // 提取题目编号，允许前后有任意空格
        const questionNumberMatch = questionText.match(/^\s*(?:\d+\.|\d+\)|第\s*\d+\s*题)\s*/);
        if (!questionNumberMatch) {
          // 可能是没有编号的题目或干扰内容，跳过
          return;
        }
        
        // 提取题目原始文本（去除编号和可能的类型标记）
        let questionTypeStr = '';
        const rawQuestionText = questionText.replace(questionNumberMatch[0], '')
          // 允许【】后面没有空格
          .replace(/^【([^】]+)】\s*/, (match, typeMark) => {
            if (match && typeMark) {
              // 保存类型标记
              questionTypeStr = typeMark;
            }
            return '';
          })
          .trim();
        
        // 分离题干、选项、答案和解析
        
        // 1. 找到所有答案和解析标记的位置
        const allMarks = [
          // 答案标记
          rawQuestionText.search(/\s*答案：?/),
          rawQuestionText.search(/\s*【答案/),
          rawQuestionText.search(/\s*【答案与解析/),
          // 解析标记
          rawQuestionText.search(/\s*解析：?/),
          rawQuestionText.search(/\s*【解析/)
        ];
        
        // 2. 找到最前面的标记位置
        let firstMarkIndex = rawQuestionText.length;
        for (const index of allMarks) {
          if (index !== -1 && index < firstMarkIndex) {
            firstMarkIndex = index;
          }
        }
        
        // 3. 只在第一个标记之前的文本中提取选项
        const textBeforeMarks = rawQuestionText.slice(0, firstMarkIndex);
        
        // 4. 提取选项（只在第一个标记之前的文本中）
        const options: Option[] = [];
        // 更新选项正则表达式，支持中文句号（。）
        const optionRegex = /\s*([A-Z])[.．]\s*(.+?)(?=\s*[A-Z][.．]|$)/g;
        let optionMatch;
        let hasOptions = false;
        
        while ((optionMatch = optionRegex.exec(textBeforeMarks)) !== null) {
          hasOptions = true;
          const [, optionId, optionContent] = optionMatch;
          options.push({
            id: optionId,
            content: optionContent.trim(),
          });
        }
        
        // 提取题干（只包含选项之前的内容）
        let content = '';
        if (hasOptions) {
          // 选项之前的内容作为题干
          content = rawQuestionText.slice(0, rawQuestionText.search(/\s*[A-Z]\./)).trim();
        } else {
          // 没有选项的情况，提取答案之前的内容作为题干
          // 允许多种答案标签格式
          content = rawQuestionText.split(/\s*(答案：?|【答案|【答案与解析)\s*/)[0].trim();
        }
        
        // 提取答案部分
        let answer: string | string[] = '';
        let analysis = '';
        
        // 1. 支持【答案】和【解析】格式
        const answerMatch = rawQuestionText.match(/【答案】\s*([\s\S]*?)(?=【解析】|$)/);
        const analysisMatch = rawQuestionText.match(/【解析】\s*([\s\S]*?)(?=【|$)/);
        
        // 2. 支持【答案与解析】格式（用于简答题/论述题）
        const answerAndAnalysisMatch = rawQuestionText.match(/【答案与解析】\s*([\s\S]*?)(?=【|$)/);
        
        // 3. 支持传统的答案：和解析：格式
        const traditionalAnswerMatch = rawQuestionText.match(/答案：?\s*([\s\S]*?)(?=\s*解析：|$)/);
        const traditionalAnalysisMatch = rawQuestionText.match(/解析：\s*([\s\S]*?)(?=\n|$)/);
        
        if (answerMatch) {
          // 从【答案】标签提取答案
          const pureAnswer = answerMatch[1].trim();
          const answers = pureAnswer.split(',').map(a => a.trim().replace(/^：/, ''));
          answer = answers.length > 1 ? answers : answers[0];
        } else if (traditionalAnswerMatch) {
          // 从传统格式提取答案
          const pureAnswer = traditionalAnswerMatch[1].trim().replace(/\s*解析：.*$/, '').trim();
          const answers = pureAnswer.split(',').map(a => a.trim().replace(/^：/, ''));
          answer = answers.length > 1 ? answers : answers[0];
        } else if (answerAndAnalysisMatch) {
          // 从【答案与解析】提取，用于简答题/论述题
          const content = answerAndAnalysisMatch[1].trim();
          answer = content;
          analysis = content;
        }
        
        if (analysisMatch) {
          // 从【解析】标签提取解析
          analysis = analysisMatch[1].trim();
        } else if (traditionalAnalysisMatch && !answerAndAnalysisMatch) {
          // 从传统格式提取解析
          analysis = traditionalAnalysisMatch[1].trim();
        }
        
        // 识别题型：优先从类型标记提取，否则使用选项数量判断
        let type: QuestionType = 'unknown';
        
        // 优先从【】中提取题目类型
        if (questionTypeStr) {
          const typeStrLower = questionTypeStr.toLowerCase();
          if (typeStrLower.includes('单选') || typeStrLower.includes('单选题')) {
            type = 'single';
          } else if (typeStrLower.includes('多选') || typeStrLower.includes('多选题')) {
            type = 'multiple';
          } else if (typeStrLower.includes('简答') || typeStrLower.includes('论述') || typeStrLower.includes('问答')) {
            type = 'short';
          }
        }
        
        // 如果类型标记未识别，使用选项数量判断
        if (type === 'unknown') {
          if (hasOptions) {
            // 有选项，默认都是单选，除非明确标记为多选
            type = 'single';
          } else {
            // 没有选项，是简答题或论述题
            type = 'short';
          }
        }
        
        // 创建题目对象
        questions.push({
          type,
          content,
          options: hasOptions ? options : undefined,
          answer,
          analysis,
          difficulty: 3,
          category: '默认分类',
          isMarked: false,
          isWrong: false,
        });
        
      } catch (error) {
        errors.push(`解析第${index + 1}题失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
    
  } catch (error) {
    errors.push(`文本解析错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return { questions, errors };
};

// 根据文件类型选择解析器
export const parseFile = async (file: File): Promise<ImportResult> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'docx':
      return parseWordFile(file);
    case 'xlsx':
      return parseExcelFile(file);
    case 'pdf':
      return parsePDFFile(file);
    case 'md':
      return parseMarkdownFile(file);
    default:
      return {
        questions: [],
        errors: [`不支持的文件格式: ${fileExtension}`],
      };
  }
};
