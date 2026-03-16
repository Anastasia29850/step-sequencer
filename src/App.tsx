/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Volume2, Zap, Music, Activity, Layers, Sparkles } from 'lucide-react';

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
  { id: 'violin', name: 'VIOLIN', color: 'bg-amber-400', activeColor: 'bg-amber-300', type: 'melodic' },
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
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.6);
  }

  playViolin(time: number, freq: number = 440) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Simple vibrato
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = 5.5;
    vibratoGain.gain.value = freq * 0.008;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(time);
    vibrato.stop(time + 1.2);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 1.2);
  }

  playTrack(trackId: string, time: number, freq?: number) {
    switch (trackId) {
      case 'kick': this.playKick(time); break;
      case 'snare': this.playSnare(time); break;
      case 'hihat': this.playHihat(time); break;
      case 'clap': this.playClap(time); break;
      case 'piano': this.playPiano(time, freq); break;
      case 'violin': this.playViolin(time, freq); break;
    }
  }
}

const audioEngine = new AudioEngine();

export default function App() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(-1);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  
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

  // Scheduler Refs
  const nextNoteTime = useRef(0);
  const currentTickRef = useRef(0);
  const timerID = useRef<number | null>(null);
  const trackConfigsRef = useRef(trackConfigs);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    trackConfigsRef.current = trackConfigs;
  }, [trackConfigs]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const scheduleNote = (tick: number, time: number) => {
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
                const ticksPerStep = TICKS_PER_BAR / config.subdivision;
                const activeStep = currentTick !== -1 && currentTick % ticksPerStep === 0 
                  ? currentTick / ticksPerStep 
                  : -1;

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
