import { describe, it, expect } from 'vitest';
import { useVoiceStore } from './useVoiceStore';

describe('useVoiceStore', () => {
  it('has initial default voice', () => {
    const state = useVoiceStore.getState();
    expect(state.voiceId).toBe('Chelsie');
    expect(state.voices.length).toBeGreaterThan(0);
  });

  it('can set voiceId', () => {
    useVoiceStore.getState().setVoiceId('Ethan');
    expect(useVoiceStore.getState().voiceId).toBe('Ethan');
  });
});
