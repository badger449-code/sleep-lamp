import { useState, useEffect, useRef, useCallback } from 'react';

export const useWakeWord = (onWakeWordDetected, _isActive = false, onWakeWordError) => {
  const [isListening, setIsListening] = useState(false);
  const [wakeWordError, setWakeWordError] = useState(null);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(_isActive);
  const restartTimerRef = useRef(null);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  const onWakeWordErrorRef = useRef(onWakeWordError);
  const wakeWordErrorRef = useRef(wakeWordError);
  const isStartingRef = useRef(false);

  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  useEffect(() => {
    onWakeWordErrorRef.current = onWakeWordError;
  }, [onWakeWordError]);

  useEffect(() => {
    wakeWordErrorRef.current = wakeWordError;
  }, [wakeWordError]);

  const stopRecognition = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        return;
      }
    }
  }, []);

  const checkWakeWord = useCallback(
    (text) => {
      const normalizedText = String(text || '').replace(/[\s，。、！？.,!?]/g, '');
      if (!normalizedText.includes('小梦小梦')) return;
      if (typeof onWakeWordDetectedRef.current === 'function') {
        onWakeWordDetectedRef.current();
      }
      stopRecognition();
    },
    [stopRecognition]
  );

  const initRecognitionIfNeeded = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setWakeWordError('not-supported');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => {
      setWakeWordError(null);
      setIsListening(true);
      isStartingRef.current = false;
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          checkWakeWord(transcript);
        } else {
          interimTranscript += transcript;
          checkWakeWord(interimTranscript);
        }
      }
    };

    recognition.onerror = (event) => {
      const err = event?.error || 'unknown';
      setWakeWordError(err);
      isStartingRef.current = false;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        if (typeof onWakeWordErrorRef.current === 'function') onWakeWordErrorRef.current(err);
        stopRecognition();
        return;
      }
      if (err === 'network') {
        if (typeof onWakeWordErrorRef.current === 'function') onWakeWordErrorRef.current(err);
        stopRecognition();
        return;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      isStartingRef.current = false;
      if (!shouldListenRef.current) return;
      const err = wakeWordErrorRef.current;
      if (err === 'network' || err === 'not-allowed' || err === 'service-not-allowed') {
        return;
      }
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!shouldListenRef.current) return;
        try {
          recognition.start();
        } catch {
          return;
        }
      }, 700);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [checkWakeWord, stopRecognition]);

  const startRecognition = useCallback(() => {
    shouldListenRef.current = true;
    const recognition = initRecognitionIfNeeded();
    if (!recognition) return;
    if (isListening || isStartingRef.current) return;
    try {
      isStartingRef.current = true;
      recognition.start();
    } catch {
      isStartingRef.current = false;
      return;
    }
  }, [initRecognitionIfNeeded, isListening]);

  return {
    isWakeWordListening: isListening,
    wakeWordError,
    startWakeWordListener: startRecognition,
    stopWakeWordListener: stopRecognition
  };
};
