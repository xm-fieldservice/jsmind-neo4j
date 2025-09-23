if (typeof LocalStorageAdapter === 'undefined') {
  class LocalStorageAdapter extends IStorage {
    get(key) {
      return localStorage.getItem(key);
    }

    set(key, value) {
      localStorage.setItem(key, value);
    }

    delete(key) {
      localStorage.removeItem(key);
    }

    list(prefix) {
      return Object.keys(localStorage).filter(k => k.startsWith(prefix));
    }
  }
  window.LocalStorageAdapter = LocalStorageAdapter;
}
