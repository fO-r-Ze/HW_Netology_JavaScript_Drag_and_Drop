const STORAGE_KEY = 'trello-board-v1';

export default class Storage {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }

  static clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}