
import React, { useEffect, useState, useRef } from 'react';

interface AvatarProps {
  isSpeaking: boolean;
  currentWord: string;
}

type GestureType = 'SWEEP' | 'CIRCLE' | 'TAP' | 'ZIGZAG' | 'STILL';

const Avatar: React.FC<AvatarProps> = ({ isSpeaking, currentWord }) => {
  const [leftHand, setLeftHand] = useState({ x: 70, y: 120, rot: 0, scale: 1.2, opacity: 0.9 });
  const [rightHand, setRightHand] = useState({ x: 130, y: 120, rot: 0, scale: 1.2, opacity: 0.9 });
  
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Deterministically choose a gesture based on the word
  const getGestureForWord = (word: string): GestureType => {
    if (!word) return 'STILL';
    const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const types: GestureType[] = ['SWEEP', 'CIRCLE', 'TAP', 'ZIGZAG'];
    return types[hash % types.length];
  };

  useEffect(() => {
    const gesture = getGestureForWord(currentWord);
    
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = (time - startTimeRef.current) / 1000; // seconds
      
      // Neutral resting positions (centered and slightly lower)
      let lx = 70, ly = 130, lr = 0, ls = 1.2, lo = 0.8;
      let rx = 130, ry = 130, rr = 0, rs = 1.2, ro = 0.8;

      if (isSpeaking) {
        lo = 1;
        ro = 1;
        
        const speed = 7;
        const amplitude = 30;

        switch (gesture) {
          case 'SWEEP':
            rx += Math.sin(elapsed * speed) * amplitude;
            ry -= Math.abs(Math.cos(elapsed * speed)) * 15;
            rr = Math.sin(elapsed * speed) * 40;
            break;
          case 'CIRCLE':
            lx += Math.cos(elapsed * speed) * amplitude;
            ly += Math.sin(elapsed * speed) * amplitude;
            rx -= Math.cos(elapsed * speed) * amplitude;
            ry -= Math.sin(elapsed * speed) * amplitude;
            break;
          case 'TAP':
            ly += Math.sin(elapsed * speed * 2) * 20;
            ry += Math.sin(elapsed * speed * 2) * 20;
            lr = -10;
            rr = 10;
            break;
          case 'ZIGZAG':
            rx += (elapsed % 0.4 > 0.2 ? 25 : -25);
            ry -= (elapsed % 0.8 > 0.4 ? 15 : -15);
            lx -= (elapsed % 0.4 > 0.2 ? 25 : -25);
            ly -= (elapsed % 0.8 > 0.4 ? 15 : -15);
            break;
          default:
            rx += Math.sin(time * 0.008) * 8;
            ry += Math.cos(time * 0.008) * 8;
            lx += Math.cos(time * 0.008) * 8;
            ly += Math.sin(time * 0.008) * 8;
        }
      }

      setLeftHand({ x: lx, y: ly, rot: lr, scale: ls, opacity: lo });
      setRightHand({ x: rx, y: ry, rot: rr, scale: rs, opacity: ro });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isSpeaking, currentWord]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 opacity-20" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 2px 2px, #4f46e5 1px, transparent 0)', 
             backgroundSize: '30px 30px' 
           }}>
      </div>
      
      {/* Central Glow */}
      <div className="absolute w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]"></div>

      <svg width="100%" height="100%" viewBox="0 0 200 240" className="relative z-10 drop-shadow-[0_0_15px_rgba(79,70,229,0.4)]">
        <defs>
          <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Left Hand */}
        <g transform={`translate(${leftHand.x}, ${leftHand.y}) rotate(${leftHand.rot}) scale(${leftHand.scale})`} opacity={leftHand.opacity}>
          <rect x="-15" y="-18" width="30" height="36" rx="10" fill="url(#handGrad)" stroke="#b45309" strokeWidth="0.5" filter="url(#glow)" />
          {/* Fingers detail */}
          <line x1="-6" y1="-12" x2="-6" y2="8" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          <line x1="0" y1="-12" x2="0" y2="10" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          <line x1="6" y1="-12" x2="6" y2="8" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          {/* Palm line */}
          <path d="M-8 5 Q0 12 8 5" fill="none" stroke="#b45309" strokeWidth="0.5" opacity="0.3" />
        </g>

        {/* Right Hand */}
        <g transform={`translate(${rightHand.x}, ${rightHand.y}) rotate(${rightHand.rot}) scale(${rightHand.scale})`} opacity={rightHand.opacity}>
          <rect x="-15" y="-18" width="30" height="36" rx="10" fill="url(#handGrad)" stroke="#b45309" strokeWidth="0.5" filter="url(#glow)" />
          {/* Fingers detail */}
          <line x1="-6" y1="-12" x2="-6" y2="8" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          <line x1="0" y1="-12" x2="0" y2="10" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          <line x1="6" y1="-12" x2="6" y2="8" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          {/* Palm line */}
          <path d="M-8 5 Q0 12 8 5" fill="none" stroke="#b45309" strokeWidth="0.5" opacity="0.3" />
        </g>
      </svg>
      
      {currentWord && (
        <div className="absolute bottom-10 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-100 px-6 py-2 rounded-xl shadow-xl font-bold text-lg tracking-widest animate-pulse">
          {currentWord.toUpperCase()}
        </div>
      )}

      {/* Scanning Line Effect */}
      {isSpeaking && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/50 blur-[1px] shadow-[0_0_10px_#6366f1] animate-[scan_3s_linear_infinite]"></div>
      )}
      
      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Avatar;
