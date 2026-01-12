import React from 'react';
import { Folder, PlayableTrack } from '../types';
import { PencilIcon, PlaylistIcon, TrashIcon } from './Icons';

interface FolderGridProps {
  folders: Folder[];
  allTracks: PlayableTrack[]; // Needed to count tracks per folder
  isAdmin: boolean;
  onFolderClick: (id: string) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (id: string) => void;
}

export const FolderGrid: React.FC<FolderGridProps> = ({ 
  folders, allTracks, isAdmin, onFolderClick, onEditFolder, onDeleteFolder 
}) => {
  
  const getFolderBgImage = (folder: Folder) => {
    // 1. Se o usuário definiu uma capa manual (via Blob no banco), usa ela.
    if (folder.coverUrl) return folder.coverUrl;

    // 2. Caso contrário, usa as imagens padrão baseadas no nome da pasta
    const n = folder.name.toLowerCase();
    
    // Configuração das imagens conforme solicitado - Ajustado para caminhos relativos (sem / inicial)
    if (n.includes('mantras')) {
        return 'imagens/mantra.jpg';
    }
    if (n.includes('reprogramação') || n.includes('reprogramacao')) {
        return 'imagens/capa.jpg';
    }
    
    return null;
  };

  return (
    <>
      {folders.map(folder => {
        const trackCount = allTracks.filter(t => t.folderId === folder.id).length;
        const folderBg = getFolderBgImage(folder);
        
        return (
          <div key={folder.id} onClick={() => onFolderClick(folder.id)} className="group relative overflow-hidden rounded-xl cursor-pointer bg-neural-card border border-white/5 hover:border-neural-accent/50 transition-all min-h-[140px] shadow-lg">
            {folderBg ? (
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-500" 
                style={{ 
                    backgroundImage: `url("${folderBg}")`,
                    // Truque mágico para iOS: força a GPU a renderizar o background dentro do overflow:hidden
                    transform: 'translateZ(0)' 
                }} 
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neural-card to-black"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            
            {isAdmin && (
              <div className="absolute top-0 right-0 p-3 flex gap-2 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditFolder(folder); }} 
                  className="p-2 bg-black/70 text-gray-200 hover:text-white rounded-full border border-white/10"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} 
                  className="p-2 bg-black/70 text-gray-400 hover:text-red-500 rounded-full border border-white/10"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="p-5 flex flex-col h-full justify-between relative z-10">
              {!folderBg ? (
                <div className="w-12 h-12 rounded-full bg-neural-purple/10 flex items-center justify-center mb-4 border border-neural-purple/20">
                  <PlaylistIcon className="w-6 h-6 text-neural-purple" />
                </div>
              ) : (
                <div className="mb-auto"></div>
              )}
              <div>
                <h3 className="font-bold text-lg text-white mb-1 drop-shadow-md">{folder.name}</h3>
                <p className="text-xs text-gray-300 font-mono drop-shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neural-accent inline-block"></span>
                    {trackCount} áudios
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};