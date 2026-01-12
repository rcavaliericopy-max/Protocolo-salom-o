export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  coverBlob?: Blob; // Imagem salva no banco
  coverUrl?: string; // URL temporária para exibição
}

export interface AudioTrack {
  id: string;
  folderId: string; // 'root' or specific folder UUID
  name: string;
  blob: Blob;
  addedAt: number;
  duration?: number;
}

// Helper type for the track with the object URL created for playback
export interface PlayableTrack extends AudioTrack {
  url: string;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  createdAt: number;
}

export enum LoopMode {
  OFF = 'OFF',
  ALL = 'ALL',
  ONE = 'ONE'
}