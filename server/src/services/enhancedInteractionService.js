/**
 * 增强版交互管理器
 * 结合prompts.js的阶段逻辑和心理学情绪技能
 */

export class InteractionManager {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.stage = 'stage1'; // 初始阶段
    this.rounds = 0;       // 情绪追问轮数
    this.storyRounds = 0;  // 故事对话轮数
    this.userEmotions = []; // 用户情绪历史
    this.sessionContext = {}; // 会话上下文
    this.emotionHistory = []; // 情绪历史记录
  }

  /**
   * 处理用户输入并返回流程结果
   * @param {string} input - 用户输入
   * @returns {Object} 流程结果
   */
  async processInput(input) {
    // 分析输入内容
    const inputAnalysis = this.analyzeInput(input);
    
    // 记录情绪历史
    this.emotionHistory.push(inputAnalysis.emotion);
    
    // 根据当前阶段和输入内容决定下一步
    switch(this.stage) {
      case 'stage1':
        return this.handleStage1(input, inputAnalysis);
      case 'stage2':
        return this.handleStage2(input, inputAnalysis);
      case 'stage3':
        return this.handleStage3(input, inputAnalysis);
      case 'stage4':
        return this.handleStage4(input, inputAnalysis);
      case 'stage5':
        return this.handleStage5(input, inputAnalysis);
      default:
        return this.handleDefault(input, inputAnalysis);
    }
  }

  /**
   * 分析输入内容
   */
  analyzeInput(input) {
    const analysis = {
      emotion: this.detectEmotion(input),
      keywords: this.extractKeywords(input),
      sentiment: this.assessSentiment(input),
      isStageTransition: this.checkStageTransition(input)
    };
    
    return analysis;
  }

  /**
   * 检测情绪
   */
  detectEmotion(input) {
    const lowerInput = input.toLowerCase();
    
    // 检测正面情绪
    if (lowerInput.includes('开心') || lowerInput.includes('高兴') || lowerInput.includes('愉快') || lowerInput.includes('不错')) {
      return '愉悦';
    }
    if (lowerInput.includes('放松') || lowerInput.includes('平静') || lowerInput.includes('舒适') || lowerInput.includes('好')) {
      return '放松';
    }
    
    // 检测负面情绪
    if (lowerInput.includes('焦虑') || lowerInput.includes('紧张') || lowerInput.includes('担心')) {
      return '焦虑';
    }
    if (lowerInput.includes('难过') || lowerInput.includes('伤心') || lowerInput.includes('失落')) {
      return '低落';
    }
    if (lowerInput.includes('生气') || lowerInput.includes('愤怒') || lowerInput.includes('烦')) {
      return '愤怒';
    }
    if (lowerInput.includes('害怕') || lowerInput.includes('恐惧') || lowerInput.includes('恐慌')) {
      return '恐惧';
    }
    if (lowerInput.includes('失恋') || lowerInput.includes('分手') || lowerInput.includes('背叛')) {
      return '低落';
    }
    if (lowerInput.includes('委屈') || lowerInput.includes('憋屈') || lowerInput.includes('不公')) {
      return '委屈';
    }
    if (lowerInput.includes('后悔') || lowerInput.includes('遗憾') || lowerInput.includes('当初')) {
      return '懊悔';
    }
    
    return '一般';
  }

  /**
   * 提取关键词
   */
  extractKeywords(input) {
    const keywords = [];
    const lowerInput = input.toLowerCase();
    
    // 情绪相关关键词
    const emotionKeywords = [
      '开心', '高兴', '愉快', '放松', '平静', '焦虑', '紧张', '担心', 
      '难过', '伤心', '失落', '生气', '愤怒', '害怕', '恐惧', '恐慌',
      '委屈', '憋屈', '不公', '后悔', '遗憾', '当初', '失恋', '分手',
      '今天', '心情', '感觉', '压力', '烦恼', '痛苦', '孤独', '无助',
      '好', '不错', '舒服', '满意', '轻松', '糟糕', '讨厌', '恨', '气'
    ];
    
    for (const keyword of emotionKeywords) {
      if (lowerInput.includes(keyword)) {
        keywords.push(keyword);
      }
    }
    
    return keywords;
  }

  /**
   * 评估情感倾向
   */
  assessSentiment(input) {
    const positiveWords = ['好', '不错', '舒服', '平静', '开心', '高兴', '愉快', '满意', '轻松', '放松'];
    const negativeWords = ['不好', '糟糕', '难过', '痛苦', '烦', '讨厌', '恨', '气', '焦虑', '紧张', '担心', '伤心', '失落', '生气', '愤怒', '害怕', '恐惧', '恐慌'];
    
    let score = 0;
    const lowerInput = input.toLowerCase();
    
    for (const word of positiveWords) {
      if (lowerInput.includes(word)) score++;
    }
    
    for (const word of negativeWords) {
      if (lowerInput.includes(word)) score--;
    }
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * 检查是否需要阶段转换
   */
  checkStageTransition(input) {
    const lowerInput = input.toLowerCase();
    
    // 检查是否表达困意
    if (lowerInput.includes('困') || lowerInput.includes('想睡') || lowerInput.includes('要睡')) {
      return 'stage5';
    }
    
    // 检查是否同意开始故事
    if (lowerInput.includes('好') || lowerInput.includes('开始') || lowerInput.includes('继续')) {
      return 'stage3_to_stage4';
    }
    
    return null;
  }

  /**
   * 处理阶段1：首轮开场与呼吸预热
   */
  handleStage1(input, analysis) {
    // 检查是否进入阶段2
    if (analysis.emotion !== '愉悦' && analysis.emotion !== '放松' && analysis.emotion !== '一般') {
      this.stage = 'stage2';
      this.rounds = 0; // 重置情绪追问轮数
      return {
        stage: 'stage2',
        rounds: this.rounds,
        storyRounds: this.storyRounds,
        text: `我感受到了你的情绪变化。现在让我们进入更深的共情和放松阶段，我会运用心理学知识来帮助你。`,
        shouldContinue: true
      };
    }
    
    return {
      stage: 'stage1',
      rounds: this.rounds,
      storyRounds: this.storyRounds,
      text: '',
      shouldContinue: true
    };
  }

  /**
   * 处理阶段2：情绪共情与深度放松
   */
  handleStage2(input, analysis) {
    this.rounds++;
    
    // 检查情绪是否改善
    const isImproved = analysis.sentiment === 'positive' || 
                      (analysis.emotion === '一般' || analysis.emotion === '放松');
    
    // 检查是否达到轮数上限或情绪改善
    if (this.rounds >= 6 || isImproved) {
      this.stage = 'stage3';
      this.rounds = 0; // 重置轮数
      return {
        stage: 'stage3',
        rounds: this.rounds,
        storyRounds: this.storyRounds,
        text: `经过情绪共情和放松引导，现在让我们进入故事推荐阶段。`,
        shouldContinue: true
      };
    }
    
    // 特殊处理：如果用户表达继续情绪疏导的需求，允许突破6轮限制
    if (input.toLowerCase().includes('继续') || input.toLowerCase().includes('再聊聊') || 
        input.toLowerCase().includes('还想聊聊') || input.toLowerCase().includes('再谈谈')) {
      // 不增加轮数，允许继续进行情绪疏导
      return {
        stage: 'stage2',
        rounds: this.rounds - 1, // 保持当前轮数不变，允许继续
        storyRounds: this.storyRounds,
        text: `我理解你希望继续情绪疏导，我们可以继续进行心理学深度引导。`,
        shouldContinue: true
      };
    }
    
    return {
      stage: 'stage2',
      rounds: this.rounds,
      storyRounds: this.storyRounds,
      text: '',
      shouldContinue: true
    };
  }

  /**
   * 处理阶段3：故事推荐与白噪音启动
   */
  handleStage3(input, analysis) {
    // 检查是否同意开始故事
    if (input.toLowerCase().includes('好') || input.toLowerCase().includes('开始') || 
        input.toLowerCase().includes('继续') || input.toLowerCase().includes('是的')) {
      this.stage = 'stage4';
      return {
        stage: 'stage4',
        rounds: this.rounds,
        storyRounds: this.storyRounds,
        text: '',
        shouldContinue: true
      };
    }
    
    return {
      stage: 'stage3',
      rounds: this.rounds,
      storyRounds: this.storyRounds,
      text: '',
      shouldContinue: true
    };
  }

  /**
   * 处理阶段4：故事讲述与自然分支
   */
  handleStage4(input, analysis) {
    this.storyRounds++;
    
    // 检查是否达到故事轮数上限
    if (this.storyRounds >= 5) {
      this.stage = 'stage5';
      return {
        stage: 'stage5',
        rounds: this.rounds,
        storyRounds: this.storyRounds,
        text: '',
        shouldContinue: true
      };
    }
    
    return {
      stage: 'stage4',
      rounds: this.rounds,
      storyRounds: this.storyRounds,
      text: '',
      shouldContinue: true
    };
  }

  /**
   * 处理阶段5：结束、困意确认与埋点
   */
  handleStage5(input, analysis) {
    // 检查是否表示困意
    if (input.toLowerCase().includes('困') || input.toLowerCase().includes('想睡') || input.toLowerCase().includes('睡了')) {
      return {
        stage: 'FINISHED',
        rounds: this.rounds,
        storyRounds: this.storyRounds,
        text: '祝你有个甜美的梦乡，晚安。',
        shouldContinue: false
      };
    }
    
    // 检查是否要继续
    if (input.toLowerCase().includes('继续') || input.toLowerCase().includes('还不困') || input.toLowerCase().includes('再聊')) {
      this.stage = 'stage4'; // 回到故事阶段
      return {
        stage: 'stage4',
        rounds: this.rounds,
        storyRounds: this.storyRounds,
        text: '',
        shouldContinue: true
      };
    }
    
    return {
      stage: 'stage5',
      rounds: this.rounds,
      storyRounds: this.storyRounds,
      text: '',
      shouldContinue: true
    };
  }

  /**
   * 处理默认情况
   */
  handleDefault(input, analysis) {
    this.stage = 'stage1';
    return {
      stage: 'stage1',
      rounds: this.rounds,
      storyRounds: this.storyRounds,
      text: '',
      shouldContinue: true
    };
  }
}