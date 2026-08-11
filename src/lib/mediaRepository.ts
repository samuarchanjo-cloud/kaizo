const DATABASE_NAME = "kaizo-media";
const DATABASE_VERSION = 1;
const STORE_NAME = "media";

export interface StoredMedia {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface MediaStorageRepository {
  save(blob: Blob, mediaId?: string): Promise<StoredMedia>;
  get(mediaId: string): Promise<Blob | null>;
  remove(mediaId: string): Promise<void>;
}

const createMediaId = () =>
  `media-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o armazenamento de mídia."));
  });

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> => {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    operation(store, resolve, reject);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao acessar a mídia local."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Operação de mídia cancelada."));
  });
};

export const indexedDbMediaRepository: MediaStorageRepository = {
  async save(blob, mediaId = createMediaId()) {
    const record: StoredMedia = {
      id: mediaId,
      blob,
      mimeType: blob.type || "image/jpeg",
      size: blob.size,
      createdAt: new Date().toISOString(),
    };
    await runTransaction<void>("readwrite", (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return record;
  },

  get(mediaId) {
    return runTransaction<Blob | null>("readonly", (store, resolve, reject) => {
      const request = store.get(mediaId);
      request.onsuccess = () => resolve((request.result as StoredMedia | undefined)?.blob ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  remove(mediaId) {
    return runTransaction<void>("readwrite", (store, resolve, reject) => {
      const request = store.delete(mediaId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};

// Ponto único de substituição futura por um adapter de Supabase Storage.
export const mediaRepository: MediaStorageRepository = indexedDbMediaRepository;

