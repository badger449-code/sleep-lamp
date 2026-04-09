import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceStore } from '../store/useVoiceStore';

export const useStoryMachine = (noiseControlRef) => {
  const [status, _setStatus] = useState('idle'); // idle, listening, processing, playing
  const statusRef = useRef('idle');
  const setStatus = (newStatus) => {
    statusRef.current = newStatus;
    _setStatus(newStatus);
  };

  const [interactionStatus, _setInteractionStatus] = useState('idle'); // idle, waiting, active
  const interactionStatusRef = useRef('idle');
  const setInteractionStatus = (s) => {
    interactionStatusRef.current = s;
    _setInteractionStatus(s);
  };
  
  const [transcript, _setTranscript] = useState('');
  const transcriptRef = useRef('');
  const setTranscript = (newTranscript) => {
    transcriptRef.current = newTranscript;
    _setTranscript(newTranscript);
  };
  const [storyText, setStoryText] = useState('');
  const [error, setError] = useState(null);
  
  // Use global voice store
  const { voiceId: voice, setVoiceId: setVoice } = useVoiceStore();
  
  const [systemPrompt, _setSystemPrompt] = useState(null); // Initialize later
  const systemPromptRef = useRef(null);
  const setSystemPrompt = (newPrompt) => {
    systemPromptRef.current = newPrompt;
    _setSystemPrompt(newPrompt);
  };
  const [lastInputTime, setLastInputTime] = useState(Date.now());
  const isServerProcessingRef = useRef(false);
  const continuousModeRef = useRef(false);

  const wsRef = useRef(null);
  const wsRetryCountRef = useRef(0); // 重连次数
  const wsMaxRetriesRef = useRef(10); // 最大重试次数
  const wsBaseDelayRef = useRef(1000); // 基础延迟 1 秒
  const wsMaxDelayRef = useRef(30000); // 最大延迟 30 秒
  const [wsStatus, setWsStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  
  // Replaced SpeechRecognition with MediaRecorder
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const inputTimeoutTimerRef = useRef(null);
  const analyserRef = useRef(null);
  const isUserTalkingRef = useRef(false);
  
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const isDecodingRef = useRef(false);
  const scheduledTimeRef = useRef(0);
  const playbackEndTimerRef = useRef(null);
  const activeSourcesRef = useRef([]);
  const ignoreIncomingRef = useRef(false);
  const activeRequestIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const pendingNoiseDecayRef = useRef(null);
  
  // Initialize WebSocket and AudioContext
  useEffect(() => {
    let isMounted = true;
    // Wait for user interaction to create AudioContext to avoid warning
      // but we need it ready for when server sends data
      // For now, we will create it here but it will be in 'suspended' state
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    
    // Connect to WebSocket
    const connectWs = () => {
      // Use dynamic WebSocket URL based on current host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const envWsUrl = typeof import.meta.env.VITE_WS_URL === 'string' ? import.meta.env.VITE_WS_URL.trim() : '';
      const wsUrl = envWsUrl ? envWsUrl : `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        if (!isMounted) {
          ws.close();
          return;
        }
        console.log('✅ Connected to Story Server');
        setError(null);
        setWsStatus('connected');
        wsRetryCountRef.current = 0; // 重置重试计数
      };
      
      ws.onmessage = async (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);

          const incomingRequestId = data?.requestId;
          const activeRequestId = activeRequestIdRef.current;
          if (incomingRequestId && activeRequestId && incomingRequestId !== activeRequestId) {
            return;
          }
          
          if (data.type === 'transcription_result') {
            setTranscript(data.content);
          } else if (data.type === 'scene_determined') {
            if (noiseControlRef?.current) {
              noiseControlRef.current.setSmartSceneById(data.content);
            }
          } else if (data.type === 'noise_decay') {
            pendingNoiseDecayRef.current = data?.content?.duration_ms || 60000;
          } else if (data.type === 'text_chunk') {
            if (ignoreIncomingRef.current) return;
            setStoryText(prev => prev + data.content);
          } else if (data.type === 'audio_chunk') {
            if (ignoreIncomingRef.current) return;
            try {
              // Ensure content is not empty and is a valid string
              if (data.content && typeof data.content === 'string' && data.content.length > 0) {
                const audioData = base64ToArrayBuffer(data.content);
                // We only enqueue if it has enough data to potentially be a valid header
                if (audioData.byteLength > 0) {
                  const pauseMs = typeof data.pause_ms === 'number' ? data.pause_ms : null;
                  audioQueueRef.current.push({ audioData, pauseMs });
                  playNextChunk();
                } else {
                  console.warn('Received completely empty audio chunk');
                }
              }
            } catch (e) {
              console.error('Error processing audio chunk:', e);
            }
          } else if (data.type === 'story_end') {
            if (ignoreIncomingRef.current) return;
            isServerProcessingRef.current = false;
            // Do NOT set status to idle immediately if there are still audio chunks to play
            if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
              setStatus('idle');
              if (pendingNoiseDecayRef.current && noiseControlRef?.current) {
                noiseControlRef.current.startDecay({ durationMs: pendingNoiseDecayRef.current });
                pendingNoiseDecayRef.current = null;
              }
            }
          } else if (data.type === 'error') {
            isServerProcessingRef.current = false;
            console.error('Server error:', data.content);
            setError(data.content);
            setStatus('idle');
          } else if (data.type === 'story_saved') {
            const history = data.content;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            localStorage.setItem(`sleep_story_${timestamp}`, history);
            console.log('Story saved to local storage', `sleep_story_${timestamp}`);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onerror = (e) => {
        console.error('🚨 WebSocket error:', e);
        setWsStatus('error');
        // 如果是处于连接中状态就报错，可能是端口或地址问题
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.CLOSED) {
           console.log('WebSocket failed to connect or closed unexpectedly');
        }
      };
      
      ws.onclose = (e) => {
        if (!isMounted) return;
        
        const retryCount = wsRetryCountRef.current;
        const maxRetries = wsMaxRetriesRef.current;
        
        console.log(`❌ Disconnected (code: ${e.code}, reason: ${e.reason || 'none'})`);
        console.log(`重试次数：${retryCount}/${maxRetries}`);
        
        setWsStatus('disconnected');
        
        // 达到最大重试次数，不再重连
        if (retryCount >= maxRetries) {
          console.error('⚠️ 达到最大重试次数，停止重连');
          setWsStatus('error');
          setError('网络连接失败，请刷新页面重试');
          return;
        }
        
        // 指数退避计算
        const baseDelay = wsBaseDelayRef.current;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount); // 1s, 2s, 4s, 8s...
        const delayWithJitter = exponentialDelay * (0.5 + Math.random()); // 加随机抖动
        const finalDelay = Math.min(delayWithJitter, wsMaxDelayRef.current); // 不超过 30 秒
        
        console.log(`⏳ ${finalDelay.toFixed(0)}ms 后重试...`);
        
        setTimeout(() => {
          if (isMounted) {
            wsRetryCountRef.current += 1;
            setWsStatus('connecting');
            console.log(`🔄 第 ${wsRetryCountRef.current} 次重连...`);
            connectWs();
          }
        }, finalDelay);
      };
      
      wsRef.current = ws;
    };
    
    // Only connect if not already connected
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      // Use a slight delay to allow React StrictMode double-invocations to settle
      setTimeout(() => {
        if (isMounted && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
          connectWs();
        }
      }, 100);
    }
    
    return () => {
      isMounted = false;
      if (wsRef.current) {
        // 允许正在连接的 websocket 继续连接，不强制中断它，避免抛出 "closed before connection established"
        // 只有当它处于 OPEN 状态时，我们才手动关闭它；
        // 如果它处于 CONNECTING 状态，让它在 onopen 里因为 isMounted===false 而自我关闭
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // 不要在组件卸载时直接 close audioContext，这会导致悬挂的 promise 报错
        // 我们只需将其挂起，或者让浏览器垃圾回收
        if (audioContextRef.current.state === 'running') {
            audioContextRef.current.suspend().catch(e => console.warn(e));
        }
      }
      if (playbackEndTimerRef.current) {
        clearTimeout(playbackEndTimerRef.current);
        playbackEndTimerRef.current = null;
      }
    };
  }, []);

  const interruptPlayback = useCallback(() => {
    ignoreIncomingRef.current = true;

    const requestId = activeRequestIdRef.current;
    if (requestId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'cancel_story', requestId }));
      } catch (e) {
        // ignore
      }
    }

    audioQueueRef.current = [];
    isServerProcessingRef.current = false;

    const ctx = audioContextRef.current;
    if (ctx && ctx.state !== 'closed') {
      scheduledTimeRef.current = ctx.currentTime;
    } else {
      scheduledTimeRef.current = 0;
    }

    if (playbackEndTimerRef.current) {
      clearTimeout(playbackEndTimerRef.current);
      playbackEndTimerRef.current = null;
    }

    const sources = activeSourcesRef.current;
    activeSourcesRef.current = [];
    for (const source of sources) {
      try {
        source.onended = null;
        source.stop(0);
      } catch (e) {
        continue;
      }
    }

    isPlayingRef.current = false;
    isDecodingRef.current = false;
    setStatus('idle');
  }, []);
  
  // Play audio queue - FIXED VERSION
  const playNextChunk = async () => {
    if (isDecodingRef.current) return;
    
    // Process only one chunk at a time, but keep calling until queue is empty
    if (audioQueueRef.current.length === 0) {
      // If queue is empty and no more server processing, check if we should transition state
      if (!isServerProcessingRef.current && !isPlayingRef.current) {
        if (continuousModeRef.current) {
          console.log('AI finished. Starting input session...');
          startListening({ continuous: true });
        } else {
          setStatus('idle');
          setInteractionStatus('idle');
          if (pendingNoiseDecayRef.current && noiseControlRef?.current) {
            noiseControlRef.current.startDecay({ durationMs: pendingNoiseDecayRef.current });
            pendingNoiseDecayRef.current = null;
          }
        }
      }
      return;
    }

    isDecodingRef.current = true;
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        isDecodingRef.current = false;
        return;
      }

      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (e) {
          isDecodingRef.current = false;
          return;
        }
      }

      const ctx = audioContextRef.current;
      const startPadding = 0.06;
      const fadeInSeconds = 0.06;
      const fadeOutSeconds = 0;
      const defaultPauseMs = 220;

      const item = audioQueueRef.current.shift();
      if (!item) {
        return;
      }
      
      const chunk = item && item.audioData ? item.audioData : item;
      const pauseMs = item && typeof item.pauseMs === 'number' ? item.pauseMs : defaultPauseMs;
      if (!chunk || chunk.byteLength === 0) {
        return;
      }

      let audioBuffer;
      try {
        audioBuffer = await ctx.decodeAudioData(chunk.slice(0));
      } catch (e) {
        console.error('Failed to decode audio chunk:', e.message);
        return;
      }

      if (!audioBuffer || audioBuffer.duration === 0) {
        console.warn('Skipping invalid audio buffer');
        return;
      }

      // Calculate start time ensuring no gaps in playback
      let startTime = scheduledTimeRef.current;
      const minStart = Math.max(ctx.currentTime + startPadding, startTime);
      startTime = minStart;

      // Create audio source and gain node
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1, startTime + fadeInSeconds);

      const endTime = startTime + audioBuffer.duration;
      if (fadeOutSeconds > 0) {
        const fadeOutStart = Math.max(startTime, endTime - fadeOutSeconds);
        gain.gain.setValueAtTime(1, fadeOutStart);
        gain.gain.linearRampToValueAtTime(0, endTime);
      }

      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(startTime);

      // Update scheduled time for next chunk
      scheduledTimeRef.current = endTime + (pauseMs / 1000);
      isPlayingRef.current = true;
      setStatus('playing');
      
      // When this source finishes, process next chunk
      source.onended = () => {
        // Clean up this source from active sources
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        
        // Reset playing flag if no more scheduled audio
        const timeUntilNext = scheduledTimeRef.current - ctx.currentTime;
        if (timeUntilNext <= 0.1) { // If no more audio scheduled soon
          isPlayingRef.current = false;
        }
        
        // Process next chunk in queue
        isDecodingRef.current = false;
        setTimeout(() => {
          // Continue processing queue if there are more chunks or if still playing
          if (audioQueueRef.current.length > 0) {
            playNextChunk();
          } else if (isPlayingRef.current) {
            // Still playing but no more chunks - wait for scheduled end time
            const remainingTime = scheduledTimeRef.current - ctx.currentTime;
            if (remainingTime <= 0.1) {
              isPlayingRef.current = false;
              if (!isServerProcessingRef.current) {
                if (continuousModeRef.current) {
                  console.log('AI finished. Starting input session...');
                  startListening({ continuous: true });
                } else {
                  setStatus('idle');
                  setInteractionStatus('idle');
                  if (pendingNoiseDecayRef.current && noiseControlRef?.current) {
                    noiseControlRef.current.startDecay({ durationMs: pendingNoiseDecayRef.current });
                    pendingNoiseDecayRef.current = null;
                  }
                }
              }
            }
          }
        }, 10); // Small delay to allow proper cleanup
      };
      
      // Add to active sources for cleanup
      activeSourcesRef.current.push(source);
      
    } catch (error) {
      console.error('Error in playNextChunk:', error);
      isDecodingRef.current = false;
    }
  };
  
  // Start Listening using MediaRecorder
  const startListening = useCallback(async (eOrOptions) => {
    let autoStopMs = 30000; // Default session timeout
    let isContinuous = false;
    
    if (eOrOptions && eOrOptions.preventDefault) {
      eOrOptions.preventDefault(); // Prevent default to avoid double-firing on mobile touch+mouse
    } else if (eOrOptions && typeof eOrOptions === 'object') {
      if (eOrOptions.autoStopMs) autoStopMs = eOrOptions.autoStopMs;
      if (eOrOptions.continuous) isContinuous = eOrOptions.continuous;
    }

    continuousModeRef.current = isContinuous;

    if (statusRef.current === 'listening') return;
    
    try {
      // Ensure AudioContext is ready upon user interaction
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(e => console.warn(e));
      }

      // Enter waiting state immediately
      setInteractionStatus('waiting');
      setTranscript('');
      setError(null);
      setStatus('listening');
      audioChunksRef.current = [];
      isUserTalkingRef.current = false;

      // Timeout for "no start" - if user doesn't start talking/typing within 30s
      if (inputTimeoutTimerRef.current) clearTimeout(inputTimeoutTimerRef.current);
      inputTimeoutTimerRef.current = setTimeout(() => {
        if (interactionStatusRef.current === 'waiting') {
           console.log('User input session timed out (no start detected)');
           stopListening();
           setInteractionStatus('idle');
           setStatus('idle');
        }
      }, autoStopMs);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // VAD Implementation
      const ctx = audioContextRef.current;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStart = null;
      const silenceThreshold = 15;
      const silenceDuration = 1500;

      const checkVolume = () => {
        if (statusRef.current !== 'listening' || !analyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        // Transition from waiting to active if volume exceeds threshold (voice detected)
        if (interactionStatusRef.current === 'waiting' && average > silenceThreshold) {
           console.log('User started talking - activating input session');
           setInteractionStatus('active');
           isUserTalkingRef.current = true;
           if (inputTimeoutTimerRef.current) {
             clearTimeout(inputTimeoutTimerRef.current);
             inputTimeoutTimerRef.current = null;
           }
        }

        // Silence detection for auto-stopping after talking
        if (interactionStatusRef.current === 'active') {
          if (average < silenceThreshold) {
            if (!silenceStart) silenceStart = Date.now();
            else if (Date.now() - silenceStart > silenceDuration) {
              console.log('Silence detected after activity, stopping...');
              stopListening();
              return;
            }
          } else {
            silenceStart = null;
          }
        }

        requestAnimationFrame(checkVolume);
      };

      // Start VAD check
      requestAnimationFrame(checkVolume);

      // Use webm or ogg depending on browser support
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose default
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // When recording stops, convert chunks to base64 and send
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Clear analyser
        if (analyserRef.current) {
          analyserRef.current = null;
        }

        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64AudioMessage = reader.result;
            // The result includes the "data:audio/webm;base64," prefix
            // We can send this directly to our server
            sendAudioPrompt(base64AudioMessage);
          };
        } else {
          setStatus('idle');
          setInteractionStatus('idle');
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setLastInputTime(Date.now());

    } catch (err) {
      console.error('Microphone access error:', err);
      setError('无法访问麦克风，请检查浏览器权限设置。');
      setStatus('idle');
      setInteractionStatus('idle');
    }
  }, []);
  
  // Stop Listening and Send
  const stopListening = useCallback((e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
    }
    if (inputTimeoutTimerRef.current) {
      clearTimeout(inputTimeoutTimerRef.current);
      inputTimeoutTimerRef.current = null;
    }
    
    if (analyserRef.current) {
      analyserRef.current = null; // Immediately stop VAD loop
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setStatus('processing');
      setInteractionStatus('idle');
      setStoryText(''); // Clear previous story
    }
  }, []);

  // Manual notification that input has started (e.g. typing)
  const notifyInputStarted = useCallback(() => {
    if (interactionStatusRef.current === 'waiting') {
      console.log('Input detected (manual) - activating input session');
      setInteractionStatus('active');
      if (inputTimeoutTimerRef.current) {
        clearTimeout(inputTimeoutTimerRef.current);
        inputTimeoutTimerRef.current = null;
      }
    }
  }, []);

  // Send Audio Base64 to server
  const sendAudioPrompt = (base64Audio) => {
    const requestId =
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    activeRequestIdRef.current = requestId;
    ignoreIncomingRef.current = false;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.warn(e));
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      isServerProcessingRef.current = true;
      // Clear any waiting input timers and status
      if (inputTimeoutTimerRef.current) {
        clearTimeout(inputTimeoutTimerRef.current);
        inputTimeoutTimerRef.current = null;
      }
      setInteractionStatus('idle');
      
      wsRef.current.send(JSON.stringify({
        type: 'start_story_audio',
        audio: base64Audio,
        voice: useVoiceStore.getState().voiceId,
        systemPrompt: systemPromptRef.current,
        requestId
      }));
      setStatus('processing');
      setStoryText('');
      setLastInputTime(Date.now());
      setError(null);
    } else {
      console.log('WebSocket not open, readyState:', wsRef.current?.readyState);
      setError('服务器连接断开，正在尝试重连...');
      setStatus('idle');
    }
  };
  
  // Helper to send message (to be called by UI with latest transcript)
  const sendPrompt = (text, options = {}) => {
    if (!text.trim()) return;
    
    // Set continuous mode if requested
    if (options.continuous !== undefined) {
      continuousModeRef.current = options.continuous;
    }

    const requestId =
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    activeRequestIdRef.current = requestId;
    ignoreIncomingRef.current = false;
    
    // Ensure AudioContext is ready upon user interaction (like submitting text form)
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.warn(e));
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      isServerProcessingRef.current = true;
      // Clear any waiting input timers and status
      if (inputTimeoutTimerRef.current) {
        clearTimeout(inputTimeoutTimerRef.current);
        inputTimeoutTimerRef.current = null;
      }
      setInteractionStatus('idle');

      wsRef.current.send(JSON.stringify({
        type: 'start_story',
        content: text,
        voice: useVoiceStore.getState().voiceId, // Send selected voice
        systemPrompt: systemPromptRef.current, // Send selected system prompt
        requestId
      }));
      setStatus('processing');
      setStoryText('');
      setLastInputTime(Date.now());
      setError(null); // 清除之前的错误
    } else {
      // 尝试自动重连，而不是只报错
      console.log('WebSocket not open, readyState:', wsRef.current?.readyState);
      setError('服务器连接断开，正在尝试重连...');
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
         // 我们已经在 useEffect 的 onclose 中处理了重连，这里只是提醒用户
      }
      setStatus('idle');
    }
  };

  return {
    status,
    interactionStatus,
    transcript,
    storyText,
    error,
    voice,
    setVoice,
    systemPrompt,
    setSystemPrompt,
    startListening,
    stopListening,
    interruptPlayback,
    sendPrompt,
    notifyInputStarted
  };
};

// Helper
function base64ToArrayBuffer(base64) {
  try {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error('Invalid base64 string:', e);
    return new ArrayBuffer(0); // Return empty buffer on failure
  }
}
