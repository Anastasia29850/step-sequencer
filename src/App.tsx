/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Volume2, Zap, Music, Activity, Layers, Sparkles, Pencil, Trash2, Sliders } from 'lucide-react';

// --- Constants ---
const TICKS_PER_BAR = 96;
const SUBDIVISIONS = [
  { id: 4, label: '1/4' },
  { id: 8, label: '1/8' },
  { id: 12, label: '1/12' },
  { id: 16, label: '1/16' },
];

const SCALE_NOTES = [
  { note: 'C5', freq: 523.25 },
  { note: 'A4', freq: 440.00 },
  { note: 'G4', freq: 392.00 },
  { note: 'E4', freq: 329.63 },
  { note: 'D4', freq: 293.66 },
  { note: 'C4', freq: 261.63 },
];

const TRACKS = [
  { id: 'kick', name: 'KICK', color: 'bg-pink-400', activeColor: 'bg-pink-300', type: 'drum' },
  { id: 'snare', name: 'SNARE', color: 'bg-rose-300', activeColor: 'bg-rose-200', type: 'drum' },
  { id: 'hihat', name: 'HIHAT', color: 'bg-fuchsia-300', activeColor: 'bg-fuchsia-200', type: 'drum' },
  { id: 'clap', name: 'CLAP', color: 'bg-pink-300', activeColor: 'bg-pink-200', type: 'drum' },
  { id: 'piano', name: 'PIANO', color: 'bg-violet-400', activeColor: 'bg-violet-300', type: 'melodic' },
  { id: 'sketchpad', name: 'DRAW', color: 'bg-pink-500', activeColor: 'bg-pink-400', type: 'special' },
];

// --- Audio Engine Helpers ---
class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5;
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Synthesized Sounds
  playKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  playSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseEnvelope = this.ctx.createGain();
    noiseEnvelope.gain.setValueAtTime(1, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.2);
  }

  playHihat(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.3, time);
    env.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  playClap(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.8, time);
    env.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    noise.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.3);
  }

  playPiano(time: number, freq: number = 440) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time); // Octave up for shimmer

    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq / 2, time); // Sub-octave for depth

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.8);

    osc.connect(gain);
    osc2.connect(gain);
    sub.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc2.start(time);
    sub.start(time);
    osc.stop(time + 0.8);
    osc2.stop(time + 0.8);
    sub.stop(time + 0.8);
  }

  playSketch(time: number, freq: number, volume: number = 0.2, settings: { oscType: OscillatorType, decay: number, shimmer: number, cutoff: number }) {
    if (!this.ctx || !this.masterGain) return;
    
    // Main oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    // High-frequency "shimmer" oscillator
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();

    osc.type = settings.oscType;
    osc.frequency.setValueAtTime(freq, time);
    
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 4.01, time); // High harmonic
    shimmerGain.gain.setValueAtTime(volume * settings.shimmer, time);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(settings.cutoff, time);
    filter.Q.setValueAtTime(1, time);

    // Envelope: fast attack, configurable decay
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + settings.decay);

    osc.connect(filter);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    shimmer.start(time);
    
    osc.stop(time + settings.decay);
    shimmer.stop(time + settings.decay);
  }

  playTrack(trackId: string, time: number, freq?: number) {
    switch (trackId) {
      case 'kick': this.playKick(time); break;
      case 'snare': this.playSnare(time); break;
      case 'hihat': this.playHihat(time); break;
      case 'clap': this.playClap(time); break;
      case 'piano': this.playPiano(time, freq); break;
    }
  }
}

const audioEngine = new AudioEngine();

