import React, { useState } from 'react';
import { PlayableTrack, Folder } from '../types';
import { CheckCircleIcon, CircleIcon, FolderMoveIcon, PlayIcon, TrashIcon } from './Icons';

interface TrackListProps {
  tracks: PlayableTrack[];
  folders: Folder[];
  currentFolderId: string;
  playingTrackId?: string;
  isPlaying: boolean;
  selectedTrackIds: Set<string>;
  isAdmin: boolean;
  searchQuery: string;
  onTrackPlay: (index: number) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (trackId: string, targetFolderId: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks, folders, currentFolderId, playingTrackId, isPlaying, selectedTrackIds, isAdmin, searchQuery,
  onTrackPlay, onToggleSelect, onDelete, onMove
}) => {
  const [movingTrackId, setMovingTrackId] = useState<string | null>(null);

  return (
    <>
      {tracks.map((track, index) => {
        const isCurrentPlaying = playingTrackId === track.id;
        const isSelected = selectedTrackIds.has(track.id);
        const trackFolder = folders.find(f => f.id === track.folderId);
        
        return (
          <div 
            key={track.id} 
            className={`col-span-full group relative flex items-center gap-3 p-3 rounded-xl border transition-all ${isCurrentPlaying ? 'bg-neural-purple/10 border-neural-accent/40' : 'bg-neural-card border-transparent hover:border-white/10 hover:bg-white/5'} ${isSelected ? 'border-neural-accent/30 bg-neural-accent/5' : ''}`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(track.id); }}
              className={`p-2 rounded-full transition-all flex-shrink-0 z-20 ${isSelected ? 'text-neural-accent' : 'text-gray-400 hover:text-white'}`}
              title={isSelected ? "Desmarcar" : "Selecionar"}
            >
              {isSelected ? <CheckCircleIcon className="w-6 h-6" /> : <CircleIcon className="w-6 h-6" />}
            </button>

            <div className="flex-grow flex items-center gap-4 cursor-pointer min-w-0" onClick={() => onTrackPlay(index)}>
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-black/40 border border-white/5">
                {isCurrentPlaying && isPlaying ? (
                  <div className="flex gap-0.5 items-end h-3">
                    <span className="w-1 bg-neural-accent animate-pulse h-full"></span>
                    <span className="w-1 bg-neural-purple animate-pulse h-2/3"></span>
                    <span className="w-1 bg-neural-accent animate-pulse h-full"></span>
                  </div>
                ) : (
                  <PlayIcon className="hidden group-hover:block w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0 flex flex-col">
                <h3 className={`text-sm font-medium truncate ${isCurrentPlaying ? 'text-neural-accent' : 'text-gray-300'}`}>{track.name}</h3>
                {searchQuery && trackFolder && <span className="text-[10px] text-gray-500 uppercase">{trackFolder.name}</span>}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMovingTrackId(movingTrackId === track.id ? null : track.id); }} 
                    className="p-2 text-gray-500 hover:text-neural-accent" 
                    title="Mover"
                  >
                    <FolderMoveIcon className="w-4 h-4" />
                  </button>
                  {movingTrackId === track.id && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-neural-surface border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="p-3 text-xs font-bold text-gray-500 uppercase bg-black/20">Mover para</div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {currentFolderId !== 'root' && (
                          <button 
                            onClick={() => { onMove(track.id, 'root'); setMovingTrackId(null); }} 
                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white border-b border-white/5"
                          >
                            Biblioteca Principal
                          </button>
                        )}
                        {folders.filter(f => f.id !== currentFolderId).map(f => (
                          <button 
                            key={f.id} 
                            onClick={() => { onMove(track.id, f.id); setMovingTrackId(null); }} 
                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white border-b border-white/5"
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(track.id); }} className="p-2 text-gray-500 hover:text-red-500">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};