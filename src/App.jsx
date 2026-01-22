import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Activity, Timer, History, AlertCircle } from 'lucide-react';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const formatTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor((ms / 1000 / 60 / 60));

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [switchCount, setSwitchCount] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [lastSummary, setLastSummary] = useState(null);
  
  const startTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const wasHiddenRef = useRef(false);

  // Handle Visibility Change
  const handleVisibilityChange = useCallback(() => {
    if (!isActive) return;

    if (document.hidden) {
      wasHiddenRef.current = true;
    } else {
      if (wasHiddenRef.current) {
        setSwitchCount(prev => prev + 1);
        playNotificationSound();
        wasHiddenRef.current = false;
      }
    }
  }, [isActive]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Timer Logic
  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now() - elapsedTime;
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      clearInterval(timerIntervalRef.current);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [isActive]);

  const handleStart = () => {
    setIsActive(true);
    setElapsedTime(0);
    setSwitchCount(0);
    setLastSummary(null);
    wasHiddenRef.current = false;
  };

  const handleStop = () => {
    setIsActive(false);
    const summary = {
      duration: elapsedTime,
      switches: switchCount,
      timestamp: new Date().toISOString()
    };
    setLastSummary(summary);
    setSessionHistory(prev => [summary, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background text-gray-200 flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-black">
      
      {/* Main Container */}
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-surface rounded-2xl ring-1 ring-white/10 shadow-xl mb-4">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Context Switch Tracker
          </h1>
          <p className="text-gray-400 text-sm">
            Monitor your focus. Measure the cost of distraction.
          </p>
        </div>

        {/* Timer Display */}
        <div className="relative group">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 ${isActive ? 'opacity-40 animate-pulse-slow' : ''}`}></div>
          <div className="relative bg-surface border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
            <span className="text-xs font-medium uppercase tracking-widest text-gray-500">Session Duration</span>
            <div className="text-6xl font-mono font-medium tracking-tighter text-white tabular-nums">
              {formatTime(elapsedTime)}
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              <AlertCircle className="w-4 h-4 text-secondary" />
              <span>Context Switches: <strong className="text-white ml-1">{switchCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          {!isActive ? (
            <button
              onClick={handleStart}
              className="col-span-2 group relative flex items-center justify-center space-x-2 w-full py-4 bg-primary hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Session</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="col-span-2 group relative flex items-center justify-center space-x-2 w-full py-4 bg-surface hover:bg-white/10 text-secondary font-semibold rounded-xl border border-secondary/20 hover:border-secondary/50 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-secondary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Session</span>
            </button>
          )}
        </div>

        {/* Summary Card (Visible after stop) */}
        {lastSummary && !isActive && (
          <div className="bg-surface/50 border border-white/5 rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <History className="w-5 h-5 text-accent" />
              Session Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Total Time</div>
                <div className="text-xl font-mono text-white">{formatTime(lastSummary.duration)}</div>
              </div>
              <div className="bg-background/50 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Switches</div>
                <div className="text-xl font-mono text-secondary">{lastSummary.switches}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center pt-2">
              {lastSummary.switches === 0 
                ? "Perfect focus! No interruptions detected." 
                : "Try to minimize tab switching next time."}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}