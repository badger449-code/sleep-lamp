import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Mic2, ChevronDown, Check, Search, Filter, Play, Activity } from 'lucide-react';
import { useVoiceStore } from '../../store/useVoiceStore';
import { motion, AnimatePresence } from 'framer-motion';

export const VoiceSelector = () => {
  const { voiceId, setVoiceId, voices } = useVoiceStore();
  const [isOpen, setIsOpen] = useState(false);
  const [filterLang, setFilterLang] = useState('全部');
  const [filterGender, setFilterGender] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewVoiceId, setPreviewVoiceId] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  
  const dropdownRef = useRef(null);
  const previewAudioRef = useRef(null);
  const previewUrlRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const isJsDom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
    previewAudioRef.current = isJsDom
      ? { src: '', currentTime: 0, pause: () => {}, play: async () => {}, onended: null }
      : new Audio();
    previewAudioRef.current.onended = () => {
      setIsPreviewPlaying(false);
    };
    return () => {
      try {
        if (previewAudioRef.current) {
          previewAudioRef.current.pause();
          previewAudioRef.current.src = '';
        }
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      } catch {}
    };
  }, []);

  const currentVoice = useMemo(() => voices.find(v => v.id === voiceId) || voices[0], [voiceId, voices]);

  // Derived filter options
  const filteredVoices = useMemo(() => {
    return voices.filter(v => {
      // Filter by language category
      const isMandarin = v.languages.includes('普通话');
      const isCantonese = v.languages.includes('粤语');
      const isDialect = v.languages.includes('上海话') || v.languages.includes('北京话') || 
                        v.languages.includes('南京话') || v.languages.includes('陕西话') || 
                        v.languages.includes('闽南语') || v.languages.includes('天津话') || 
                        v.languages.includes('四川话');
      
      let langMatch = true;
      if (filterLang === '普通话') langMatch = isMandarin;
      else if (filterLang === '粤语') langMatch = isCantonese;
      else if (filterLang === '方言') langMatch = isDialect && !isCantonese; // 粤语 is often separated
      
      // Filter by gender
      let genderMatch = true;
      if (filterGender !== '全部') {
        genderMatch = v.gender === filterGender;
      }
      
      // Filter by search query
      const searchMatch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.description.toLowerCase().includes(searchQuery.toLowerCase());
                          
      return langMatch && genderMatch && searchMatch;
    });
  }, [voices, filterLang, filterGender, searchQuery]);

  // For avatar colors based on gender
  const getAvatarColor = (gender) => {
    if (gender === '女性') return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (gender === '男性') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const stopPreview = () => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setIsPreviewPlaying(false);
    setIsPreviewLoading(false);
    setPreviewVoiceId(null);
  };

  const handlePreview = async (voice) => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    if (previewVoiceId === voice.id && isPreviewPlaying) {
      stopPreview();
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.src = '';

    setPreviewVoiceId(voice.id);
    setIsPreviewLoading(true);
    setIsPreviewPlaying(false);

    try {
      const resp = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voice.id,
          text: `你好，我是${voice.name}。这是一段语音试听。`,
        }),
      });

      if (!resp.ok) {
        throw new Error(`preview_failed_${resp.status}`);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      audio.src = url;
      await audio.play();
      setIsPreviewPlaying(true);
    } catch {
      stopPreview();
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full 
          bg-slate-800/60 backdrop-blur-md border border-slate-700/50 
          text-slate-300 hover:bg-slate-700/60 transition-all duration-300
          shadow-lg hover:shadow-cyan-900/20 trae-browser-inspect-draggable
          ${isOpen ? 'ring-2 ring-cyan-500/50 bg-slate-800' : ''}
        `}
      >
        <Mic2 size={14} className={`transition-colors sm:w-[16px] sm:h-[16px] ${isOpen ? 'text-cyan-400' : 'text-slate-400'}`} />
        <span className="text-[11px] sm:text-sm font-light tracking-wide truncate max-w-[60px] sm:max-w-[100px]">
          {currentVoice?.name || '选择音色'}
        </span>
        <ChevronDown size={12} className={`text-slate-500 transition-transform duration-300 sm:w-[14px] sm:h-[14px] ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-3 w-[320px] sm:w-[380px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col origin-bottom-right"
            style={{ maxHeight: '60vh', minHeight: '300px' }}
          >
            {/* Header & Filters */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/50 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  id="voice-search-input"
                  name="voice-search-input"
                  type="text" 
                  placeholder="搜索音色..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <div className="flex bg-slate-800/50 p-0.5 rounded-lg border border-slate-700/50">
                  {['全部', '普通话', '粤语', '方言'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setFilterLang(lang)}
                      className={`px-2 py-1 rounded-md transition-colors ${filterLang === lang ? 'bg-slate-700 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <div className="flex bg-slate-800/50 p-0.5 rounded-lg border border-slate-700/50">
                  {['全部', '女性', '男性'].map(gender => (
                    <button
                      key={gender}
                      onClick={() => setFilterGender(gender)}
                      className={`px-2 py-1 rounded-md transition-colors ${filterGender === gender ? 'bg-slate-700 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {gender === '全部' ? '全部' : gender === '女性' ? '女' : '男'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Voice List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredVoices.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  没有找到匹配的音色
                </div>
              ) : (
                filteredVoices.map((v) => (
                  <div
                    key={v.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setVoiceId(v.id);
                      setIsOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setVoiceId(v.id);
                        setIsOpen(false);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group text-left
                      ${voiceId === v.id 
                        ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-inner' 
                        : 'hover:bg-slate-800/60 border border-transparent'}
                    `}
                  >
                    {/* Avatar / Icon */}
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${getAvatarColor(v.gender)} ${voiceId === v.id ? 'ring-2 ring-cyan-400/50' : ''}`}>
                      {voiceId === v.id ? (
                        <Activity size={18} className="animate-pulse text-cyan-400" />
                      ) : (
                        <span className="text-sm font-semibold">{v.name.slice(0, 1)}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium truncate transition-colors ${voiceId === v.id ? 'text-cyan-300' : 'text-slate-200 group-hover:text-white'}`}>
                          {v.name}
                        </span>
                        {voiceId === v.id && <Check size={14} className="text-cyan-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5" title={v.description}>
                        {v.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label="试听"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(v);
                      }}
                      className={`
                        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        border transition-colors
                        ${previewVoiceId === v.id && (isPreviewLoading || isPreviewPlaying)
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600/60'}
                      `}
                    >
                      {previewVoiceId === v.id && isPreviewLoading ? (
                        <Activity size={16} className="animate-spin" />
                      ) : previewVoiceId === v.id && isPreviewPlaying ? (
                        <Activity size={16} className="animate-pulse" />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
