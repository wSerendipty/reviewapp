// 简单的测试脚本，用于验证文件解析器
import { parseTextQuestions } from './src/services/fileParser';

// 测试多种格式的题目
const testText = `1. 以下哪种是最常见且危害最大的软件安全漏洞？
   A. 代码注释不完整
   B. 变量命名不规范
   C. 缓冲区溢出
   D. 函数过长
   【答案】 C 
   【解析】 
    * C. 缓冲区溢出：这是历史最悠久且危害最大的漏洞之一。当程序尝试将数据写入缓冲区，且数据长度超过缓冲区容量时，会覆盖相邻内存位置，攻击者可利用此漏洞执行恶意代码。 
    * A、B、D 属于代码质量或风格问题，虽然影响维护，但通常不被归类为严峻的“安全漏洞”。 

2. 简述 MVC 架构的组成部分及各部分的作用。
   【答案与解析】 
    * Model (模型)：处理业务逻辑和数据状态。 
    * View (视图)：负责数据的展示（用户界面）。 
    * Controller (控制器)：处理用户交互，接收请求，调用模型处理，并选择视图进行显示。

3. 以下哪些是面向对象编程的基本特征？
   A. 封装
   B. 继承
   C. 多态
   D. 结构化
   【答案】 A,B,C 
   【解析】面向对象编程的三个基本特征是封装、继承和多态。结构化是传统编程范式的特征，不是面向对象编程的基本特征。

4. 传统格式的题目示例
   A. 选项1
   B. 选项2
   C. 选项3
   答案：B
   解析：这是传统格式的答案和解析。
`;

console.log('测试文本:', testText);

// 直接测试parseTextQuestions函数
const result = parseTextQuestions(testText);

console.log('解析结果:', result);
console.log('题目数量:', result.questions.length);
console.log('错误信息:', result.errors);

result.questions.forEach((question, index) => {
  console.log(`\n第${index + 1}题:`);
  console.log('题型:', question.type);
  console.log('题干:', question.content);
  console.log('选项:', question.options);
  console.log('答案:', question.answer);
  console.log('解析:', question.analysis);
});
