import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import voicesData from '../data/voices.json';

// Default voice is Chelsie (千雪)
const defaultVoice = 'Chelsie';

export const useVoiceStore = create(
  persist(
    (set) => ({
      voiceId: defaultVoice,
      setVoiceId: (id) => set({ voiceId: id }),
      voices: voicesData,
    }),
    {
      name: 'voice-storage', // name of the item in storage (must be unique)
    }
  )
);
