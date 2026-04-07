import React, { useMemo } from 'react';

const StarryBackground = () => {
  // Generate random stars
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      duration: `${Math.random() * 3 + 2}s`,
      delay: `${Math.random() * 2}s`
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950/20"></div>

      {/* Ambient Glow Orbs */}
      <div 
        className="glow-orb w-96 h-96 bg-indigo-900/20 top-[-10%] left-[-10%]"
        style={{ animationDuration: '10s' }}
      ></div>
      <div 
        className="glow-orb w-80 h-80 bg-cyan-900/10 bottom-[-10%] right-[-10%]" 
        style={{ animationDuration: '12s', animationDelay: '2s' }}
      ></div>
      
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="star opacity-50"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            '--duration': star.duration,
            '--delay': star.delay
          }}
        />
      ))}
      
      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)]"></div>
    </div>
  );
};

export default StarryBackground;
