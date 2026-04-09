import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const emotionRules = require('../../../emotion_recognition_rules.json');

/**
 * 情绪识别服务
 * 基于心理学教授提供的专业话术库
 */
export class EmotionService {
  constructor() {
    this.emotionRules = emotionRules;
  }

  /**
   * 识别用户输入的情绪类别
   * @param {string} userInput - 用户输入的文本
   * @returns {Object} 情绪类别和置信度
   */
  recognizeEmotion(userInput) {
    const lowerInput = userInput.toLowerCase();
    let highestConfidence = 0;
    let detectedEmotion = 'neutral';
    let matchedKeywords = [];
    
    // 检查每个情绪类别
    for (const [emotion, config] of Object.entries(this.emotionRules.emotion_categories)) {
      let score = 0;
      let keywordsFound = [];
      
      // 检查关键词匹配
      for (const keyword of config.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          score += 1;
          keywordsFound.push(keyword);
        }
      }
      
      // 检查模式匹配
      for (const pattern of config.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lowerInput)) {
          score += 2; // 模式匹配权重更高
          keywordsFound.push(pattern);
        }
      }
      
      if (score > highestConfidence) {
        highestConfidence = score;
        detectedEmotion = emotion;
        matchedKeywords = keywordsFound;
      }
    }
    
    // 如果没有明确的情绪匹配，检查是否符合通用安抚场景
    if (highestConfidence === 0) {
      for (const keyword of this.emotionRules.universal_response.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          return {
            emotion: 'universal',
            confidence: 1,
            matchedKeywords: [keyword],
            template: this.emotionRules.universal_response.response_template
          };
        }
      }
    }
    
    return {
      emotion: detectedEmotion,
      confidence: highestConfidence > 0 ? Math.min(highestConfidence / 5, 1) : 0,
      matchedKeywords: matchedKeywords,
      template: highestConfidence > 0 ? 
        this.emotionRules.emotion_categories[detectedEmotion].response_template : 
        null
    };
  }

  /**
   * 根据情绪状态生成个性化响应
   * @param {string} userInput - 用户输入
   * @param {Object} emotionData - 情绪分析结果
   * @returns {string} 个性化响应
   */
  generatePersonalizedResponse(userInput, emotionData) {
    if (!emotionData.template) {
      // 如果没有匹配到特定情绪，使用通用响应
      return this.generateGenericResponse(userInput);
    }
    
    // 这里可以进一步个性化响应，比如结合用户的历史交互
    return this.customizeTemplate(emotionData.template, {
      userInput: userInput,
      emotion: emotionData.emotion
    });
  }

  /**
   * 定制化模板
   * @param {string} template - 基础模板
   * @param {Object} context - 上下文信息
   * @returns {string} 定制化响应
   */
  customizeTemplate(template, context) {
    // 这里可以根据上下文进一步定制响应
    // 例如：根据时间、用户历史等调整语气
    let customized = template;
    
    // 可以根据具体情况进行调整
    if (context.emotion === 'anxiety') {
      customized = customized.replace(/(明天那个‘你’)/g, '那个明天的自己');
    }
    
    return customized;
  }

  /**
   * 生成通用响应（当无法识别特定情绪时）
   * @param {string} userInput - 用户输入
   * @returns {string} 通用响应
   */
  generateGenericResponse(userInput) {
    const responses = [
      `我听到你说："${userInput}"。现在的感觉怎么样？`,
      `听起来你现在有些想法需要倾诉。能跟我说说吗？`,
      `感谢你愿意分享。现在让我们一起做个深呼吸，慢慢放松下来...`,
      `我在这里听着。不管你现在是什么心情，都是可以的。`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// 创建全局实例
export const emotionService = new EmotionService();

/**
 * 中间件：自动情绪识别和响应生成
 * @param {string} userInput - 用户输入
 * @returns {Object} 包含情绪分析和建议响应的对象
 */
export const processUserInput = (userInput) => {
  const emotionData = emotionService.recognizeEmotion(userInput);
  const personalizedResponse = emotionService.generatePersonalizedResponse(userInput, emotionData);
  
  return {
    emotionAnalysis: emotionData,
    response: personalizedResponse,
    shouldUsePsychologyApproach: emotionData.confidence > 0.3
  };
};