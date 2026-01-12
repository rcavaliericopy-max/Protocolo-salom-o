import React, { useRef, useState, useEffect } from 'react';
import { CloseIcon, PhotoIcon } from './Icons';

interface PlaylistModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialName?: string;
  initialCoverPreview?: string | null;
  onClose: () => void;
  onSave: (name: string, file: File | null) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({ 
  isOpen, mode, initialName = '', initialCoverPreview = null, onClose, onSave 
}) => {
  const [name, setName] = useState(initialName);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialCoverPreview);
  const [file, setFile] = useState<File | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(initialName);
    setCoverPreview(initialCoverPreview);
    setFile(null);
  }, [initialName, initialCoverPreview, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setFile(f);
      setCoverPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name, file);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neural-card border border-neural-accent/20 w-full max-w-sm rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{mode === 'create' ? 'Nova Playlist' : 'Editar Playlist'}</h3>
          <button onClick={onClose}><CloseIcon className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-xs text-gray-400 mb-1 uppercase">Nome da Playlist</label>
          <input 
            ref={inputRef} 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 focus:border-neural-accent" 
            placeholder="Ex: Meditação" 
          />
          
          <label className="block text-xs text-gray-400 mb-1 uppercase">Imagem de Capa (Opcional)</label>
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full h-32 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-neural-accent/30 transition-all mb-6 relative overflow-hidden group"
          >
            {coverPreview ? (
              <>
                <img src={coverPreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white">Trocar</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <PhotoIcon className="w-8 h-8 mb-2" />
                <span className="text-xs">Clique para escolher</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-neural-purple to-neural-accent text-black font-bold py-3 rounded-lg hover:brightness-110">
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
};