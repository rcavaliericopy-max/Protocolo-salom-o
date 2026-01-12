import React, { useRef } from 'react';
import { ArrowLeftIcon, MagnifyingGlassIcon, PencilIcon, PlayIcon, PlaylistIcon, PlusCircleIcon, UploadIcon } from './Icons';

interface ToolbarProps {
  currentFolderName: string;
  isRoot: boolean;
  isAdmin: boolean;
  searchQuery: string;
  selectionCount: number;
  onSearchChange: (val: string) => void;
  onBack: () => void;
  onEditPlaylist: () => void;
  onPlaySelected: () => void;
  onCreatePlaylist: () => void;
  onUpload: (files: FileList) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentFolderName, isRoot, isAdmin, searchQuery, selectionCount,
  onSearchChange, onBack, onEditPlaylist, onPlaySelected, onCreatePlaylist, onUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
    e.target.value = ''; // Reset
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sticky top-0 bg-neural-bg/95 backdrop-blur-md z-30 py-4 border-b border-white/5">
      <div className="flex items-center gap-2">
        {!isRoot && (
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-1 text-neural-accent">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        )}
        <div className="flex items-center gap-3">
          {!isRoot && <PlaylistIcon className="w-6 h-6 text-gray-400" />}
          <h2 className="text-xl font-bold text-white truncate max-w-[150px] sm:max-w-xs">{currentFolderName}</h2>
          {!isRoot && isAdmin && (
            <button onClick={onEditPlaylist} className="p-1.5 text-gray-500 hover:text-neural-accent">
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative w-full md:w-64 order-last md:order-none">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          type="text" 
          placeholder="Buscar áudios..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-neural-card border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white focus:border-neural-accent outline-none placeholder:text-gray-600 focus:bg-white/5 transition-colors"
        />
      </div>

      {/* Action Bar */}
      <div className="flex gap-2 w-full md:w-auto">
        {selectionCount > 0 && (
          <button 
            onClick={onPlaySelected}
            className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-neural-accent text-black font-bold rounded-full text-sm shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:brightness-110 transition-all"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Tocar ({selectionCount})</span>
          </button>
        )}

        {isRoot && isAdmin && (
          <button onClick={onCreatePlaylist} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-neural-card border border-white/10 rounded-full text-sm text-gray-300 hover:text-white">
            <PlusCircleIcon className="w-5 h-5" /><span>Criar</span>
          </button>
        )}
        
        {isAdmin && (
          <>
            <button onClick={handleUploadClick} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-neural-accent/10 border border-neural-accent/30 rounded-full text-sm text-neural-accent">
              <UploadIcon className="w-4 h-4" /><span>Add</span>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" multiple onChange={handleFileChange} />
          </>
        )}
      </div>
    </div>
  );
};