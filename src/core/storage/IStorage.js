if (typeof IStorage === 'undefined') {
  class IStorage {
    get(key) {
      throw new Error('Method not implemented');
    }

    set(key, value) {
      throw new Error('Method not implemented');
    }

    delete(key) {
      throw new Error('Method not implemented');
    }

    list(prefix) {
      throw new Error('Method not implemented');
    }
  }
  window.IStorage = IStorage;
}
