/**
 * Sleep-Lamp 心理学技能集成脚本
 * 将心理学教授提供的专业话术与AI故事系统整合
 */

import { emotionService } from './services/emotionService.js';
import { streamStory } from './services/llmService.js';
import { generateAudioStream } from './services/ttsService.js';
import { parseVoiceParamsFromPrompt } from './services/promptParser.js';
import { InteractionManager } from './services/interactionService.js';

/**
 * 心理学技能处理器
 * 根据用户情绪状态选择合适的干预方式
 */
class PsychologySkillHandler {
  constructor() {
    this.emotionService = emotionService;
    this.interactionManager = new InteractionManager();
  }

  /**
   * 处理用户输入，集成心理学技能
   */
  async processUserInput(prompt, ws) {
    // 1. 首先使用情绪识别服务
    const emotionResult = this.emotionService.recognizeEmotion(prompt);
    
    // 2. 如果检测到特定情绪，优先使用心理学专业响应
    if (emotionResult.confidence > 0.3) {
      console.log(`[心理学干预] 检测到 ${emotionResult.emotion} 情绪，置信度: ${emotionResult.confidence}`);
      
      // 使用心理学专业话术生成响应
      const psychologyResponse = this.emotionService.generatePersonalizedResponse(
        prompt, 
        emotionResult
      );
      
      // 发送心理学专业响应
      await this.sendPsychologyResponse(ws, psychologyResponse);
      
      // 如果情绪严重程度较高，延长心理学干预时间
      if (emotionResult.confidence > 0.7) {
        // 进行深度情绪疏导
        const deepIntervention = await this.generateDeepIntervention(emotionResult.emotion);
        await this.sendPsychologyResponse(ws, deepIntervention);
      }
      
      // 返回特殊标志，表示已处理
      return { handled: true, emotion: emotionResult.emotion };
    }
    
    // 3. 如果没有检测到特定情绪，使用常规流程
    return { handled: false };
  }

  /**
   * 发送心理学专业响应
   */
  async sendPsychologyResponse(ws, response) {
    // 发送文本
    ws.send(JSON.stringify({ 
      type: 'text_chunk', 
      content: response 
    }));
    
    // 生成并发送音频
    const voiceParams = await parseVoiceParamsFromPrompt("");
    const audioStream = await generateAudioStream(response, voiceParams);
    
    audioStream.on('data', (chunk) => {
      ws.send(JSON.stringify({ 
        type: 'audio_chunk', 
        content: chunk.toString('base64') 
      }));
    });
    
    // 等待音频流完成
    await new Promise((resolve) => {
      audioStream.on('end', resolve);
      audioStream.on('error', resolve); // 如果出错也继续
    });
  }

  /**
   * 生成深度情绪干预内容
   */
  async generateDeepIntervention(emotionType) {
    const interventions = {
      'anxiety': [
        "我听见你声音里有未落定的尘埃，像深夜里悬在半空的一粒微光——它不熄灭，也不肯落下。焦虑不是你的错，它只是身体在用它的方式告诉你，有些情绪太重，重到心还没学会怎么轻轻放下。",
        "现在，把一只手轻轻放在胸口，另一只手搭在小腹——跟着我，吸气，让气息像潮水漫过沙滩那样，缓缓涌进你的身体；再呼气，像云散开那样，把所有未说出口的疲惫都松开...",
        "今天的你，是踩着碎裂的月光回来的，还是披着未干的雨气？有没有哪一刻，让你忽然停顿，哪怕只是半秒，觉得'啊，我还在这里'？"
      ],
      'grievance': [
        "唉……你叹气的样子，像一朵云被风推着走，却不知道该去哪里。委屈不是一个贬义词，它只是心里的淤积，像雨后的池塘，需要一个出口。",
        "有时候，最痛的不是被伤害，而是明明不是我的错，却要我来承担。那些话，那些事，像扎在心里的刺，拔不出来，也忘不掉。",
        "但你知道吗？每一次你选择继续生活，就是对那些不公的无声反抗。你的存在，本身就是一种胜利。"
      ],
      'regret': [
        "我听见了那句'如果'——它像一把钥匙，打开了通往'原本可以'的门。但你发现了吗？那扇门后面，往往是更深的迷宫。",
        "后悔是人类最温柔的残忍，它让我们一遍遍地重演过去的剧本，试图写出不同的结局。但亲爱的，剧本已经演完了，演员可以卸妆了。",
        "与其纠结于'如果当时'，不如温柔地拍拍那个当时的自己，说一句：'你已经尽力了。'"
      ],
      'sadness': [
        "伤心不是洪水猛兽，它只是心在哭泣。就像春天的雨，虽然湿润，但也滋养着土地。不要急着擦干眼泪，让它们流完。",
        "失落的时候，整个世界都像蒙上了一层灰。但请记住，灰色也是颜色的一种，它比任何鲜艳都更接近内心的真实。",
        "在最难过的时候，允许自己脆弱，这本身就需要极大的勇气。你已经很勇敢了。"
      ]
    };
    
    const emotionInterventions = interventions[emotionType] || interventions['grievance'];
    return emotionInterventions.join('\n\n');
  }
}

// 导出心理学技能处理器
export const psychologySkillHandler = new PsychologySkillHandler();

/**
 * 增强版故事处理函数
 * 集成心理学技能
 */
export async function* enhancedStreamStory(history, systemPrompt) {
  const psychologyHandler = psychologySkillHandler;
  
  // 如果最后一条消息是用户消息，先进行情绪分析
  const lastUserMessage = history[history.length - 1];
  if (lastUserMessage && lastUserMessage.role === 'user') {
    const emotionResult = psychologyHandler.emotionService.recognizeEmotion(lastUserMessage.content);
    
    if (emotionResult.confidence > 0.5) {
      // 生成心理学响应
      const psychologyResponse = psychologyHandler.emotionService.generatePersonalizedResponse(
        lastUserMessage.content,
        emotionResult
      );
      
      // 返回心理学响应
      yield psychologyResponse;
      
      // 如果是深度情绪，继续干预
      if (emotionResult.confidence > 0.7) {
        const deepIntervention = await psychologyHandler.generateDeepIntervention(emotionResult.emotion);
        yield deepIntervention;
      }
    }
  }
  
  // 然后继续常规故事流
  for await (const chunk of streamStory(history, systemPrompt)) {
    yield chunk;
  }
}