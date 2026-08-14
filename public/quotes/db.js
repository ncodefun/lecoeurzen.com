const DB_NAME = 'quotes-db';
const STORE_NAME = 'quotes';
const DB_VERSION = 1;

let databasePromise;

function getDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open quotes database.'));
  });

  return databasePromise;
}

async function transaction(mode, action) {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;

    try {
      result = action(store);
    } catch (error) {
      reject(error);
      return;
    }

    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error || result?.error || new Error('Database operation failed.'));
    tx.onabort = () => reject(tx.error || new Error('Database operation was cancelled.'));
  });
}

export const quotesDb = {
  async getAll() {
    return transaction('readonly', (store) => store.getAll());
  },

  async put(quote) {
    return transaction('readwrite', (store) => store.put(quote));
  },

  async delete(id) {
    return transaction('readwrite', (store) => store.delete(id));
  },

  async clear() {
    return transaction('readwrite', (store) => store.clear());
  },

  async bulkPut(quotes) {
    return transaction('readwrite', (store) => {
      for (const quote of quotes) store.put(quote);
    });
  },

  async replaceAll(quotes) {
    return transaction('readwrite', (store) => {
      store.clear();
      for (const quote of quotes) store.put(quote);
    });
  },
};
