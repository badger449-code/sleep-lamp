import { useEffect, useRef, useCallback } from 'react';

/**
 * 屏幕常亮 Hook
 * 功能：防止用户睡着后屏幕自动关闭
 * 技术：Wake Lock API
 */
export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef(null);
  const isVisibleRef = useRef(true);

  // 请求唤醒锁
  const requestWakeLock = useCallback(async () => {
    if (!enabled || !isVisibleRef.current) return;

    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('✅ 屏幕常亮已启用');
        
        // 监听唤醒锁释放
        wakeLockRef.current.addEventListener('release', () => {
          console.log('🔓 屏幕常亮已释放');
        });
      } else {
        console.warn('⚠️ 浏览器不支持 Wake Lock API');
      }
    } catch (err) {
      console.error('❌ 启用屏幕常亮失败:', err);
    }
  }, [enabled]);

  // 释放唤醒锁
  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('🔓 屏幕常亮已禁用');
    }
  }, []);

  // 页面可见性变化时重新请求
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      
      if (document.visibilityState === 'visible' && enabled) {
        // 页面重新可见时，重新请求唤醒锁
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, requestWakeLock]);

  // 初始化和清理
  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return {
    isWakeLockActive: wakeLockRef.current !== null,
    requestWakeLock,
    releaseWakeLock
  };
}
