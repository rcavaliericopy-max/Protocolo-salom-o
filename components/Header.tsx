import React, { useRef } from 'react';
import { LogoutIcon, PhotoIcon } from './Icons';
import { User } from '../types';

interface HeaderProps {
  user: User;
  appCoverUrl: string | null;
  isAdmin: boolean;
  onLogout: () => void;
  onCoverUpload: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, appCoverUrl, isAdmin, onLogout, onCoverUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onCoverUpload(e.target.files[0]);
    }
  };

  return (
    <div className="relative flex-none h-40 sm:h-48 overflow-hidden z-10 group">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700" 
        style={{ 
          // Ajuste para iOS: caminho relativo sem barra inicial
          backgroundImage: appCoverUrl ? `url("${appCoverUrl}")` : 'url("imagens/capa.jpg")', 
          filter: 'brightness(0.6) contrast(1.2)',
          // Fix para iOS rendering bugs em backgrounds complexos
          transform: 'translateZ(0)'
        }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-neural-bg/60 to-neural-bg"></div>
      
      {isAdmin && (
        <div className="absolute top-4 left-4 z-40">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/20 opacity-50 hover:opacity-100 transition-opacity"
            title="Alterar capa do app"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>
      )}

      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-neural-accent uppercase font-bold tracking-wider">{isAdmin ? 'Admin' : 'Aluno'}</p>
          <p className="text-sm font-medium text-white">{user.name}</p>
        </div>
        <button onClick={onLogout} className="p-2 bg-black/40 text-white hover:text-red-400 hover:bg-black/60 rounded-full transition-colors border border-white/5">
          <LogoutIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="relative z-20 h-full flex flex-col justify-end p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white drop-shadow-lg flex items-center gap-3">
          <span className="w-2 h-8 bg-neural-accent rounded-sm shadow-[0_0_15px_#FFD700]"></span>
          Protocolo Salomão
        </h1>
      </div>
    </div>
  );
};