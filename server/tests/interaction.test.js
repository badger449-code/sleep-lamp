import { InteractionManager } from '../src/services/interactionService.js';
import { EMOTIONS } from '../src/services/promptParser.js';
import { expect, it, describe, vi } from 'vitest';

// Mock dependencies
vi.mock('../src/services/promptParser.js', () => ({
  EMOTIONS: {
    HAPPY: '愉悦',
    RELAXED: '放松',
    NEUTRAL: '一般',
    LOW: '低落',
    ANXIOUS: '焦虑',
    ANGRY: '愤怒',
    FEARFUL: '恐惧'
  },
  analyzeEmotion: vi.fn()
}));

vi.mock('../src/services/safetyService.js', () => ({
  filterSensitiveWords: (t) => t,
  checkEmotionalSafety: (t) => !t.includes('想死')
}));

import * as promptParser from '../src/services/promptParser.js';

describe('InteractionManager', () => {
  const { analyzeEmotion } = promptParser;

  it('should handle initial state correctly', async () => {
    const manager = new InteractionManager();
    analyzeEmotion.mockResolvedValueOnce({ label: EMOTIONS.NEUTRAL });

    const result = await manager.processInput('我今天非常开心');
    expect(result.stage).toBe('EMOTION_ASSESSMENT');
  });

  it('should handle assessment rounds and move to recommendation at 6', async () => {
    const manager = new InteractionManager();
    manager.stage = 'EMOTION_ASSESSMENT';
    manager.emotionRounds = 5;
    analyzeEmotion.mockResolvedValueOnce({ label: EMOTIONS.NEUTRAL });

    const result = await manager.processInput('还是很难过');
    expect(result.stage).toBe('RECOMMENDATION');
    expect(result.rounds).toBe(6);
  });

  it('should track story rounds and move to completed at 5', async () => {
    const manager = new InteractionManager();
    manager.stage = 'STORYTELLING';
    manager.storyRounds = 4;

    const result = await manager.processInput('好的，请继续讲');
    expect(result.stage).toBe('COMPLETED');
    expect(result.storyRounds).toBe(5);
  });

  it('should allow continuing story from completed state', async () => {
    const manager = new InteractionManager();
    manager.stage = 'COMPLETED';

    const result = await manager.processInput('我不困，继续讲');
    expect(result.stage).toBe('STORYTELLING');
    expect(result.storyRounds).toBe(1);
  });

  it('should trigger safety intervention for risky content', async () => {
    const manager = new InteractionManager();
    const result = await manager.processInput('我想死');
    expect(result.stage).toBe('SAFETY_INTERVENTION');
  });
});
