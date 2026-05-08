import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useStoryMachine } from './hooks/useStoryMachine';
import { useWakeWord } from './hooks/useWakeWord';
import { useWakeLock } from './hooks/useWakeLock';
import { VoiceSelector } from './components/common/VoiceSelector';
import { NoiseControl } from './components/common/NoiseControl';
import { SleepTimer } from './components/common/SleepTimer';
import StarryBackground from './components/common/StarryBackground';
import { getDefaultPrompt } from './config/prompts';
import { Mic, AlertCircle, Ear, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import './styles/App.css';

function App() {
  const noiseControlRef = useRef(null);
  const mainRef = useRef(null);
  const displayPanelRef = useRef(null);
  const belowPanelRef = useRef(null);
  const micContainerRef = useRef(null);
  const micButtonRef = useRef(null);
  const controlsBarRef = useRef(null);
  
  const { 
    status, 
    interactionStatus,
    transcript, 
    storyText, 
    error, 
    systemPrompt,
    setSystemPrompt,
    sendPrompt,
    startListening,
    stopListening,
    interruptPlayback,
    notifyInputStarted,
    wsStatus
  } = useStoryMachine(noiseControlRef);
  
  const [textInput, setTextInput] = useState('');
  const [panelDims, setPanelDims] = useState({ width: null, height: null });
  const [mainPaddingBottom, setMainPaddingBottom] = useState(128);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useState(true); // 默认开启屏幕常亮
  
  // 屏幕常亮
  const { isWakeLockActive } = useWakeLock(keepScreenOn && status === 'playing');

  // Handle manual input detection (keyboard/touch) to activate the session
  useEffect(() => {
    if (interactionStatus !== 'waiting') return;

    const handleInput = (e) => {
      // Avoid triggering on simple non-input keys or the same key that starts it
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      notifyInputStarted();
    };

    window.addEventListener('keydown', handleInput);
    window.addEventListener('touchstart', handleInput);
    
    return () => {
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('touchstart', handleInput);
    };
  }, [interactionStatus, notifyInputStarted]);

  // Generate wake up message based on current time
  const getWakeUpMessage = useCallback(() => {
    const hour = new Date().getHours();
    let timeGreeting = '';
    
    if (hour >= 5 && hour < 11) timeGreeting = '早上好';
    else if (hour >= 11 && hour < 13) timeGreeting = '中午好';
    else if (hour >= 13 && hour < 18) timeGreeting = '下午好';
    else if (hour >= 18 && hour < 22) timeGreeting = '晚上好';
    else timeGreeting = '深夜好';

    return `当前时间是${timeGreeting}。我刚刚唤醒了你。请直接开始阶段1的对话，给我一个温暖的开场，引导我进行呼吸放松，并询问我今天过得怎么样。`;
  }, []);

  // Simple beep for wake word feedback
  const playWakeBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Could not play beep', e);
    }
  }, []);

  const cancelTTS = useCallback(() => {
    try {
      window.speechSynthesis?.cancel?.();
    } catch {
      return;
    }
  }, []);

  // 定时器到期：停止播放并显示提示（夜间模式友好 toast）
  const handleTimerStop = useCallback(() => {
    setTimerActive(false);
    cancelTTS();
    interruptPlayback();
    // 温柔提示用户 - toast 不阻断交互，夜间模式友好
    toast.success('定时时间已到，祝你晚安好梦 🌙', {
      duration: 5000,
      position: 'top-center',
      style: {
        background: 'rgba(30, 41, 59, 0.95)',
        color: '#e2e8f0',
        border: '1px solid rgba(100, 116, 139, 0.2)',
        borderRadius: '16px',
        padding: '14px 20px',
        fontSize: '15px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
      },
    });
  }, []);

  const handleWakeWord = useCallback(() => {
    console.log('Wake word triggered!');
    cancelTTS();
    interruptPlayback();
    playWakeBeep();
    setTimeout(() => {
      // Proactively send start prompt in continuous mode
      sendPrompt(getWakeUpMessage(), { continuous: true });
    }, 400);
  }, [cancelTTS, interruptPlayback, playWakeBeep, sendPrompt, getWakeUpMessage]);

  const { isWakeWordListening, wakeWordError, startWakeWordListener, stopWakeWordListener } = useWakeWord(
    handleWakeWord,
    false,
    (err) => {
      if (err === 'network' || err === 'not-allowed' || err === 'service-not-allowed' || err === 'not-supported') {
        setWakeWordEnabled(false);
      }
    }
  );

  // Manage wake word listener based on status
  useEffect(() => {
    if (!wakeWordEnabled) return;
    
    if (status === 'idle') {
      startWakeWordListener();
    } else {
      stopWakeWordListener();
    }
  }, [status, wakeWordEnabled, startWakeWordListener, stopWakeWordListener]);

  const toggleWakeWord = () => {
    setWakeWordEnabled(prev => !prev);
  };

  // Initialize default prompt
  useEffect(() => {
    if (!systemPrompt) {
      setSystemPrompt(getDefaultPrompt());
    }
  }, [systemPrompt, setSystemPrompt]);

  const MotionDiv = motion.div;

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim() && !['listening', 'processing'].includes(status)) {
      cancelTTS();
      sendPrompt(textInput);
      setTextInput('');
    }
  };

  const recalcLayout = useCallback(() => {
    const mainEl = mainRef.current;
    const panelEl = displayPanelRef.current;
    const belowEl = belowPanelRef.current;
    const micEl = micContainerRef.current;
    const controlsEl = controlsBarRef.current;
    if (!mainEl || !panelEl || !belowEl || !micEl) return;

    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const mainRect = mainEl.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();
    const belowRect = belowEl.getBoundingClientRect();
    const micRect = micEl.getBoundingClientRect();
    const controlsRect = controlsEl ? controlsEl.getBoundingClientRect() : null;
    const overlayTop = controlsRect ? Math.min(micRect.top, controlsRect.top) : micRect.top;

    const safeGap = 16;
    const minPanelHeight = viewportH < 560 ? 160 : 240;
    const gapBetweenPanelAndBelow = belowRect.top - panelRect.bottom;

    const maxPanelHeight =
      overlayTop - safeGap - panelRect.top - Math.max(0, gapBetweenPanelAndBelow) - belowRect.height;

    const nextHeight = Math.max(minPanelHeight, Math.floor(maxPanelHeight));
    const nextWidth = Math.floor(mainRect.width);

    setPanelDims(prev => {
      if (prev.width === nextWidth && prev.height === nextHeight) return prev;
      return { width: nextWidth, height: nextHeight };
    });

    const bottomReserve = Math.ceil(viewportH - overlayTop + safeGap);
    setMainPaddingBottom(prev => {
      const next = Math.max(160, bottomReserve);
      return prev === next ? prev : next;
    });
  }, []);

  useLayoutEffect(() => {
    recalcLayout();
  }, [recalcLayout, status, storyText, error]);

  useEffect(() => {
    const onViewportChange = () => requestAnimationFrame(recalcLayout);
    window.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => requestAnimationFrame(recalcLayout));
      if (mainRef.current) ro.observe(mainRef.current);
      if (belowPanelRef.current) ro.observe(belowPanelRef.current);
    }

    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
      ro?.disconnect?.();
    };
  }, [recalcLayout]);

  useEffect(() => {
    const btn = micButtonRef.current;
    if (!btn) return;

    const onTouchStart = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      cancelTTS();
      interruptPlayback();
      stopWakeWordListener();
      setWakeWordEnabled(false);
      
      // If idle and no story, trigger proactive start
      if (status === 'idle' && !storyText) {
        sendPrompt(getWakeUpMessage(), { continuous: true });
      } else {
        startListening(ev);
      }
    };

    const onTouchEnd = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      stopListening(ev);
    };

    btn.addEventListener('touchstart', onTouchStart, { passive: false });
    btn.addEventListener('touchend', onTouchEnd, { passive: false });
    btn.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      btn.removeEventListener('touchstart', onTouchStart);
      btn.removeEventListener('touchend', onTouchEnd);
      btn.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [cancelTTS, startListening, stopListening, stopWakeWordListener]);

  return (
    <>
      {/* Toast 通知容器 - 夜间模式友好 */}
      <Toaster />
      
      <div
      className="min-h-[100dvh] text-slate-100 flex flex-col items-center justify-start sm:justify-center font-sans relative overflow-x-hidden overflow-y-auto custom-scrollbar"
      style={{
        paddingTop: 'calc(clamp(16px, 3vw, 24px) + env(safe-area-inset-top))',
        paddingRight: 'calc(clamp(16px, 3vw, 24px) + env(safe-area-inset-right))',
        paddingBottom: 'calc(clamp(16px, 3vw, 24px) + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(clamp(16px, 3vw, 24px) + env(safe-area-inset-left))'
      }}
    >
      
      {/* Background Layer */}
      <StarryBackground />
      
      {/* Header */}
      <header className="mb-8 text-center relative z-50 w-full flex flex-col items-center">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl sm:text-4xl font-extralight tracking-[0.16em] sm:tracking-[0.2em] text-slate-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] mt-6 sm:mt-8">SLEEP STORY AI</h1>
          {/* WebSocket 连接状态指示器 */}
          <div className={`mt-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            wsStatus === 'connected' 
              ? 'bg-green-900/30 text-green-400 ring-1 ring-green-500/30' 
              : wsStatus === 'connecting'
              ? 'bg-yellow-900/30 text-yellow-400 ring-1 ring-yellow-500/30 animate-pulse'
              : wsStatus === 'error'
              ? 'bg-red-900/30 text-red-400 ring-1 ring-red-500/30'
              : 'bg-slate-800/50 text-slate-500 ring-1 ring-slate-700/50'
          }`}>
            {wsStatus === 'connected' ? (
              <Wifi size={12} />
            ) : wsStatus === 'connecting' ? (
              <Wifi size={12} className="animate-pulse" />
            ) : wsStatus === 'error' ? (
              <WifiOff size={12} />
            ) : (
              <WifiOff size={12} />
            )}
            <span className="hidden sm:inline">
              {wsStatus === 'connected' ? '已连接' : 
               wsStatus === 'connecting' ? '重连中...' : 
               wsStatus === 'error' ? '连接失败' : '未连接'}
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 font-light tracking-wide">Whisper your dreams...</p>
      </header>

      {/* Main Display Area */}
      <main
        ref={mainRef}
        className="w-full max-w-md flex-1 flex flex-col items-center relative z-10 gap-6"
        style={{ paddingBottom: `calc(${mainPaddingBottom}px + env(safe-area-inset-bottom))` }}
      >
        
        {/* Status / Transcript / Story */}
        <div
          ref={displayPanelRef}
          className="w-full min-h-[240px] p-5 sm:p-8 rounded-3xl glass-panel flex flex-col items-center justify-center text-center transition-all duration-500 overflow-hidden"
          style={{
            width: panelDims.width ? `${panelDims.width}px` : undefined,
            height: panelDims.height ? `${panelDims.height}px` : undefined
          }}
        >
          
          {error && (
            <div className="text-red-300 bg-red-900/20 px-4 py-2 rounded-lg flex items-center gap-2 mb-4 border border-red-800/30">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {status === 'listening' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-cyan-200 text-2xl font-light tracking-wide animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                {interactionStatus === 'waiting' ? "Waiting for you..." : (transcript || "Listening...")}
              </div>
              {interactionStatus === 'waiting' && (
                <div className="flex flex-col items-center gap-2">
                   <div className="w-16 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                     <MotionDiv 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-cyan-400/50"
                     />
                   </div>
                   <span className="text-slate-500 text-[10px] tracking-widest uppercase animate-pulse">Speak or type to continue</span>
                </div>
              )}
            </div>
          )}

          {status === 'processing' && (
             <div className="flex flex-col items-center gap-4">
               <div className="relative w-12 h-12">
                 <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"></div>
                 <div className="absolute inset-0 border-2 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.3)]"></div>
               </div>
               <span className="text-slate-400 text-sm tracking-widest uppercase">Weaving Dream...</span>
             </div>
          )}

          {(status === 'playing' || status === 'idle') && storyText && (
            <div className="prose prose-invert prose-p:text-slate-300/90 prose-p:font-light prose-p:leading-loose max-h-full overflow-y-auto text-left w-full scroll-smooth pr-2 custom-scrollbar">
              <p className="whitespace-pre-wrap text-[15px] sm:text-lg leading-relaxed sm:leading-loose">{storyText}</p>
              {status === 'playing' && (
                 <span className="inline-block w-2 h-2 ml-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse align-middle"></span>
              )}
            </div>
          )}
          
          {status === 'idle' && !storyText && !error && (
            <div className="text-slate-500/80 font-light italic text-base sm:text-lg">
              按住下方按钮或输入文字开始你的旅程...
            </div>
          )}
        </div>

        <div ref={belowPanelRef} className="w-full flex flex-col items-center gap-4">
          <form onSubmit={handleTextSubmit} className="w-full">
            <input
              id="story-input"
              name="story-input"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={['listening', 'processing', 'playing'].includes(status)}
              placeholder="输入你想说的内容..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            />
          </form>

          <div className="text-[10px] text-slate-600 font-mono tracking-widest opacity-50">
            STATUS: {status.toUpperCase()}
          </div>
          {wakeWordError && (
            <div className="text-[10px] text-red-300 font-mono tracking-widest opacity-80">
              WAKEWORD_ERROR: {String(wakeWordError).toUpperCase()}
            </div>
          )}
        </div>

        {/* Ambient Controls */}
        <div
          ref={controlsBarRef}
          className="fixed bottom-[calc(16px+env(safe-area-inset-bottom)+70px+12px)] sm:bottom-[calc(24px+env(safe-area-inset-bottom))] left-0 right-0 flex flex-wrap justify-center items-center gap-1.5 sm:gap-4 z-40 pointer-events-none px-2 sm:px-4"
        >
            <div className="pointer-events-auto">
                <NoiseControl ref={noiseControlRef} />
            </div>
            <div className="pointer-events-auto">
                <VoiceSelector />
            </div>
            <div className="pointer-events-auto">
                <SleepTimer onStop={handleTimerStop} />
            </div>
            <div className="pointer-events-auto">
                <button 
                  onClick={toggleWakeWord}
                  title={
                    wakeWordError
                      ? `唤醒不可用：${wakeWordError}`
                      : '开启后可对我说「小梦小梦」'
                  }
                  className={`
                    flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full 
                    bg-slate-800/60 backdrop-blur-md border border-slate-700/50 
                    transition-all duration-300 shadow-lg
                    ${wakeWordEnabled ? 'text-cyan-400 ring-1 ring-cyan-500/50 bg-slate-800' : 'text-slate-400 hover:bg-slate-700/60'}
                  `}
                >
                  <Ear size={14} className={`sm:w-[16px] sm:h-[16px] ${isWakeWordListening ? 'animate-pulse text-cyan-400' : ''}`} />
                  <span className="text-[11px] sm:text-sm font-light">唤醒: {wakeWordEnabled ? '开' : '关'}</span>
                </button>
            </div>
            <div className="pointer-events-auto">
                <button 
                  onClick={() => setKeepScreenOn(prev => !prev)}
                  title={keepScreenOn ? '屏幕常亮中（防止睡着后自动锁屏）' : '屏幕自动关闭'}
                  className={`
                    flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full 
                    bg-slate-800/60 backdrop-blur-md border border-slate-700/50 
                    transition-all duration-300 shadow-lg
                    ${keepScreenOn ? 'text-yellow-400 ring-1 ring-yellow-500/50 bg-slate-800' : 'text-slate-400 hover:bg-slate-700/60'}
                  `}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-[16px] sm:h-[16px]">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  <span className="text-[11px] sm:text-sm font-light">
                    {keepScreenOn ? '常亮：开' : '常亮：关'}
                  </span>
                </button>
            </div>
        </div>

      </main>

      <div
        ref={micContainerRef}
        className="group fixed left-1/2 -translate-x-1/2 bottom-[calc(16px+env(safe-area-inset-bottom))] sm:left-auto sm:translate-x-0 sm:right-[calc(16px+env(safe-area-inset-right))] z-[9999]"
      >
        {status === 'listening' && (
          <>
            <MotionDiv 
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 2.5 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 bg-cyan-500/20 rounded-full z-0 blur-md"
            />
            <MotionDiv 
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.8 }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6, ease: "easeOut" }}
              className="absolute inset-0 bg-cyan-400/10 rounded-full z-0 blur-sm"
            />
          </>
        )}

        <button
          ref={micButtonRef}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cancelTTS();
            interruptPlayback();
            stopWakeWordListener();
            setWakeWordEnabled(false);
            
            // If idle and no story, trigger proactive start
            if (status === 'idle' && !storyText) {
              sendPrompt(getWakeUpMessage(), { continuous: true });
            } else {
              startListening(e);
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stopListening(e);
          }}
          onMouseLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stopListening(e);
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cancelTTS();
            interruptPlayback();
          }}
          className={`
            relative w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center 
            transition-all duration-500 border border-white/5 select-none touch-none
            ${status === 'listening' 
              ? (interactionStatus === 'waiting' 
                  ? 'bg-slate-800/90 border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]' 
                  : 'bg-gradient-to-br from-cyan-600 to-cyan-800 scale-95 shadow-[0_0_40px_rgba(8,145,178,0.6)] border-cyan-400/30')
              : 'bg-slate-800/80 hover:bg-slate-700/80 shadow-2xl shadow-black/50 hover:scale-105 backdrop-blur-sm'}
          `}
        >
          <Mic 
            size={28} 
            strokeWidth={1.5}
            className={`transition-colors duration-300 sm:w-[32px] sm:h-[32px] ${status === 'listening' ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-slate-400 group-hover:text-slate-200'}`} 
          />
        </button>
      </div>
    </div>
    </>
  );
}

export default App;