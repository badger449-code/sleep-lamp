import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { CloudRain, Volume2, VolumeX, Waves, Flame, Trees, CloudLightning, Droplets, Coffee, BookOpen, Moon, Bug, ChevronDown } from 'lucide-react';

const NOISES = [
  { id: 'rain', name: '雨声', icon: CloudRain, srcs: ['/audio/rain.mp3'], color: 'cyan', category: 'nature' },
  { id: 'ocean', name: '海浪', icon: Waves, srcs: ['/audio/ocean.mp3'], color: 'blue', category: 'nature' },
  { id: 'fire', name: '篝火', icon: Flame, srcs: ['/audio/fire.mp3'], color: 'orange', category: 'nature' },
  { id: 'forest', name: '森林', icon: Trees, srcs: ['/audio/forest.mp3'], color: 'emerald', category: 'nature' },
  { id: 'thunderstorm', name: '雷雨', icon: CloudLightning, srcs: ['/audio/thunderstorm.mp3'], color: 'indigo', category: 'nature' },
  { id: 'stream', name: '溪流', icon: Droplets, srcs: ['/audio/stream.mp3'], color: 'sky', category: 'nature' },
  { id: 'cafe', name: '咖啡厅', icon: Coffee, srcs: ['/audio/cafe.mp3'], color: 'amber', category: 'env' },
  { id: 'library', name: '图书馆', icon: BookOpen, srcs: ['/audio/library.mp3'], color: 'stone', category: 'env' },
  { id: 'rainy_night', name: '雨夜', icon: Moon, srcs: ['/audio/rain.mp3'], color: 'slate', category: 'env' },
  { id: 'summer_night', name: '夏夜虫鸣', icon: Bug, srcs: ['/audio/summer_night.mp3'], color: 'lime', category: 'env' },
  // Smart scenes
  { id: 'fairy_tale', name: '童话奇幻', icon: Trees, srcs: ['/audio/forest.mp3', '/audio/stream.mp3'], color: 'emerald', category: 'scene' },
  { id: 'suspense', name: '悬疑故事', icon: CloudLightning, srcs: ['/audio/thunderstorm.mp3', '/audio/rain.mp3'], color: 'indigo', category: 'scene' },
  { id: 'cozy', name: '温馨日常', icon: Coffee, srcs: ['/audio/cafe.mp3', '/audio/summer_night.mp3'], color: 'amber', category: 'scene' },
];

const DEFAULT_NOISE_VOLUME = 0.2;

