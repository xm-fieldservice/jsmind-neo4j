class IndexedDBAdapter extends IStorage {
  // 如上实现
}

if (typeof window !== 'undefined') {
  window.IndexedDBAdapter = IndexedDBAdapter;
}
