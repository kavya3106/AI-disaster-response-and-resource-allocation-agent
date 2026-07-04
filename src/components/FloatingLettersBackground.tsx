import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import bgImage from '../assets/images/resq_bg_illustration_1783014115471.jpg';

interface FloatingLetter {
  char: string;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  size: number;
  color: string;
}

export default function FloatingLettersBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showLetters, setShowLetters] = useState(true);
  const [intensity, setIntensity] = useState<'calm' | 'active' | 'storm'>('active');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Array of words/letters to float
    const keywords = [
      'ResQ', 'AI', 'LSTM', 'CNN', 'SOLVER', 'LAT', 'LNG', 'ALERT', 'TAMILNADU',
      'DEPOT', 'EPOC', '01', 'FUSION', 'ROUTING', 'UAV', 'SATELLITE', 'FLOW', 'SECURE',
      'METRICS', '96.1%', 'DISPATCH', 'WIND', 'WATER', 'RAIN', 'THREAT', 'CRITICAL',
      'SEVERITY', 'DENSE', 'DEBRIS', 'MIGRATION', 'OPTIMIZER', 'TNSDMA', 'CHENNAI'
    ];

    const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%@#$*';
    
    // Create initial letters
    const letters: FloatingLetter[] = [];
    const maxLetters = intensity === 'calm' ? 30 : intensity === 'active' ? 70 : 130;

    const createLetter = (initialYAtBottom = false): FloatingLetter => {
      const isWord = Math.random() > 0.4;
      const char = isWord 
        ? keywords[Math.floor(Math.random() * keywords.length)]
        : pool[Math.floor(Math.random() * pool.length)];

      const size = Math.floor(Math.random() * 10) + (isWord ? 11 : 9);
      
      // Sky blue / teal emergency tone coloring
      const colors = [
        'rgba(56, 189, 248, opacity)', // sky-400
        'rgba(45, 212, 191, opacity)', // teal-400
        'rgba(99, 102, 241, opacity)', // indigo-500
        'rgba(14, 165, 233, opacity)'  // sky-500
      ];
      const colorTemplate = colors[Math.floor(Math.random() * colors.length)];

      return {
        char,
        x: Math.random() * width,
        y: initialYAtBottom ? height + 20 : Math.random() * height,
        speed: (Math.random() * 0.6 + 0.2) * (intensity === 'calm' ? 0.6 : intensity === 'active' ? 1 : 1.8),
        opacity: Math.random() * 0.4 + 0.15,
        size,
        color: colorTemplate
      };
    };

    for (let i = 0; i < maxLetters; i++) {
      letters.push(createLetter(false));
    }

    // Resize observer to handle container adjustments dynamically as mandated
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (showLetters) {
        letters.forEach((item, index) => {
          // Drifts upwards
          item.y -= item.speed;
          
          // Slight sway sideways
          item.x += Math.sin(item.y / 40 + index) * 0.2;

          // Wrap around if exit screen
          if (item.y < -30) {
            letters[index] = createLetter(true);
          }

          // Draw floating letter with high-contrast text rendering
          ctx.font = `${item.size}px "JetBrains Mono", monospace`;
          ctx.fillStyle = item.color.replace('opacity', item.opacity.toString());
          
          // Text glow effect to make it pop but stay in the background
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(14, 165, 233, 0.4)';
          
          ctx.fillText(item.char, item.x, item.y);
          ctx.shadowBlur = 0; // reset
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [showLetters, intensity]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
      {/* 1. Underlying generated Illustration backdrop with low-opacity blend */}
      <div 
        className="absolute inset-0 bg-no-repeat bg-cover bg-center transition-opacity duration-1000 opacity-[0.06] md:opacity-[0.09]"
        style={{ 
          backgroundImage: `url(${bgImage})`,
          mixBlendMode: 'lighten'
        }}
      />

      {/* 2. Linear Gradient overlays to seamlessly anchor the backdrop to dark-slate workspace */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-slate-950" />

      {/* 3. HTML5 Canvas for real-time floating letters overlay */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block w-full h-full opacity-60 mix-blend-screen"
      />

      {/* 4. Tiny premium manual control in the footer or bottom right to change state (visible and unique) */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-auto flex items-center gap-2 bg-slate-950/90 border border-slate-900 px-2.5 py-1.5 rounded-lg text-[9px] font-mono text-slate-400">
        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Telemetry:</span>
        <button
          onClick={() => setShowLetters(!showLetters)}
          className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
            showLetters ? 'bg-sky-500/20 text-sky-400 font-bold' : 'bg-slate-900 text-slate-600'
          }`}
          title="Toggle floating letters overlay"
        >
          {showLetters ? 'ON' : 'OFF'}
        </button>
        <span className="text-slate-800">|</span>
        <div className="flex gap-1">
          {(['calm', 'active', 'storm'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setIntensity(mode)}
              className={`px-1 rounded uppercase transition-all text-[8px] font-semibold cursor-pointer ${
                intensity === mode ? 'text-sky-300 font-bold bg-sky-500/10' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
