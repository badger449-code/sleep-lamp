/**
 * 增强版交互管理器测试
 */

import { InteractionManager } from './server/src/services/enhancedInteractionService.js';

console.log('🧪 开始测试增强版交互管理器...\n');

// 创建交互管理器实例
const manager = new InteractionManager();

// 测试情绪检测
console.log('📋 情绪检测测试:');
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
  console.log(`  输入: "${input}"`);
  console.log(`  检测情绪: ${analysis.emotion}`);
  console.log(`  关键词: [${analysis.keywords.join(', ')}]`);
  console.log(`  情感倾向: ${analysis.sentiment}`);
  console.log('');
}

// 测试阶段处理
console.log('📋 阶段处理测试:');

// 模拟阶段1（开场）
console.log('阶段1 - 开场:');
const stage1Result = manager.processInput('你好');
console.log(`  结果: ${stage1Result.stage}, 情绪追问: ${stage1Result.rounds}/6, 故事对话: ${stage1Result.storyRounds}/5`);
console.log('');

// 模拟阶段2（情绪疏导）
console.log('阶段2 - 情绪疏导:');
manager.stage = 'stage2';
const stage2Result = manager.processInput('我今天失恋了，很难过');
console.log(`  结果: ${stage2Result.stage}, 情绪追问: ${stage2Result.rounds}/6, 故事对话: ${stage2Result.storyRounds}/5`);
console.log('');

// 模拟阶段3（故事推荐）
console.log('阶段3 - 故事推荐:');
manager.stage = 'stage3';
const stage3Result = manager.processInput('好的，开始吧');
console.log(`  结果: ${stage3Result.stage}, 情绪追问: ${stage3Result.rounds}/6, 故事对话: ${stage3Result.storyRounds}/5`);
console.log('');

console.log('✅ 增强版交互管理器测试完成！');