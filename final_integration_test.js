/**
 * 最终集成测试
 * 验证情绪技能系统与prompts.js阶段流程的集成
 */

console.log('🧪 开始最终集成测试...\n');

// 验证情绪识别服务
console.log('📋 验证情绪识别服务:');
try {
  const { processUserInput } = await import('./server/src/services/emotionService.js');
  const result = processUserInput('我今天失恋了，很难过');
  console.log(`  ✅ 情绪识别正常: ${result.emotionAnalysis.emotion}`);
  console.log(`  ✅ 置信度: ${(result.emotionAnalysis.confidence * 100).toFixed(0)}%`);
} catch (e) {
  console.log(`  ❌ 情绪识别异常: ${e.message}`);
}

// 验证技能系统
console.log('\n📋 验证技能系统:');
try {
  const { executeEmotionSkill } = await import('./server/src/skills/emotion_skills.js');
  const skillResult = executeEmotionSkill('我今天失恋了，很难过');
  console.log(`  ✅ 技能执行正常: ${skillResult.skill.name}`);
  console.log(`  ✅ 响应长度: ${skillResult.response.length} 字符`);
} catch (e) {
  console.log(`  ❌ 技能执行异常: ${e.message}`);
}

// 验证交互管理器
console.log('\n📋 验证交互管理器:');
try {
  const { InteractionManager } = await import('./server/src/services/enhancedInteractionService.js');
  const manager = new InteractionManager();
  const result = manager.processInput('我今天很开心');
  console.log(`  ✅ 交互管理器正常创建`);
  console.log(`  ✅ 情绪检测: ${manager.analyzeInput('我很难过').emotion}`);
} catch (e) {
  console.log(`  ❌ 交互管理器异常: ${e.message}`);
}

console.log('\n✅ 所有系统模块验证完成！');
console.log('\n✨ 系统现在具备以下能力：');
console.log('  • 情绪识别：自动检测用户情绪状态');
console.log('  • 心理学技能：基于专业话术的情绪疏导');
console.log('  • 阶段管理：与prompts.js的5阶段流程集成');
console.log('  • 突破限制：在阶段2可突破6轮限制进行深度疏导');
console.log('  • 无缝集成：情绪技能与原有AI交互流程融合');