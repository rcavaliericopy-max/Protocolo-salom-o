import React, { useState, useEffect, useRef, useMemo } from 'react';
import { dbService } from './services/db';
import { AudioTrack, PlayableTrack, LoopMode, Folder, User } from './types';
import { 
  PlayIcon, PauseIcon, NextIcon, PrevIcon, UploadIcon, 
  TrashIcon, LoopIcon, WaveformIcon, PlaylistIcon, PlusCircleIcon, ArrowLeftIcon, FolderMoveIcon, PencilIcon, CloseIcon,
  EyeIcon, EyeSlashIcon, LogoutIcon, KeyIcon, PhotoIcon, CheckCircleIcon, CircleIcon, MagnifyingGlassIcon
} from './components/Icons';

// Helper to safely create Object URLs
const safeCreateUrl = (blob: Blob | MediaSource | null | undefined): string | undefined => {
    if (blob instanceof Blob || blob instanceof MediaSource) {
        return URL.createObjectURL(blob);
    }
    return undefined;
};

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isAdminLoginVisible, setIsAdminLoginVisible] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Auth Form Data
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authConfirmPass, setAuthConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // --- App Data State ---
  const [allTracks, setAllTracks] = useState<PlayableTrack[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [appCoverUrl, setAppCoverUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection State
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [playlistNameInput, setPlaylistNameInput] = useState('');
  const [playlistImageFile, setPlaylistImageFile] = useState<File | null>(null);
  const [playlistCoverPreview, setPlaylistCoverPreview] = useState<string | null>(null);
  
  // Player State
  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.OFF);
  
  // Playback Progress
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // UI State
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [movingTrackId, setMovingTrackId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const playlistImageInputRef = useRef<HTMLInputElement>(null);
  const appCoverInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  // --- Initialization ---

  const init = async () => {
    try {
      await dbService.init();
      await dbService.ensureAdminUser();
      
      const storedUserId = localStorage.getItem('protocolo_salomao_uid');
      if (storedUserId) {
          const user = await dbService.getUserById(storedUserId);
          if (user) setCurrentUser(user);
      }

      await loadMedia();
    } catch (err) {
      console.error("Initialization error", err);
    }
  };

  const loadMedia = async () => {
      const storedTracks = await dbService.getAllTracks();
      const storedFolders = await dbService.getAllFolders();
      
      const playableTracks: PlayableTrack[] = storedTracks.map(t => {
        const url = safeCreateUrl(t.blob);
        return url ? { ...t, url } : null;
      }).filter((t): t is PlayableTrack => t !== null);
      
      const processedFolders = storedFolders.map(f => ({
          ...f,
          coverUrl: safeCreateUrl(f.coverBlob)
      }));
      
      setAllTracks(playableTracks);
      setFolders(processedFolders);

      const coverBlob = await dbService.getSetting('appCover');
      const url = safeCreateUrl(coverBlob);
      if (url) setAppCoverUrl(url);
  };

  useEffect(() => {
    init();
    return () => {
      allTracks.forEach(track => URL.revokeObjectURL(track.url));
      folders.forEach(f => { if(f.coverUrl) URL.revokeObjectURL(f.coverUrl); });
      if(appCoverUrl) URL.revokeObjectURL(appCoverUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Reset selection when changing folders
  useEffect(() => {
      setSelectedTrackIds(new Set());
  }, [currentFolderId]);

  // --- Auth Handlers ---

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
        if (authMode === 'signup') {
            if (authPass !== authConfirmPass) {
                setAuthError('repetir a mesma senha');
                setAuthLoading(false);
                return;
            }
            if (authPass.length < 6) {
                setAuthError('A senha deve ter pelo menos 6 caracteres.');
                setAuthLoading(false);
                return;
            }
            const role = 'user';
            const newUser: User = {
                id: crypto.randomUUID(),
                email: authEmail,
                name: authName,
                password: authPass,
                role: role,
                createdAt: Date.now()
            };
            await dbService.createUser(newUser);
            loginSuccess(newUser);
        } else {
            const user = await dbService.loginUser(authEmail, authPass);
            if (user) loginSuccess(user);
        }
    } catch (err: any) {
        setAuthError(typeof err === 'string' ? err : 'Erro inesperado.');
        setAuthLoading(false);
    }
  };

  const loginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('protocolo_salomao_uid', user.id);
    setAuthLoading(false);
    setAuthEmail('');
    setAuthPass('');
    setAuthConfirmPass('');
    setAuthName('');
    setIsAdminLoginVisible(false);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('protocolo_salomao_uid');
      setIsPlaying(false);
      setQueue([]);
      setQueueIndex(-1);
  };

  const handleAdminKeyClick = () => {
      setIsAdminLoginVisible(!isAdminLoginVisible);
      setAuthMode('login');
      setAuthError('');
  };

  // --- App Logic ---
  useEffect(() => {
    if (isModalOpen && modalInputRef.current) {
        setTimeout(() => modalInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  const visibleFolders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
        return folders.filter(f => f.name.toLowerCase().includes(query));
    }
    return currentFolderId === 'root' ? folders : [];
  }, [folders, currentFolderId, searchQuery]);

  const currentViewTracks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
        return allTracks.filter(t => {
            const folder = folders.find(f => f.id === t.folderId);
            const folderName = folder ? folder.name.toLowerCase() : '';
            return t.name.toLowerCase().includes(query) || folderName.includes(query);
        });
    }
    return allTracks.filter(t => currentFolderId === 'root' ? (!t.folderId || t.folderId === 'root') : t.folderId === currentFolderId);
  }, [allTracks, currentFolderId, searchQuery, folders]);

  // --- Audio Engine Logic ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (loopMode === LoopMode.ONE) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        handleNext();
      }
    };
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [queueIndex, loopMode, queue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (queueIndex >= 0 && queue[queueIndex]) {
       const track = queue[queueIndex];
       if (audio.src !== track.url) {
         audio.src = track.url;
         audio.load();
       }
       if (isPlaying) {
         audio.play().catch(error => {
            console.warn("Playback prevented:", error);
            setIsPlaying(false);
         });
       } else {
         audio.pause();
       }
    } else if (queue.length === 0 || queueIndex === -1) {
        audio.pause();
    }
  }, [queueIndex, isPlaying, queue]);

  // --- Selection Logic ---
  
  const toggleTrackSelection = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(selectedTrackIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedTrackIds(newSet);
  };

  const playSelectedTracks = () => {
      const selected = currentViewTracks.filter(t => selectedTrackIds.has(t.id));
      if (selected.length === 0) return;
      setQueue(selected);
      setQueueIndex(0);
      setIsPlaying(true);
  };

  // --- Actions ---

  const handleAppCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAdmin) return;
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          await dbService.saveSetting('appCover', file);
          const newUrl = safeCreateUrl(file);
          if (newUrl) {
              if(appCoverUrl) URL.revokeObjectURL(appCoverUrl);
              setAppCoverUrl(newUrl);
          }
      } catch (err) {
          console.error(err);
          alert("Erro ao salvar capa do app");
      }
  };

  const openCreatePlaylistModal = () => { 
      if(!isAdmin) return; 
      setModalMode('create'); 
      setEditingFolderId(null);
      setPlaylistNameInput(''); 
      setPlaylistImageFile(null); 
      setPlaylistCoverPreview(null);
      setIsModalOpen(true); 
  };

  const openEditPlaylistModal = (folder?: Folder) => {
      if(!isAdmin) return;
      const target = folder || folders.find(f => f.id === currentFolderId);
      if (!target) return;
      
      setModalMode('edit');
      setEditingFolderId(target.id);
      setPlaylistNameInput(target.name); 
      setPlaylistImageFile(null); 
      setPlaylistCoverPreview(target.coverUrl || null);
      setIsModalOpen(true);
  };

  const handleModalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setPlaylistImageFile(file);
          setPlaylistCoverPreview(safeCreateUrl(file) || null);
      }
  };

  const handlePlaylistSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistNameInput.trim() || !isAdmin) return;
    
    const coverBlob = playlistImageFile || undefined;

    if (modalMode === 'create') {
        const newFolder: Folder = { 
            id: crypto.randomUUID(), 
            name: playlistNameInput.trim(), 
            createdAt: Date.now(),
            coverBlob: coverBlob 
        };
        try {
            await dbService.createFolder(newFolder);
            setFolders(prev => [{...newFolder, coverUrl: safeCreateUrl(coverBlob)}, ...prev]);
            setIsModalOpen(false);
        } catch (err) { console.error("Failed to create playlist", err); }
    } else {
        const targetId = editingFolderId || currentFolderId;
        const current = folders.find(f => f.id === targetId);
        if (current) {
            const finalBlob = coverBlob || current.coverBlob;
            const updated: Folder = { ...current, name: playlistNameInput.trim(), coverBlob: finalBlob };
            const { coverUrl, ...toSave } = updated;

            try {
                await dbService.updateFolder(toSave);
                setFolders(prev => prev.map(f => f.id === current.id ? {...updated, coverUrl: safeCreateUrl(finalBlob)} : f));
                setIsModalOpen(false);
            } catch (err) { console.error("Failed to update playlist", err); }
        }
    }
  };

  const deleteFolder = async (folderId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isAdmin) return;
      if (!window.confirm("Apagar esta playlist e todos os áudios dela?")) return;
      try {
          await dbService.deleteFolder(folderId);
          setFolders(prev => prev.filter(f => f.id !== folderId));
          setAllTracks(prev => {
              const tracksToDelete = prev.filter(t => t.folderId === folderId);
              tracksToDelete.forEach(t => URL.revokeObjectURL(t.url));
              return prev.filter(t => t.folderId !== folderId);
          });
          if (queueIndex >= 0 && queue[queueIndex]?.folderId === folderId) { setIsPlaying(false); setQueueIndex(-1); setQueue([]); }
          if (currentFolderId === folderId) setCurrentFolderId('root');
      } catch (err) { console.error("Failed to delete folder", err); }
  };

  const triggerUpload = () => { if(isAdmin) fileInputRef.current?.click(); };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!isAdmin) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newTracks: PlayableTrack[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/')) continue;
      const track: AudioTrack = {
        id: crypto.randomUUID(), folderId: currentFolderId, name: file.name.replace(/\.[^/.]+$/, ""), blob: file, addedAt: Date.now()
      };
      try {
        await dbService.addTrack(track);
        const url = safeCreateUrl(file);
        if(url) newTracks.push({ ...track, url });
      } catch (err) { console.error("Error saving track:", err); }
    }
    setAllTracks(prev => [...prev, ...newTracks]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!isAdmin) return;
    try {
      await dbService.deleteTrack(id);
      const trackToRemove = allTracks.find(t => t.id === id);
      if (trackToRemove) URL.revokeObjectURL(trackToRemove.url);
      setAllTracks(prev => prev.filter(t => t.id !== id));
      if (queueIndex >= 0 && queue[queueIndex]?.id === id) setIsPlaying(false);
      // Remove from selection if deleted
      if (selectedTrackIds.has(id)) {
          const newSet = new Set(selectedTrackIds);
          newSet.delete(id);
          setSelectedTrackIds(newSet);
      }
    } catch (err) { console.error("Error deleting track", err); }
  };

  const moveTrackToFolder = async (trackId: string, targetFolderId: string) => {
     if(!isAdmin) return;
     const track = allTracks.find(t => t.id === trackId);
     if (!track) return;
     const updatedTrack: AudioTrack = { ...track, folderId: targetFolderId };
     try {
         await dbService.updateTrack(updatedTrack);
         setAllTracks(prev => prev.map(t => t.id === trackId ? { ...t, folderId: targetFolderId } : t));
         setMovingTrackId(null);
     } catch (err) { console.error("Failed to move track", err); }
  };

  // ... Playback Controls ...
  const playTrack = (trackIndexInView: number) => { setQueue(currentViewTracks); setQueueIndex(trackIndexInView); setIsPlaying(true); };
  const handlePlayPause = () => {
    if (queue.length === 0 && currentViewTracks.length > 0) playTrack(0);
    else if (queue.length > 0) setIsPlaying(!isPlaying);
  };
  const handleNext = () => {
    if (queue.length === 0) return;
    if (loopMode === LoopMode.ALL || loopMode === LoopMode.OFF) {
        let nextIndex = queueIndex + 1;
        if (nextIndex >= queue.length) { if (loopMode === LoopMode.ALL) nextIndex = 0; else { setIsPlaying(false); return; } }
        setQueueIndex(nextIndex); setIsPlaying(true);
    } else if (loopMode === LoopMode.ONE) { if (audioRef.current) audioRef.current.currentTime = 0; audioRef.current?.play(); }
  };
  const handlePrev = () => {
    if (queue.length === 0) return;
    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) setQueueIndex(queue.length - 1); else setQueueIndex(prevIndex);
    setIsPlaying(true);
  };
  const toggleLoop = () => { if (loopMode === LoopMode.OFF) setLoopMode(LoopMode.ALL); else if (loopMode === LoopMode.ALL) setLoopMode(LoopMode.ONE); else setLoopMode(LoopMode.OFF); };
  
  // FIX: Robust seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };
  
  const formatTime = (time: number) => { if (isNaN(time)) return "00:00"; const minutes = Math.floor(time / 60); const seconds = Math.floor(time % 60); return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; };
  
  // --- Drag & Drop ---
  const handleDragOver = (e: React.DragEvent) => { if(!isAdmin) return; e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { if(!isAdmin) return; e.preventDefault(); setIsDragOver(false); };
  const handleDrop = async (e: React.DragEvent) => {
    if(!isAdmin) return;
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileList = e.dataTransfer.files; const newTracks: PlayableTrack[] = [];
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i]; if (!file.type.startsWith('audio/')) continue;
          const track: AudioTrack = { id: crypto.randomUUID(), folderId: currentFolderId, name: file.name.replace(/\.[^/.]+$/, ""), blob: file, addedAt: Date.now() };
          try { 
              await dbService.addTrack(track); 
              const url = safeCreateUrl(file);
              if(url) newTracks.push({ ...track, url }); 
          } catch (err) { console.error(err); }
        }
        setAllTracks(prev => [...prev, ...newTracks]);
    }
  };

  const getFolderBgImage = (folder: Folder) => {
    if (folder.coverUrl) return folder.coverUrl;
    const n = folder.name.toLowerCase();
    if (n.includes('mantras')) return 'assets/mantras.jpg';
    if (n.includes('reprogramação') || n.includes('reprogramacao')) return 'assets/reprogramacao.jpg';
    return null;
  };

  const currentTrackName = queueIndex >= 0 && queue[queueIndex] ? queue[queueIndex].name : "Protocolo Salomão";
  const currentFolderName = currentFolderId === 'root' ? 'Biblioteca Principal' : folders.find(f => f.id === currentFolderId)?.name || 'Playlist';

  if (!currentUser) {
    return (
        <div className="flex h-screen w-full bg-neural-bg items-center justify-center p-4 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neural-purple/10 via-transparent to-transparent opacity-50"></div>
             <div className="bg-neural-card border border-neural-accent/20 w-full max-w-md p-8 rounded-2xl shadow-[0_0_40px_rgba(189,0,255,0.1)] relative z-10 backdrop-blur-md">
                <div className="text-center mb-8 flex flex-col items-center">
                    <img src="assets/brain-logo.png" className="h-40 w-auto mb-4 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <h1 className="text-2xl font-bold text-white tracking-tight mb-1">{isAdminLoginVisible ? 'Área Administrativa' : 'Protocolo Salomão'}</h1>
                </div>
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authMode === 'signup' && !isAdminLoginVisible && (
                        <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white" placeholder="Seu nome" />
                    )}
                    <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white" placeholder="seu@email.com" />
                    <div className="relative">
                        <input type={showPass ? "text" : "password"} required value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white pr-10" placeholder="******" />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-500 hover:text-white">{showPass ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}</button>
                    </div>
                    {authMode === 'signup' && !isAdminLoginVisible && (
                        <input type="password" required value={authConfirmPass} onChange={e => setAuthConfirmPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white" placeholder="Confirmar Senha" />
                    )}
                    {authError && <div className="text-red-400 text-sm text-center">{authError}</div>}
                    <button type="submit" disabled={authLoading} className={`w-full bg-gradient-to-r text-black font-bold py-3.5 rounded-lg hover:brightness-110 ${isAdminLoginVisible ? 'from-amber-400 to-yellow-600' : 'from-neural-purple to-neural-accent'}`}>{authLoading ? '...' : (authMode === 'login' ? 'Entrar' : 'Cadastrar')}</button>
                </form>
                {!isAdminLoginVisible && (
                    <div className="mt-8 text-center">
                        <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} className="text-sm text-gray-400 underline decoration-neural-accent/50">{authMode === 'login' ? 'Criar conta' : 'Fazer login'}</button>
                    </div>
                )}
                <button onClick={handleAdminKeyClick} className={`absolute bottom-4 right-4 p-2 transition-all ${isAdminLoginVisible ? 'text-amber-400' : 'text-gray-800 opacity-20'}`}><KeyIcon className="w-4 h-4" /></button>
             </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-neural-bg text-gray-200 font-sans selection:bg-neural-purple selection:text-white overflow-hidden">
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neural-card border border-neural-accent/20 w-full max-w-sm rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">{modalMode === 'create' ? 'Nova Playlist' : 'Editar Playlist'}</h3>
                    <button onClick={() => setIsModalOpen(false)}><CloseIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handlePlaylistSave}>
                    <label className="block text-xs text-gray-400 mb-1 uppercase">Nome da Playlist</label>
                    <input ref={modalInputRef} type="text" value={playlistNameInput} onChange={(e) => setPlaylistNameInput(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 focus:border-neural-accent" placeholder="Ex: Meditação" />
                    
                    <label className="block text-xs text-gray-400 mb-1 uppercase">Imagem de Capa (Opcional)</label>
                    <div onClick={()=>playlistImageInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-neural-accent/30 transition-all mb-6 relative overflow-hidden group">
                        {playlistCoverPreview ? (
                            <>
                                <img src={playlistCoverPreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-xs text-white">Trocar</span></div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500"><PhotoIcon className="w-8 h-8 mb-2" /><span className="text-xs">Clique para escolher</span></div>
                        )}
                        <input type="file" ref={playlistImageInputRef} className="hidden" accept="image/*" onChange={handleModalImageSelect} />
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-neural-purple to-neural-accent text-black font-bold py-3 rounded-lg hover:brightness-110">Salvar</button>
                </form>
            </div>
        </div>
      )}

      <div className="relative flex-none h-40 sm:h-48 overflow-hidden z-10 group">
        <div className="absolute inset-0 bg-cover bg-center transition-all duration-700" style={{ backgroundImage: appCoverUrl ? `url("${appCoverUrl}")` : 'url("https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop")', filter: 'brightness(0.6) contrast(1.2)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-neural-bg/60 to-neural-bg"></div>
        {isAdmin && (
            <div className="absolute top-4 left-4 z-40">
                <button onClick={() => appCoverInputRef.current?.click()} className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/20 opacity-50 hover:opacity-100"><PhotoIcon className="w-5 h-5" /></button>
                <input type="file" ref={appCoverInputRef} className="hidden" accept="image/*" onChange={handleAppCoverUpload} />
            </div>
        )}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
             <div className="text-right hidden sm:block"><p className="text-xs text-neural-accent uppercase font-bold">{isAdmin ? 'Admin' : 'Aluno'}</p><p className="text-sm font-medium text-white">{currentUser.name}</p></div>
             <button onClick={handleLogout} className="p-2 bg-black/40 text-white hover:text-red-400 rounded-full"><LogoutIcon className="w-5 h-5" /></button>
        </div>
        <div className="relative z-20 h-full flex flex-col justify-end p-6 max-w-4xl mx-auto w-full">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white drop-shadow-lg flex items-center gap-3"><span className="w-2 h-8 bg-neural-accent rounded-sm"></span>Protocolo Salomão</h1>
        </div>
      </div>

      <main className={`flex-grow overflow-y-auto p-4 transition-colors duration-300 ${isDragOver ? 'bg-neural-accent/5 ring-2 ring-inset ring-neural-accent/30' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <div className="max-w-4xl mx-auto pb-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sticky top-0 bg-neural-bg/95 backdrop-blur-md z-30 py-4 border-b border-white/5">
             <div className="flex items-center gap-2">
                {currentFolderId !== 'root' && <button onClick={() => setCurrentFolderId('root')} className="p-2 hover:bg-white/10 rounded-full mr-1 text-neural-accent"><ArrowLeftIcon className="w-6 h-6" /></button>}
                <div className="flex items-center gap-3">
                    {currentFolderId !== 'root' && <PlaylistIcon className="w-6 h-6 text-gray-400" />}
                    <h2 className="text-xl font-bold text-white truncate max-w-[150px] sm:max-w-xs">{currentFolderName}</h2>
                    {currentFolderId !== 'root' && isAdmin && <button onClick={() => openEditPlaylistModal()} className="p-1.5 text-gray-500 hover:text-neural-accent"><PencilIcon className="w-4 h-4" /></button>}
                </div>
             </div>
             
             {/* Search Bar */}
             <div className="relative w-full md:w-64 order-last md:order-none">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Buscar áudios..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neural-card border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white focus:border-neural-accent outline-none placeholder:text-gray-600 focus:bg-white/5 transition-colors"
                />
             </div>

             {/* Action Bar */}
             <div className="flex gap-2 w-full md:w-auto">
                 {selectedTrackIds.size > 0 && (
                     <button 
                        onClick={playSelectedTracks}
                        className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-neural-accent text-black font-bold rounded-full text-sm shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:brightness-110 transition-all"
                     >
                        <PlayIcon className="w-4 h-4" />
                        <span>Tocar ({selectedTrackIds.size})</span>
                     </button>
                 )}

                 {currentFolderId === 'root' && isAdmin && <button onClick={openCreatePlaylistModal} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-neural-card border border-white/10 rounded-full text-sm text-gray-300 hover:text-white"><PlusCircleIcon className="w-5 h-5" /><span>Criar</span></button>}
                 {isAdmin && <><button onClick={triggerUpload} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-neural-accent/10 border border-neural-accent/30 rounded-full text-sm text-neural-accent"><UploadIcon className="w-4 h-4" /><span>Add</span></button><input type="file" ref={fileInputRef} className="hidden" accept="audio/*" multiple onChange={handleFileUpload} /></>}
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleFolders.map(folder => {
                const trackCount = allTracks.filter(t => t.folderId === folder.id).length;
                const folderBg = getFolderBgImage(folder);
                return (
                    <div key={folder.id} onClick={() => { setCurrentFolderId(folder.id); setSearchQuery(''); }} className="group relative overflow-hidden rounded-xl cursor-pointer bg-neural-card border border-white/5 hover:border-neural-accent/50 transition-all min-h-[140px] shadow-lg">
                        {folderBg ? <div className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-500" style={{ backgroundImage: `url("${folderBg}")` }}></div> : <div className="absolute inset-0 bg-gradient-to-br from-neural-card to-black"></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                        {isAdmin && (
                            <div className="absolute top-0 right-0 p-3 flex gap-2 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); openEditPlaylistModal(folder); }} className="p-2 bg-black/70 text-gray-200 hover:text-white rounded-full"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={(e) => deleteFolder(folder.id, e)} className="p-2 bg-black/70 text-gray-400 hover:text-red-500 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        )}
                        <div className="p-5 flex flex-col h-full justify-between relative z-10">
                            {!folderBg ? <div className="w-12 h-12 rounded-full bg-neural-purple/10 flex items-center justify-center mb-4"><PlaylistIcon className="w-6 h-6 text-neural-purple" /></div> : <div className="mb-auto"></div>}
                            <div><h3 className="font-bold text-lg text-white mb-1 drop-shadow-md">{folder.name}</h3><p className="text-xs text-gray-300 font-mono drop-shadow-sm">{trackCount} áudios</p></div>
                        </div>
                    </div>
                );
            })}

            {currentViewTracks.length === 0 && visibleFolders.length === 0 && (
              <div onClick={triggerUpload} className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:bg-white/5">
                <div className="w-16 h-16 rounded-full bg-neural-accent/5 flex items-center justify-center mb-4">
                    {searchQuery ? <MagnifyingGlassIcon className="w-8 h-8 text-neural-accent/50" /> : <UploadIcon className="w-8 h-8 text-neural-accent/50" />}
                </div>
                <p className="text-gray-300 font-medium">
                    {searchQuery ? 'Nenhum resultado encontrado' : (currentFolderId === 'root' ? 'Biblioteca vazia' : 'Playlist vazia')}
                </p>
              </div>
            )}

            {currentViewTracks.map((track, index) => {
                const isCurrentPlaying = queueIndex >= 0 && queue[queueIndex]?.id === track.id;
                const isSelected = selectedTrackIds.has(track.id);
                const trackFolder = folders.find(f => f.id === track.folderId);
                
                return (
                  <div key={track.id} className={`col-span-full group relative flex items-center gap-3 p-3 rounded-xl border transition-all ${isCurrentPlaying ? 'bg-neural-purple/10 border-neural-accent/40' : 'bg-neural-card border-transparent hover:border-white/10 hover:bg-white/5'} ${isSelected ? 'border-neural-accent/30 bg-neural-accent/5' : ''}`}>
                    
                    {/* VISIBLE Selection Checkbox */}
                    <button
                        onClick={(e) => toggleTrackSelection(track.id, e)}
                        className={`p-2 rounded-full transition-all flex-shrink-0 z-20 ${isSelected ? 'text-neural-accent' : 'text-gray-400 hover:text-white'}`}
                        title={isSelected ? "Desmarcar" : "Selecionar"}
                    >
                        {isSelected ? <CheckCircleIcon className="w-6 h-6" /> : <CircleIcon className="w-6 h-6" />}
                    </button>

                    <div className="flex-grow flex items-center gap-4 cursor-pointer min-w-0" onClick={() => playTrack(index)}>
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-black/40 border border-white/5">
                        {isCurrentPlaying && isPlaying ? <div className="flex gap-0.5 items-end h-3"><span className="w-1 bg-neural-accent animate-pulse h-full"></span><span className="w-1 bg-neural-purple animate-pulse h-2/3"></span><span className="w-1 bg-neural-accent animate-pulse h-full"></span></div> : <PlayIcon className="hidden group-hover:block w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0 flex flex-col">
                            <h3 className={`text-sm font-medium truncate ${isCurrentPlaying ? 'text-neural-accent' : 'text-gray-300'}`}>{track.name}</h3>
                            {searchQuery && trackFolder && <span className="text-[10px] text-gray-500 uppercase">{trackFolder.name}</span>}
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setMovingTrackId(movingTrackId === track.id ? null : track.id); }} className="p-2 text-gray-500 hover:text-neural-accent" title="Mover"><FolderMoveIcon className="w-4 h-4" /></button>
                                {movingTrackId === track.id && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-neural-surface border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                        <div className="p-3 text-xs font-bold text-gray-500 uppercase bg-black/20">Mover para</div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                            {currentFolderId !== 'root' && <button onClick={() => moveTrackToFolder(track.id, 'root')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white border-b border-white/5">Biblioteca Principal</button>}
                                            {folders.filter(f => f.id !== currentFolderId).map(f => <button key={f.id} onClick={() => moveTrackToFolder(track.id, f.id)} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white border-b border-white/5">{f.name}</button>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={(e) => deleteTrack(track.id, e)} className="p-2 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    )}
                  </div>
                );
            })}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 pb-8 sm:pb-4 z-50">
        <audio ref={audioRef} />
        <div className="max-w-4xl mx-auto">
            {/* NOVO SEEKBAR ROBUSTO */}
            <div className="w-full flex items-center gap-2 mb-2 select-none relative">
                <span className="text-xs font-mono text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
                <div className="relative flex-1 h-8 flex items-center group">
                    {/* Linha de fundo */}
                    <div className="absolute inset-x-0 h-1 bg-gray-800 rounded-full overflow-hidden pointer-events-none">
                        <div className="h-full bg-gradient-to-r from-neural-purple to-neural-accent transition-all duration-100 ease-linear" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                    </div>
                    {/* Input Range Real - Cobre tudo */}
                    <input
                        type="range"
                        className="seek-slider"
                        min={0}
                        max={duration || 100}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                    />
                </div>
                <span className="text-xs font-mono text-gray-400 w-10">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-between sm:justify-center gap-4">
                <div className="hidden sm:block w-1/3 truncate"><p className="text-sm font-medium text-white truncate">{currentTrackName}</p><p className="text-xs text-neural-accent truncate">Tocando Agora</p></div>
                <div className="flex items-center gap-6 justify-center w-full sm:w-auto">
                    <button onClick={toggleLoop} className={`transition-colors ${loopMode !== LoopMode.OFF ? 'text-neural-accent' : 'text-gray-600'}`}><LoopIcon className="w-5 h-5" one={loopMode === LoopMode.ONE} /></button>
                    <button onClick={handlePrev} className="text-gray-400 hover:text-white"><PrevIcon className="w-8 h-8" /></button>
                    <button onClick={handlePlayPause} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10">
                        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-1" />}
                    </button>
                    <button onClick={handleNext} className="text-gray-400 hover:text-white"><NextIcon className="w-8 h-8" /></button>
                </div>
                <div className="hidden sm:block w-1/3 text-right">
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;