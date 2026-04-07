import { EMOTIONS, analyzeEmotion } from './promptParser.js';
import { filterSensitiveWords, checkEmotionalSafety } from './safetyService.js';

/**
 * Manages the conversation flow state machine.
 */
export class InteractionManager {
  constructor() {
    this.stage = 'INITIAL'; // INITIAL, EMOTION_ASSESSMENT, RECOMMENDATION, STORYTELLING, COMPLETED
    this.emotionRounds = 0;
    this.storyRounds = 0;
    this.currentEmotion = null;
    this.maxEmotionRounds = 6;
    this.minStoryRounds = 3;
    this.maxStoryRounds = 5;
    this.currentStory = null;
  }

  /**
   * Processes user input and determines the next step.
   * @param {string} input 
   * @returns {Promise<{stage: string, rounds: number, storyRounds: number}>}
   */
  async processInput(input) {
    const normalizedInput = String(input || '').replace(/[\s，。、！？.,!?]/g, '');

    // 1. Safety Check (Regex based for speed)
    const riskyKeywords = ['想死', '绝望', '活不下去', '自残'];
    if (riskyKeywords.some(keyword => input.includes(keyword))) {
      this.stage = 'SAFETY_INTERVENTION';
      return { stage: this.stage, text: "听起来你现在非常难过，我建议你寻求更专业的支持。但我会一直在这里陪着你，为你放一段舒缓的音乐。" };
    }

    const isWakeInput =
      normalizedInput.includes('小梦小梦') ||
      normalizedInput === '你好' ||
      normalizedInput === '在吗' ||
      normalizedInput === '你在吗';

    if (isWakeInput) {
      if (this.stage === 'INITIAL') {
        this.stage = 'EMOTION_ASSESSMENT';
      }
      return {
        stage: this.stage,
        rounds: this.emotionRounds,
        storyRounds: this.storyRounds
      };
    }

    // 2. Emotion Analysis (Call once per turn in early stages)
    let emotionLabel = EMOTIONS.NEUTRAL;
    if (this.stage === 'INITIAL' || this.stage === 'EMOTION_ASSESSMENT') {
      const { label } = await analyzeEmotion(input);
      emotionLabel = label;
    }

    // 3. Stage Logic
    if (this.stage === 'INITIAL') {
      this.stage = 'EMOTION_ASSESSMENT';
      if (emotionLabel === EMOTIONS.HAPPY || emotionLabel === EMOTIONS.RELAXED) {
        this.stage = 'RECOMMENDATION';
      }
    } else if (this.stage === 'EMOTION_ASSESSMENT') {
      this.emotionRounds++;
      if (emotionLabel === EMOTIONS.HAPPY || emotionLabel === EMOTIONS.RELAXED || this.emotionRounds >= this.maxEmotionRounds) {
        this.stage = 'RECOMMENDATION';
      }
    } else if (this.stage === 'RECOMMENDATION') {
      // Assuming user accepts recommendation or provides a keyword
      this.stage = 'STORYTELLING';
      this.storyRounds = 1;
    } else if (this.stage === 'STORYTELLING') {
      this.storyRounds++;
      // After 3-5 rounds, we should transition to Stage 5 (End and recording)
      if (this.storyRounds >= this.maxStoryRounds) {
        this.stage = 'COMPLETED';
      }
    } else if (this.stage === 'COMPLETED') {
      // If user is not sleepy, continue story
      if (input.includes('不困') || input.includes('继续')) {
        this.stage = 'STORYTELLING';
        this.storyRounds = 1;
      }
    }

    return {
      stage: this.stage,
      rounds: this.emotionRounds,
      storyRounds: this.storyRounds
    };
  }
}
