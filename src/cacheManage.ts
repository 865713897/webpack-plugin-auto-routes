export default class CacheManage {
  private cache: Map<string, any> = new Map();

  constructor() {}

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  get(key: string) {
    return this.cache.get(key);
  }

  has(key: string) {
    return this.cache.has(key);
  }

  clear(key: string | null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  getOrInsertWith(key: string, callback: () => any) {
    if (this.has(key)) {
      return this.get(key);
    } else {
      const value = callback();
      this.set(key, value);
      return value;
    }
  }
}
