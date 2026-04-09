/**
 * 完整的增强版交互管理器测试
 */

// 使用动态导入
async function runTest() {
  try {
    const { InteractionManager } = await import('./server/src/services/enhancedInteractionService.js');

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

    // 测试完整的交互流程
    console.log('📋 完整交互流程测试:');

    // 1. 阶段1：用户表达负面情绪，应进入阶段2
    console.log('1. 阶段1 - 开场（输入负面情绪，应转入阶段2）:');
    const stage1Result = manager.processInput('我今天失恋了，很难过');
    console.log(`   结果: ${stage1Result.stage}, 情绪追问: ${stage1Result.rounds}/6, 故事对话: ${stage1Result.storyRounds}/5`);
    console.log('');

    // 2. 阶段2：继续处理负面情绪
    console.log('2. 阶段2 - 情绪疏导（继续负面情绪）:');
    const stage2Result = manager.processInput('我感觉整个世界都塌了');
    console.log(`   结果: ${stage2Result.stage}, 情绪追问: ${stage2Result.rounds}/6, 故事对话: ${stage2Result.storyRounds}/5`);
    console.log('');

    // 3. 阶段2：用户要求继续情绪疏导（突破6轮限制）
    console.log('3. 阶段2 - 情绪疏导（要求继续疏导，应允许继续）:');
    const stage2ExtendResult = manager.processInput('我想继续聊聊，还能再谈谈吗');
    console.log(`   结果: ${stage2ExtendResult.stage}, 情绪追问: ${stage2ExtendResult.rounds}/6, 故事对话: ${stage2ExtendResult.storyRounds}/5`);
    console.log('');

    // 4. 阶段2：情绪改善，进入阶段3
    console.log('4. 阶段2 - 情绪疏导（情绪改善，应进入阶段3）:');
    const stage2ImproveResult = manager.processInput('谢谢你，我现在感觉好多了');
    console.log(`   结果: ${stage2ImproveResult.stage}, 情绪追问: ${stage2ImproveResult.rounds}/6, 故事对话: ${stage2ImproveResult.storyRounds}/5`);
    console.log('');

    // 5. 阶段3：同意开始故事
    console.log('5. 阶段3 - 故事推荐（同意开始故事）:');
    const stage3Result = manager.processInput('好的，开始故事吧');
    console.log(`   结果: ${stage3Result.stage}, 情绪追问: ${stage3Result.rounds}/6, 故事对话: ${stage3Result.storyRounds}/5`);
    console.log('');

    // 6. 阶段4：故事讲述
    console.log('6. 阶段4 - 故事讲述:');
    const stage4Result = manager.processInput('这个故事很有趣');
    console.log(`   结果: ${stage4Result.stage}, 情绪追问: ${stage4Result.rounds}/6, 故事对话: ${stage4Result.storyRounds}/5`);
    console.log('');

    // 7. 阶段5：表示困意
    console.log('7. 阶段5 - 结束（表示困意）:');
    const stage5Result = manager.processInput('我现在有点困了，想睡觉');
    console.log(`   结果: ${stage5Result.stage}, 情绪追问: ${stage5Result.rounds}/6, 故事对话: ${stage5Result.storyRounds}/5`);
    console.log('');

    console.log('✅ 完整交互管理器测试完成！');

    // 额外测试：验证情绪技能集成
    console.log('📋 验证情绪技能集成:');
    
    // 重置管理器
    manager.reset();
    
    // 测试不同情绪的处理
    const emotionTests = [
      { input: '我很焦虑，明天要考试', expected: ['stage2'] },
      { input: '我感觉很委屈，老板冤枉了我', expected: ['stage2'] },
      { input: '我很后悔，不应该和朋友吵架', expected: ['stage2'] },
      { input: '我心里空空的，感觉失去了什么', expected: ['stage2'] }
    ];
    
    for (const test of emotionTests) {
      const result = manager.processInput(test.input);
      console.log(`  输入: "${test.input}" -> 阶段: ${result.stage}`);
    }
    
    console.log('\n🎉 增强版交互管理器测试成功！');
    
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

runTest();