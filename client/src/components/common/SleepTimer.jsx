import React, { useState, useEffect, useCallback } from 'react';
import { Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 睡眠定时器组件
 * 功能：15/30/60 分钟定时关闭
 */
export function SleepTimer({ onStop }) {
  const [duration, setDuration] = useState(null); // 分钟
  const [remaining, setRemaining] = useState(null); // 剩余秒数
  const [isActive, setIsActive] = useState(false);

  // 开始定时器
  const startTimer = useCallback((minutes) => {
    const seconds = minutes * 60;
    setDuration(minutes);
    setRemaining(seconds);
    setIsActive(true);
  }, []);

  // 停止定时器
  const stopTimer = useCallback(() => {
    setIsActive(false);
    setDuration(null);
    setRemaining(null);
    if (onStop) onStop();
  }, [onStop]);

  // 倒计时逻辑
  useEffect(() => {
    if (!isActive || remaining === null) return;

    if (remaining <= 0) {
      // 时间到了
      stopTimer();
      return;
    }

    const timer = setInterval(() => {
      setRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, remaining, stopTimer]);

  // 格式化时间显示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 如果没有激活，显示预设按钮
  if (!isActive) {
    return (
      <div className="flex gap-2">
        {[15, 30, 60].map(mins => (
          <button
            key={mins}
            onClick={() => startTimer(mins)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors flex items-center gap-1"
          >
            <Clock size={14} />
            {mins}分钟
          </button>
        ))}
      </div>
    );
  }

  // 激活状态，显示倒计时
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2"
    >
      <Clock size={18} className="text-white" />
      <span className="text-white font-mono text-lg">
        {formatTime(remaining)}
      </span>
      <button
        onClick={stopTimer}
        className="p-1 hover:bg-white/20 rounded transition-colors"
        title="取消定时"
      >
        <X size={16} className="text-white" />
      </button>
    </motion.div>
  );
}
