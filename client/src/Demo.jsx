import React from 'react';
import { VoiceSelector } from './components/common/VoiceSelector';
import { useVoiceStore } from './store/useVoiceStore';
import './styles/index.css';

export default function Demo() {
  const { voiceId, voices } = useVoiceStore();
  const selectedVoice = voices.find(v => v.id === voiceId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-12">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-3xl font-light mb-2">Voice Selector Component Demo</h1>
        <p className="text-slate-400 mb-12">阿里云官方音色选择器演示</p>
        
        <div className="bg-slate-900/50 p-12 rounded-3xl border border-slate-800/80 w-full flex flex-col items-center gap-8">
          <div className="text-center">
            <h2 className="text-sm text-slate-400 mb-4 uppercase tracking-widest">Interactive Component</h2>
            <VoiceSelector />
          </div>
          
          <div className="mt-8 p-6 bg-slate-800/30 rounded-2xl border border-slate-700/30 w-full max-w-md">
            <h3 className="text-sm font-medium text-cyan-400 mb-4">Current State (Zustand Store)</h3>
            <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
{JSON.stringify({
  voiceId,
  selectedVoiceName: selectedVoice?.name,
  selectedVoiceDescription: selectedVoice?.description,
  selectedVoiceLanguages: selectedVoice?.languages
}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
