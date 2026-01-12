import React, { useState, useEffect, useRef, useMemo } from 'react';
import { dbService, generateUUID } from './services/db';
import { AudioTrack, PlayableTrack, LoopMode, Folder, User } from './types';

// Importing new components
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { FolderGrid } from './components/FolderGrid';
import { TrackList } from './components/TrackList';
import { PlayerBar } from './components/PlayerBar';
import { PlaylistModal } from './components/PlaylistModal';
import { MagnifyingGlassIcon, UploadIcon, WaveformIcon } from './components/Icons'; 

const safeCreateUrl = (blob: Blob | MediaSource | null | undefined): string | undefined => {
    if (blob instanceof Blob || blob instanceof MediaSource) {
        return URL.createObjectURL(blob);
    }
    return undefined;
};

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- App Data State ---
  const [isInitializing, setIsInitializing] = useState(true); // Loading state
  const [loadingMessage, setLoadingMessage] = useState('Iniciando sistema...');
  const [allTracks, setAllTracks] = useState<PlayableTrack[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [appCoverUrl, setAppCoverUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  // --- UI State (Modals) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [playlistNameInput, setPlaylistNameInput] = useState('');
  const [playlistCoverPreview, setPlaylistCoverPreview] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  
  // --- Player State ---
  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.OFF);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // --- Drag & Drop State ---
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const isAdmin = currentUser?.role === 'admin';

  // --- Initialization ---
  const init = async () => {
    setIsInitializing(true);
    setLoadingMessage('Carregando biblioteca...');
    try {
      await dbService.init();
      await dbService.ensureAdminUser();
      
      const storedUserId = localStorage.getItem('protocolo_salomao_uid') || sessionStorage.getItem('protocolo_salomao_uid');
      
      if (storedUserId) {
          const user = await dbService.getUserById(storedUserId);
          if (user) setCurrentUser(user);
      }

      await loadMedia();
    } catch (err) {
      console.error("Initialization error", err);
    } finally {
      setIsInitializing(false);
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

  useEffect(() => { setSelectedTrackIds(new Set()); }, [currentFolderId]);

  // --- Repair Function ---
  const handleRepairLibrary = async () => {
      if(!window.confirm("Isso irá baixar todos os áudios novamente. Requer conexão com a internet. Deseja continuar?")) return;
      
      setIsRepairing(true);
      setLoadingMessage('Baixando áudios do servidor... Isso pode levar alguns minutos no iPhone.');
      try {
          await dbService.resetLibrary();
          alert("Biblioteca atualizada com sucesso! O app será recarregado.");
          window.location.reload();
      } catch (err) {
          alert("Erro ao reparar biblioteca: " + err);
          setIsRepairing(false);
      }
  };

  // --- Auth Handlers ---
  const handleLoginSuccess = (user: User, rememberMe: boolean) => {
    setCurrentUser(user);
    if (rememberMe) {
        localStorage.setItem('protocolo_salomao_uid', user.id);
        sessionStorage.removeItem('protocolo_salomao_uid');
    } else {
        sessionStorage.setItem('protocolo_salomao_uid', user.id);
        localStorage.removeItem('protocolo_salomao_uid');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('protocolo_salomao_uid');
    sessionStorage.removeItem('protocolo_salomao_uid');
    setIsPlaying(false);
    setQueue([]);
    setQueueIndex(-1);
  };

  // --- Data Logic (Memoized) ---
  const visibleFolders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query) return folders.filter(f => f.name.toLowerCase().includes(query));
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

  // --- Audio Engine ---
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
         audio.play().catch(error => { console.warn("Playback prevented:", error); setIsPlaying(false); });
       } else {
         audio.pause();
       }
    } else if (queue.length === 0 || queueIndex === -1) {
        audio.pause();
    }
  }, [queueIndex, isPlaying, queue]);

  // --- Player Actions ---
  const playTrack = (trackIndexInView: number) => { 
    setQueue(currentViewTracks); 
    setQueueIndex(trackIndexInView); 
    setIsPlaying(true); 
  };
  
  const playSelectedTracks = () => {
    const selected = currentViewTracks.filter(t => selectedTrackIds.has(t.id));
    if (selected.length === 0) return;
    setQueue(selected);
    setQueueIndex(0);
    setIsPlaying(true);
  };

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

  const handleSeek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const toggleTrackSelection = (id: string) => {
    const newSet = new Set(selectedTrackIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedTrackIds(newSet);
  };

  // --- File Actions ---
  const handleAppCoverUpload = async (file: File) => {
    if (!isAdmin) return;
    try {
        await dbService.saveSetting('appCover', file);
        const newUrl = safeCreateUrl(file);
        if (newUrl) {
            if(appCoverUrl) URL.revokeObjectURL(appCoverUrl);
            setAppCoverUrl(newUrl);
        }
    } catch (err) { console.error("Erro capa app", err); }
  };

  const handleFileUpload = async (files: FileList) => {
    if(!isAdmin) return;
    const newTracks: PlayableTrack[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/')) continue;
      const track: AudioTrack = {
        id: generateUUID(), folderId: currentFolderId, name: file.name.replace(/\.[^/.]+$/, ""), blob: file, addedAt: Date.now()
      };
      try {
        await dbService.addTrack(track);
        const url = safeCreateUrl(file);
        if(url) newTracks.push({ ...track, url });
      } catch (err) { console.error("Error saving track:", err); }
    }
    setAllTracks(prev => [...prev, ...newTracks]);
  };

  const handleFolderAction = {
    create: () => {
        setModalMode('create');
        setEditingFolderId(null);
        setPlaylistNameInput('');
        setPlaylistCoverPreview(null);
        setIsModalOpen(true);
    },
    edit: (folder?: Folder) => {
        const target = folder || folders.find(f => f.id === currentFolderId);
        if (!target) return;
        setModalMode('edit');
        setEditingFolderId(target.id);
        setPlaylistNameInput(target.name);
        setPlaylistCoverPreview(target.coverUrl || null);
        setIsModalOpen(true);
    },
    save: async (name: string, file: File | null) => {
        if (!name.trim() || !isAdmin) return;
        const coverBlob = file || undefined;

        if (modalMode === 'create') {
            const newFolder: Folder = { id: generateUUID(), name: name.trim(), createdAt: Date.now(), coverBlob: coverBlob };
            try {
                await dbService.createFolder(newFolder);
                setFolders(prev => [{...newFolder, coverUrl: safeCreateUrl(coverBlob)}, ...prev]);
                setIsModalOpen(false);
            } catch (err) { console.error(err); }
        } else {
            const targetId = editingFolderId || currentFolderId;
            const current = folders.find(f => f.id === targetId);
            if (current) {
                const finalBlob = coverBlob || current.coverBlob;
                const updated: Folder = { ...current, name: name.trim(), coverBlob: finalBlob };
                const { coverUrl, ...toSave } = updated;
                try {
                    await dbService.updateFolder(toSave);
                    setFolders(prev => prev.map(f => f.id === current.id ? {...updated, coverUrl: safeCreateUrl(finalBlob)} : f));
                    setIsModalOpen(false);
                } catch (err) { console.error(err); }
            }
        }
    },
    delete: async (folderId: string) => {
        if (!isAdmin || !window.confirm("Apagar esta playlist e todos os áudios dela?")) return;
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
        } catch (err) { console.error(err); }
    }
  };

  const handleTrackAction = {
      delete: async (id: string) => {
          if(!isAdmin) return;
          try {
              await dbService.deleteTrack(id);
              const trackToRemove = allTracks.find(t => t.id === id);
              if (trackToRemove) URL.revokeObjectURL(trackToRemove.url);
              setAllTracks(prev => prev.filter(t => t.id !== id));
              if (queueIndex >= 0 && queue[queueIndex]?.id === id) setIsPlaying(false);
              if (selectedTrackIds.has(id)) {
                  const newSet = new Set(selectedTrackIds);
                  newSet.delete(id);
                  setSelectedTrackIds(newSet);
              }
          } catch (err) { console.error(err); }
      },
      move: async (trackId: string, targetFolderId: string) => {
          if(!isAdmin) return;
          const track = allTracks.find(t => t.id === trackId);
          if (!track) return;
          const updatedTrack: AudioTrack = { ...track, folderId: targetFolderId };
          try {
              await dbService.updateTrack(updatedTrack);
              setAllTracks(prev => prev.map(t => t.id === trackId ? { ...t, folderId: targetFolderId } : t));
          } catch (err) { console.error(err); }
      }
  };

  // --- Drag & Drop ---
  const handleDragOver = (e: React.DragEvent) => { if(!isAdmin) return; e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { if(!isAdmin) return; e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
      if(!isAdmin) return;
      e.preventDefault(); setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileUpload(e.dataTransfer.files);
      }
  };

  const currentTrackName = queueIndex >= 0 && queue[queueIndex] ? queue[queueIndex].name : "Protocolo Salomão";
  const currentFolderName = currentFolderId === 'root' ? 'Biblioteca Principal' : folders.find(f => f.id === currentFolderId)?.name || 'Playlist';

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Se estiver carregando, mostra o spinner
  if (isInitializing || isRepairing) {
      return (
          <div className="flex h-screen w-full bg-neural-bg items-center justify-center flex-col gap-4 p-8 text-center">
              <div className="w-12 h-12 border-4 border-neural-purple border-t-neural-accent rounded-full animate-spin"></div>
              <p className="text-gray-400 font-medium animate-pulse">{loadingMessage}</p>
              {isRepairing && <p className="text-xs text-gray-500 max-w-xs mt-2">Mantenha o app aberto. Isso pode levar alguns minutos se a conexão estiver lenta.</p>}
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-neural-bg text-gray-200 font-sans selection:bg-neural-purple selection:text-white overflow-hidden">
      
      <PlaylistModal 
        isOpen={isModalOpen} 
        mode={modalMode} 
        initialName={playlistNameInput}
        initialCoverPreview={playlistCoverPreview}
        onClose={() => setIsModalOpen(false)}
        onSave={handleFolderAction.save}
      />

      <Header 
        user={currentUser} 
        appCoverUrl={appCoverUrl} 
        isAdmin={isAdmin} 
        onLogout={handleLogout} 
        onCoverUpload={handleAppCoverUpload} 
      />

      <main 
        className={`flex-grow overflow-y-auto p-4 transition-colors duration-300 ${isDragOver ? 'bg-neural-accent/5 ring-2 ring-inset ring-neural-accent/30' : ''}`} 
        onDragOver={handleDragOver} 
        onDragLeave={handleDragLeave} 
        onDrop={handleDrop}
      >
        <div className="max-w-4xl mx-auto pb-40">
          <Toolbar 
            currentFolderName={currentFolderName}
            isRoot={currentFolderId === 'root'}
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            selectionCount={selectedTrackIds.size}
            onSearchChange={setSearchQuery}
            onBack={() => setCurrentFolderId('root')}
            onEditPlaylist={() => handleFolderAction.edit()}
            onPlaySelected={playSelectedTracks}
            onCreatePlaylist={handleFolderAction.create}
            onUpload={handleFileUpload}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FolderGrid 
              folders={visibleFolders}
              allTracks={allTracks}
              isAdmin={isAdmin}
              onFolderClick={(id) => { setCurrentFolderId(id); setSearchQuery(''); }}
              onEditFolder={handleFolderAction.edit}
              onDeleteFolder={handleFolderAction.delete}
            />

            {currentViewTracks.length === 0 && visibleFolders.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-center p-6">
                <div className="w-16 h-16 rounded-full bg-neural-accent/5 flex items-center justify-center mb-4">
                    {searchQuery ? <MagnifyingGlassIcon className="w-8 h-8 text-neural-accent/50" /> : <WaveformIcon className="w-8 h-8 text-neural-accent/50" />}
                </div>
                <p className="text-gray-300 font-medium mb-2">
                    {searchQuery ? 'Nenhum resultado encontrado' : (currentFolderId === 'root' ? 'Biblioteca vazia' : 'Playlist vazia')}
                </p>
                
                {/* Botão de Reparo de Emergência para iOS/Bugs */}
                {currentFolderId === 'root' && !searchQuery && (
                  <button 
                    onClick={handleRepairLibrary}
                    className="mt-4 px-6 py-2 bg-neural-surface border border-neural-accent/30 text-neural-accent rounded-lg text-sm hover:bg-neural-accent hover:text-black transition-colors"
                  >
                    Reparar Biblioteca / Baixar Áudios
                  </button>
                )}
              </div>
            )}

            <TrackList 
              tracks={currentViewTracks}
              folders={folders}
              currentFolderId={currentFolderId}
              playingTrackId={queueIndex >= 0 && queue[queueIndex] ? queue[queueIndex].id : undefined}
              isPlaying={isPlaying}
              selectedTrackIds={selectedTrackIds}
              isAdmin={isAdmin}
              searchQuery={searchQuery}
              onTrackPlay={playTrack}
              onToggleSelect={toggleTrackSelection}
              onDelete={handleTrackAction.delete}
              onMove={handleTrackAction.move}
            />
          </div>
        </div>
      </main>

      <PlayerBar 
        currentTrackName={currentTrackName}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        loopMode={loopMode}
        audioRef={audioRef}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onToggleLoop={() => setLoopMode(prev => prev === LoopMode.OFF ? LoopMode.ALL : prev === LoopMode.ALL ? LoopMode.ONE : LoopMode.OFF)}
        onSeek={handleSeek}
      />
    </div>
  );
};

export default App;