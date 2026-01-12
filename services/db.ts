import { AudioTrack, Folder, User } from '../types';
import { INITIAL_LIBRARY } from '../config/library';

const DB_NAME = 'NeuroFocusDB';
const DB_VERSION = 21; 
const TRACKS_STORE = 'tracks';
const FOLDERS_STORE = 'folders';
const USERS_STORE = 'users'; 
const SETTINGS_STORE = 'settings';

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject("Falha ao abrir banco de dados local.");
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        
        this.db.onclose = () => {
            console.warn("Database connection closed unexpectedly.");
            this.db = null;
        };

        try {
            // Seed check simplificado para não bloquear inicialização
            const trackStore = this.db.transaction([TRACKS_STORE], 'readonly').objectStore(TRACKS_STORE);
            const countRequest = trackStore.count();
            
            countRequest.onsuccess = () => {
                if (countRequest.result === 0) {
                    // Executa seed em background, não espera para resolver o init
                    this.seedDefaultFolders().then(() => this.seedInitialTracks()).catch(console.error);
                }
            };
        } catch (e) {
            console.warn("Seed check skipped:", e);
        }
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          const trackStore = db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          trackStore.createIndex('folderId', 'folderId', { unique: false });
        }
        if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
          db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(USERS_STORE)) {
           const userStore = db.createObjectStore(USERS_STORE, { keyPath: 'id' });
           userStore.createIndex('email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE); 
        }
      };
    });
  }

  async resetLibrary(): Promise<void> {
      if (!this.db) await this.init();
      const transaction = this.db!.transaction([TRACKS_STORE, FOLDERS_STORE], 'readwrite');
      transaction.objectStore(TRACKS_STORE).clear();
      transaction.objectStore(FOLDERS_STORE).clear();
      
      return new Promise((resolve, reject) => {
          transaction.oncomplete = async () => {
              try {
                  await this.seedDefaultFolders();
                  await this.seedInitialTracks();
                  resolve();
              } catch (e) { reject(e); }
          };
          transaction.onerror = () => reject("Falha ao limpar banco de dados");
      });
  }

  private async seedDefaultFolders(): Promise<void> {
      // Implementação simplificada para evitar bloqueios
      try {
        const existingFolders = await this.getAllFolders();
        for (const group of INITIAL_LIBRARY) {
            if (!existingFolders.some(f => f.name.toLowerCase() === group.folderName.toLowerCase())) {
                const newFolder: Folder = { id: generateUUID(), name: group.folderName, createdAt: Date.now() };
                await this.createFolder(newFolder);
            }
        }
      } catch (e) { console.error("Error seeding folders", e); }
  }

  private async seedInitialTracks(): Promise<void> {
      // ... (Mantém lógica, mas garante que erros não matem a aplicação inteira)
      try {
        const allTracks = await this.getAllTracks();
        const folders = await this.getAllFolders();
        for (const group of INITIAL_LIBRARY) {
            const targetFolder = folders.find(f => f.name.toLowerCase() === group.folderName.toLowerCase());
            if (!targetFolder) continue;
            for (const trackData of group.tracks) {
                if (allTracks.find(t => t.name === trackData.name)) continue;
                try {
                    const encodedFilename = trackData.filename.split('/').map(encodeURIComponent).join('/');
                    const response = await fetch(`audio/${encodedFilename}`);
                    if (!response.ok) continue;
                    const blob = await response.blob();
                    if (blob.size < 500 || blob.type.includes('html')) continue;
                    await this.addTrack({ id: generateUUID(), folderId: targetFolder.id, name: trackData.name, blob: blob, addedAt: Date.now() });
                } catch (err) { console.error(`Failed to load ${trackData.name}`, err); }
            }
        }
      } catch (e) { console.error("Seed tracks error", e); }
  }

  // --- Users Methods (Reforçados) ---

  async ensureAdminUser(): Promise<void> {
      try {
        if (!this.db) await this.init();
        const adminEmail = "rcavaliericopy@gmail.com";
        // Usa try/catch para evitar crash se getAll falhar
        const existing = await this.loginUser(adminEmail).catch(() => null);
        if (existing) {
            if(existing.role !== 'admin') {
                const t = this.db!.transaction([USERS_STORE], 'readwrite');
                existing.role = 'admin';
                t.objectStore(USERS_STORE).put(existing);
            }
            return;
        }
        await this.createUser({
            id: 'admin-root-user', email: adminEmail, name: 'Admin', password: '@Vitor123', role: 'admin', createdAt: Date.now()
        });
      } catch (e) { console.error("Ensure admin failed", e); }
  }

  async createUser(user: User): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
        try {
            const transaction = this.db!.transaction([USERS_STORE], 'readwrite');
            const store = transaction.objectStore(USERS_STORE);
            const emailIndex = store.index('email');
            
            const emailRequest = emailIndex.get(user.email);
            emailRequest.onsuccess = () => {
                if (emailRequest.result) {
                    reject("E-mail já cadastrado.");
                } else {
                    const addRequest = store.add(user);
                    addRequest.onsuccess = () => resolve();
                    addRequest.onerror = () => reject("Erro ao salvar usuário.");
                }
            };
            emailRequest.onerror = () => reject("Erro de leitura no banco.");
            transaction.onerror = () => reject("Erro na transação de cadastro.");
        } catch (e) {
            reject("Erro crítico no banco de dados.");
        }
    });
  }

  async loginUser(email: string, password?: string): Promise<User | null> {
      // Força reinicialização se a conexão foi perdida
      if (!this.db) {
          try { await this.init(); } catch (e) { throw new Error("Banco de dados indisponível."); }
      }
      
      return new Promise((resolve, reject) => {
          try {
              const transaction = this.db!.transaction([USERS_STORE], 'readonly');
              const store = transaction.objectStore(USERS_STORE);
              const index = store.index('email');
              const request = index.get(email);

              request.onsuccess = () => {
                  const user = request.result as User;
                  if (user) {
                      if (password && user.password !== password) {
                          reject("Senha incorreta.");
                      } else {
                          resolve(user);
                      }
                  } else {
                      reject("Usuário não encontrado.");
                  }
              };
              request.onerror = () => reject("Erro ao buscar usuário.");
              transaction.onerror = () => reject("Transação de login falhou.");
          } catch (e) {
              reject("Erro de conexão com o banco de dados.");
          }
      });
  }

  // Métodos genéricos auxiliares
  async getUserById(id: string): Promise<User | null> {
      if (!this.db) await this.init();
      return new Promise((resolve) => {
          const t = this.db!.transaction([USERS_STORE], 'readonly');
          const r = t.objectStore(USERS_STORE).get(id);
          r.onsuccess = () => resolve(r.result || null);
          r.onerror = () => resolve(null);
      });
  }

  // --- CRUD Genérico (Simplificado para brevidade, mantendo funcionalidade) ---
  
  async saveSetting(key: string, value: any): Promise<void> {
     if(!this.db) await this.init();
     const t = this.db!.transaction([SETTINGS_STORE], 'readwrite');
     t.objectStore(SETTINGS_STORE).put(value, key);
     return new Promise(r => { t.oncomplete = () => r(); });
  }

  async getSetting(key: string): Promise<any> {
     if(!this.db) await this.init();
     const r = this.db!.transaction([SETTINGS_STORE], 'readonly').objectStore(SETTINGS_STORE).get(key);
     return new Promise(res => { r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  }

  async addTrack(track: AudioTrack): Promise<void> {
    if (!this.db) await this.init();
    const t = this.db!.transaction([TRACKS_STORE], 'readwrite');
    t.objectStore(TRACKS_STORE).add(track);
    return new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(); });
  }

  async updateTrack(track: AudioTrack): Promise<void> {
      if (!this.db) await this.init();
      const t = this.db!.transaction([TRACKS_STORE], 'readwrite');
      t.objectStore(TRACKS_STORE).put(track);
      return new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(); });
  }

  async getAllTracks(): Promise<AudioTrack[]> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const r = this.db!.transaction([TRACKS_STORE], 'readonly').objectStore(TRACKS_STORE).getAll();
      r.onsuccess = () => resolve((r.result as AudioTrack[]).sort((a,b) => a.addedAt - b.addedAt));
      r.onerror = () => resolve([]);
    });
  }

  async deleteTrack(id: string): Promise<void> {
    if (!this.db) await this.init();
    const t = this.db!.transaction([TRACKS_STORE], 'readwrite');
    t.objectStore(TRACKS_STORE).delete(id);
    return new Promise(r => { t.oncomplete = () => r(); });
  }

  async createFolder(folder: Folder): Promise<void> {
    if (!this.db) await this.init();
    const t = this.db!.transaction([FOLDERS_STORE], 'readwrite');
    t.objectStore(FOLDERS_STORE).add(folder);
    return new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(); });
  }

  async updateFolder(folder: Folder): Promise<void> {
    if (!this.db) await this.init();
    const t = this.db!.transaction([FOLDERS_STORE], 'readwrite');
    t.objectStore(FOLDERS_STORE).put(folder);
    return new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(); });
  }

  async getAllFolders(): Promise<Folder[]> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const r = this.db!.transaction([FOLDERS_STORE], 'readonly').objectStore(FOLDERS_STORE).getAll();
      r.onsuccess = () => resolve((r.result as Folder[]).sort((a,b) => b.createdAt - a.createdAt));
      r.onerror = () => resolve([]);
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
      if (!this.db) await this.init();
      const t = this.db!.transaction([FOLDERS_STORE, TRACKS_STORE], 'readwrite');
      t.objectStore(FOLDERS_STORE).delete(folderId);
      const index = t.objectStore(TRACKS_STORE).index('folderId');
      const request = index.openCursor(IDBKeyRange.only(folderId));
      request.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) { cursor.delete(); cursor.continue(); }
      };
      return new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(); });
  }
}

export const dbService = new DBService();