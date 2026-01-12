import { AudioTrack, Folder, User } from '../types';
import { INITIAL_LIBRARY } from '../config/library';

const DB_NAME = 'NeuroFocusDB';
const DB_VERSION = 11; // Incrementado para forçar re-verificação dos arquivos
const TRACKS_STORE = 'tracks';
const FOLDERS_STORE = 'folders';
const USERS_STORE = 'users';
const SETTINGS_STORE = 'settings';

export class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject("Could not open database");
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        
        try {
            await this.seedDefaultFolders();
            await this.seedInitialTracks(); 
        } catch (e) {
            console.warn("Seed process warning:", e);
        }
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          const trackStore = db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          trackStore.createIndex('folderId', 'folderId', { unique: false });
        } else {
           const trackStore = transaction?.objectStore(TRACKS_STORE);
           if (trackStore && !trackStore.indexNames.contains('folderId')) {
               trackStore.createIndex('folderId', 'folderId', { unique: false });
           }
        }

        if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
          db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(USERS_STORE)) {
           const userStore = db.createObjectStore(USERS_STORE, { keyPath: 'id' });
           userStore.createIndex('email', 'email', { unique: true });
        } else {
           const userStore = transaction?.objectStore(USERS_STORE);
           if (userStore && !userStore.indexNames.contains('email')) {
               userStore.createIndex('email', 'email', { unique: true });
           }
        }

        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE); 
        }
      };
    });
  }

  // --- Seeding (Preenchimento Automático) ---

  private async seedDefaultFolders(): Promise<void> {
      const existingFolders = await this.getAllFolders();

      for (const group of INITIAL_LIBRARY) {
          // Busca case-insensitive
          const exists = existingFolders.some(f => f.name.toLowerCase() === group.folderName.toLowerCase());
          if (!exists) {
              const newFolder: Folder = {
                  id: crypto.randomUUID(),
                  name: group.folderName,
                  createdAt: Date.now()
              };
              await this.createFolder(newFolder);
              console.log(`Pasta criada automaticamente: ${group.folderName}`);
          }
      }
  }

  private async seedInitialTracks(): Promise<void> {
      const allTracks = await this.getAllTracks();
      const folders = await this.getAllFolders();

      for (const group of INITIAL_LIBRARY) {
          const targetFolder = folders.find(f => f.name.toLowerCase() === group.folderName.toLowerCase());
          if (!targetFolder) continue;

          for (const trackData of group.tracks) {
              // Verifica se a música já existe para não duplicar
              const existing = allTracks.find(t => t.name === trackData.name && t.folderId === targetFolder.id);
              
              // Se já existe, pulamos.
              if (existing) continue;

              try {
                  // Codifica a URL para aceitar espaços e caracteres especiais (ex: "n°1")
                  // Ex: "audio/Reprogramar/1 Boas Vindas.mp3"
                  const urlPath = `audio/${trackData.filename}`;
                  const encodedUrl = encodeURI(urlPath);

                  console.log(`Tentando baixar: ${encodedUrl}`);

                  const response = await fetch(encodedUrl);
                  
                  if (!response.ok) {
                      console.warn(`Arquivo não encontrado no servidor: ${urlPath} (Status: ${response.status})`);
                      continue;
                  }
                  
                  const blob = await response.blob();
                  
                  // Se o blob for muito pequeno (ex: página de erro 404 do Netlify), ignorar
                  if (blob.size < 1000) {
                      console.warn(`Arquivo parece inválido (muito pequeno): ${urlPath}`);
                      continue;
                  }

                  const newTrack: AudioTrack = {
                      id: crypto.randomUUID(),
                      folderId: targetFolder.id,
                      name: trackData.name,
                      blob: blob,
                      addedAt: Date.now()
                  };
                  await this.addTrack(newTrack);
                  console.log(`Música salva no banco: ${trackData.name}`);
              } catch (err) {
                  console.error(`Erro ao processar música ${trackData.filename}:`, err);
              }
          }
      }
  }

  // --- Settings (App Cover) ---
  
  async saveSetting(key: string, value: any): Promise<void> {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
          const store = transaction.objectStore(SETTINGS_STORE);
          const request = store.put(value, key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject("Error saving setting");
      });
  }

  async getSetting(key: string): Promise<any> {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
          const store = transaction.objectStore(SETTINGS_STORE);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject("Error getting setting");
      });
  }

  // --- Users ---

  async ensureAdminUser(): Promise<void> {
      if (!this.db) await this.init();
      const adminEmail = "rcavaliericopy@gmail.com";
      const existing = await this.loginUser(adminEmail).catch(() => null);
      if (existing) {
          if(existing.role !== 'admin') {
               const transaction = this.db!.transaction([USERS_STORE], 'readwrite');
               const store = transaction.objectStore(USERS_STORE);
               existing.role = 'admin';
               store.put(existing);
          }
          return;
      }

      const adminUser: User = {
          id: 'admin-root-user',
          email: adminEmail,
          name: 'Admin',
          password: '@Vitor123',
          role: 'admin',
          createdAt: Date.now()
      };
      
      await this.createUser(adminUser).catch(() => {});
  }

  async createUser(user: User): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
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
                addRequest.onerror = () => reject("Erro ao criar usuário.");
            }
        };
        emailRequest.onerror = () => reject("Erro ao verificar e-mail.");
    });
  }

  async loginUser(email: string, password?: string): Promise<User | null> {
      if (!this.db) await this.init();
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
                          return;
                      }
                      resolve(user);
                  } else {
                      reject("Usuário não encontrado.");
                  }
              };
              request.onerror = () => reject("Erro ao tentar login.");
          } catch (e) {
              reject(e);
          }
      });
  }

  async getUserById(id: string): Promise<User | null> {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([USERS_STORE], 'readonly');
          const store = transaction.objectStore(USERS_STORE);
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject("Erro ao buscar usuário.");
      });
  }

  // --- Tracks ---

  async addTrack(track: AudioTrack): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRACKS_STORE], 'readwrite');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.add(track);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error adding track");
    });
  }

  async updateTrack(track: AudioTrack): Promise<void> {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([TRACKS_STORE], 'readwrite');
        const store = transaction.objectStore(TRACKS_STORE);
        const request = store.put(track);
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Error updating track");
      });
  }

  async getAllTracks(): Promise<AudioTrack[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRACKS_STORE], 'readonly');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as AudioTrack[];
        results.sort((a, b) => a.addedAt - b.addedAt);
        resolve(results);
      };
      request.onerror = () => reject("Error fetching tracks");
    });
  }

  async deleteTrack(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRACKS_STORE], 'readwrite');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error deleting track");
    });
  }

  // --- Folders (Playlists) ---

  async createFolder(folder: Folder): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDERS_STORE], 'readwrite');
      const store = transaction.objectStore(FOLDERS_STORE);
      const request = store.add(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error creating folder");
    });
  }

  async updateFolder(folder: Folder): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDERS_STORE], 'readwrite');
      const store = transaction.objectStore(FOLDERS_STORE);
      const request = store.put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error updating folder");
    });
  }

  async getAllFolders(): Promise<Folder[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDERS_STORE], 'readonly');
      const store = transaction.objectStore(FOLDERS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
          const results = request.result as Folder[];
          results.sort((a, b) => b.createdAt - a.createdAt);
          resolve(results);
      };
      request.onerror = () => reject("Error fetching folders");
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([FOLDERS_STORE, TRACKS_STORE], 'readwrite');
          
          const folderStore = transaction.objectStore(FOLDERS_STORE);
          folderStore.delete(folderId);

          const trackStore = transaction.objectStore(TRACKS_STORE);
          const index = trackStore.index('folderId');
          const range = IDBKeyRange.only(folderId);
          const cursorRequest = index.openCursor(range);

          cursorRequest.onsuccess = (e) => {
              const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
              if (cursor) {
                  cursor.delete();
                  cursor.continue();
              }
          };

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject("Error deleting folder and contents");
      });
  }
}

export const dbService = new DBService();