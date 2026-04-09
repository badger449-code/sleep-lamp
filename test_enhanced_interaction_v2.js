/**
 * 增强版交互管理器测试（改进版）
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

// 测试交互流程
console.log('📋 交互流程测试:');

// 测试阶段1到阶段2的转换
console.log('阶段1 - 开场（输入负面情绪，应转入阶段2）:');
const stage1Result = manager.processInput('我今天失恋了，很难过');
console.log(`  结果: ${stage1Result.stage}, 情绪追问: ${stage1Result.rounds}/6, 故事对话: ${stage1Result.storyRounds}/5`);
console.log('');

// 测试阶段2的处理
console.log('阶段2 - 情绪疏导（继续负面情绪）:');
const stage2Result = manager.processInput('我感觉整个世界都塌了');
console.log(`  结果: ${stage2Result.stage}, 情绪追问: ${stage2Result.rounds}/6, 故事对话: ${stage2Result.storyRounds}/5`);
console.log('');

// 测试阶段2突破限制
console.log('阶段2 - 情绪疏导（要求继续疏导，应突破6轮限制）:');
const stage2ExtendResult = manager.processInput('我想继续聊聊，还能再谈谈吗');
console.log(`  结果: ${stage2ExtendResult.stage}, 情绪追问: ${stage2ExtendResult.rounds}/6, 故事对话: ${stage2ExtendResult.storyRounds}/5`);
console.log('');

// 测试阶段2情绪改善
console.log('阶段2 - 情绪疏导（情绪改善，应进入阶段3）:');
const stage2ImproveResult = manager.processInput('谢谢你，我现在感觉好多了');
console.log(`  结果: ${stage2ImproveResult.stage}, 情绪追问: ${stage2ImproveResult.rounds}/6, 故事对话: ${stage2ImproveResult.storyRounds}/5`);
console.log('');

// 重置并测试故事流程
console.log('阶段3 - 故事推荐（同意开始故事）:');
manager.stage = 'stage3';
const stage3Result = manager.processInput('好的，开始故事吧');
console.log(`  结果: ${stage3Result.stage}, 情绪追问: ${stage3Result.rounds}/6, 故事对话: ${stage3Result.storyRounds}/5`);
console.log('');

// 测试故事阶段
console.log('阶段4 - 故事讲述:');
const stage4Result = manager.processInput('这个故事很有趣');
console.log(`  结果: ${stage4Result.stage}, 情绪追问: ${stage4Result.rounds}/6, 故事对话: ${stage4Result.storyRounds}/5`);
console.log('');

console.log('✅ 增强版交互管理器测试完成！');