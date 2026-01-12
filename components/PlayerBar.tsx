import React from 'react';
import { LoopIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from './Icons';
import { LoopMode } from '../types';

interface PlayerBarProps {
  currentTrackName: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loopMode: LoopMode;
  audioRef: React.RefObject<HTMLAudioElement | null>; // Changed to match React 19 types
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLoop: () => void;
  onSeek: (time: number) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrackName, isPlaying, currentTime, duration, loopMode, audioRef,
  onPlayPause, onNext, onPrev, onToggleLoop, onSeek
}) => {
  
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 pb-8 sm:pb-4 z-50">
      <audio ref={audioRef} />
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex items-center gap-2 mb-2 select-none relative">
          <span className="text-xs font-mono text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-8 flex items-center group">
            <div className="absolute inset-x-0 h-1 bg-gray-800 rounded-full overflow-hidden pointer-events-none">
              <div 
                className="h-full bg-gradient-to-r from-neural-purple to-neural-accent transition-all duration-100 ease-linear" 
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
            <input
              type="range"
              className="seek-slider"
              min={0}
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
            />
          </div>
          <span className="text-xs font-mono text-gray-400 w-10">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-center gap-4">
          <div className="hidden sm:block w-1/3 truncate">
            <p className="text-sm font-medium text-white truncate">{currentTrackName}</p>
            <p className="text-xs text-neural-accent truncate">Tocando Agora</p>
          </div>
          <div className="flex items-center gap-6 justify-center w-full sm:w-auto">
            <button onClick={onToggleLoop} className={`transition-colors ${loopMode !== LoopMode.OFF ? 'text-neural-accent' : 'text-gray-600'}`}>
              <LoopIcon className="w-5 h-5" one={loopMode === LoopMode.ONE} />
            </button>
            <button onClick={onPrev} className="text-gray-400 hover:text-white">
              <PrevIcon className="w-8 h-8" />
            </button>
            <button 
              onClick={onPlayPause} 
              className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-1" />}
            </button>
            <button onClick={onNext} className="text-gray-400 hover:text-white">
              <NextIcon className="w-8 h-8" />
            </button>
          </div>
          <div className="hidden sm:block w-1/3 text-right"></div>
        </div>
      </div>
    </footer>
  );
};