// --- Components ---
const DrawMusic = React.memo(({ 
  isAudioStarted, 
  resetTrigger, 
  onAddPoint, 
  onClear,
  settings,
  onSettingsChange
}: { 
  isAudioStarted: boolean, 
  resetTrigger: number,
  onAddPoint: (tick: number, freq: number, vol: number) => void,
  onClear: () => void,
  settings: { oscType: OscillatorType, decay: number, shimmer: number, cutoff: number },
  onSettingsChange: (newSettings: any) => void
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);
  const lastProcessedReset = useRef<number>(0);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  }, [onClear]);

  useEffect(() => {
    if (resetTrigger > lastProcessedReset.current) {
      lastProcessedReset.current = resetTrigger;
      clearCanvas();
    }
  }, [resetTrigger, clearCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !canvasRef.current || !isAudioStarted) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.current.getContext('2d');
    if (ctx && lastPos.current) {
      const dist = Math.hypot(x - lastPos.current.x, y - lastPos.current.y);
      
      // Only draw and record if we've moved enough
      if (dist > 5) {
        const hue = (Date.now() / 25) % 360;
        const solidColor = `hsl(${hue}, 70%, 75%)`;
        
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = solidColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 0;
        ctx.stroke();

        // Record logic: X is time (tick), Y is pitch
        const tick = Math.floor((x / canvasRef.current.width) * TICKS_PER_BAR);
        const freq = 200 + (1 - y / canvasRef.current.height) * 1200;
        const vol = 0.08 + (x / canvasRef.current.width) * 0.12;
        
        if (tick >= 0 && tick < TICKS_PER_BAR) {
          onAddPoint(tick, freq, vol);
          if (audioEngine.ctx) {
            audioEngine.resume();
            audioEngine.playSketch(audioEngine.ctx.currentTime, freq, vol, settings);
          }
        }

        lastPos.current = { x, y };
      }
    } else {
      lastPos.current = { x, y };
    }
  };

  return (
    <div className="relative w-full h-96 bg-zinc-900/40 rounded-3xl border border-pink-900/10 overflow-hidden group">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-3 pointer-events-none">
        <div className="p-2 bg-pink-500/20 rounded-lg">
          <Pencil className="w-4 h-4 text-pink-400" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-pink-200/60">Draw Music</h3>
          <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Draw to record crystal synth patterns into the loop</p>
        </div>
      </div>
      
      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-16 z-10 p-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-pink-400 rounded-xl border border-white/5 transition-all opacity-0 group-hover:opacity-100"
        title="Paramètres du son"
      >
        <Sliders className="w-4 h-4" />
      </button>

      {showSettings && (
        <div className="absolute top-16 right-6 z-20 p-4 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-pink-500/20 w-48 space-y-4 shadow-2xl">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-bold">Oscillateur</label>
            <div className="grid grid-cols-2 gap-1">
              {['sine', 'triangle', 'square', 'sawtooth'].map(type => (
                <button
                  key={type}
                  onClick={() => onSettingsChange({ ...settings, oscType: type as OscillatorType })}
                  className={`text-[8px] py-1 rounded-md border transition-all uppercase font-bold ${
                    settings.oscType === type 
                      ? 'bg-pink-500/20 border-pink-500/40 text-pink-400' 
                      : 'bg-zinc-800/50 border-white/5 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {type.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Déclin</label>
              <span className="text-[9px] text-pink-400 font-mono">{settings.decay.toFixed(1)}s</span>
            </div>
            <input 
              type="range" min="0.1" max="4" step="0.1"
              value={settings.decay}
              onChange={(e) => onSettingsChange({ ...settings, decay: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Shimmer</label>
              <span className="text-[9px] text-pink-400 font-mono">{(settings.shimmer * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.05"
              value={settings.shimmer}
              onChange={(e) => onSettingsChange({ ...settings, shimmer: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Filtre</label>
              <span className="text-[9px] text-pink-400 font-mono">{settings.cutoff}Hz</span>
            </div>
            <input 
              type="range" min="200" max="8000" step="100"
              value={settings.cutoff}
              onChange={(e) => onSettingsChange({ ...settings, cutoff: parseInt(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => onSettingsChange({
                oscType: 'sine',
                decay: 1.5,
                shimmer: 0.3,
                cutoff: 2000,
              })}
              className="w-full py-1.5 text-[8px] text-zinc-500 hover:text-pink-400 uppercase font-bold transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={clearCanvas}
        className="absolute top-4 right-6 z-10 p-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-pink-400 rounded-xl border border-white/5 transition-all opacity-0 group-hover:opacity-100"
        title="Effacer le dessin"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          setIsDrawing(true);
          const rect = canvasRef.current!.getBoundingClientRect();
          lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }}
        onPointerUp={() => {
          setIsDrawing(false);
          lastPos.current = null;
        }}
        onPointerLeave={() => {
          setIsDrawing(false);
          lastPos.current = null;
        }}
        onPointerMove={handlePointerMove}
        className="w-full h-full cursor-crosshair touch-none"
      />
    </div>
  );
});

const PastelPop = ({ isAudioStarted }: { isAudioStarted: boolean }) => {
  const [bubbles, setBubbles] = useState<{ 
    id: number, 
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    size: number, 
    color: string,
    isMoving: boolean,
    bounces: number,
    noteIndex: number
  }[]>([]);
  const [score, setScore] = useState(0);
  const requestRef = useRef<number>();

  const updatePhysics = useCallback(() => {
    setBubbles(prev => {
      return prev.map(b => {
        if (!b.isMoving) return b;

        let { x, y, vx, vy, bounces, size } = b;
        
        // Update position
        x += vx;
        y += vy;

        let hitWall = false;
        // Bounce off walls (percentages)
        if (x < 5 || x > 95) {
          vx *= -1;
          x = Math.max(5, Math.min(95, x));
          hitWall = true;
        }
        if (y < 5 || y > 95) {
          vy *= -1;
          y = Math.max(5, Math.min(95, y));
          hitWall = true;
        }

        if (hitWall) {
          bounces += 1;
          // Play sound on bounce
          if (audioEngine.ctx && bounces <= 2) {
            const note = SCALE_NOTES[b.noteIndex % SCALE_NOTES.length];
            audioEngine.playPiano(audioEngine.ctx.currentTime, note.freq);
          }
        }

        // If it has bounced 2 times, start shrinking it to disappear
        if (bounces >= 2) {
          size *= 0.85;
        }

        return { ...b, x, y, vx, vy, bounces, size };
      }).filter(b => b.size > 2); // Remove when tiny
    });
    requestRef.current = requestAnimationFrame(updatePhysics);
  }, []);

  useEffect(() => {
    if (isAudioStarted) {
      requestRef.current = requestAnimationFrame(updatePhysics);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isAudioStarted, updatePhysics]);

  useEffect(() => {
    if (!isAudioStarted) return;
    const interval = setInterval(() => {
      setBubbles(prev => {
        if (prev.length < 20) {
          return [...prev, {
            id: Date.now() + Math.random(),
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            vx: 0, // Fixed initially
            vy: 0,
            size: Math.random() * 20 + 25,
            color: [
              'bg-pink-200', 
              'bg-violet-200', 
              'bg-blue-200', 
              'bg-emerald-200', 
              'bg-amber-200',
              'bg-rose-200'
            ][Math.floor(Math.random() * 6)],
            isMoving: false,
            bounces: 0,
            noteIndex: Math.floor(Math.random() * SCALE_NOTES.length)
          }];
        }
        return prev;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isAudioStarted]);

  const handleBubbleClick = (id: number) => {
    setScore(s => s + 1);
    setBubbles(prev => prev.map(b => {
      if (b.id === id) {
        if (audioEngine.ctx) {
          audioEngine.resume();
          const note = SCALE_NOTES[b.noteIndex % SCALE_NOTES.length];
          audioEngine.playPiano(audioEngine.ctx.currentTime, note.freq * 1.5);
        }

        // Give it velocity or change it if already moving
        return { 
          ...b, 
          isMoving: true, 
          vx: (Math.random() - 0.5) * 2.5, 
          vy: (Math.random() - 0.5) * 2.5 
        };
      }
      return b;
    }));
  };

  return (
    <div className="mt-6 p-4 sm:p-8 bg-zinc-900/30 rounded-[2rem] border border-pink-500/5 relative overflow-hidden h-64 flex flex-col items-center justify-center group/game">
      <div className="absolute top-4 left-6 flex items-center gap-2 z-10">
        <div className="p-1.5 bg-pink-500/10 rounded-lg">
          <Sparkles className="w-3 h-3 text-pink-400" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-pink-200/40">Mini-Jeu: Pastel Pop</span>
      </div>
      
      <div className="absolute top-4 right-6 flex items-center gap-3 z-10">
        <div className="bg-black/40 px-3 py-1 rounded-full border border-pink-500/10">
          <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-tighter">Score: {score}</span>
        </div>
        <button 
          onClick={() => setScore(0)}
          className="p-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-pink-400 rounded-lg border border-white/5 transition-all"
          title="Reset Score"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      {!isAudioStarted ? (
        <div className="flex flex-col items-center gap-2 opacity-40">
          <Zap className="w-5 h-5 text-pink-500 animate-pulse" />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Activez le studio pour jouer</p>
        </div>
      ) : (
        <div className="w-full h-full relative">
          {bubbles.map(b => (
            <button
              key={b.id}
              onClick={() => handleBubbleClick(b.id)}
              className={`absolute rounded-full shadow-[0_0_20px_rgba(0,0,0,0.15)] cursor-pointer ${b.color} border border-white/40 transition-transform duration-200 active:scale-90`}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.size}px`,
                height: `${b.size}px`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
          {bubbles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-pink-500/20">Attendez les bulles...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(-1);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [sketchNotes, setSketchNotes] = useState<Record<number, { freq: number, vol: number }[]>>({});
  const [sketchSettings, setSketchSettings] = useState({
    oscType: 'sine' as OscillatorType,
    decay: 1.5,
    shimmer: 0.3,
    cutoff: 2000,
  });
  
  const [trackConfigs, setTrackConfigs] = useState<Record<string, { steps: any, subdivision: number }>>(() => {
    const initial: Record<string, { steps: any, subdivision: number }> = {};
    TRACKS.forEach(t => {
      if (t.type === 'melodic') {
        // 2D array: [noteIndex][stepIndex]
        initial[t.id] = {
          steps: Array.from({ length: SCALE_NOTES.length }, () => new Array(16).fill(false)),
          subdivision: 16
        };
      } else {
        initial[t.id] = {
          steps: new Array(16).fill(false),
          subdivision: 16
        };
      }
    });
    return initial;
  });

  const onAddPoint = useCallback((tick: number, freq: number, vol: number) => {
    setSketchNotes(prev => ({
      ...prev,
      [tick]: [...(prev[tick] || []), { freq, vol }]
    }));
  }, []);

  const onClear = useCallback(() => {
    setSketchNotes({});
  }, []);

  // Scheduler Refs
  const nextNoteTime = useRef(0);
  const currentTickRef = useRef(0);
  const timerID = useRef<number | null>(null);
  const trackConfigsRef = useRef(trackConfigs);
  const sketchNotesRef = useRef(sketchNotes);
  const sketchSettingsRef = useRef(sketchSettings);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    trackConfigsRef.current = trackConfigs;
  }, [trackConfigs]);

  useEffect(() => {
    sketchNotesRef.current = sketchNotes;
  }, [sketchNotes]);

  useEffect(() => {
    sketchSettingsRef.current = sketchSettings;
  }, [sketchSettings]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const scheduleNote = (tick: number, time: number) => {
    // Play sketch notes for this tick
    const notes = sketchNotesRef.current[tick];
    if (notes) {
      notes.forEach(note => {
        audioEngine.playSketch(time, note.freq, note.vol, sketchSettingsRef.current);
      });
    }

    TRACKS.forEach(track => {
      const config = trackConfigsRef.current[track.id];
      const ticksPerStep = TICKS_PER_BAR / config.subdivision;
      
      if (tick % ticksPerStep === 0) {
        const stepIndex = tick / ticksPerStep;
        if (track.type === 'melodic') {
          config.steps.forEach((noteSteps: boolean[], noteIndex: number) => {
            if (noteSteps[stepIndex]) {
              audioEngine.playTrack(track.id, time, SCALE_NOTES[noteIndex].freq);
            }
          });
        } else {
          if (config.steps[stepIndex]) {
            audioEngine.playTrack(track.id, time);
          }
        }
      }
    });
    
    setTimeout(() => {
      setCurrentTick(tick);
    }, (time - (audioEngine.ctx?.currentTime || 0)) * 1000);
  };

  const scheduler = () => {
    if (!audioEngine.ctx) return;
    
    while (nextNoteTime.current < audioEngine.ctx.currentTime + 0.1) {
      scheduleNote(currentTickRef.current, nextNoteTime.current);
      
      // Each tick is 1/96th of a bar (4 beats)
      // 1 beat = 60/bpm seconds
      // 4 beats = 4 * (60/bpm) seconds
      // 1 tick = (4 * 60/bpm) / 96 = (60/bpm) / 24
      const secondsPerTick = (60.0 / bpmRef.current) / 24;
      nextNoteTime.current += secondsPerTick;
      currentTickRef.current = (currentTickRef.current + 1) % TICKS_PER_BAR;
    }
  };

  const togglePlay = () => {
    if (!isAudioStarted) {
      audioEngine.init();
      setIsAudioStarted(true);
    }
    audioEngine.resume();

    if (isPlaying) {
      if (timerID.current) window.clearInterval(timerID.current);
      setIsPlaying(false);
      setCurrentTick(-1);
    } else {
      currentTickRef.current = 0;
      nextNoteTime.current = audioEngine.ctx!.currentTime;
      timerID.current = window.setInterval(scheduler, 25);
      setIsPlaying(true);
    }
  };

  const toggleStep = (trackId: string, stepIndex: number, noteIndex?: number) => {
    setTrackConfigs(prev => {
      const config = prev[trackId];
      const track = TRACKS.find(t => t.id === trackId);
      
      if (track?.type === 'melodic' && noteIndex !== undefined) {
        const newSteps = [...config.steps];
        newSteps[noteIndex] = [...newSteps[noteIndex]];
        newSteps[noteIndex][stepIndex] = !newSteps[noteIndex][stepIndex];
        return { ...prev, [trackId]: { ...config, steps: newSteps } };
      } else {
        return {
          ...prev,
          [trackId]: {
            ...config,
            steps: config.steps.map((s: boolean, i: number) => i === stepIndex ? !s : s)
          }
        };
      }
    });
    
    if (!isPlaying && isAudioStarted) {
      audioEngine.resume();
      const freq = noteIndex !== undefined ? SCALE_NOTES[noteIndex].freq : undefined;
      audioEngine.playTrack(trackId, audioEngine.ctx!.currentTime, freq);
    }
  };

  const changeSubdivision = (trackId: string, sub: number) => {
    setTrackConfigs(prev => {
      const config = prev[trackId];
      const oldSub = config.subdivision;
      if (oldSub === sub) return prev;
      
      const track = TRACKS.find(t => t.id === trackId);
      
      if (track?.type === 'melodic') {
        const newSteps = Array.from({ length: SCALE_NOTES.length }, () => new Array(sub).fill(false));
        config.steps.forEach((noteSteps: boolean[], noteIdx: number) => {
          noteSteps.forEach((active: boolean, i: number) => {
            if (active) {
              const progress = i / oldSub;
              const newIndex = Math.floor(progress * sub);
              if (newIndex < sub) newSteps[noteIdx][newIndex] = true;
            }
          });
        });
        return { ...prev, [trackId]: { steps: newSteps, subdivision: sub } };
      } else {
        const newSteps = new Array(sub).fill(false);
        config.steps.forEach((active: boolean, i: number) => {
          if (active) {
            const progress = i / oldSub;
            const newIndex = Math.floor(progress * sub);
            if (newIndex < sub) newSteps[newIndex] = true;
          }
        });
        return { ...prev, [trackId]: { steps: newSteps, subdivision: sub } };
      }
    });
  };

  // --- Pointer Interaction Logic ---
  const isPointerDown = useRef(false);
  const lastToggled = useRef<string | null>(null);

  const handlePointerDown = (trackId: string, stepIndex: number, noteIndex?: number) => {
    isPointerDown.current = true;
    toggleStep(trackId, stepIndex, noteIndex);
    lastToggled.current = noteIndex !== undefined ? `${trackId}-${stepIndex}-${noteIndex}` : `${trackId}-${stepIndex}`;
  };

  const handlePointerEnter = (trackId: string, stepIndex: number, noteIndex?: number) => {
    if (isPointerDown.current) {
      const key = noteIndex !== undefined ? `${trackId}-${stepIndex}-${noteIndex}` : `${trackId}-${stepIndex}`;
      if (lastToggled.current !== key) {
        toggleStep(trackId, stepIndex, noteIndex);
        lastToggled.current = key;
      }
    }
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
    lastToggled.current = null;
  };

  const generateRandomComposition = () => {
    setTrackConfigs(prev => {
      const next = { ...prev };
      TRACKS.forEach(track => {
        const config = { ...next[track.id] };
        if (track.type === 'melodic') {
          const newSteps = Array.from({ length: SCALE_NOTES.length }, () => 
            new Array(config.subdivision).fill(false).map(() => Math.random() > 0.92)
          );
          next[track.id] = { ...config, steps: newSteps };
        } else {
          let probability = 0.15;
          if (track.id === 'hihat') probability = 0.4;
          if (track.id === 'kick') probability = 0.2;
          
          const newSteps = new Array(config.subdivision).fill(false).map(() => Math.random() > (1 - probability));
          next[track.id] = { ...config, steps: newSteps };
        }
      });
      return next;
    });
  };

  const resetAll = () => {
    setTrackConfigs(prev => {
      const next = { ...prev };
      TRACKS.forEach(track => {
        if (track.type === 'melodic') {
          next[track.id] = { ...next[track.id], steps: Array.from({ length: SCALE_NOTES.length }, () => new Array(next[track.id].subdivision).fill(false)) };
        } else if (track.type === 'drum') {
          next[track.id] = { ...next[track.id], steps: new Array(next[track.id].subdivision).fill(false) };
        }
      });
      return next;
    });
    setResetTrigger(prev => prev + 1);
  };

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-pink-500/30 flex flex-col">
      {/* Header / Top Bar */}
      <header className="w-full bg-black/40 border-b border-pink-900/20 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-4 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-2xl bg-pink-500 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Pastel<span className="text-pink-400">Beats</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-pink-500/40 font-bold">Soft Studio Sequencer</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-8 w-full sm:w-auto">
          <div className="flex items-center gap-4 bg-zinc-900/50 px-4 py-2 rounded-2xl border border-pink-900/20 flex-1 sm:flex-none justify-between sm:justify-start">
            <label className="text-[10px] uppercase tracking-widest text-pink-400 font-bold">Tempo</label>
            <input 
              type="range" 
              min="40" 
              max="240" 
              value={bpm} 
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-24 sm:w-32 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <span className="text-sm font-mono font-bold text-pink-400 w-8 sm:w-12 text-center">{bpm}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={resetAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold bg-zinc-900/50 text-zinc-400 border border-pink-900/20 hover:bg-zinc-800 transition-all active:scale-95"
              title="Réinitialiser tout"
            >
              <Trash2 className="w-4 h-4" />
              <span className="uppercase tracking-widest text-[10px]">Reset</span>
            </button>

            <button 
              onClick={generateRandomComposition}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold bg-zinc-900/50 text-pink-400 border border-pink-900/20 hover:bg-zinc-800 transition-all active:scale-95"
              title="Générer une composition aléatoire"
            >
              <Sparkles className="w-4 h-4" />
              <span className="uppercase tracking-widest text-[10px]">Random</span>
            </button>

            <button 
              onClick={togglePlay}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 sm:px-8 py-3 rounded-2xl font-bold transition-all duration-300 ${
                isPlaying 
                  ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                  : 'bg-pink-500 text-white hover:bg-pink-600 active:scale-95'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span className="uppercase tracking-widest text-xs">{isPlaying ? 'Stop' : 'Play'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Area */}
      <main className="flex-1 p-2 sm:p-4 lg:p-12 flex flex-col items-center justify-center overflow-x-hidden">
        <div className="max-w-6xl w-full space-y-4 sm:space-y-8">
          <div className="bg-zinc-900/40 rounded-3xl sm:rounded-[3rem] p-4 sm:p-8 lg:p-12 border border-pink-900/10 backdrop-blur-sm relative overflow-x-auto">
            <div className="min-w-[600px] sm:min-w-[800px] space-y-6 sm:space-y-8">
              {TRACKS.map((track) => {
                const config = trackConfigs[track.id];
                const ticksPerStep = config ? TICKS_PER_BAR / config.subdivision : 0;
                const activeStep = currentTick !== -1 && ticksPerStep > 0 && currentTick % ticksPerStep === 0 
                  ? currentTick / ticksPerStep 
                  : -1;

                if (track.type === 'special' && track.id === 'sketchpad') {
                  return (
                    <div key={track.id} className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                      <div className="w-full sm:w-28 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <Pencil className="w-3 h-3 text-pink-400" />
                          <span className="text-[10px] font-bold tracking-widest text-pink-200/60 uppercase">{track.name}</span>
                        </div>
                        <button
                          onClick={() => setResetTrigger(prev => prev + 1)}
                          className="text-[7px] px-1.5 py-0.5 rounded-md border border-white/5 bg-zinc-800/30 text-zinc-600 hover:text-pink-400 hover:border-pink-500/30 transition-all uppercase font-bold"
                        >
                          Clr
                        </button>
                      </div>
                      <div className="flex-1">
                        <DrawMusic 
                          isAudioStarted={isAudioStarted} 
                          resetTrigger={resetTrigger} 
                          onAddPoint={onAddPoint}
                          onClear={onClear}
                          settings={sketchSettings}
                          onSettingsChange={setSketchSettings}
                        />
                        <PastelPop isAudioStarted={isAudioStarted} />
                      </div>
                    </div>
                  );
                }

                if (track.type === 'melodic') {
                  return (
                    <div key={track.id} className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        <div className="w-full sm:w-28 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5">
                          <span className="text-[10px] font-bold tracking-widest text-pink-200/60 uppercase">{track.name}</span>
                          <div className="flex flex-wrap justify-end gap-1">
                            <button
                              onClick={() => setTrackConfigs(prev => ({
                                ...prev,
                                [track.id]: { ...prev[track.id], steps: Array.from({ length: SCALE_NOTES.length }, () => new Array(config.subdivision).fill(false)) }
                              }))}
                              className="text-[7px] px-1.5 py-0.5 rounded-md border border-white/5 bg-zinc-800/30 text-zinc-600 hover:text-pink-400 hover:border-pink-500/30 transition-all uppercase font-bold"
                            >
                              Clr
                            </button>
                            {SUBDIVISIONS.map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => changeSubdivision(track.id, sub.id)}
                                className={`text-[8px] px-1.5 py-0.5 rounded-md border transition-all duration-200 ${
                                  config.subdivision === sub.id 
                                    ? 'bg-pink-500 text-white border-pink-400' 
                                    : 'bg-zinc-800/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                }`}
                              >
                                {sub.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="hidden sm:block flex-1"></div>
                      </div>
                      
                      <div className="space-y-1">
                        {SCALE_NOTES.map((note, noteIdx) => (
                          <div key={note.note} className="flex items-center gap-3 sm:gap-6">
                            <div className="w-8 sm:w-28 flex justify-end shrink-0">
                              <span className="text-[8px] font-mono text-zinc-600 font-bold">{note.note}</span>
                            </div>
                            <div 
                              className="grid gap-1 sm:gap-2 flex-1 touch-none"
                              style={{ 
                                touchAction: 'none',
                                gridTemplateColumns: `repeat(${config.subdivision}, minmax(0, 1fr))`
                              }}
                            >
                              {config.steps[noteIdx].map((active: boolean, i: number) => (
                                <button
                                  key={i}
                                  onPointerDown={() => handlePointerDown(track.id, i, noteIdx)}
                                  onPointerEnter={() => handlePointerEnter(track.id, i, noteIdx)}
                                  className={`
                                    h-5 sm:h-6 rounded-md transition-all duration-200 relative
                                    ${active 
                                      ? (activeStep === i ? `${track.activeColor} scale-[1.02]` : `${track.color} scale-[0.98]`) 
                                      : (activeStep === i ? 'bg-white/10 border-white/20' : 'bg-zinc-800/30 hover:bg-zinc-800/50 border border-white/5')}
                                    ${activeStep === i ? 'z-10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : ''}
                                    ${!active && activeStep !== i && ((config.subdivision === 16 && i % 4 === 0) || (config.subdivision === 12 && i % 3 === 0) || (config.subdivision === 8 && i % 2 === 0)) ? 'bg-zinc-800/60' : ''}
                                  `}
                                >
                                  {((config.subdivision === 16 && i % 4 === 0) || (config.subdivision === 12 && i % 3 === 0) || (config.subdivision === 8 && i % 2 === 0)) && !active && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-0.5 h-0.5 rounded-full bg-pink-500/10"></div>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={track.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <div className="w-full sm:w-28 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5">
                      <span className="text-[10px] font-bold tracking-widest text-pink-200/60 uppercase">{track.name}</span>
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          onClick={() => setTrackConfigs(prev => ({
                            ...prev,
                            [track.id]: { ...prev[track.id], steps: new Array(config.subdivision).fill(false) }
                          }))}
                          className="text-[7px] px-1.5 py-0.5 rounded-md border border-white/5 bg-zinc-800/30 text-zinc-600 hover:text-pink-400 hover:border-pink-500/30 transition-all uppercase font-bold"
                        >
                          Clr
                        </button>
                        {SUBDIVISIONS.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => changeSubdivision(track.id, sub.id)}
                            className={`text-[8px] px-1.5 py-0.5 rounded-md border transition-all duration-200 ${
                              config.subdivision === sub.id 
                                ? 'bg-pink-500 text-white border-pink-400' 
                                : 'bg-zinc-800/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div 
                      className="grid gap-1 sm:gap-2 flex-1 touch-none"
                      style={{ 
                        touchAction: 'none',
                        gridTemplateColumns: `repeat(${config.subdivision}, minmax(0, 1fr))`
                      }}
                    >
                      {config.steps.map((active, i) => (
                        <button
                          key={i}
                          onPointerDown={() => handlePointerDown(track.id, i)}
                          onPointerEnter={() => handlePointerEnter(track.id, i)}
                          className={`
                            aspect-square rounded-lg sm:rounded-xl transition-all duration-200 relative
                            ${active 
                              ? (activeStep === i ? `${track.activeColor} scale-[1.02]` : `${track.color} scale-[0.98]`) 
                              : (activeStep === i ? 'bg-white/10 border-white/20' : 'bg-zinc-800/50 hover:bg-zinc-800 border border-white/5')}
                            ${activeStep === i ? 'z-10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : ''}
                            ${!active && activeStep !== i && ((config.subdivision === 16 && i % 4 === 0) || (config.subdivision === 12 && i % 3 === 0) || (config.subdivision === 8 && i % 2 === 0)) ? 'bg-zinc-800/80' : ''}
                          `}
                        >
                          {((config.subdivision === 16 && i % 4 === 0) || (config.subdivision === 12 && i % 3 === 0) || (config.subdivision === 8 && i % 2 === 0)) && !active && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-1 h-1 rounded-full bg-pink-500/20"></div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Step Indicators (Master 16th Pulse) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-6 border-t border-pink-900/20">
                <div className="hidden sm:block w-28"></div>
                <div className="grid grid-cols-16 gap-1 sm:gap-2 flex-1">
                  {Array.from({ length: 16 }).map((_, i) => {
                    // 16th note is every 96 / 16 = 6 ticks
                    const isTickActive = currentTick !== -1 && Math.floor(currentTick / 6) === i;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 sm:gap-1.5">
                        <div className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full transition-all duration-300 ${isTickActive ? 'bg-pink-500 scale-125' : 'bg-zinc-800'}`}></div>
                        <span className={`text-[7px] sm:text-[8px] font-bold ${isTickActive ? 'text-pink-400' : 'text-zinc-600'}`}>{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12 opacity-40">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-pink-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-pink-500">Stereo Output</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-pink-500">Multi-Touch Grid</span>
            </div>
          </div>
        </div>
      </main>

      {/* Start Overlay */}
      {!isAudioStarted && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
          <div className="max-w-sm w-full space-y-8 text-center">
            <div className="relative mx-auto w-24 h-24">
              <div className="relative w-full h-full bg-pink-500 rounded-3xl flex items-center justify-center">
                <Music className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white tracking-tight">Pastel<span className="text-pink-400">Beats</span></h2>
              <p className="text-zinc-400 text-sm leading-relaxed">A soft, intuitive sequencer for effortless rhythm creation. Tap to begin.</p>
            </div>
            <button 
              onClick={togglePlay}
              className="w-full py-5 bg-pink-500 text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-pink-600 transition-all active:scale-95"
            >
              Start Studio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