const NOISE_GAIN = {
  rain: 0.9,
  ocean: 0.8,
  fire: 0.85,
  forest: 0.8,
  thunderstorm: 0.75,
  stream: 1.1,
  cafe: 0.7,
  library: 0.85,
  rainy_night: 0.8,
  summer_night: 1.1,
  fairy_tale: 0.85,
  suspense: 0.75, 
  cozy: 0.85,
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const getNormalizedVolume = (noiseId, baseVolume, srcCount) => {
  const gain = NOISE_GAIN[noiseId] ?? 1;
  const mixCompensation = srcCount > 1 ? 0.7 : 1;
  return clamp01(baseVolume * gain * mixCompensation);
};

export const NoiseControl = forwardRef((props, ref) => {
  const audioRefs = useRef([]);
  const [currentNoise, setCurrentNoise] = useState(NOISES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_NOISE_VOLUME);
  const [isOpen, setIsOpen] = useState(false);
  const decayIntervalRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setSmartScene: (text) => {
      let matchedScene = null;
      if (text.includes('童话') || text.includes('奇幻') || text.includes('魔法')) {
        matchedScene = NOISES.find(n => n.id === 'fairy_tale');
      } else if (text.includes('悬疑') || text.includes('恐怖') || text.includes('探险')) {
        matchedScene = NOISES.find(n => n.id === 'suspense');
      } else if (text.includes('温馨') || text.includes('日常') || text.includes('治愈')) {
        matchedScene = NOISES.find(n => n.id === 'cozy');
      }
      
      if (matchedScene && currentNoise.id !== matchedScene.id) {
        handleNoiseSelect(matchedScene);
      }
    },
    setSmartSceneById: (sceneId) => {
      // Clear any existing decay
      if (decayIntervalRef.current) {
        clearInterval(decayIntervalRef.current);
        decayIntervalRef.current = null;
      }
      
       setVolume(DEFAULT_NOISE_VOLUME);

      if (!sceneId || sceneId === 'none') {
        if (!isPlaying) {
          if (decayIntervalRef.current) clearInterval(decayIntervalRef.current);
          audioRefs.current.forEach((audio, index) => {
            if (audio && index < currentNoise.srcs.length) {
              audio.play().catch(e => console.error("Audio play failed:", e));
            }
          });
          setIsPlaying(true);
        }
        return;
      }
      
      let matchedScene = NOISES.find(n => n.id === sceneId);
      
      // Map 'nature' to forest if needed
      if (!matchedScene && sceneId === 'nature') {
        matchedScene = NOISES.find(n => n.id === 'forest');
      }
      
      if (matchedScene && currentNoise.id !== matchedScene.id) {
        handleNoiseSelect(matchedScene);
      }
    },
    startDecay: ({ durationMs = 60000 } = {}) => {
      const steps = Math.max(1, Math.floor(durationMs / 1000));
      const stepTime = Math.max(50, Math.floor(durationMs / steps));
      const startVol = volume;
      const volStep = startVol / steps;
      
      if (decayIntervalRef.current) clearInterval(decayIntervalRef.current);
      
      let currentVol = startVol;
      decayIntervalRef.current = setInterval(() => {
        currentVol -= volStep;
        if (currentVol <= 0) {
          currentVol = 0;
          clearInterval(decayIntervalRef.current);
          setIsPlaying(false);
          audioRefs.current.forEach(audio => {
            if (audio) audio.pause();
          });
        }
        setVolume(Math.max(0, currentVol));
      }, stepTime);
    }
  }));

  // Handle source change
  useEffect(() => {
    // Stop all current
    audioRefs.current.forEach(audio => {
      if (audio) {
        audio.pause();
      }
    });

    if (isPlaying) {
      setTimeout(() => {
        audioRefs.current.forEach((audio, index) => {
          if (audio && index < currentNoise.srcs.length) {
            audio.play().catch(e => console.error("Audio play failed:", e));
          }
        });
      }, 50);
    }
  }, [currentNoise]);

  // Handle volume change
  useEffect(() => {
    audioRefs.current.forEach(audio => {
      if (audio) {
        audio.volume = getNormalizedVolume(currentNoise.id, volume, currentNoise.srcs.length);
      }
    });
  }, [volume, currentNoise]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRefs.current.forEach(audio => {
        if (audio) audio.pause();
      });
      setIsPlaying(false);
    } else {
      // Clear decay if manual play
      if (decayIntervalRef.current) clearInterval(decayIntervalRef.current);
      
      audioRefs.current.forEach((audio, index) => {
        if (audio && index < currentNoise.srcs.length) {
          audio.play().catch(e => console.error("Audio play failed:", e));
        }
      });
      setIsPlaying(true);
    }
  };

  const handleNoiseSelect = (noise) => {
    setCurrentNoise(noise);
    setIsOpen(false);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  // Group noises by category
  const categories = {
    nature: '自然类',
    env: '环境类',
    scene: '智能场景'
  };

  const CurrentIcon = currentNoise.icon;

  return (
    <div className="relative z-40">
        {/* Render max possible audios */}
        {[0, 1].map(index => {
          const src = currentNoise.srcs[index];
          return src ? (
            <audio 
              key={index}
              ref={el => audioRefs.current[index] = el} 
              preload="none"
              loop 
              src={src}
              onPlay={() => { if (index === 0) setIsPlaying(true); }}
              onPause={() => { if (index === 0) setIsPlaying(false); }}
            />
          ) : null;
        })}
        
        <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-800/60 backdrop-blur-md p-1.5 sm:p-2 pl-2 sm:pl-3 rounded-full border border-slate-700/50 shadow-lg">
            
            {/* Play/Pause & Icon Button */}
            <div className="relative">
                 <button
                    onClick={togglePlay}
                    className={`
                    p-1.5 sm:p-2.5 rounded-full transition-all duration-300 flex items-center justify-center
                    ${isPlaying 
                        ? `bg-${currentNoise.color}-600 text-white shadow-[0_0_15px_rgba(0,0,0,0.3)]` 
                        : 'bg-slate-700/80 text-slate-400 hover:bg-slate-600'}
                    `}
                    title={isPlaying ? "Pause" : "Play"}
                >
                    <CurrentIcon size={16} className="sm:w-[20px] sm:h-[20px]" />
                </button>
            </div>

            {/* Selector Dropdown Trigger (Text) */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 sm:gap-2 min-w-[50px] sm:min-w-[70px] hover:bg-white/5 p-1 sm:p-1.5 rounded-lg transition-colors"
            >
                <div className="flex flex-col items-start">
                    <span className={`text-[10px] sm:text-xs font-bold text-${currentNoise.color}-400`}>{currentNoise.name}</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 hidden sm:inline-block">{isPlaying ? '播放中' : '已暂停'}</span>
                </div>
                <ChevronDown size={12} className={`text-slate-500 transition-transform duration-300 sm:w-[14px] sm:h-[14px] ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2 border-l border-white/10 pl-1.5 sm:pl-3">
                 {volume === 0 ? <VolumeX size={12} className="text-slate-500 sm:w-[14px] sm:h-[14px]" /> : <Volume2 size={12} className="text-slate-400 sm:w-[14px] sm:h-[14px]" />}
                 <input
                    id="noise-volume-slider"
                    name="noise-volume-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-12 sm:w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-slate-300"
                />
            </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
            <>
                <div 
                    className="fixed inset-0 z-30 bg-transparent" 
                    onClick={() => setIsOpen(false)}
                />
                <div className="absolute bottom-full left-0 mb-3 w-48 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 origin-bottom-left animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-2 p-1">
                        {Object.entries(categories).map(([catKey, catName]) => (
                          <div key={catKey}>
                            <div className="text-xs font-semibold text-slate-500 mb-1 px-2 uppercase tracking-wider">{catName}</div>
                            <div className="space-y-0.5">
                              {NOISES.filter(n => n.category === catKey).map((noise) => (
                                  <button
                                      key={noise.id}
                                      onClick={() => handleNoiseSelect(noise)}
                                      className={`
                                          w-full flex items-center gap-3 p-2 rounded-xl transition-all
                                          ${currentNoise.id === noise.id 
                                              ? 'bg-slate-800 shadow-inner' 
                                              : 'hover:bg-slate-800/50'}
                                      `}
                                  >
                                      <div className={`
                                          p-1.5 rounded-full 
                                          ${currentNoise.id === noise.id ? `bg-${noise.color}-500/20 text-${noise.color}-400` : 'bg-slate-800 text-slate-500'}
                                      `}>
                                          <noise.icon size={14} />
                                      </div>
                                      <span className={`text-sm ${currentNoise.id === noise.id ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                                          {noise.name}
                                      </span>
                                  </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                </div>
            </>
        )}
    </div>
  );
});
