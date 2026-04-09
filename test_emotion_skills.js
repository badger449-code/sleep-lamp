/**
 * 情绪技能系统测试脚本
 */

import { executeEmotionSkill } from './server/src/skills/emotion_skills.js';

// 动态导入需要特殊处理
async function runTests() {
  // 使用动态导入来加载 emotionService
  const { processUserInput } = await import('./server/src/services/emotionService.js');

  console.log('🧪 开始测试情绪识别和技能系统...\n');

  // 测试各种情绪输入
  const testInputs = [
    '我明天要开会，好紧张，担心出错',
    '凭什么总是我来承担这些',
    '我好后悔当初没选择那份工作',
    '我觉得心里空空的，很难过',
    '我还是睡不着',
    '今天过得很糟糕'
  ];

  for (const input of testInputs) {
    console.log(`📝 输入: "${input}"`);
    
    // 测试情绪识别
    const emotionResult = processUserInput(input);
    console.log(`🧠 情绪识别: ${emotionResult.emotionAnalysis.emotion} (置信度: ${(emotionResult.emotionAnalysis.confidence * 100).toFixed(0)}%)`);
    
    // 测试技能选择
    const skillResult = executeEmotionSkill(input);
    console.log(`🎯 选择技能: ${skillResult.skill.name}`);
    console.log(`💬 响应长度: ${skillResult.response.length} 字符`);
    console.log(`✅ 技能执行成功\n`);
  }

  console.log('✅ 所有测试完成！');
}

runTests().catch(console.error);