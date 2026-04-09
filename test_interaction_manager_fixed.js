/**
 * 测试增强版交互管理器
 */

import { InteractionManager } from './server/src/services/enhancedInteractionService.js';

console.log('🧪 测试增强版交互管理器...\n');

try {
  // 创建交互管理器实例
  const manager = new InteractionManager();

  console.log('✅ 交互管理器创建成功\n');

  // 测试情绪检测功能
  console.log('📋 测试情绪检测功能:');
  const testInputs = [
    '我今天很开心',
    '我感觉有点焦虑',
    '我很难过，失恋了',
    '我觉得很委屈',
    '我很后悔没抓住那个机会',
    '我今天过得一般'
  ];

  for (const input of testInputs) {
    const analysis = manager.analyzeInput(input);
    console.log(`  输入: "${input}" -> 情绪: ${analysis.emotion}, 情感: ${analysis.sentiment}`);
  }
  console.log('');

  // 测试阶段转换
  console.log('📋 测试阶段转换:');
  
  // 模拟阶段1（用户输入负面情绪）
  console.log('阶段1 - 输入负面情绪:');
  const result1 = manager.processInput('我今天失恋了，很难过');
  console.log(`  结果: 阶段=${result1.stage}, 情绪追问=${result1.rounds}/6, 故事对话=${result1.storyRounds}/5`);
  console.log('');

  // 模拟阶段2（继续负面情绪）
  console.log('阶段2 - 继续负面情绪:');
  const result2 = manager.processInput('我感觉整个世界都塌了');
  console.log(`  结果: 阶段=${result2.stage}, 情绪追问=${result2.rounds}/6, 故事对话=${result2.storyRounds}/5`);
  console.log('');

  // 模拟阶段2（要求继续疏导）
  console.log('阶段2 - 要求继续疏导:');
  const result3 = manager.processInput('我想继续聊聊，还能再谈谈吗');
  console.log(`  结果: 阶段=${result3.stage}, 情绪追问=${result3.rounds}/6, 故事对话=${result3.storyRounds}/5`);
  console.log('');

  // 模拟阶段2（情绪改善）
  console.log('阶段2 - 情绪改善:');
  const result4 = manager.processInput('谢谢你，我现在感觉好多了');
  console.log(`  结果: 阶段=${result4.stage}, 情绪追问=${result4.rounds}/6, 故事对话=${result4.storyRounds}/5`);
  console.log('');

  console.log('🎉 增强版交互管理器测试完成！');
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error('堆栈:', error.stack);
}