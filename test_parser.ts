// 简单的测试脚本，用于验证文件解析器
import { parseTextQuestions } from './src/services/fileParser';

// 测试用户提供的论述题格式
const testText = `1.【论述题】谈谈基于构件的软件开发（CBSD）相比传统从头开发的优势。  
 答案：基于构件的软件开发（CBSD）通过复用已有的高质量软件构件，显著提高了开发效率、降低了开发成本，并提升了系统的可靠性和可维护性。相比传统从头开发，CBSD缩短了开发周期，减少了重复劳动，有利于标准化和模块化设计，同时便于系统升级和替换功能模块。
`;

console.log('测试文本:', testText);

// 直接测试parseTextQuestions函数
const result = parseTextQuestions(testText);

console.log('解析结果:', result);
console.log('题目数量:', result.questions.length);
console.log('错误信息:', result.errors);

if (result.questions.length > 0) {
  console.log('解析的题目:', result.questions[0]);
}
